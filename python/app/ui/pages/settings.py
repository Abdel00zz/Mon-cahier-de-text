"""Réglages : identité, matières, apparence, langue, données.

Chaque changement est enregistré immédiatement : aucun bouton « Enregistrer »
à oublier, aucun formulaire perdu en fermant la fenêtre. Les sections sont
courtes et nommées une seule fois (pas de sous-titre qui répète le titre).
"""

from __future__ import annotations

from pathlib import Path

from PyQt6.QtCore import QDate, Qt, pyqtSignal
from PyQt6.QtWidgets import (
    QButtonGroup,
    QCheckBox,
    QDateEdit,
    QFileDialog,
    QFormLayout,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from ...core.models import Locale, TextSize, Theme
from ...core.subjects import SUBJECTS
from ...data import backup
from ...paths import data_dir
from ...state import AppState


class Section(QFrame):
    """Bloc de réglages : un titre, puis des lignes."""

    def __init__(self, title: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setProperty("card", "true")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(12)
        heading = QLabel(title)
        heading.setObjectName("sectionTitle")
        layout.addWidget(heading)
        self.heading = heading
        self.body = QFormLayout()
        self.body.setSpacing(10)
        self.body.setLabelAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        layout.addLayout(self.body)

    def add_row(self, label: str, widget: QWidget) -> QLabel:
        caption = QLabel(label)
        caption.setProperty("field", "true")
        self.body.addRow(caption, widget)
        return caption


class SettingsPage(QWidget):
    notify = pyqtSignal(str)

    def __init__(self, state: AppState, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._state = state
        self._building = False
        self._captions: list[tuple[QLabel, str]] = []

        outer = QVBoxLayout(self)
        outer.setContentsMargins(24, 20, 24, 12)
        outer.setSpacing(12)

        self._title = QLabel()
        self._title.setObjectName("pageTitle")
        outer.addWidget(self._title)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        canvas = QWidget()
        column = QVBoxLayout(canvas)
        self._column = column
        column.setSpacing(14)
        scroll.setWidget(canvas)
        outer.addWidget(scroll, 1)

        # ── Identité ────────────────────────────────────────────────────────
        self._identity = Section("")
        self.teacher = QLineEdit()
        self.teacher.textEdited.connect(lambda value: self._state.update_config(default_teacher_name=value))
        self._row(self._identity, "settings.teacher", self.teacher)
        self.establishment = QLineEdit()
        self.establishment.textEdited.connect(lambda value: self._state.update_config(establishment_name=value))
        self._row(self._identity, "settings.establishment", self.establishment)
        self.academy = QLineEdit()
        self.academy.textEdited.connect(lambda value: self._state.update_config(academy_region=value))
        self._row(self._identity, "settings.academy", self.academy)
        self.province = QLineEdit()
        self.province.textEdited.connect(lambda value: self._state.update_config(education_province=value))
        self._row(self._identity, "settings.province", self.province)
        column.addWidget(self._identity)

        # ── Matières ────────────────────────────────────────────────────────
        self._subjects = Section("")
        subjects_host = QWidget()
        subjects_layout = QGridLayout(subjects_host)
        subjects_layout.setContentsMargins(0, 0, 0, 0)
        subjects_layout.setHorizontalSpacing(18)
        subjects_layout.setVerticalSpacing(4)
        self._subject_boxes: dict[str, QCheckBox] = {}
        for position, subject in enumerate(SUBJECTS):
            box = QCheckBox(subject)
            box.toggled.connect(self._subjects_changed)
            subjects_layout.addWidget(box, position // 2, position % 2)
            self._subject_boxes[subject] = box
        column.addWidget(self._subjects)
        self._subjects.body.addRow(subjects_host)

        # ── Apparence ───────────────────────────────────────────────────────
        self._appearance = Section("")
        themes = QWidget()
        themes_layout = QHBoxLayout(themes)
        themes_layout.setContentsMargins(0, 0, 0, 0)
        themes_layout.setSpacing(6)
        self._theme_group = QButtonGroup(self)
        self._theme_buttons: dict[Theme, QPushButton] = {}
        for theme in Theme:
            button = QPushButton()
            button.setCheckable(True)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.clicked.connect(lambda _checked=False, value=theme: self._set_theme(value))
            themes_layout.addWidget(button)
            self._theme_group.addButton(button)
            self._theme_buttons[theme] = button
        themes_layout.addStretch(1)
        self._row(self._appearance, "settings.theme", themes)

        sizes = QWidget()
        sizes_layout = QHBoxLayout(sizes)
        sizes_layout.setContentsMargins(0, 0, 0, 0)
        sizes_layout.setSpacing(6)
        self._size_buttons: dict[TextSize, QPushButton] = {}
        for size in TextSize:
            button = QPushButton()
            button.setCheckable(True)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.clicked.connect(lambda _checked=False, value=size: self._set_size(value))
            sizes_layout.addWidget(button)
            self._size_buttons[size] = button
        sizes_layout.addStretch(1)
        self._row(self._appearance, "settings.text_size", sizes)

        languages = QWidget()
        languages_layout = QHBoxLayout(languages)
        languages_layout.setContentsMargins(0, 0, 0, 0)
        languages_layout.setSpacing(6)
        self._locale_buttons: dict[Locale, QPushButton] = {}
        names = {Locale.FR: "Français", Locale.AR: "العربية", Locale.EN: "English"}
        for locale, label in names.items():
            button = QPushButton(label)
            button.setCheckable(True)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.clicked.connect(lambda _checked=False, value=locale: self._set_locale(value))
            languages_layout.addWidget(button)
            self._locale_buttons[locale] = button
        languages_layout.addStretch(1)
        self._row(self._appearance, "settings.language", languages)
        column.addWidget(self._appearance)

        # ── Données ─────────────────────────────────────────────────────────
        self._data = Section("")
        actions = QWidget()
        actions_layout = QHBoxLayout(actions)
        actions_layout.setContentsMargins(0, 0, 0, 0)
        actions_layout.setSpacing(6)
        self._export_button = QPushButton()
        self._export_button.setCursor(Qt.CursorShape.PointingHandCursor)
        self._export_button.clicked.connect(self._export_backup)
        self._import_button = QPushButton()
        self._import_button.setCursor(Qt.CursorShape.PointingHandCursor)
        self._import_button.clicked.connect(self._import_backup)
        self._archive_button = QPushButton()
        self._archive_button.setCursor(Qt.CursorShape.PointingHandCursor)
        self._archive_button.clicked.connect(self._archive_year)
        for button in (self._export_button, self._import_button, self._archive_button):
            actions_layout.addWidget(button)
        actions_layout.addStretch(1)
        self._data.add_row("", actions)

        self._year = QDateEdit()
        self._year.setCalendarPopup(True)
        self._year.dateChanged.connect(self._year_changed)
        self._row(self._data, "settings.school_year", self._year)

        self._location = QLabel(str(data_dir()))
        self._location.setObjectName("hint")
        self._location.setWordWrap(True)
        self._data.add_row("", self._location)
        column.addWidget(self._data)

        column.addStretch(1)
        self._state.configChanged.connect(self._sync_widgets)
        self.retranslate()

    # ── Traduction ──────────────────────────────────────────────────────────
    def _row(self, section: Section, key: str, widget: QWidget) -> QLabel:
        caption = section.add_row("", widget)
        self._captions.append((caption, key))
        return caption

    def retranslate(self) -> None:
        t = self._state.t
        # La barre de défilement occupe un bord : on réserve la marge du bon côté.
        side = 8 if self._state.is_rtl else 0
        self._column.setContentsMargins(side, 0, 0 if self._state.is_rtl else 8, 16)
        self._title.setText(t("settings.heading"))
        self._identity.heading.setText(t("settings.identity"))
        self._subjects.heading.setText(t("settings.subjects"))
        self._appearance.heading.setText(t("settings.appearance"))
        self._data.heading.setText(t("data.heading"))
        for caption, key in self._captions:
            caption.setText(t(key))

        self._theme_buttons[Theme.LIGHT].setText(t("settings.theme.light"))
        self._theme_buttons[Theme.DARK].setText(t("settings.theme.dark"))
        self._theme_buttons[Theme.SYSTEM].setText(t("settings.theme.system"))
        self._size_buttons[TextSize.SM].setText(t("settings.size.sm"))
        self._size_buttons[TextSize.MD].setText(t("settings.size.md"))
        self._size_buttons[TextSize.LG].setText(t("settings.size.lg"))
        self._size_buttons[TextSize.XL].setText(t("settings.size.xl"))
        self._export_button.setText(t("data.export"))
        self._import_button.setText(t("data.import"))
        self._archive_button.setText(t("data.archive"))
        self._sync_widgets()

    # ── Synchronisation des widgets ─────────────────────────────────────────
    def _sync_widgets(self) -> None:
        config = self._state.config
        self._building = True
        try:
            self.teacher.setText(config.default_teacher_name)
            self.establishment.setText(config.establishment_name)
            self.academy.setText(config.academy_region)
            self.province.setText(config.education_province)

            selected = set(config.selected_subjects)
            for subject, box in self._subject_boxes.items():
                box.setChecked(subject in selected)
                box.setEnabled(True)

            for theme, button in self._theme_buttons.items():
                button.setChecked(config.theme is theme)
            for size, button in self._size_buttons.items():
                button.setChecked(config.app_text_size is size)
            for locale, button in self._locale_buttons.items():
                button.setChecked(config.locale is locale)

            self._year.blockSignals(True)
            start = config.school_year_start
            self._year.setDate(QDate(start.year, start.month, start.day))
            self._year.blockSignals(False)
            self._location.setText(f"{self._state.t('data.location')}  {data_dir()}")
        finally:
            self._building = False

    # ── Actions ─────────────────────────────────────────────────────────────
    def _subjects_changed(self) -> None:
        if self._building:
            return
        chosen = [subject for subject, box in self._subject_boxes.items() if box.isChecked()]
        self._state.update_config(selected_subjects=chosen)

    def _set_theme(self, theme: Theme) -> None:
        self._state.set_theme(theme)

    def _set_size(self, size: TextSize) -> None:
        self._state.set_text_size(size)

    def _set_locale(self, locale: Locale) -> None:
        self._state.set_locale(locale)

    def _year_changed(self, value: QDate) -> None:
        if self._building:
            return
        self._state.update_config(school_year_start=value.toPyDate())

    def _export_backup(self) -> None:
        suggested = backup.backup_path("cahier").name
        target, _selected = QFileDialog.getSaveFileName(self, self._state.t("data.export"), suggested, "JSON (*.json)")
        if not target:
            return
        backup.export_to_file(self._state.repository, Path(target))
        self.notify.emit(self._state.t("message.exported"))

    def _import_backup(self) -> None:
        source, _selected = QFileDialog.getOpenFileName(self, self._state.t("data.import"), "", "JSON (*.json)")
        if not source:
            return
        try:
            backup.import_from_file(self._state.repository, Path(source))
        except ValueError as error:
            self.notify.emit(f"{self._state.t('message.import_failed')} — {error}")
            return
        self._reload_after_import()
        self.notify.emit(self._state.t("message.imported"))

    def _archive_year(self) -> None:
        year = self._state.config.school_year_start
        label = f"{year.year}-{year.year + 1}"
        meta = self._state.repository.create_archive(label)
        backup.archive_to_file(self._state.repository, meta)
        self.notify.emit(self._state.t("data.archived", count=meta.class_count))

    def _reload_after_import(self) -> None:
        self._state.reload_config()
        self._state.notify_classes_changed()
        self._state.notify_timetable_changed()
        self._sync_widgets()
        self.retranslate()
