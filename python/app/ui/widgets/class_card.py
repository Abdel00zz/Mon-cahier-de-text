"""Carte d'une classe : la pastille colorée du tableau de bord.

La teinte vient de :mod:`app.core.palette` — la même que dans l'emploi du temps,
ce qui permet de reconnaître une classe d'un coup d'œil, partout.
"""

from __future__ import annotations

from collections.abc import Callable

from PyQt6.QtCore import QPoint, QSize, Qt
from PyQt6.QtWidgets import QFrame, QHBoxLayout, QLabel, QMenu, QPushButton, QVBoxLayout, QWidget

from ...core.models import ClassInfo
from ...core.palette import Palette
from ...core.timetable import ClockSlot
from ..icons import icon, pixmap


class ClassCard(QFrame):
    """Carte cliquable, avec un menu d'actions discret."""

    MIN_WIDTH = 232

    def __init__(
        self,
        info: ClassInfo,
        palette: Palette,
        *,
        dark: bool,
        session_label: str | None = None,
        session_slot: ClockSlot | None = None,
        subject_visible: bool = True,
        on_open: Callable[[ClassInfo], None] | None = None,
        on_schedule: Callable[[ClassInfo], None] | None = None,
        on_edit: Callable[[ClassInfo], None] | None = None,
        on_delete: Callable[[ClassInfo], None] | None = None,
        t: Callable[..., str] | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._info = info
        self._on_open = on_open
        self._t = t or (lambda key, **_values: key)
        bg = palette.dark_bg if dark else palette.bg
        bg2 = palette.dark_bg2 if dark else palette.bg2
        title = palette.dark_title if dark else palette.title
        secondary = palette.dark_title if dark else palette.secondary
        border = palette.border if not dark else palette.dark_bg2

        self.setObjectName("classCard")
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumWidth(self.MIN_WIDTH)
        self.setMinimumHeight(96)
        self.setStyleSheet(
            f"#classCard {{ background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 {bg}, stop:1 {bg2});"
            f" border: 1px solid {border}; border-radius: 18px; }}"
            f"#classCard:hover {{ border: 1px solid {title}; }}"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 13, 12, 13)
        layout.setSpacing(6)

        header = QHBoxLayout()
        header.setSpacing(8)
        self._title = QLabel(info.name)
        self._title.setStyleSheet(f"color:{title}; font-size:16px; font-weight:700;")
        self._title.setWordWrap(True)
        header.addWidget(self._title, 1)

        self._menu_button = QPushButton()
        self._menu_button.setProperty("role", "ghost")
        self._menu_button.setFixedSize(28, 28)
        self._menu_button.setIcon(icon("menu", secondary, 18))
        self._menu_button.setIconSize(QSize(18, 18))
        self._menu_button.setCursor(Qt.CursorShape.PointingHandCursor)
        self._menu_button.setStyleSheet(
            f"QPushButton {{ color:{secondary}; background:transparent; border:0; font-size:17px; padding:0; }}"
            f"QPushButton:hover {{ background: rgba(0,0,0,0.06); border-radius: 8px; }}"
        )
        self._menu_button.clicked.connect(self._show_menu)
        header.addWidget(self._menu_button, 0, Qt.AlignmentFlag.AlignTop)
        layout.addLayout(header)

        meta = " · ".join(part for part in (info.level, info.subject if subject_visible else "") if part)
        if meta:
            meta_label = QLabel(meta)
            meta_label.setStyleSheet(f"color:{secondary}; font-size:12px;")
            meta_label.setWordWrap(True)
            layout.addWidget(meta_label)

        if session_slot is not None and session_label:
            chip = QLabel(f"{session_label} · {session_slot.label}")
            chip.setStyleSheet(
                f"color:{title}; background: rgba(255,255,255,0.55); border-radius: 8px;"
                " padding: 3px 8px; font-size: 11px; font-weight: 600;"
            )
            chip.setMaximumWidth(230)
            layout.addWidget(chip, 0, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)

        layout.addStretch(1)

    # ── Interactions ────────────────────────────────────────────────────────
    @property
    def info(self) -> ClassInfo:
        return self._info

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802 - API Qt
        if event.button() == Qt.MouseButton.LeftButton and self._on_open is not None:
            self._on_open(self._info)
        super().mouseReleaseEvent(event)

    def _show_menu(self) -> None:
        menu = QMenu(self)
        open_action = menu.addAction(pixmap("book", "#6b4c35", 16), self._t("editor.open"))
        schedule_action = menu.addAction(pixmap("calendar", "#6b4c35", 16), self._t("schedule.heading"))
        menu.addSeparator()
        edit_action = menu.addAction(pixmap("edit", "#6b4c35", 16), self._t("dialog.edit_class"))
        delete_action = menu.addAction(pixmap("trash", "#b43c32", 16), self._t("action.delete"))

        chosen = menu.exec(self._menu_button.mapToGlobal(QPoint(0, self._menu_button.height())))
        if chosen is None:
            return
        if chosen is open_action and self._on_open:
            self._on_open(self._info)
        elif chosen is schedule_action and self._on_schedule:
            self._on_schedule(self._info)
        elif chosen is edit_action and self._on_edit:
            self._on_edit(self._info)
        elif chosen is delete_action and self._on_delete:
            self._on_delete(self._info)
