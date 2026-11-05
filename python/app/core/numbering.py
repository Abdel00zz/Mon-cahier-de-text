"""Numérotation pédagogique du cahier.

Deux conventions cohabitent, comme dans un manuel scolaire marocain :

* le **plan** — chapitre, section, sous-section, sous-sous-section — numéroté
  ``I``, ``A``, ``1°``, ``a)`` (ou ``1``, ``1.1``, ``1.1.1`` en style arabe) ;
* les **éléments de cours** — définition, théorème, exemple, exercice — qui
  possèdent chacun leur compteur, remis à zéro à chaque chapitre.

Un numéro saisi à la main prime toujours sur le calcul *et* fait avancer le
compteur : sans cela, la suite automatique contredirait la saisie.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .models import DEPTH, ContentItem, ContentKind, Session

_ROMAN_TABLE: tuple[tuple[int, str], ...] = (
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
    (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
)


def roman(value: int) -> str:
    """Chiffres romains usuels (1 → I … 3999 → MMMCMXCIX)."""
    if not isinstance(value, int) or value < 1 or value > 3999:
        return str(value)
    remaining, out = value, []
    for amount, symbol in _ROMAN_TABLE:
        while remaining >= amount:
            out.append(symbol)
            remaining -= amount
    return "".join(out)


def letters(value: int) -> str:
    """A, B … Z, AA, AB … (comme les colonnes d'un tableur)."""
    if value < 1:
        return str(value)
    out: list[str] = []
    while value > 0:
        value, rest = divmod(value - 1, 26)
        out.append(chr(ord("A") + rest))
    return "".join(reversed(out))


def small_letters(value: int) -> str:
    """a), b) … — le niveau le plus fin du plan."""
    return f"{letters(value).lower()})"


@dataclass(frozen=True, slots=True)
class PlanNumbers:
    """Numéros affichés, indexés par ``id`` d'élément."""

    values: dict[str, str] = field(default_factory=dict)

    def of(self, item: ContentItem) -> str:
        return self.values.get(item.id, "")


def build_plan_numbers(session: Session, *, style: str = "roman", enabled: bool = True) -> PlanNumbers:
    """Calcule les numéros du plan et des éléments de cours d'une séance.

    ``style`` vaut ``"roman"`` (I / A / 1° / a)) ou ``"arabic"`` (1 / 1.1 / …).
    """
    numbers: dict[str, str] = {}
    if not enabled:
        return PlanNumbers(numbers)

    # 1. Numérotation du plan, profondeur par profondeur.
    counters = [0, 0, 0, 0]

    def label(depth: int, position: int) -> str:
        if style == "arabic":
            return ".".join(str(counters[i]) for i in range(depth + 1))
        return (
            roman(position) if depth == 0
            else letters(position) if depth == 1
            else f"{position}°" if depth == 2
            else small_letters(position)
        )

    def visit(items: list[ContentItem]) -> None:
        for item in items:
            if item.is_structural:
                depth = DEPTH[item.kind]
                counters[depth] += 1
                for deeper in range(depth + 1, len(counters)):
                    counters[deeper] = 0
                numbers[item.id] = item.manual_number or label(depth, counters[depth])
            visit(item.children)

    visit(session.items)

    # 2. Éléments de cours : un compteur par nature, par chapitre.
    chapter = 0
    by_kind: dict[tuple[int, ContentKind], int] = {}

    def visit_items(items: list[ContentItem]) -> None:
        nonlocal chapter
        for item in items:
            if item.kind is ContentKind.CHAPTER:
                chapter += 1
            if not item.is_structural and item.kind not in {ContentKind.TEXT}:
                key = (chapter, item.kind)
                if item.manual_number:
                    numbers[item.id] = item.manual_number
                    parsed = _trailing_int(item.manual_number)
                    if parsed is not None and parsed > by_kind.get(key, 0):
                        by_kind[key] = parsed
                else:
                    by_kind[key] = by_kind.get(key, 0) + 1
                    numbers[item.id] = str(by_kind[key])
            visit_items(item.children)

    visit_items(session.items)
    return PlanNumbers(numbers)


def _trailing_int(value: str) -> int | None:
    tail = value.replace("(", " ").replace(")", " ").replace(".", " ").split()
    for part in reversed(tail):
        if part.isdigit():
            return int(part)
    return None


#: Libellés courts affichés dans la colonne « nature » de l'éditeur.
KIND_LABELS: dict[ContentKind, dict[str, str]] = {
    ContentKind.CHAPTER: {"fr": "Chapitre", "ar": "درس", "en": "Chapter"},
    ContentKind.SECTION: {"fr": "Section", "ar": "فرع", "en": "Section"},
    ContentKind.SUBSECTION: {"fr": "Sous-section", "ar": "فقرة", "en": "Sub-section"},
    ContentKind.SUBSUBSECTION: {"fr": "Paragraphe", "ar": "بند", "en": "Paragraph"},
    ContentKind.TEXT: {"fr": "Texte", "ar": "نص", "en": "Text"},
    ContentKind.DEFINITION: {"fr": "Définition", "ar": "تعريف", "en": "Definition"},
    ContentKind.THEOREM: {"fr": "Théorème", "ar": "مبرهنة", "en": "Theorem"},
    ContentKind.PROPERTY: {"fr": "Propriété", "ar": "خاصية", "en": "Property"},
    ContentKind.EXAMPLE: {"fr": "Exemple", "ar": "مثال", "en": "Example"},
    ContentKind.EXERCISE: {"fr": "Exercice", "ar": "تمرين", "en": "Exercise"},
    ContentKind.ACTIVITY: {"fr": "Activité", "ar": "نشاط", "en": "Activity"},
    ContentKind.APPLICATION: {"fr": "Application", "ar": "تطبيق", "en": "Application"},
    ContentKind.REMARK: {"fr": "Remarque", "ar": "ملاحظة", "en": "Remark"},
    ContentKind.HOMEWORK: {"fr": "Devoir", "ar": "عمل منزلي", "en": "Homework"},
    ContentKind.EVALUATION: {"fr": "Évaluation", "ar": "تقويم", "en": "Assessment"},
}


def kind_label(kind: ContentKind, locale: str) -> str:
    return KIND_LABELS[kind].get(locale, KIND_LABELS[kind]["fr"])
