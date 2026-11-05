"""Emploi du temps : grille horaire et calcul des séances.

La grille est volontairement simple et lisible : six jours, des positions
horaires régulières, une pause déjeuner entre matin et après-midi. Tout est
exprimé en minutes depuis minuit, ce qui rend les comparaisons exactes et
testables (aucun fuseau, aucune heure « flottante »).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from .models import ClockSlot, TimetableSlot

#: Jours travaillés : lundi (1) → samedi (6), comme le calendrier scolaire.
SCHOOL_DAYS: tuple[int, ...] = (1, 2, 3, 4, 5, 6)

DAY_KEYS: dict[int, str] = {1: "lundi", 2: "mardi", 3: "mercredi", 4: "jeudi", 5: "vendredi", 6: "samedi"}


def _slot(index: int, start: time, end: time, *, lunch_before: bool = False) -> ClockSlot:
    return ClockSlot(
        index=index,
        start_min=start.hour * 60 + start.minute,
        end_min=end.hour * 60 + end.minute,
        lunch_before=lunch_before,
    )


#: Huit positions : quatre le matin, quatre l'après-midi.
DEFAULT_SLOTS: tuple[ClockSlot, ...] = (
    _slot(0, time(8, 0), time(9, 0)),
    _slot(1, time(9, 0), time(10, 0)),
    _slot(2, time(10, 0), time(11, 0)),
    _slot(3, time(11, 0), time(12, 0)),
    _slot(4, time(14, 0), time(15, 0), lunch_before=True),
    _slot(5, time(15, 0), time(16, 0)),
    _slot(6, time(16, 0), time(17, 0)),
    _slot(7, time(17, 0), time(18, 0)),
)

MORNING_SLOTS = tuple(item for item in DEFAULT_SLOTS if item.start_min < 12 * 60)
AFTERNOON_SLOTS = tuple(item for item in DEFAULT_SLOTS if item.start_min >= 12 * 60)


@dataclass(frozen=True, slots=True)
class SessionMoment:
    """Une séance située dans le temps réel."""

    class_id: str
    day: int
    slot: int
    starts_at: datetime
    ends_at: datetime

    @property
    def key(self) -> str:
        return f"{self.class_id}:{self.day}:{self.slot}"


def slots_for(index: int) -> ClockSlot | None:
    return DEFAULT_SLOTS[index] if 0 <= index < len(DEFAULT_SLOTS) else None


def slot_of_minutes(minutes: int) -> ClockSlot | None:
    """Position horaire qui contient une heure donnée."""
    for item in DEFAULT_SLOTS:
        if item.start_min <= minutes < item.end_min:
            return item
    return None


def session_at(entries: list[TimetableSlot], moment: datetime) -> SessionMoment | None:
    """Séance en cours à un instant précis, s'il y en a une."""
    weekday = moment.isoweekday()
    slot = slot_of_minutes(moment.hour * 60 + moment.minute)
    if slot is None:
        return None
    for entry in entries:
        if entry.day != weekday or entry.slot != slot.index:
            continue
        day_start = moment.replace(hour=0, minute=0, second=0, microsecond=0)
        return SessionMoment(
            class_id=entry.class_id,
            day=weekday,
            slot=slot.index,
            starts_at=day_start + timedelta(minutes=slot.start_min),
            ends_at=day_start + timedelta(minutes=slot.end_min),
        )
    return None


def next_session(entries: list[TimetableSlot], moment: datetime) -> SessionMoment | None:
    """Prochaine séance, en cherchant jusqu'à sept jours plus loin."""
    for day_offset in range(0, 8):
        day = moment.date() + timedelta(days=day_offset)
        weekday = day.isoweekday()
        candidates = sorted((entry for entry in entries if entry.day == weekday), key=lambda item: item.slot)
        for entry in candidates:
            slot = slots_for(entry.slot)
            if slot is None:
                continue
            starts_at = datetime.combine(day, time(slot.start_min // 60, slot.start_min % 60))
            if starts_at <= moment:
                continue
            return SessionMoment(
                class_id=entry.class_id,
                day=weekday,
                slot=entry.slot,
                starts_at=starts_at,
                ends_at=datetime.combine(day, time(slot.end_min // 60, slot.end_min % 60)),
            )
    return None


def sessions_of_day(entries: list[TimetableSlot], day: date) -> list[TimetableSlot]:
    """Créneaux d'une journée, dans l'ordre horaire."""
    weekday = day.isoweekday()
    return sorted((entry for entry in entries if entry.day == weekday), key=lambda item: item.slot)


def weekly_load(entries: list[TimetableSlot], class_id: str) -> int:
    """Nombre de créneaux hebdomadaires d'une classe."""
    return sum(1 for entry in entries if entry.class_id == class_id)


def free_slots(entries: list[TimetableSlot], day: int) -> list[int]:
    """Positions encore libres d'un jour : c'est ce que propose l'éditeur."""
    taken = {entry.slot for entry in entries if entry.day == day}
    return [item.index for item in DEFAULT_SLOTS if item.index not in taken]
