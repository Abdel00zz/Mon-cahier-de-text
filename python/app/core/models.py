"""Modèles du domaine — validation stricte, aucune dépendance à Qt ni à SQLite.

Les modèles sont immuables dans l'esprit : une modification produit une copie
(``model_copy(update=…)``). Cela évite les mutations invisibles entre l'édition
et l'enregistrement, principale source de bugs dans une application de saisie.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ── Vocabulaire ──────────────────────────────────────────────────────────────


class Cycle(StrEnum):
    COLLEGE = "college"
    LYCEE = "lycee"
    PREPA = "prepa"


class Theme(StrEnum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


class TextSize(StrEnum):
    SM = "sm"
    MD = "md"
    LG = "lg"
    XL = "xl"


class Locale(StrEnum):
    FR = "fr"
    AR = "ar"
    EN = "en"


class ContentKind(StrEnum):
    """Nature d'une ligne du cahier.

    Les trois premières valeurs sont les seules lignes *structurelles* (elles
    portent la numérotation du plan) ; les suivantes sont des éléments de cours
    ou des évaluations.
    """

    CHAPTER = "chapter"
    SECTION = "section"
    SUBSECTION = "subsection"
    SUBSUBSECTION = "subsubsection"
    TEXT = "text"
    DEFINITION = "definition"
    THEOREM = "theorem"
    PROPERTY = "property"
    EXAMPLE = "example"
    EXERCISE = "exercise"
    ACTIVITY = "activity"
    APPLICATION = "application"
    REMARK = "remark"
    HOMEWORK = "homework"
    EVALUATION = "evaluation"


STRUCTURAL_KINDS: frozenset[ContentKind] = frozenset(
    {ContentKind.CHAPTER, ContentKind.SECTION, ContentKind.SUBSECTION, ContentKind.SUBSUBSECTION}
)

#: Profondeur de chaque niveau structurel (0 = chapitre).
DEPTH: dict[ContentKind, int] = {
    ContentKind.CHAPTER: 0,
    ContentKind.SECTION: 1,
    ContentKind.SUBSECTION: 2,
    ContentKind.SUBSUBSECTION: 3,
}

#: Types qui portent déjà leur numéro dans leur titre (« Contrôle continu 2 »).
EVALUATION_KINDS = frozenset({ContentKind.EVALUATION})

NonEmpty = Annotated[str, Field(min_length=1, max_length=200)]


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def _clean(value: str) -> str:
    """Retire les espaces de bord et normalise les espaces internes multiples."""
    return " ".join(value.split())


# ── Classe ───────────────────────────────────────────────────────────────────


class ClassInfo(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(default_factory=new_id)
    name: NonEmpty
    teacher_name: str = Field(default="", max_length=120)
    subject: str = Field(default="", max_length=80)
    color: str = Field(default="", max_length=24)  # « class-hue:210 » ou vide
    cycle: Cycle | None = None
    level: str = Field(default="", max_length=40)
    group: str = Field(default="", max_length=8)
    created_at: datetime = Field(default_factory=datetime.now)

    @field_validator("name", "teacher_name", "subject", "level")
    @classmethod
    def _squash(cls, value: str) -> str:
        return _clean(value)

    @property
    def full_name(self) -> str:
        """« 1 PCSI · Groupe 2 » — le nom tel qu'il est lu par l'enseignant."""
        parts = [self.name]
        if self.group:
            parts.append(f"Groupe {self.group}")
        return " · ".join(parts)

    @property
    def menu_label(self) -> str:
        """Libellé compact pour une liste déroulante."""
        return f"{self.name} — {self.subject}" if self.subject else self.name


# ── Emploi du temps ──────────────────────────────────────────────────────────


class TimetableSlot(BaseModel):
    """Créneau hebdomadaire : un jour (1 = lundi) et une position dans la journée."""

    day: int = Field(ge=1, le=6)
    slot: int = Field(ge=0, le=23)
    class_id: str


class ClockSlot(BaseModel):
    """Bornes horaires d'une position de la grille, en minutes depuis minuit."""

    index: int
    start_min: int = Field(ge=0, le=24 * 60)
    end_min: int = Field(ge=0, le=24 * 60)
    lunch_before: bool = False

    @property
    def label(self) -> str:
        return f"{_hhmm(self.start_min)} – {_hhmm(self.end_min)}"

    @property
    def duration_min(self) -> int:
        return max(0, self.end_min - self.start_min)


