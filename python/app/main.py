"""Point d'entrée de l'application de bureau.

Aucune dépendance au réseau : la base SQLite est créée dans le dossier de
données de l'utilisateur au premier lancement, puis rouverte à chaque session.
"""

from __future__ import annotations

import sys

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QApplication

from .core.models import Theme
from .data.database import Database
from .data.repository import Repository
from .paths import database_path
from .state import AppState
from .ui.main_window import MainWindow
from .ui.theme import apply_theme, load_project_fonts


def _toggle_theme(state: AppState) -> None:
    state.set_theme(Theme.LIGHT if state.is_dark else Theme.DARK)


def main() -> int:
    QApplication.setApplicationName("Cahier de textes")
    QApplication.setOrganizationName("CahierDeTextes")
    QApplication.setHighDpiScaleFactorRoundingPolicy(Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)

    app = QApplication(sys.argv)
    load_project_fonts()

    database = Database(database_path())
    state = AppState(Repository(database))
    apply_theme(app, dark=state.is_dark, size=state.config.app_text_size, rtl=state.is_rtl)
    app.setLayoutDirection(
        Qt.LayoutDirection.RightToLeft if state.is_rtl else Qt.LayoutDirection.LeftToRight
    )

    window = MainWindow(state)
    window.themeToggled.connect(lambda: _toggle_theme(state))
    window.show()

    try:
        code = app.exec()
    finally:
        database.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
