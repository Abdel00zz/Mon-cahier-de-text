"""État applicatif partagé.

Une seule instance relie les pages : la configuration, le dépôt et les signaux
de rafraîchissement. Quand une classe est créée dans une page, les autres se
mettent à jour sans que l'appelant ait à les connaître.
"""

from __future__ import annotations

from PyQt6.QtCore import QObject, Qt, pyqtSignal
from PyQt6.QtWidgets import QApplication

from .core.i18n import Translator
from .core.models import AppConfig, ClassInfo, Cycle, Locale, TextSize, Theme
from .core.palette import Palette, build_palette_map
from .core.subjects import SUBJECTS
from .data.repository import Repository
from .ui.theme import apply_theme


class AppState(QObject):
    configChanged = pyqtSignal()
    classesChanged = pyqtSignal()
    timetableChanged = pyqtSignal()

    def __init__(self, repository: Repository, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self.repository = repository
        self._config = repository.config()
        # Une seule règle : toute modification de réglage réapplique la charte
        # (couleurs, taille de texte, sens de lecture). Aucune page n'a à y penser.
        self.configChanged.connect(self.refresh_theme)

    # ── Configuration ───────────────────────────────────────────────────────
    @property
    def config(self) -> AppConfig:
        return self._config

    def update_config(self, **changes: object) -> None:
        self._config = self._config.model_copy(update=changes)
        self.repository.save_config(self._config)
        self.configChanged.emit()

    def reload_config(self) -> None:
        """Relit la configuration en base — utilisé après une restauration."""
        self._config = self.repository.config()
        self.configChanged.emit()

    @property
    def translator(self) -> Translator:
        return Translator(self._config.locale)

    def t(self, key: str, **values: object) -> str:
        return self.translator(key, **values)

    @property
    def is_dark(self) -> bool:
        if self._config.theme is Theme.DARK:
            return True
        if self._config.theme is Theme.LIGHT:
            return False
        hints = QApplication.styleHints()
        return hints.colorScheme().name.lower() == "dark"

    @property
    def is_rtl(self) -> bool:
        return self._config.locale is Locale.AR

    def set_locale(self, locale: Locale) -> None:
        self.update_config(locale=locale)

    def set_theme(self, theme: Theme) -> None:
        self.update_config(theme=theme)

    def set_text_size(self, size: TextSize) -> None:
        self.update_config(app_text_size=size)

    def available_subjects(self) -> list[str]:
        return list(self._config.selected_subjects) or list(SUBJECTS)

    def available_cycles(self) -> list[Cycle]:
        return list(self._config.cycles) or list(Cycle)

    # ── Données ─────────────────────────────────────────────────────────────
    def classes(self) -> list[ClassInfo]:
        return self.repository.classes()

    def palette_map(self, classes: list[ClassInfo] | None = None) -> dict[str, Palette]:
        items = classes if classes is not None else self.classes()
        return build_palette_map([(info.id, info.color, info.subject) for info in items])

    def notify_classes_changed(self) -> None:
        self.classesChanged.emit()

    def notify_timetable_changed(self) -> None:
        self.timetableChanged.emit()

    # ── Apparence ───────────────────────────────────────────────────────────
    def refresh_theme(self) -> None:
        app = QApplication.instance()
        if app is None:
            return
        apply_theme(app, dark=self.is_dark, size=self._config.app_text_size, rtl=self.is_rtl)
        app.setLayoutDirection(
            Qt.LayoutDirection.RightToLeft if self.is_rtl else Qt.LayoutDirection.LeftToRight
        )