def _hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


# ── Cahier ───────────────────────────────────────────────────────────────────


class ContentItem(BaseModel):
    """Une ligne du cahier : structure du plan, élément de cours ou évaluation."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(default_factory=new_id)
    kind: ContentKind = ContentKind.TEXT
    text: str = Field(default="", max_length=4000)
    #: Numéro saisi à la main : il prime sur le calcul et fait avancer le compteur.
    manual_number: str | None = Field(default=None, max_length=12)
    children: list[ContentItem] = Field(default_factory=list)

    @field_validator("text")
    @classmethod
    def _squash(cls, value: str) -> str:
        return _clean(value)

    @field_validator("manual_number")
    @classmethod
    def _number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @property
    def is_structural(self) -> bool:
        return self.kind in STRUCTURAL_KINDS


ContentItem.model_rebuild()


class Session(BaseModel):
    """Une séance du cahier : une date, un contenu, une remarque."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(default_factory=new_id)
    class_id: str
    date: date
    remark: str = Field(default="", max_length=400)
    homework: str = Field(default="", max_length=400)
    items: list[ContentItem] = Field(default_factory=list)

    @field_validator("remark", "homework")
    @classmethod
    def _squash(cls, value: str) -> str:
        return _clean(value)

    def walk(self) -> list[tuple[ContentItem, tuple[int, ...]]]:
        """Parcours préfixe du plan : chaque élément avec son chemin d'indices."""
        found: list[tuple[ContentItem, tuple[int, ...]]] = []

        def visit(items: list[ContentItem], path: tuple[int, ...]) -> None:
            for index, item in enumerate(items):
                here = (*path, index)
                found.append((item, here))
                visit(item.children, here)

        visit(self.items, ())
        return found


# ── Configuration ────────────────────────────────────────────────────────────


class AppConfig(BaseModel):
    """Réglages persistés — un seul document, relu au démarrage."""

    model_config = ConfigDict(str_strip_whitespace=True)

    establishment_name: str = Field(default="", max_length=160)
    default_teacher_name: str = Field(default="", max_length=120)
    academy_region: str = Field(default="", max_length=120)
    education_province: str = Field(default="", max_length=120)
    selected_subjects: list[str] = Field(default_factory=list)
    cycles: list[Cycle] = Field(default_factory=list)
    theme: Theme = Theme.SYSTEM
    app_text_size: TextSize = TextSize.MD
    locale: Locale = Locale.AR
    school_year_start: date = Field(default_factory=lambda: date(date.today().year, 9, 1))
    show_subject_on_cards: bool = True
    auto_numbering: bool = True
    structure_style: Literal["arabic", "roman"] = "roman"

    @field_validator("selected_subjects", "cycles")
    @classmethod
    def _unique(cls, value: list) -> list:
        seen: list = []
        for item in value:
            if item not in seen:
                seen.append(item)
        return seen


# ── Archives ─────────────────────────────────────────────────────────────────


class ArchiveMeta(BaseModel):
    """Métadonnées d'une archive annuelle (le contenu vit dans `backup`)."""

    id: str = Field(default_factory=new_id)
    year_label: str
    class_count: int = 0
    session_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)


class Workspace(BaseModel):
    """Photo complète d'un espace de travail — unité de sauvegarde et d'archive."""

    version: int = 1
    exported_at: datetime = Field(default_factory=datetime.now)
    config: AppConfig = Field(default_factory=AppConfig)
    classes: list[ClassInfo] = Field(default_factory=list)
    timetable: list[TimetableSlot] = Field(default_factory=list)
    sessions: list[Session] = Field(default_factory=list)
    archives: list[ArchiveMeta] = Field(default_factory=list)
