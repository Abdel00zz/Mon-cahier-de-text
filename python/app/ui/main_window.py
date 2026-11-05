"""Fenêtre principale : navigation, pages et dialogues partagés.

La navigation est un rail latéral sur grand écran, un simple empilement de pages
sur fenêtre étroite — l'utilisateur ne voit jamais une interface de bureau
comprimée dans un espace de téléphone.
"""

from __future__ import annotations

from PyQt6.QtCore import QSize, Qt, pyqtSignal
from PyQt6.QtGui import QKeySequence, QShortcut
from PyQt6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from ..state import AppState
from .icons import icon
from .pages.dashboard import DashboardPage
from .pages.editor import EditorPage
from .pages.help import HelpPage
from .pages.schedule import SchedulePage
from .pages.settings import SettingsPage
from .widgets.dialogs import ClassDialog, ConfirmDialog
from .widgets.empty_state import Toast

DASHBOARD, EDITOR, SCHEDULE, SETTINGS, HELP = range(5)

NAV_ITEMS: tuple[tuple[str, str], ...] = (
    ("nav.dashboard", "classes"),
    ("nav.editor", "book"),
    ("nav.schedule", "calendar"),
    ("nav.settings", "settings"),
    ("nav.help", "help"),
)

#: En dessous de cette largeur, le rail devient une barre compacte.
COMPACT_WIDTH = 900


