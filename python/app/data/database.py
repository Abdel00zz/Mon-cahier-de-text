"""Accès SQLite : connexion unique, schéma versionné, transactions explicites.

Le module n'expose qu'un objet : :class:`Database`. Le reste de l'application
ne voit jamais de curseur — c'est le rôle des dépôts (`repository.py`). Ce
cloisonnement rend la base remplaçable (tests en mémoire) sans toucher au
domaine ni à l'interface.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

#: Version du schéma. Toute évolution incrémente cette valeur et ajoute une
#: étape dans `_MIGRATIONS`, ce qui permet d'ouvrir une base ancienne sans perte.
SCHEMA_VERSION = 1

_SCHEMA = """
CREATE TABLE IF NOT EXISTS config (
    id      INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    teacher_name TEXT NOT NULL DEFAULT '',
    subject      TEXT NOT NULL DEFAULT '',
    color        TEXT NOT NULL DEFAULT '',
    cycle        TEXT,
    level        TEXT NOT NULL DEFAULT '',
    grp          TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timetable (
    day      INTEGER NOT NULL CHECK (day BETWEEN 1 AND 6),
    slot     INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 23),
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    PRIMARY KEY (day, slot)
);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id);

CREATE TABLE IF NOT EXISTS sessions (
    id       TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date     TEXT NOT NULL,
    remark   TEXT NOT NULL DEFAULT '',
    homework TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_class_date ON sessions(class_id, date);

CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parent_id     TEXT REFERENCES items(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL DEFAULT 0,
    kind          TEXT NOT NULL,
    text          TEXT NOT NULL DEFAULT '',
    manual_number TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_session ON items(session_id, parent_id, position);

CREATE TABLE IF NOT EXISTS archives (
    id            TEXT PRIMARY KEY,
    year_label    TEXT NOT NULL,
    class_count   INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    payload       TEXT NOT NULL
);
"""


class Database:
    """Connexion SQLite en mode WAL, prête pour un usage mono-utilisateur."""

    def __init__(self, path: Path | str = ":memory:") -> None:
        self._path = str(path)
        self._connection = sqlite3.connect(self._path, isolation_level=None)
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        if self._path != ":memory:":
            # WAL : lecture pendant l'écriture, et aucune corruption sur coupure.
            self._connection.execute("PRAGMA journal_mode = WAL")
            self._connection.execute("PRAGMA synchronous = NORMAL")
        self._migrate()

    # ── Cycle de vie ────────────────────────────────────────────────────────

    @property
    def path(self) -> str:
        return self._path

    def close(self) -> None:
        self._connection.close()

    def __enter__(self) -> Database:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    # ── Requêtes ────────────────────────────────────────────────────────────

    def query(self, sql: str, params: tuple | dict = ()) -> list[sqlite3.Row]:
        return list(self._connection.execute(sql, params))

    def one(self, sql: str, params: tuple | dict = ()) -> sqlite3.Row | None:
        return self._connection.execute(sql, params).fetchone()

    def scalar(self, sql: str, params: tuple | dict = ()) -> object:
        row = self._connection.execute(sql, params).fetchone()
        return row[0] if row else None

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        """Regroupe plusieurs écritures : tout réussit, ou rien n'est écrit."""
        self._connection.execute("BEGIN")
        try:
            yield self._connection
        except Exception:
            self._connection.execute("ROLLBACK")
            raise
        else:
            self._connection.execute("COMMIT")

    def execute(self, sql: str, params: tuple | dict = ()) -> None:
        self._connection.execute(sql, params)

    # ── Schéma ──────────────────────────────────────────────────────────────

    def _migrate(self) -> None:
        current = int(self.scalar("PRAGMA user_version") or 0)
        if current >= SCHEMA_VERSION:
            return
        # `executescript` clôt toute transaction ouverte : on l'exécute donc
        # hors du gestionnaire `transaction()`. Le script est idempotent
        # (CREATE … IF NOT EXISTS), une interruption ne laisse rien à moitié fait.
        self._connection.executescript(_SCHEMA)
        self._connection.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
