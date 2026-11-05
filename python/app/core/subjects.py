"""Référentiel des matières et des niveaux.

Les libellés sont doublés en français et en arabe : la matière est choisie une
fois, puis affichée dans la langue de l'interface. L'ordre suit le bulletin
officiel (matières scientifiques, puis littéraires, puis transversales).
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import Cycle


@dataclass(frozen=True, slots=True)
class Subject:
    key: str
    fr: str
    ar: str
    cycles: tuple[Cycle, ...] = ()


_ALL = (Cycle.COLLEGE, Cycle.LYCEE, Cycle.PREPA)

SUBJECT_CATALOGUE: tuple[Subject, ...] = (
    Subject("math", "Mathématiques", "الرياضيات", _ALL),
    Subject("physique", "Physique — Chimie", "الفيزياء والكيمياء", (Cycle.LYCEE, Cycle.PREPA)),
    Subject("svt", "Sciences de la vie et de la Terre", "علوم الحياة والأرض", (Cycle.COLLEGE, Cycle.LYCEE)),
    Subject("techno", "Sciences de l'ingénieur", "علوم المهندس", (Cycle.LYCEE, Cycle.PREPA)),
    Subject("eco", "Sciences économiques", "العلوم الاقتصادية والتدبير", (Cycle.LYCEE,)),
    Subject("info", "Informatique", "المعلوميات", _ALL),
    Subject("francais", "Français", "اللغة الفرنسية", _ALL),
    Subject("arabe", "Arabe", "اللغة العربية", _ALL),
    Subject("anglais", "Anglais", "اللغة الإنجليزية", _ALL),
    Subject("philo", "Philosophie", "الفلسفة", (Cycle.LYCEE,)),
    Subject("islamique", "Éducation islamique", "التربية الإسلامية", (Cycle.COLLEGE, Cycle.LYCEE)),
    Subject("histoire", "Histoire — Géographie", "التاريخ والجغرافيا", (Cycle.COLLEGE, Cycle.LYCEE)),
    Subject("eps", "Éducation physique", "التربية البدنية", _ALL),
)

#: Libellés affichés, dans l'ordre du catalogue (français par défaut).
SUBJECTS: tuple[str, ...] = tuple(subject.fr for subject in SUBJECT_CATALOGUE)

_BY_FR = {subject.fr: subject for subject in SUBJECT_CATALOGUE}
_BY_AR = {subject.ar: subject for subject in SUBJECT_CATALOGUE}


def subject_label(value: str, locale: str) -> str:
    """Libellé localisé d'une matière, tolérant aux saisies libres."""
    subject = _BY_FR.get(value) or _BY_AR.get(value)
    if subject is None:
        return value
    return subject.ar if locale == "ar" else subject.fr


def subjects_for_cycle(cycle: Cycle | None) -> tuple[str, ...]:
    if cycle is None:
        return SUBJECTS
    return tuple(subject.fr for subject in SUBJECT_CATALOGUE if cycle in subject.cycles)


#: Niveaux proposés par cycle — le professeur peut toujours saisir autre chose.
LEVELS: dict[Cycle, tuple[str, ...]] = {
    Cycle.COLLEGE: ("1AC", "2AC", "3AC"),
    Cycle.LYCEE: ("Tronc commun", "1er Bac", "2ème Bac"),
    Cycle.PREPA: ("1ère année", "2ème année"),
}
