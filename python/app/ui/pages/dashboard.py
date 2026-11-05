"""Tableau de bord : la vue d'ensemble des classes.

Une carte par classe, réparties en flux selon la largeur de la fenêtre ; la
barre supérieure filtre, la pastille « + » crée. Aucun état vide passif : la
première fois, l'écran propose directement la création.
"""

from __future__ import annotations

from datetime import datetime

from PyQt6.QtCore import QSize, Qt, pyqtSignal
from PyQt6.QtGui import QKeySequence, QShortcut
from PyQt6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QScrollArea,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from ...core.timetable import DEFAULT_SLOTS, ClockSlot, next_session, session_at, weekly_load
from ...state import AppState
from ..icons import icon
from ..widgets.class_card import ClassCard
from ..widgets.empty_state import EmptyState
from ..widgets.flow_layout import FlowLayout

_EMPTY_INDEX = 1


class DashboardPage(QWidget):
    openClass = pyqtSignal(str)
    openSchedule = pyqtSignal(str)
    createClass = pyqtSignal()
    editClass = pyqtSignal(str)
    deleteClass = pyqtSignal(str)

    def __init__(self, state: AppState, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._state = state
        self.setObjectName("dashboardPage")

        outer = QVBoxLayout(self)
        outer.setContentsMargins(24, 20, 24, 12)
        outer.setSpacing(12)

        header = QHBoxLayout()
        header.setSpacing(12)
        self._title = QLabel()
        self._title.setObjectName("pageTitle")
        header.addWidget(self._title)
        header.addStretch(1)

        self._search = QLineEdit()
        self._search.setClearButtonEnabled(True)
        self._search.setMinimumWidth(200)
        self._search.setMaximumWidth(300)
        self._search.textChanged.connect(self._render)
        header.addWidget(self._search)

        self._add = QPushButton()
        self._add.setProperty("role", "round")
        self._add.setIcon(icon("plus", "#fffaF2", 18))
        self._add.setIconSize(QSize(18, 18))
        self._add.setFixedSize(38, 38)
        self._add.setCursor(Qt.CursorShape.PointingHandCursor)
        self._add.clicked.connect(self.createClass.emit)
        header.addWidget(self._add)
        outer.addLayout(header)

        self._subtitle = QLabel()
        self._subtitle.setObjectName("hint")
        outer.addWidget(self._subtitle)

        self._stack = QStackedWidget()
        outer.addWidget(self._stack, 1)

        self._scroll = QScrollArea()
        self._scroll.setWidgetResizable(True)
        self._scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        self._scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self._canvas = QWidget()
        self._flow = FlowLayout(self._canvas, h_spacing=12, v_spacing=12)
        self._scroll.setWidget(self._canvas)
        self._stack.addWidget(self._scroll)

        self._empty_host = QWidget()
        self._empty_layout = QVBoxLayout(self._empty_host)
        self._empty_layout.setContentsMargins(0, 0, 0, 0)
        self._stack.addWidget(self._empty_host)

        shortcut = QShortcut(QKeySequence("Ctrl+N"), self)
        shortcut.activated.connect(self.createClass.emit)

        self._state.classesChanged.connect(self.refresh)
        self._state.timetableChanged.connect(self.refresh)
        self._state.configChanged.connect(self.refresh)
        self.refresh()

    # ── Rendu ───────────────────────────────────────────────────────────────
    def refresh(self) -> None:
        t = self._state.t
        self._title.setText(t("dashboard.heading"))
        self._search.setPlaceholderText(t("dashboard.search"))
        self._add.setToolTip(t("dashboard.add"))
        self._add.setAccessibleName(t("dashboard.add"))
        self._render()

    def _render(self) -> None:
        self._clear(self._flow)
        self._clear(self._empty_layout)

        t = self._state.t
        classes = self._state.classes()
        palettes = self._state.palette_map(classes)
        entries = self._state.repository.timetable()
        now = datetime.now()
        current = session_at(entries, now)
        upcoming = next_session(entries, now)

        query = self._search.text().strip().lower()
        visible = [
            info
            for info in classes
            if not query
            or query in info.name.lower()
            or query in info.subject.lower()
            or query in info.level.lower()
        ]

        if classes:
            load = sum(weekly_load(entries, info.id) for info in classes)
            parts = [str(len(classes)), t("dashboard.week_load", count=load)]
            if upcoming is not None and not query:
                parts.append(f"{t('dashboard.session_next')} · {upcoming.starts_at.strftime('%a %H:%M')}")
            self._subtitle.setText(" · ".join(parts))
        else:
            self._subtitle.setText("")

        if not visible:
            searching = bool(query) and bool(classes)
            self._empty_layout.addWidget(
                EmptyState(
                    icon_name="search" if searching else "classes",
                    title=t("dashboard.no_result") if searching else t("dashboard.empty.title"),
                    body=t("dashboard.no_result") if searching else t("dashboard.empty.body"),
                    action_label=None if searching else t("dashboard.add"),
                    on_action=None if searching else self.createClass.emit,
                )
            )
            self._stack.setCurrentIndex(_EMPTY_INDEX)
            return

        for info in visible:
            label: str | None = None
            slot: ClockSlot | None = None
            if current is not None and current.class_id == info.id:
                label = t("dashboard.session_now")
                slot = next((item for item in DEFAULT_SLOTS if item.index == current.slot), None)
            self._flow.addWidget(
                ClassCard(
                    info,
                    palettes[info.id],
                    dark=self._state.is_dark,
                    session_label=label,
                    session_slot=slot,
                    subject_visible=self._state.config.show_subject_on_cards,
                    on_open=lambda item: self.openClass.emit(item.id),
                    on_schedule=lambda item: self.openSchedule.emit(item.id),
                    on_edit=lambda item: self.editClass.emit(item.id),
                    on_delete=lambda item: self.deleteClass.emit(item.id),
                    t=t,
                )
            )
        self._stack.setCurrentIndex(0)

    @staticmethod
    def _clear(layout) -> None:
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget() if item is not None else None
            if widget is not None:
                widget.setParent(None)
                widget.deleteLater()
