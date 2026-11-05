"""Emploi du temps : grille hebdomadaire, matin et après-midi.

Chaque case vide propose les classes ; une case remplie rappelle la matière et
permet de vider le créneau. La couleur de la case est celle de la carte du
tableau de bord — une seule palette pour toute l'application.
"""

from __future__ import annotations

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QAbstractItemView,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QMenu,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ...core.subjects import subject_label
from ...core.timetable import AFTERNOON_SLOTS, DAY_KEYS, MORNING_SLOTS, ClockSlot
from ...state import AppState
from ..icons import pixmap

ROLE = Qt.ItemDataRole.UserRole


class SchedulePage(QWidget):
    openClass = pyqtSignal(str)
    notify = pyqtSignal(str)

    def __init__(self, state: AppState, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._state = state
        self._period = "morning"

        outer = QVBoxLayout(self)
        outer.setContentsMargins(24, 20, 24, 16)
        outer.setSpacing(12)

        header = QHBoxLayout()
        header.setSpacing(10)
        self._title = QLabel()
        self._title.setObjectName("pageTitle")
        header.addWidget(self._title)
        header.addStretch(1)

        self._morning = QPushButton()
        self._afternoon = QPushButton()
        for button, period in ((self._morning, "morning"), (self._afternoon, "afternoon")):
            button.setCheckable(True)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.clicked.connect(lambda _checked=False, value=period: self._set_period(value))
            header.addWidget(button)
        outer.addLayout(header)

        self._hint = QLabel()
        self._hint.setObjectName("hint")
        outer.addWidget(self._hint)

        self._table = QTableWidget()
        self._table.setRowCount(len(DAY_KEYS))
        self._table.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection)
        self._table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self._table.verticalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self._table.verticalHeader().setFixedWidth(96)
        self._table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self._table.horizontalHeader().setHighlightSections(False)
        self._table.cellClicked.connect(self._cell_clicked)
        outer.addWidget(self._table, 1)

        self._state.timetableChanged.connect(self.refresh)
        self._state.classesChanged.connect(self.refresh)
        self._state.configChanged.connect(self.refresh)
        self.refresh()

    # ── Période ─────────────────────────────────────────────────────────────
    @property
    def _slots(self) -> tuple[ClockSlot, ...]:
        return MORNING_SLOTS if self._period == "morning" else AFTERNOON_SLOTS

    def _set_period(self, period: str) -> None:
        self._period = period
        self.refresh()

    def show_class(self, class_id: str) -> None:
        """Met en évidence les créneaux d'une classe (appel depuis une carte)."""
        self.refresh()
        for row in range(self._table.rowCount()):
            for column in range(self._table.columnCount()):
                item = self._table.item(row, column)
                if item is not None and item.data(ROLE) == class_id:
                    self._table.setCurrentCell(row, column)
                    self._table.setFocus()
                    return

    # ── Rendu ───────────────────────────────────────────────────────────────
    def refresh(self) -> None:
        t = self._state.t
        dark = self._state.is_dark
        locale = self._state.config.locale.value
        self._title.setText(t("schedule.heading"))
        self._hint.setText(t("schedule.empty.body"))
        self._morning.setText(t("schedule.morning"))
        self._afternoon.setText(t("schedule.afternoon"))
        self._morning.setChecked(self._period == "morning")
        self._afternoon.setChecked(self._period == "afternoon")

        slots = self._slots
        classes = {info.id: info for info in self._state.classes()}
        palettes = self._state.palette_map(list(classes.values()))
        entries = {(entry.day, entry.slot): entry.class_id for entry in self._state.repository.timetable()}

        headers = [slot.label for slot in slots]
        self._table.setColumnCount(len(headers))
        self._table.setHorizontalHeaderLabels(headers)
        self._table.setVerticalHeaderLabels([t(f"weekday.{day}") for day in DAY_KEYS])

        for row, day in enumerate(DAY_KEYS, start=0):
            for column, slot in enumerate(slots, start=0):
                class_id = entries.get((day, slot.index))
                item = QTableWidgetItem()
                item.setData(ROLE, class_id)
                if class_id and class_id in classes:
                    info = classes[class_id]
                    palette = palettes[class_id]
                    label = info.name if not info.subject else f"{info.name}\n{subject_label(info.subject, locale)}"
                    item.setText(label)
                    item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                    background = palette.dark_bg if dark else palette.bg
                    foreground = palette.dark_title if dark else palette.title
                    item.setBackground(QColor(background))
                    item.setForeground(QColor(foreground))
                    item.setToolTip(info.menu_label)
                else:
                    item.setText(t("schedule.free"))
                    item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                    item.setForeground(QColor("#9b9b9b"))
                self._table.setItem(row, column, item)

    # ── Interaction ─────────────────────────────────────────────────────────
    def _cell_clicked(self, row: int, column: int) -> None:
        day = DAY_KEYS[row]
        slot = self._slots[column]
        entries = {(entry.day, entry.slot): entry.class_id for entry in self._state.repository.timetable()}
        current = entries.get((day, slot.index))

        classes = self._state.classes()
        if not classes:
            self.notify.emit(self._state.t("dashboard.empty.title"))
            return

        menu = QMenu(self)
        title = menu.addAction(f"{self._state.t('weekday.' + str(day))} · {slot.label}")
        title.setEnabled(False)
        menu.addSeparator()

        for info in classes:
            action = menu.addAction(pixmap("classes", "#6b4c35", 16), info.menu_label)
            action.setCheckable(True)
            action.setChecked(info.id == current)
            action.triggered.connect(lambda _checked=False, target=info.id: self._assign(day, slot.index, target))

        if current is not None:
            menu.addSeparator()
            clear = menu.addAction(pixmap("close", "#b43c32", 16), self._state.t("schedule.clear"))
            clear.triggered.connect(lambda _checked=False: self._clear(day, slot.index))

        menu.exec(self._table.mapToGlobal(self._table.visualRect(self._table.model().index(row, column)).center()))

    def _assign(self, day: int, slot: int, class_id: str) -> None:
        self._state.repository.assign_slot(day, slot, class_id)
        self._state.notify_timetable_changed()
        self.notify.emit(self._state.t("message.saved"))

    def _clear(self, day: int, slot: int) -> None:
        self._state.repository.clear_slot(day, slot)
        self._state.notify_timetable_changed()
