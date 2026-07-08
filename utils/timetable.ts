import { ClassSchedule, TimetableEntry } from '../types';

/** Créneaux horaires de la grille (sans la colonne « 24 h » du modèle papier). */
export interface HourSlot {
    index: number;
    label: string;
    /** début/fin en minutes depuis minuit (heure locale de l'appareil) */
    startMin: number;
    endMin: number;
    lunchBefore?: boolean; // affiche une pause déjeuner avant ce créneau
}

export const HOUR_SLOTS: HourSlot[] = [
    { index: 0, label: '08h–09h', startMin: 8 * 60, endMin: 9 * 60 },
    { index: 1, label: '09h–10h', startMin: 9 * 60, endMin: 10 * 60 },
    { index: 2, label: '10h–11h', startMin: 10 * 60, endMin: 11 * 60 },
    { index: 3, label: '11h–12h', startMin: 11 * 60, endMin: 12 * 60 },
    { index: 4, label: '14h–15h', startMin: 14 * 60, endMin: 15 * 60, lunchBefore: true },
    { index: 5, label: '15h–16h', startMin: 15 * 60, endMin: 16 * 60 },
    { index: 6, label: '16h–17h', startMin: 16 * 60, endMin: 17 * 60 },
    { index: 7, label: '17h–18h', startMin: 17 * 60, endMin: 18 * 60 },
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
 * Deux créneaux forment-ils une continuité réelle (ex. 08h–09h puis 09h–10h) ?
 * La pause déjeuner (`lunchBefore`) brise la continuité : 11h–12h puis 14h–15h
 * restent deux séances distinctes.
 */
export const areSlotsContiguous = (slotA: number, slotB: number): boolean => {
    const [a, b] = slotA <= slotB ? [slotA, slotB] : [slotB, slotA];
    if (b !== a + 1) return false;
    return !HOUR_SLOTS.find(s => s.index === b)?.lunchBefore;
};

/**
 * Nombre de séances CONTINUES formées par un ensemble de créneaux d'un même
 * jour pour une même classe : deux heures qui se suivent (sans pause déjeuner)
 * comptent pour UNE séance de 2 h — le prof ne saisit qu'une ligne datée dans
 * son cahier pour une telle séance, le moteur de retard ne doit donc en
 * attendre qu'une.
 */
export const countContiguousSessions = (slots: number[]): number => {
    if (slots.length === 0) return 0;
    const sorted = Array.from(new Set(slots)).sort((a, b) => a - b);
    let sessions = 1;
    for (let i = 1; i < sorted.length; i++) {
        if (!areSlotsContiguous(sorted[i - 1], sorted[i])) sessions += 1;
    }
    return sessions;
};

/**
 * Dérive `schedules` (jours + nombre de séances/jour) à partir de la grille,
 * pour alimenter le moteur de retard sans changer son API.
 * Les créneaux consécutifs d'une même classe sont fusionnés en une seule séance.
 */
export const deriveSchedules = (timetable: TimetableEntry[] | undefined): ClassSchedule[] => {
    const byClass = new Map<string, Map<number, number[]>>();
    for (const entry of timetable ?? []) {
        if (!byClass.has(entry.classId)) byClass.set(entry.classId, new Map());
        const dayMap = byClass.get(entry.classId)!;
        if (!dayMap.has(entry.day)) dayMap.set(entry.day, []);
        dayMap.get(entry.day)!.push(entry.slot);
    }
    const schedules: ClassSchedule[] = [];
    for (const [classId, dayMap] of byClass) {
        const slots = Array.from(dayMap.entries()).map(([weekday, slotIndexes]) => ({
            weekday,
            sessions: countContiguousSessions(slotIndexes),
        }));
        if (slots.length > 0) schedules.push({ classId, slots });
    }
    return schedules;
};

/**
 * Séance continue d'un jour donné : bloc de créneaux contigus fusionnés
 * (une séance de 2 h = un seul bloc), avec ses heures réelles de début/fin.
 */
export interface SessionBlock {
    classId: string;
    day: number;
    startMin: number;
    endMin: number;
    /** durée du bloc en heures (2 = séance double) */
    hours: number;
}

/**
 * Blocs de séances d'un jour donné, dans l'ordre chronologique — alimente les
 * rappels locaux de fin de séance (une seule alerte par bloc de 2 h, cohérent
 * avec la fusion appliquée au moteur de retard).
 */
export const getDaySessionBlocks = (
    timetable: TimetableEntry[] | undefined,
    day: number
): SessionBlock[] => {
    const byClass = new Map<string, number[]>();
    for (const entry of timetable ?? []) {
        if (entry.day !== day) continue;
        if (!byClass.has(entry.classId)) byClass.set(entry.classId, []);
        byClass.get(entry.classId)!.push(entry.slot);
    }
    const blocks: SessionBlock[] = [];
    for (const [classId, slots] of byClass) {
        const sorted = Array.from(new Set(slots)).sort((a, b) => a - b);
        let runStart = sorted[0];
        let prev = sorted[0];
        const flush = (endSlot: number): void => {
            const start = HOUR_SLOTS.find(s => s.index === runStart);
            const end = HOUR_SLOTS.find(s => s.index === endSlot);
            if (start && end) {
                blocks.push({ classId, day, startMin: start.startMin, endMin: end.endMin, hours: endSlot - runStart + 1 });
            }
        };
        for (let i = 1; i < sorted.length; i++) {
            if (!areSlotsContiguous(prev, sorted[i])) {
                flush(prev);
                runStart = sorted[i];
            }
            prev = sorted[i];
        }
        flush(prev);
    }
    return blocks.sort((a, b) => a.startMin - b.startMin);
};

/**
 * Position d'un créneau assigné dans sa séance continue — alimente le
 * regroupement visuel de la grille (cases soudées + badge « 2 h »).
 */
export interface SlotRunInfo {
    classId: string;
    isStart: boolean;
    isEnd: boolean;
    /** durée totale de la séance continue, en heures */
    hours: number;
}

/**
 * Pour un jour donné, associe chaque créneau assigné à sa séance continue
 * (mêmes règles de contiguïté que le moteur de retard : même classe, créneaux
 * consécutifs, pause déjeuner exclue). La grille de saisie s'en sert pour
 * afficher les blocs fusionnés exactement comme le calcul les compte —
 * ce que le prof voit est ce que le moteur mesure.
 */
export const getDaySlotRuns = (
    timetable: TimetableEntry[] | undefined,
    day: number
): Map<number, SlotRunInfo> => {
    const classBySlot = new Map<number, string>();
    for (const entry of timetable ?? []) {
        if (entry.day === day) classBySlot.set(entry.slot, entry.classId);
    }
    const runs = new Map<number, SlotRunInfo>();
    let run: number[] = [];
    let runClass: string | null = null;

    const flush = (): void => {
        const classId = runClass;
        if (!classId) return;
        run.forEach((slot, i) => {
            runs.set(slot, {
                classId,
                isStart: i === 0,
                isEnd: i === run.length - 1,
                hours: run.length,
            });
        });
        run = [];
        runClass = null;
    };

    let prevSlot: number | null = null;
    for (const { index: slot } of HOUR_SLOTS) {
        const classId = classBySlot.get(slot);
        const continues =
            classId !== undefined &&
            classId === runClass &&
            prevSlot !== null &&
            areSlotsContiguous(prevSlot, slot);
        if (!continues) flush();
        if (classId !== undefined) {
            if (run.length === 0) runClass = classId;
            run.push(slot);
        }
        prevSlot = slot;
    }
    flush();
    return runs;
};

/**
 * `schedules` effectifs d'une configuration : toujours re-dérivés de la grille
 * quand elle existe (source de vérité, règle de dérivation évolutive) ; les
 * `schedules` hérités saisis sans grille sont conservés tels quels.
 */
export const effectiveSchedules = (
    config: { timetable?: TimetableEntry[]; schedules?: ClassSchedule[] }
): ClassSchedule[] =>
    (config.timetable?.length ?? 0) > 0 ? deriveSchedules(config.timetable) : (config.schedules ?? []);
