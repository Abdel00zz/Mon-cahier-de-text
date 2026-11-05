"""Dépôts : la seule porte d'entrée vers les données.

Chaque méthode traduit une intention du domaine (ouvrir un cahier, déplacer
une séance, archiver l'année) en requêtes SQL, et rend des modèles validés.
Aucune requête n'est écrite ailleurs dans l'application.
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable
from datetime import date, datetime

from ..core.models import (
    AppConfig,
    ArchiveMeta,
    ClassInfo,
    ContentItem,
    ContentKind,
    Cycle,
    Session,
    TimetableSlot,
    Workspace,
)
from .database import Database


class Repository:
    """Façade unique sur la base locale."""

    def __init__(self, database: Database) -> None:
        self._db = database

    @property
    def database(self) -> Database:
        return self._db

    # ── Configuration ───────────────────────────────────────────────────────

    def config(self) -> AppConfig:
        row = self._db.one("SELECT payload FROM config WHERE id = 1")
        if row is None:
            return AppConfig()
        try:
            return AppConfig.model_validate_json(row["payload"])
        except ValueError:
            # Un réglage corrompu ne doit jamais empêcher l'ouverture du cahier.
            return AppConfig()

    def save_config(self, config: AppConfig) -> None:
        payload = config.model_dump_json()
        self._db.execute(
            "INSERT INTO config (id, payload) VALUES (1, ?) "
            "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
            (payload,),
        )

    # ── Classes ─────────────────────────────────────────────────────────────

    def classes(self) -> list[ClassInfo]:
        rows = self._db.query("SELECT * FROM classes ORDER BY created_at, name")
        return [self._class_from_row(row) for row in rows]

    def class_by_id(self, class_id: str) -> ClassInfo | None:
        row = self._db.one("SELECT * FROM classes WHERE id = ?", (class_id,))
        return self._class_from_row(row) if row else None

    def add_class(self, info: ClassInfo) -> ClassInfo:
        self._db.execute(
            "INSERT INTO classes (id, name, teacher_name, subject, color, cycle, level, grp, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                info.id,
                info.name,
                info.teacher_name,
                info.subject,
                info.color,
                info.cycle.value if info.cycle else None,
                info.level,
                info.group,
                info.created_at.isoformat(),
            ),
        )
        return info

    def update_class(self, info: ClassInfo) -> ClassInfo:
        self._db.execute(
            "UPDATE classes SET name = ?, teacher_name = ?, subject = ?, color = ?, cycle = ?, level = ?, grp = ? "
            "WHERE id = ?",
            (
                info.name,
                info.teacher_name,
                info.subject,
                info.color,
                info.cycle.value if info.cycle else None,
                info.level,
                info.group,
                info.id,
            ),
        )
        return info

    def delete_class(self, class_id: str) -> None:
        # Les séances et les créneaux suivent la classe (ON DELETE CASCADE).
        self._db.execute("DELETE FROM classes WHERE id = ?", (class_id,))

    @staticmethod
    def _class_from_row(row: sqlite3.Row) -> ClassInfo:
        return ClassInfo(
            id=row["id"],
            name=row["name"],
            teacher_name=row["teacher_name"],
            subject=row["subject"],
            color=row["color"],
            cycle=Cycle(row["cycle"]) if row["cycle"] else None,
            level=row["level"],
            group=row["grp"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    # ── Emploi du temps ─────────────────────────────────────────────────────

    def timetable(self) -> list[TimetableSlot]:
        rows = self._db.query("SELECT day, slot, class_id FROM timetable ORDER BY day, slot")
        return [TimetableSlot(day=row["day"], slot=row["slot"], class_id=row["class_id"]) for row in rows]

    def assign_slot(self, day: int, slot: int, class_id: str) -> None:
        """Place une classe ; un créneau n'accueille qu'une seule classe."""
        self._db.execute(
            "INSERT INTO timetable (day, slot, class_id) VALUES (?, ?, ?) "
            "ON CONFLICT(day, slot) DO UPDATE SET class_id = excluded.class_id",
            (day, slot, class_id),
        )

    def clear_slot(self, day: int, slot: int) -> None:
        self._db.execute("DELETE FROM timetable WHERE day = ? AND slot = ?", (day, slot))

    # ── Cahier ──────────────────────────────────────────────────────────────

    def sessions(self, class_id: str) -> list[Session]:
        rows = self._db.query(
            "SELECT * FROM sessions WHERE class_id = ? ORDER BY date, position",
            (class_id,),
        )
        return [self._session_from_row(row) for row in rows]

    def session_by_id(self, session_id: str) -> Session | None:
        row = self._db.one("SELECT * FROM sessions WHERE id = ?", (session_id,))
        return self._session_from_row(row) if row else None

    def add_session(self, session: Session) -> Session:
        position = int(self._db.scalar(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM sessions WHERE class_id = ?",
            (session.class_id,),
        ) or 0)
        with self._db.transaction() as connection:
            connection.execute(
                "INSERT INTO sessions (id, class_id, date, remark, homework, position) VALUES (?, ?, ?, ?, ?, ?)",
                (session.id, session.class_id, session.date.isoformat(), session.remark, session.homework, position),
            )
            self._write_items(connection, session)
        return session

    def save_session(self, session: Session) -> Session:
        """Remplace le contenu d'une séance (les items sont réécrits d'un bloc)."""
        with self._db.transaction() as connection:
            connection.execute(
                "UPDATE sessions SET date = ?, remark = ?, homework = ? WHERE id = ?",
                (session.date.isoformat(), session.remark, session.homework, session.id),
            )
            connection.execute("DELETE FROM items WHERE session_id = ?", (session.id,))
            self._write_items(connection, session)
        return session

    def delete_session(self, session_id: str) -> None:
        self._db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

    def find_session(self, class_id: str, day: date) -> Session | None:
        """Séance d'une classe à une date donnée (une seule par jour)."""
        row = self._db.one(
            "SELECT * FROM sessions WHERE class_id = ? AND date = ? ORDER BY position LIMIT 1",
            (class_id, day.isoformat()),
        )
        return self._session_from_row(row) if row else None

    def ensure_session(self, class_id: str, day: date) -> Session:
        """Ouvre la séance du jour, ou la crée si elle n'existe pas encore."""
        return self.find_session(class_id, day) or self.add_session(Session(class_id=class_id, date=day))

    def _session_from_row(self, row: sqlite3.Row) -> Session:
        return Session(
            id=row["id"],
            class_id=row["class_id"],
            date=date.fromisoformat(row["date"]),
            remark=row["remark"],
            homework=row["homework"],
            items=self._read_items(row["id"]),
        )

    def _read_items(self, session_id: str) -> list[ContentItem]:
        rows = self._db.query(
            "SELECT * FROM items WHERE session_id = ? ORDER BY position",
            (session_id,),
        )
        indexed = {
            row["id"]: ContentItem(
                id=row["id"],
                kind=ContentKind(row["kind"]),
                text=row["text"],
                manual_number=row["manual_number"],
            )
            for row in rows
        }
        roots: list[ContentItem] = []
        for row in rows:
            item = indexed[row["id"]]
            parent = indexed.get(row["parent_id"]) if row["parent_id"] else None
            if parent is not None:
                parent.children.append(item)
            else:
                roots.append(item)
        return roots

    @staticmethod
    def _write_items(connection: sqlite3.Connection, session: Session) -> None:
        counter = 0

        def walk(items: Iterable[ContentItem], parent_id: str | None) -> None:
            nonlocal counter
            for position, item in enumerate(items):
                connection.execute(
                    "INSERT INTO items (id, session_id, parent_id, position, kind, text, manual_number) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (item.id, session.id, parent_id, position, item.kind.value, item.text, item.manual_number),
                )
                counter += 1
                walk(item.children, item.id)

        walk(session.items, None)

    # ── Archives ────────────────────────────────────────────────────────────

    def archives(self) -> list[ArchiveMeta]:
        rows = self._db.query(
            "SELECT id, year_label, class_count, session_count, created_at"
            " FROM archives ORDER BY created_at DESC"
        )
        return [
            ArchiveMeta(
                id=row["id"],
                year_label=row["year_label"],
                class_count=row["class_count"],
                session_count=row["session_count"],
                created_at=datetime.fromisoformat(row["created_at"]),
            )
            for row in rows
        ]

    def create_archive(self, year_label: str) -> ArchiveMeta:
        workspace = self.export_workspace()
        meta = ArchiveMeta(
            year_label=year_label,
            class_count=len(workspace.classes),
            session_count=len(workspace.sessions),
        )
        self._db.execute(
            "INSERT INTO archives"
            " (id, year_label, class_count, session_count, created_at, payload)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                meta.id,
                meta.year_label,
                meta.class_count,
                meta.session_count,
                meta.created_at.isoformat(),
                workspace.model_dump_json(),
            ),
        )
        return meta

    def archive_payload(self, archive_id: str) -> Workspace | None:
        row = self._db.one("SELECT payload FROM archives WHERE id = ?", (archive_id,))
        if row is None:
            return None
        return Workspace.model_validate_json(row["payload"])

    def delete_archive(self, archive_id: str) -> None:
        self._db.execute("DELETE FROM archives WHERE id = ?", (archive_id,))

    # ── Espace de travail ───────────────────────────────────────────────────

    def export_workspace(self) -> Workspace:
        classes = self.classes()
        return Workspace(
            config=self.config(),
            classes=classes,
            timetable=self.timetable(),
            sessions=[session for info in classes for session in self.sessions(info.id)],
            archives=self.archives(),
        )

    def import_workspace(self, workspace: Workspace) -> None:
        """Remplace tout l'espace de travail par la sauvegarde fournie.

        Une seule transaction : une sauvegarde invalide laisse la base intacte.
        """
        known = {info.id for info in workspace.classes}
        with self._db.transaction() as connection:
            for table in ("items", "sessions", "timetable", "classes"):
                connection.execute(f"DELETE FROM {table}")  # noqa: S608 — noms de tables internes

            connection.execute(
                "INSERT INTO config (id, payload) VALUES (1, ?) "
                "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
                (workspace.config.model_dump_json(),),
            )

            for info in workspace.classes:
                connection.execute(
                    "INSERT INTO classes (id, name, teacher_name, subject, color, cycle, level, grp, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        info.id,
                        info.name,
                        info.teacher_name,
                        info.subject,
                        info.color,
                        info.cycle.value if info.cycle else None,
                        info.level,
                        info.group,
                        info.created_at.isoformat(),
                    ),
                )

            for slot in workspace.timetable:
                if slot.class_id in known:
                    connection.execute(
                        "INSERT INTO timetable (day, slot, class_id) VALUES (?, ?, ?) "
                        "ON CONFLICT(day, slot) DO UPDATE SET class_id = excluded.class_id",
                        (slot.day, slot.slot, slot.class_id),
                    )

            for position, session in enumerate(workspace.sessions):
                if session.class_id not in known:
                    continue
                connection.execute(
                    "INSERT INTO sessions (id, class_id, date, remark, homework, position) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        session.id,
                        session.class_id,
                        session.date.isoformat(),
                        session.remark,
                        session.homework,
                        position,
                    ),
                )
                self._write_items(connection, session)

    def stats(self) -> dict[str, int]:
        return {
            "classes": int(self._db.scalar("SELECT COUNT(*) FROM classes") or 0),
            "sessions": int(self._db.scalar("SELECT COUNT(*) FROM sessions") or 0),
            "items": int(self._db.scalar("SELECT COUNT(*) FROM items") or 0),
            "slots": int(self._db.scalar("SELECT COUNT(*) FROM timetable") or 0),
        }

    def to_json(self) -> str:
        return self.export_workspace().model_dump_json(indent=2)

    def from_json(self, raw: str) -> Workspace:
        return Workspace.model_validate(json.loads(raw))
