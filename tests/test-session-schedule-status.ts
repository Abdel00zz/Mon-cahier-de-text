import assert from 'node:assert/strict';
import test from 'node:test';
import { computeClassSessionSchedule } from '../src/domain/calendar/sessionScheduleStatus';
import type { TimetableEntry } from '../src/types';

test('session schedule status : détecte une séance en cours avec calcul du temps restant', () => {
    // Lundi (day: 1), slot 2 (10h-11h, startMin: 600, endMin: 660)
    const timetable: TimetableEntry[] = [{ day: 1, slot: 2, classId: 'cls-1' }];

    // Le Maroc est à UTC+1 (heure d'hiver/été GMT+1).
    // 09h16 UTC correspond exactement à 10h16 à Casablanca (minute = 10 * 60 + 16 = 616).
    const monday1016Casablanca = new Date('2026-10-12T09:16:00Z');

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
    // 08h45 UTC -> 09h45 à Casablanca -> 15 min avant 10h00
    const monday0945Casablanca = new Date('2026-10-12T08:45:00Z');

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday0945Casablanca,
        locale: 'fr',
    });

    assert.equal(status.state, 'starting_soon');
    assert.equal(status.remainingMinutes, 15);
    assert.match(status.label, /Séance dans 15 min \(10h00\)/);
});

test('session schedule status : détecte une séance plus tard aujourd’hui', () => {
    // Lundi slot 4 (14h-15h)
    const timetable: TimetableEntry[] = [{ day: 1, slot: 4, classId: 'cls-1' }];
    // 09h00 UTC -> 10h00 à Casablanca
    const monday1000Casablanca = new Date('2026-10-12T09:00:00Z');

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
    // Lundi 12h00 Casablanca -> 11h00 UTC
    const monday1200Casablanca = new Date('2026-10-12T11:00:00Z');

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday1200Casablanca,
        locale: 'fr',
    });

    assert.equal(status.state, 'upcoming');
    assert.equal(status.dayOffset, 2);
    assert.match(status.label, /Prochaine séance : Mercredi à 10h00/);
    assert.equal(status.shortLabel, 'Mercredi à 10h00');
});

test('session schedule status : supporte la locale arabe', () => {
    const timetable: TimetableEntry[] = [{ day: 1, slot: 2, classId: 'cls-1' }];
    const monday1016Casablanca = new Date('2026-10-12T09:16:00Z');

    const status = computeClassSessionSchedule(timetable, 0, 'cls-1', {
        now: monday1016Casablanca,
        locale: 'ar',
    });

    assert.equal(status.state, 'in_progress');
    assert.match(status.label, /حصة جارية · متبقي 44 دقيقة/);
});