class MainWindow(QMainWindow):
    themeToggled = pyqtSignal()

    def __init__(self, state: AppState) -> None:
        super().__init__()
        self._state = state
        self._is_compact = False
        self.setWindowTitle(state.t("app.title"))
        self.setMinimumSize(QSize(720, 560))
        self.resize(1180, 780)

        root = QWidget()
        root.setObjectName("appRoot")
        self.setCentralWidget(root)
        shell = QHBoxLayout(root)
        shell.setContentsMargins(0, 0, 0, 0)
        shell.setSpacing(0)

        shell.addWidget(self._build_sidebar())

        content = QWidget()
        content_layout = QVBoxLayout(content)
        content_layout.setContentsMargins(0, 0, 0, 0)
        self._stack = QStackedWidget()
        content_layout.addWidget(self._stack)
        shell.addWidget(content, 1)

        self.dashboard = DashboardPage(state)
        self.editor = EditorPage(state)
        self.schedule = SchedulePage(state)
        self.settings_page = SettingsPage(state)
        self.help_page = HelpPage(state)
        for page in (self.dashboard, self.editor, self.schedule, self.settings_page, self.help_page):
            self._stack.addWidget(page)

        self._toast = Toast(root)

        self._connect()
        self._install_shortcuts()
        self.retranslate()
        self._show(DASHBOARD)

    # ── Construction ────────────────────────────────────────────────────────
    def _build_sidebar(self) -> QWidget:
        sidebar = QWidget()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(232)
        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(14, 16, 14, 14)
        layout.setSpacing(6)

        self._brand = QLabel()
        self._brand.setObjectName("brandTitle")
        layout.addWidget(self._brand)
        self._brand_sub = QLabel()
        self._brand_sub.setObjectName("brandSubtitle")
        layout.addWidget(self._brand_sub)
        layout.addSpacing(12)

        self._nav: dict[int, QPushButton] = {}
        for index, (_key, glyph) in enumerate(NAV_ITEMS):
            button = QPushButton()
            button.setProperty("nav", "true")
            button.setCheckable(True)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.setIconSize(QSize(18, 18))
            button.setIcon(icon(glyph, "#6e5a49", 18))
            button.clicked.connect(lambda _checked=False, target=index: self._show(target))
            layout.addWidget(button)
            self._nav[index] = button

        layout.addStretch(1)
        self._theme_button = QPushButton()
        self._theme_button.setProperty("role", "ghost")
        self._theme_button.setCursor(Qt.CursorShape.PointingHandCursor)
        self._theme_button.clicked.connect(self.themeToggled.emit)
        layout.addWidget(self._theme_button)
        self._sidebar = sidebar
        return sidebar

    def _install_shortcuts(self) -> None:
        for index in range(5):
            shortcut = QShortcut(QKeySequence(f"Ctrl+{index + 1}"), self)
            shortcut.activated.connect(lambda target=index: self._show(target))

    def _connect(self) -> None:
        self.dashboard.createClass.connect(self._create_class)
        self.dashboard.openClass.connect(self._open_class)
        self.dashboard.editClass.connect(self._edit_class)
        self.dashboard.deleteClass.connect(self._delete_class)
        self.dashboard.openSchedule.connect(self._open_schedule)
        self.editor.back.connect(lambda: self._show(DASHBOARD))
        self.editor.notify.connect(self._notify)
        self.schedule.notify.connect(self._notify)
        self.settings_page.notify.connect(self._notify)
        self._state.configChanged.connect(self._on_config_changed)
        self._state.classesChanged.connect(self._on_data_changed)
        self._state.timetableChanged.connect(self._on_data_changed)

    # ── Navigation ──────────────────────────────────────────────────────────
    def _show(self, index: int) -> None:
        self._stack.setCurrentIndex(index)
        for position, button in self._nav.items():
            button.setChecked(position == index)
            button.setProperty("active", "true" if position == index else "false")
            self._restyle(button)

    def _open_class(self, class_id: str) -> None:
        self.editor.open_class(class_id)
        self._show(EDITOR)

    def _open_schedule(self, class_id: str) -> None:
        self._show(SCHEDULE)
        self.schedule.show_class(class_id)

    # ── Classes ─────────────────────────────────────────────────────────────
    def _create_class(self) -> None:
        dialog = ClassDialog(
            t=self._state.t,
            subjects=self._state.available_subjects(),
            cycles=self._state.available_cycles(),
            parent=self,
        )
        if dialog.exec() != ClassDialog.DialogCode.Accepted:
            return
        self._state.repository.add_class(dialog.values())
        self._state.notify_classes_changed()
        self._notify(self._state.t("message.saved"))

    def _edit_class(self, class_id: str) -> None:
        info = self._state.repository.class_by_id(class_id)
        if info is None:
            return
        dialog = ClassDialog(
            t=self._state.t,
            subjects=self._state.available_subjects(),
            cycles=self._state.available_cycles(),
            info=info,
            parent=self,
        )
        if dialog.exec() != ClassDialog.DialogCode.Accepted:
            return
        self._state.repository.update_class(dialog.values())
        self._state.notify_classes_changed()

    def _delete_class(self, class_id: str) -> None:
        info = self._state.repository.class_by_id(class_id)
        if info is None:
            return
        t = self._state.t
        dialog = ConfirmDialog(
            title=t("confirm.delete_class.title"),
            body=f"{info.name} — {t('confirm.delete_class.body')}",
            t=t,
            parent=self,
        )
        if dialog.exec() != ConfirmDialog.DialogCode.Accepted:
            return
        self._state.repository.delete_class(class_id)
        self._state.notify_classes_changed()
        self._state.notify_timetable_changed()

    # ── Réactions ───────────────────────────────────────────────────────────
    def _on_config_changed(self) -> None:
        self.retranslate()

    def _on_data_changed(self) -> None:
        if self._stack.currentIndex() == SCHEDULE:
            self.schedule.refresh()

    def retranslate(self) -> None:
        t = self._state.t
        self.setWindowTitle(t("app.title"))
        self._brand.setText(t("app.title"))
        subtitle = self._state.config.establishment_name
        self._brand_sub.setText(subtitle)
        compact = self._is_compact
        self._sidebar.setFixedWidth(76 if compact else 232)
        self._brand.setVisible(not compact)
        self._brand_sub.setVisible(bool(subtitle) and not compact)
        nav_keys = ("nav.dashboard", "nav.editor", "nav.schedule", "nav.settings", "nav.help")
        for index, key in enumerate(nav_keys):
            self._nav[index].setText("" if compact else t(key))
            self._nav[index].setToolTip(t(key))
            self._nav[index].setIcon(icon(NAV_ITEMS[index][1], self._icon_colour, 18))
        dark = self._state.is_dark
        self._theme_button.setToolTip(t("settings.theme.dark") if not dark else t("settings.theme.light"))
        self._theme_button.setText("")
        self._theme_button.setIcon(icon("moon" if not dark else "sun", self._icon_colour, 18))
        self._theme_button.setIconSize(QSize(18, 18))
        for page in (self.dashboard, self.editor, self.schedule, self.settings_page, self.help_page):
            refresh = getattr(page, "retranslate", None) or getattr(page, "refresh", None)
            if callable(refresh):
                refresh()

    @property
    def _icon_colour(self) -> str:
        return "#d9c7b4" if self._state.is_dark else "#6e5a49"

    def _notify(self, text: str) -> None:
        self._toast.show_message(text)

    @staticmethod
    def _restyle(widget: QWidget) -> None:
        widget.style().unpolish(widget)
        widget.style().polish(widget)
        widget.update()

    # ── Cycle de vie ────────────────────────────────────────────────────────
    def resizeEvent(self, event) -> None:  # noqa: N802 - API Qt
        super().resizeEvent(event)
        compact = self.width() < COMPACT_WIDTH
        if compact == self._is_compact and self._sidebar.width() == (76 if compact else 232):
            return
        self._is_compact = compact
        self.retranslate()

    def closeEvent(self, event) -> None:  # noqa: N802 - API Qt
        self.editor.flush()  # la dernière saisie part avant la fermeture
        super().closeEvent(event)
