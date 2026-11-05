"""Fumée d'interface : la fenêtre se construit, navigue, crée et enregistre.

Ces tests s'exécutent sans écran (`QT_QPA_PLATFORM=offscreen`) : ils vérifient
le câblage réel entre les pages et l'état, pas seulement le domaine.
"""

from __future__ import annotations

from datetime import date

import pytest
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QApplication

from app.core.models import ClassInfo, Locale, Theme
from app.data.repository import Repository
from app.state import AppState
from app.ui.main_window import DASHBOARD, EDITOR, HELP, SCHEDULE, SETTINGS, MainWindow
from app.ui.theme import apply_theme


@pytest.fixture
def state(repository: Repository) -> AppState:
    application = QApplication.instance()
    assert isinstance(application, QApplication)
    instance = AppState(repository)
    instance.update_config(locale=Locale.FR)
    apply_theme(application, dark=False, size=instance.config.app_text_size, rtl=False)
    return instance


@pytest.fixture
def window(qtbot, state: AppState) -> MainWindow:
    built = MainWindow(state)
    qtbot.addWidget(built)
    built.show()
    qtbot.waitExposed(built)
    return built


def test_window_builds_every_page(window: MainWindow) -> None:
    assert window._stack.count() == 5  # noqa: SLF001 - vérification du câblage
    assert window._stack.currentIndex() == DASHBOARD  # noqa: SLF001


def test_navigation_switches_pages(window: MainWindow) -> None:
    for index in (EDITOR, SCHEDULE, SETTINGS, HELP, DASHBOARD):
        window._show(index)  # noqa: SLF001
        assert window._stack.currentIndex() == index  # noqa: SLF001


def test_creating_a_class_reaches_every_page(qtbot, window: MainWindow, state: AppState) -> None:
    state.repository.add_class(ClassInfo(name="1 PCSI", subject="Mathématiques"))
    state.notify_classes_changed()
    qtbot.wait(10)

    assert len(state.classes()) == 1
    assert window.dashboard._stack.currentIndex() == 0  # noqa: SLF001 - cartes visibles


def test_opening_a_class_loads_the_notebook(qtbot, window: MainWindow, state: AppState) -> None:
    info = state.repository.add_class(ClassInfo(name="2 TSI", subject="Physique"))
    state.notify_classes_changed()

    window._open_class(info.id)  # noqa: SLF001
    qtbot.wait(10)

    assert window._stack.currentIndex() == EDITOR  # noqa: SLF001
    assert window.editor._class is not None  # noqa: SLF001
    assert window.editor._stack.currentIndex() == 0  # noqa: SLF001 - cahier affiché


def test_new_chapter_is_numbered_and_saved(qtbot, window: MainWindow, state: AppState) -> None:
    info = state.repository.add_class(ClassInfo(name="3 TCO", subject="Informatique"))
    state.notify_classes_changed()
    window._open_class(info.id)  # noqa: SLF001

    window.editor._create_session()  # noqa: SLF001
    qtbot.wait(10)
    window.editor._add_item("chapter")  # noqa: SLF001
    qtbot.wait(10)

    session = window.editor._session  # noqa: SLF001
    assert session is not None
    assert len(session.items) == 1

    window.editor.flush()
    stored = state.repository.find_session(info.id, date.today())
    assert stored is not None
    assert len(stored.items) == 1


def test_schedule_page_shows_the_assigned_cell(qtbot, window: MainWindow, state: AppState) -> None:
    info = state.repository.add_class(ClassInfo(name="1 A", subject="Mathématiques"))
    state.repository.assign_slot(1, 2, info.id)
    state.notify_timetable_changed()
    window._show(SCHEDULE)  # noqa: SLF001
    qtbot.wait(10)

    table = window.schedule._table  # noqa: SLF001
    item = table.item(0, 2)
    assert item is not None
    assert "1 A" in item.text()


def test_theme_toggle_is_persisted(qtbot, window: MainWindow, state: AppState) -> None:
    state.set_theme(Theme.DARK)
    state.refresh_theme()
    qtbot.wait(10)

    assert state.is_dark is True
    assert state.repository.config().theme.value == "dark"
    assert window._theme_button.toolTip()  # noqa: SLF001


def test_narrow_window_compacts_the_rail(qtbot, window: MainWindow) -> None:
    window.resize(780, 640)
    qtbot.wait(20)

    assert window._is_compact is True  # noqa: SLF001
    assert window._sidebar.width() == 76  # noqa: SLF001

    window.resize(1180, 800)
    qtbot.wait(20)
    assert window._is_compact is False  # noqa: SLF001
    assert window._sidebar.width() == 232  # noqa: SLF001


def test_arabic_switches_layout_direction(qtbot, state: AppState) -> None:
    state.set_locale(Locale.AR)
    qtbot.wait(10)

    application = QApplication.instance()
    assert application is not None
    assert application.layoutDirection() == Qt.LayoutDirection.RightToLeft
