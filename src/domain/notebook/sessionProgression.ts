import type { ClassSnapshot, LessonsData, ScheduleSlot } from '../../types';
import { countExpectedSessions, getSchoolYearStart, listExpectedSessionDates, type HolidayCalendar } from '../calendar/calendar';
import { buildLessonRows } from './lessonRows';

/*
 * Progression d'un cahier, séance par séance : ce que l'emploi du temps
 * laissait attendre depuis la rentrée, ce qui a réellement été saisi, et les
 * journées de classe restées sans trace.
 *
 * Module PUR : ni React, ni stockage, ni réseau. La fiche direction l'affiche,
 * les tests le vérifient.
 */

/** Une séance datée telle qu'on la résume à la direction. */
interface SessionEntry {
    date: string;
    items: number;
    /** premiers intitulés de la séance, pour identifier le contenu d'un coup d'œil */
    titles: string[];
}

export interface SessionProgression {
    /** séances datées, triées de la plus ancienne à la plus récente */
    sessions: SessionEntry[];
    /** séances prévues par l'emploi du temps depuis la rentrée (séances doubles incluses) */
    expectedSessions: number;
    /** séances échues réellement saisies : une séance future ne compense pas un retard */
    actualSessions: number;
    gap: number;
    /** journées de classe prévues sans aucune trace dans le cahier, triées */
    missing: string[];
    averageItems: number;
    firstDate: string | null;
    lastDate: string | null;
    /** part des séances attendues déjà saisies, bornée à 100 % */
    coverage: number;
}

/** Créneaux d'une classe : projection fidèle si présente, jours seuls sinon. */
export const snapshotSlots = (snapshot?: ClassSnapshot | null): ScheduleSlot[] =>
    snapshot?.scheduleSlots ?? (snapshot?.weekdays ?? []).map(weekday => ({ weekday }));

const MAX_TITLES = 3;

export const analyseSessionProgression = (
    lessonsData: LessonsData,
    slots: ScheduleSlot[],
    today: string,
    calendar: HolidayCalendar,
): SessionProgression => {
    const byDate = new Map<string, SessionEntry>();
    let itemsTotal = 0;

    for (const row of buildLessonRows(lessonsData)) {
        const node = row.data as { date?: unknown; title?: unknown };
        const date = typeof node.date === 'string' ? node.date.trim() : '';
        if (!date) continue;
        // Seuls les contenus des séances échues entrent dans la moyenne : une
        // séance déjà planifiée pour plus tard ne gonfle pas la densité du cahier.
        if (date <= today) itemsTotal += 1;
        const entry = byDate.get(date) ?? { date, items: 0, titles: [] };
        entry.items += 1;
        const title = typeof node.title === 'string' ? node.title.trim() : '';
        if (title && entry.titles.length < MAX_TITLES) entry.titles.push(title);
        byDate.set(date, entry);
    }

    const sessions = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const actualSessions = sessions.filter(session => session.date <= today).length;
    const from = getSchoolYearStart(calendar, today);
    const expectedSessions = slots.length ? countExpectedSessions(from, today, slots, calendar) : 0;
    const missing = slots.length
        ? listExpectedSessionDates(from, today, slots, calendar).filter(date => !byDate.has(date))
        : [];

    return {
        sessions,
        expectedSessions,
        actualSessions,
        gap: Math.max(0, expectedSessions - actualSessions),
        missing,
        averageItems: actualSessions > 0 ? Math.round((itemsTotal / actualSessions) * 10) / 10 : 0,
        firstDate: sessions[0]?.date ?? null,
        lastDate: sessions[sessions.length - 1]?.date ?? null,
        coverage: expectedSessions > 0 ? Math.min(100, Math.round((actualSessions / expectedSessions) * 100)) : 0,
    };
};
