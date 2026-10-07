import { addDaysIso } from './dataUtils';
import type { AppConfig, LessonsData } from '../../types';
import { absenceDates, classSessionsDuring, notebookSessionDates } from './absenceInjection';
import type { LessonRow } from './lessonRows';
import { groupLessonRows } from './tableRows';

export interface AbsenceSession {
    date: string;
    reasons: string[];
}

/** Pure projection of administrative settings. No lesson nodes or indices are created. */
export function buildAbsenceSessions(config: Pick<AppConfig, 'absences' | 'timetable' | 'timetableClock'>,
    classId: string, lessons: LessonsData): AbsenceSession[] {
    const recordedDates = notebookSessionDates(lessons);
    const byDate = new Map<string, Set<string>>();
    for (const period of config.absences ?? []) {
        const covered = new Set(absenceDates(period));
        const scheduled = classSessionsDuring(config.timetable, config.timetableClock, period, [classId]);
        const dates = new Set([...recordedDates.filter(date => covered.has(date)), ...scheduled.flatMap(entry => entry.dates)]);
        for (const date of dates) {
            const reasons = byDate.get(date) ?? new Set<string>();
            const reason = period.motif?.trim();
            if (reason) reasons.add(reason);
            byDate.set(date, reasons);
        }
    }
    return [...byDate].sort(([a], [b]) => a.localeCompare(b))
        .map(([date, reasons]) => ({ date, reasons: [...reasons].sort() }));
}

export interface AbsenceDisplayRow {
    kind: 'absence';
    key: string;
    session: AbsenceSession;
}

/** A certificate is a visual session boundary: repeated content must not merge
 * across it. Both editing targets and the screen use this grouping, with the
 * original coordinates intact. Positions here belong only to the projection.
 */
export function groupRowsWithAbsences(source: LessonRow[], sessions: readonly AbsenceSession[]) {
    if (sessions.length === 0) return groupLessonRows(source);
    let gap = 0;
    let previousDate = '';
    const projected = source.map(row => {
        const date = addDaysIso(row.data.date, 0);
        if (date && previousDate && sessions.some(session => session.date >= previousDate && session.date < date)) gap++;
        if (date) previousDate = date;
        return { ...row, position: row.position + gap };
    });
    return groupLessonRows(projected);
}

/** Insert display-only rows after the latest preceding session, keeping the
 * original course order, coordinates and grouping intact on screen and paper.
 */
export function withAbsenceRows<T>(rows: T[], sessions: readonly AbsenceSession[],
    datesOf: (row: T) => readonly string[]): Array<T | AbsenceDisplayRow> {
    const slots = new Map<number, AbsenceDisplayRow[]>();
    for (const session of sessions) {
        let after = -1;
        let latest = '';
        rows.forEach((row, index) => {
            for (const rawDate of datesOf(row)) {
                const date = addDaysIso(rawDate, 0);
                if (date <= session.date && date >= latest) { latest = date; after = index; }
            }
        });
        const slot = slots.get(after) ?? [];
        slot.push({ kind: 'absence', key: `absence:${session.date}`, session });
        slots.set(after, slot);
    }
    const result: Array<T | AbsenceDisplayRow> = [...(slots.get(-1) ?? [])];
    rows.forEach((row, index) => { result.push(row, ...(slots.get(index) ?? [])); });
    return result;
}
