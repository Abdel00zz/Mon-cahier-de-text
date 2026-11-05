"""Numérotation : conventions du plan, compteurs par nature, priorité du manuel."""

from __future__ import annotations

from datetime import date

from app.core.models import ContentItem, ContentKind, Session
from app.core.numbering import build_plan_numbers, letters, roman, small_letters


def _session(*items: ContentItem) -> Session:
    return Session(class_id="c1", date=date(2026, 9, 7), items=list(items))


def test_roman_and_letters_follow_school_conventions() -> None:
    assert [roman(value) for value in (1, 4, 9, 14, 40)] == ["I", "IV", "IX", "XIV", "XL"]
    assert [letters(value) for value in (1, 26, 27, 52)] == ["A", "Z", "AA", "AZ"]
    assert small_letters(3) == "c)"
    assert roman(0) == "0"


def test_plan_uses_roman_letters_and_degree() -> None:
    chapter = ContentItem(kind=ContentKind.CHAPTER, text="Suites")
    section = ContentItem(kind=ContentKind.SECTION, text="Limites")
    subsection = ContentItem(kind=ContentKind.SUBSECTION, text="Opérations")
    chapter.children = [section]
    section.children = [subsection]

    numbers = build_plan_numbers(_session(chapter))

    assert numbers.of(chapter) == "I"
    assert numbers.of(section) == "A"
    assert numbers.of(subsection) == "1°"


def test_counters_reset_at_each_chapter() -> None:
    first = ContentItem(kind=ContentKind.CHAPTER, text="Un")
    first.children = [ContentItem(kind=ContentKind.SECTION, text="a"), ContentItem(kind=ContentKind.SECTION, text="b")]
    second = ContentItem(kind=ContentKind.CHAPTER, text="Deux")
    second.children = [ContentItem(kind=ContentKind.SECTION, text="c")]

    numbers = build_plan_numbers(_session(first, second))

    assert [numbers.of(child) for child in first.children] == ["A", "B"]
    assert numbers.of(second.children[0]) == "A"
    assert numbers.of(second) == "II"


def test_course_items_have_their_own_counter_per_chapter() -> None:
    chapter = ContentItem(kind=ContentKind.CHAPTER, text="Chapitre")
    definitions = [ContentItem(kind=ContentKind.DEFINITION, text=f"d{index}") for index in range(3)]
    exercise = ContentItem(kind=ContentKind.EXERCISE, text="ex")
    chapter.children = [*definitions, exercise]

    numbers = build_plan_numbers(_session(chapter))

    assert [numbers.of(item) for item in definitions] == ["1", "2", "3"]
    assert numbers.of(exercise) == "1"


def test_manual_number_wins_and_advances_the_counter() -> None:
    chapter = ContentItem(kind=ContentKind.CHAPTER, text="Chapitre")
    manual = ContentItem(kind=ContentKind.DEFINITION, text="manuel", manual_number="7")
    following = ContentItem(kind=ContentKind.DEFINITION, text="suivant")
    chapter.children = [manual, following]

    numbers = build_plan_numbers(_session(chapter))

    assert numbers.of(manual) == "7"
    assert numbers.of(following) == "8"


def test_arabic_style_numbers_by_depth() -> None:
    chapter = ContentItem(kind=ContentKind.CHAPTER, text="Un")
    section = ContentItem(kind=ContentKind.SECTION, text="a")
    chapter.children = [section]

    numbers = build_plan_numbers(_session(chapter), style="arabic")

    assert numbers.of(chapter) == "1"
    assert numbers.of(section) == "1.1"


def test_numbering_can_be_disabled() -> None:
    chapter = ContentItem(kind=ContentKind.CHAPTER, text="Un")

    numbers = build_plan_numbers(_session(chapter), enabled=False)

    assert numbers.of(chapter) == ""
