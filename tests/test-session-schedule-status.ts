import assert from 'node:assert/strict';
import test from 'node:test';
import { computeClassSessionSchedule } from '../src/domain/calendar/sessionScheduleStatus';
import { moroccoClockMinutes } from '../src/domain/notifications/sessionAlertEngine';
import type { TimetableEntry } from '../src/types';

function makeCasablancaDate(year: number, month: number, day: number, hours: number, minutes: number): Date {
    const targetMin = hours * 60 + minutes;
    const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    const actualMin = Math.round(moroccoClockMinutes(d));
    const diff = targetMin - actualMin;
    return new Date(d.getTime() + diff * 60_000);
}

test('session schedule status : détecte une séance en cours avec calcul du temps restant', () => {
    // Lundi (day: 1), slot 2 (10h-11h, startMin: 600, endMin: 660)
    const timetable: TimetableEntry[] = [{ day: 1, slot: 2, classId: 'cls-1' }];
    const monday1016Casablanca = makeCasablancaDate(2026, 10, 12, 10, 16);

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday1016Casablanca,
        locale: 'fr',
    });

    assert.equal(status.state, 'in_progress');
    assert.equal(status.remainingMinutes, 44);
    assert.match(status.label, /Séance en cours · reste 44 min avant la fin/);
    assert.equal(status.shortLabel, 'En cours · 44 min');
});

test('session schedule status : détecte une séance imminente (< 60 min)', () => {
    // Lundi slot 2 (10h-11h)
    const timetable: TimetableEntry[] = [{ day: 1, slot: 2, classId: 'cls-1' }];
    // 09h45 à Casablanca -> 15 min avant 10h00
    const monday0945Casablanca = makeCasablancaDate(2026, 10, 12, 9, 45);

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday0945Casablanca,
        locale: 'fr',
    });

    assert.equal(status.state, 'starting_soon');
    assert.equal(status.remainingMinutes, 20);
    assert.match(status.label, /Séance dans 20 min \(10h05\)/);
});

test('session schedule status : détecte une séance plus tard aujourd’hui', () => {
    // Lundi slot 4 (14h-15h)
    const timetable: TimetableEntry[] = [{ day: 1, slot: 4, classId: 'cls-1' }];
    const monday1000Casablanca = makeCasablancaDate(2026, 10, 12, 10, 0);

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday1000Casablanca,
        locale: 'fr',
    });

    assert.equal(status.state, 'today_later');
    assert.match(status.label, /Séance aujourd’hui à 14h00/);
});

test('session schedule status : détecte la prochaine séance demain ou un autre jour', () => {
    // Mercredi (day: 3), slot 2 (10h-11h)
    const timetable: TimetableEntry[] = [{ day: 3, slot: 2, classId: 'cls-1' }];
    const monday1200Casablanca = makeCasablancaDate(2026, 10, 12, 12, 0);

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday1200Casablanca,
        locale: 'fr',
    });

    assert.equal(status.state, 'upcoming');
    assert.equal(status.dayOffset, 2);
    assert.match(status.label, /Prochaine séance : Mercredi à 10h05/);
    assert.equal(status.shortLabel, 'Mercredi à 10h05');
});

test('session schedule status : supporte la locale arabe', () => {
    const timetable: TimetableEntry[] = [{ day: 1, slot: 2, classId: 'cls-1' }];
    const monday1016Casablanca = makeCasablancaDate(2026, 10, 12, 10, 16);

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday1016Casablanca,
        locale: 'ar',
    });

    assert.equal(status.state, 'in_progress');
    assert.equal(status.dayLabel, 'اليوم');
    assert.match(status.label, /حصة جارية · متبقي 44 دقيقة/);

    // Mardi (day: 2) vu depuis Lundi 12h00 -> غدا
    const tomorrowStatus = computeClassSessionSchedule([{ day: 2, slot: 4, classId: 'cls-1' }], 0, 'cls-1', {
        now: makeCasablancaDate(2026, 10, 12, 12, 0),
        locale: 'ar',
    });
    assert.equal(tomorrowStatus.state, 'upcoming');
    assert.equal(tomorrowStatus.dayLabel, 'غدا');
    assert.equal(tomorrowStatus.dayOffset, 1);
});

