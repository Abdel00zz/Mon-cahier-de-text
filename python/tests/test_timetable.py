"""Emploi du temps : séance en cours, suivante, charge hebdomadaire, cases libres."""

from __future__ import annotations

from datetime import datetime

from app.core.models import TimetableSlot
from app.core.timetable import (
    AFTERNOON_SLOTS,
    DEFAULT_SLOTS,
    MORNING_SLOTS,
    free_slots,
    next_session,
    session_at,
    sessions_of_day,
    slot_of_minutes,
    weekly_load,
)


def test_slots_split_morning_and_afternoon_without_overlap() -> None:
    assert len(MORNING_SLOTS) == 4
    assert len(AFTERNOON_SLOTS) == 4
    assert {slot.index for slot in MORNING_SLOTS} | {slot.index for slot in AFTERNOON_SLOTS} == set(range(8))
    pairs = list(zip(DEFAULT_SLOTS[:-1], DEFAULT_SLOTS[1:], strict=True))
    for earlier, later in pairs:
        assert earlier.end_min <= later.start_min


def test_slot_of_minutes_matches_the_grid() -> None:
    assert slot_of_minutes(8 * 60 + 30).index == 0
    assert slot_of_minutes(15 * 60 + 10).index == 5
    assert slot_of_minutes(12 * 60 + 30) is None


def test_session_at_returns_the_current_class() -> None:
    entries = [TimetableSlot(day=1, slot=2, class_id="c1")]

    current = session_at(entries, datetime(2026, 9, 7, 10, 20))

    assert current is not None
    assert current.class_id == "c1"
    assert current.starts_at.hour == 10
    assert current.ends_at.hour == 11


def test_session_at_ignores_other_days_and_breaks() -> None:
    entries = [TimetableSlot(day=1, slot=2, class_id="c1")]

    assert session_at(entries, datetime(2026, 9, 8, 10, 20)) is None
    assert session_at(entries, datetime(2026, 9, 7, 12, 30)) is None


def test_next_session_jumps_to_the_following_day() -> None:
    entries = [TimetableSlot(day=1, slot=0, class_id="c1"), TimetableSlot(day=2, slot=3, class_id="c2")]

    upcoming = next_session(entries, datetime(2026, 9, 7, 9, 30))

    assert upcoming is not None
    assert upcoming.class_id == "c2"
    assert upcoming.starts_at == datetime(2026, 9, 8, 11, 0)


def test_next_session_is_none_without_timetable() -> None:
    assert next_session([], datetime(2026, 9, 7, 9, 30)) is None


def test_sessions_of_day_and_weekly_load() -> None:
    entries = [
        TimetableSlot(day=1, slot=3, class_id="c1"),
        TimetableSlot(day=1, slot=0, class_id="c1"),
        TimetableSlot(day=2, slot=1, class_id="c1"),
        TimetableSlot(day=2, slot=2, class_id="c2"),
    ]

    monday = sessions_of_day(entries, datetime(2026, 9, 7).date())

    assert [entry.slot for entry in monday] == [0, 3]
    assert weekly_load(entries, "c1") == 3
    assert weekly_load(entries, "c2") == 1


def test_free_slots_exclude_taken_positions() -> None:
    entries = [TimetableSlot(day=1, slot=0, class_id="c1")]

    free = free_slots(entries, 1)

    assert 0 not in free
    assert len(free) == len(DEFAULT_SLOTS) - 1
