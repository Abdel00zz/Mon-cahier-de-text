import { ClassSchedule, TimetableEntry } from '../types';

/** Créneaux horaires de la grille (sans la colonne « 24 h » du modèle papier). */
export interface HourSlot {
    index: number;
    label: string;
    lunchBefore?: boolean; // affiche une pause déjeuner avant ce créneau
}

export const HOUR_SLOTS: HourSlot[] = [
    { index: 0, label: '08h–09h' },
    { index: 1, label: '09h–10h' },
    { index: 2, label: '10h–11h' },
    { index: 3, label: '11h–12h' },
    { index: 4, label: '14h–15h', lunchBefore: true },
    { index: 5, label: '15h–16h' },
    { index: 6, label: '16h–17h' },
    { index: 7, label: '17h–18h' },
];

/** Jours ouvrés affichés (lundi → samedi), valeurs en convention getDay() 0=dimanche. */
export const TIMETABLE_DAYS: { value: number; label: string }[] = [
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' },
];

export const getTimetableEntry = (
    timetable: TimetableEntry[] | undefined,
    day: number,
    slot: number
): TimetableEntry | undefined => timetable?.find(e => e.day === day && e.slot === slot);

/** Pose ou retire une classe dans une case, renvoie la nouvelle grille. */
export const setTimetableEntry = (
    timetable: TimetableEntry[] | undefined,
    day: number,
    slot: number,
    classId: string | null
): TimetableEntry[] => {
    const rest = (timetable ?? []).filter(e => !(e.day === day && e.slot === slot));
    if (!classId) return rest;
    return [...rest, { day, slot, classId }];
};

/**
 * Dérive `schedules` (jours + nombre de séances/jour) à partir de la grille,
 * pour alimenter le moteur de retard sans changer son API.
 */
export const deriveSchedules = (timetable: TimetableEntry[] | undefined): ClassSchedule[] => {
    const byClass = new Map<string, Map<number, number>>();
    for (const entry of timetable ?? []) {
        if (!byClass.has(entry.classId)) byClass.set(entry.classId, new Map());
        const dayMap = byClass.get(entry.classId)!;
        dayMap.set(entry.day, (dayMap.get(entry.day) ?? 0) + 1);
    }
    const schedules: ClassSchedule[] = [];
    for (const [classId, dayMap] of byClass) {
        const slots = Array.from(dayMap.entries()).map(([weekday, sessions]) => ({ weekday, sessions }));
        if (slots.length > 0) schedules.push({ classId, slots });
    }
    return schedules;
};
