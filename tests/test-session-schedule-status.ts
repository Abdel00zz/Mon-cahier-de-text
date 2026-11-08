import assert from 'node:assert/strict';
import test from 'node:test';
import { computeClassSessionSchedule } from '../src/domain/calendar/sessionScheduleStatus';
import { moroccoClockMinutes } from '../src/domain/notifications/sessionAlertEngine';
import { deriveSchedules, setTimetableEntry } from '../src/domain/calendar/timetable';
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
    // 09h45 à Casablanca -> 20 min avant la sonnerie réelle de 10h05.
    const monday0945Casablanca = makeCasablancaDate(2026, 10, 12, 9, 45);

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday0945Casablanca,
        locale: 'fr',
    });

    assert.equal(status.state, 'starting_soon');
    assert.equal(status.remainingMinutes, 20);
    assert.equal(status.label, 'Séance dans 20 min');
    assert.equal(status.startTimeLabel, '10h00', 'nominal time matches the timetable');
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
    assert.match(status.label, /Prochaine séance : Mercredi à 10h00/);
    assert.equal(status.shortLabel, 'Mercredi à 10h00');
});

test('une modification de la grille met à jour la durée de la carte et le nombre de séances séparément', () => {
    const options = { now: makeCasablancaDate(2026, 10, 12, 8, 15) };
    let grid = setTimetableEntry([], 1, 0, 'A');
    const card = (id: string) => computeClassSessionSchedule(grid, 0, id, options);
    assert.equal(card('A').sessionHours, 1);
    grid = setTimetableEntry(grid, 1, 1, 'A');
    grid = setTimetableEntry(grid, 1, 2, 'A');
    grid = setTimetableEntry(grid, 1, 3, 'A');
    grid = setTimetableEntry(grid, 1, 4, 'A');
    assert.equal(card('A').sessionHours, 4);
    assert.equal(deriveSchedules(grid)[0].slots[0].sessions, 2, 'la pause déjeuner sépare les séances');
    grid = setTimetableEntry(grid, 1, 1, 'B');
    assert.equal(card('A').sessionHours, 1);
    assert.equal(card('B').sessionHours, 1);
    grid = setTimetableEntry(grid, 1, 1, null);
    assert.equal(card('B').state, 'none');
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

test('session schedule status : suit l’horloge locale du téléphone/PC et reste en cours jusqu’à la dernière seconde avant de passer à la séance suivante', () => {
    const timetable: TimetableEntry[] = [
        { day: 1, slot: 0, classId: 'cls-1' }, // 07h55–08h55
        { day: 1, slot: 2, classId: 'cls-1' }, // 10h05–11h00
    ];
    // Lundi 12 octobre 2026 à 08:54:59.900 en heure locale de l'appareil
    const lastSecondLocal = new Date(2026, 9, 12, 8, 54, 59, 900);
    const activeStatus = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: lastSecondLocal,
        timeZone: 'local',
        locale: 'fr',
    });
    assert.equal(activeStatus.state, 'in_progress');
    assert.equal(activeStatus.remainingSeconds, 1);
    assert.equal(activeStatus.remainingMinutes, 1);
    assert.ok(activeStatus.nextTransitionMs && activeStatus.nextTransitionMs <= 200);

    // À la seconde exacte 08:55:00.000, bascule immédiate sur la séance suivante (10h05)
    const exactEndLocal = new Date(2026, 9, 12, 8, 55, 0, 0);
    const nextStatus = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: exactEndLocal,
        timeZone: 'local',
        locale: 'fr',
    });
    assert.equal(nextStatus.state, 'today_later');
    assert.equal(nextStatus.startMin, 605);
    assert.equal(nextStatus.startTimeLabel, '10h00');
});


