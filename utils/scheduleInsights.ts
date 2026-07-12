import { ClassInfo, TimetableEntry } from '../types.js';
import { getOfficialWeeklyHours } from './officialHours.js';
import { getDaySlotRuns, TIMETABLE_DAYS } from './timetable.js';

/**
 * Moteur d'AVIS sur l'emploi du temps — purement indicatif, jamais bloquant.
 *
 * L'horaire hebdomadaire officiel (MEN) est déjà connu par classe. Ce module
 * confronte les heures RÉELLEMENT saisies dans la grille à cet horaire, et
 * signale calmement les écarts : « vous avez posé 6 h pour 2BAC PC alors que
 * l'officiel est de 5 h ». Le prof reste maître (dédoublements, options,
 * spécificités d'établissement) — c'est une aide, pas une contrainte.
 */

export type HoursDeviation = 'match' | 'over' | 'under' | 'empty';

export interface ClassHoursInsight {
    classId: string;
    className: string;
    subject: string;
    /** heures posées dans la grille (nombre de cases cochées) */
    scheduledHours: number;
    /** séances/semaine (blocs continus fusionnés) */
    sessions: number;
    /** heures officielles indicatives, si connues */
    officialHours: number | null;
    /** contexte lisible de l'officiel (ex. « Sciences Physiques · Maths ») */
    officialContext: string | null;
    /** signe de l'écart (empty = aucune heure posée) */
    deviation: HoursDeviation;
    /** écart signé en heures (scheduled − officiel) ; 0 si inconnu */
    delta: number;
}

/** Heures posées dans la grille pour une classe (une case = 1 h). */
export const countScheduledHours = (timetable: TimetableEntry[] | undefined, classId: string): number =>
    (timetable ?? []).filter(e => e.classId === classId).length;

/** Séances/semaine (blocs continus fusionnés) pour une classe. */
export const countWeeklySessions = (timetable: TimetableEntry[] | undefined, classId: string): number => {
    let sessions = 0;
    for (const day of TIMETABLE_DAYS) {
        for (const run of getDaySlotRuns(timetable, day.value).values()) {
            if (run.classId === classId && run.isStart) sessions += 1;
        }
    }
    return sessions;
};

export const computeClassHoursInsight = (
    classInfo: ClassInfo,
    timetable: TimetableEntry[] | undefined
): ClassHoursInsight => {
    const scheduledHours = countScheduledHours(timetable, classInfo.id);
    const sessions = countWeeklySessions(timetable, classInfo.id);
    const official = getOfficialWeeklyHours(classInfo.cycle, classInfo.name, classInfo.subject);

    let deviation: HoursDeviation = 'match';
    let delta = 0;
    if (scheduledHours === 0) {
        deviation = 'empty';
    } else if (official) {
        delta = scheduledHours - official.hours;
        deviation = delta === 0 ? 'match' : delta > 0 ? 'over' : 'under';
    }

    return {
        classId: classInfo.id,
        className: classInfo.name,
        subject: classInfo.subject,
        scheduledHours,
        sessions,
        officialHours: official?.hours ?? null,
        officialContext: official?.context ?? null,
        deviation,
        delta,
    };
};

/** Avis sur toutes les classes (celles ayant un horaire officiel connu d'abord). */
export const computeScheduleInsights = (
    classes: ClassInfo[],
    timetable: TimetableEntry[] | undefined
): ClassHoursInsight[] => classes.map(c => computeClassHoursInsight(c, timetable));

/** Message français court pour un écart d'heures (null si rien à signaler). */
export const hoursDeviationMessage = (insight: ClassHoursInsight): string | null => {
    if (insight.officialHours === null) return null;
    const abs = Math.abs(insight.delta);
    if (insight.deviation === 'over') {
        return `${insight.className} : ${insight.scheduledHours} h posées pour ${insight.officialHours} h officielles — ${abs} h de trop. Vérifiez la grille (sauf dédoublement/option).`;
    }
    if (insight.deviation === 'under') {
        return `${insight.className} : ${insight.scheduledHours} h posées pour ${insight.officialHours} h officielles — il manque ${abs} h. Un créneau oublié ?`;
    }
    return null;
};
