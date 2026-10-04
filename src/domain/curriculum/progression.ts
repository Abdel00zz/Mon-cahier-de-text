import { AbsencePeriod, AppLocale, ClassInfo, ClassSchedule, ClassSnapshot, LessonsData, NotificationSettings, ScheduleSlot, TeacherSnapshot } from '../../types.js';
import { normalizeContentType } from '../../constants/type-keys.js';
import { flattenLessons } from '../notebook/dataUtils.js';
import { EVALUATION_TYPES } from '../notebook/contentNumbering.js';
import { isNonCourseActivity } from './chapterLifecycle.js';

/*
 * Un « élément de contenu » est un travail effectué en classe (item, devoir,
 * contrôle…), jamais un conteneur structurel. Le filtre s'appuie sur
 * l'elementType du parcours (fiable) et non sur `data.type` : les Sections
 * n'ont pas de champ `type` et passaient l'ancien filtre, les titres
 * structurels gonflaient le dénominateur de complétion.
 */
const CONTAINER_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection']);
const isContentEntry = (entry: { data: any; elementType: string }): boolean =>
    !CONTAINER_TYPES.has(entry.elementType) && !CONTAINER_TYPES.has(entry.data?.type);

/** Une évaluation porte une date d'échéance, pas une séance tenue. */
const isEvaluationEntry = (entry: { data?: { type?: unknown } }): boolean =>
    EVALUATION_TYPES.test(normalizeContentType(String(entry.data?.type ?? '')));

export interface LoggedSessionOptions {
    /** Créneaux de la classe : une double séance attendue se compte deux fois. */
    slots?: readonly ScheduleSlot[];
    /** Aucune date postérieure ne compte : le cahier n'est pas encore tenu. */
    today?: string;
}

/**
 * Séances réellement tenues, sur la même base que les séances attendues
 * (`countExpectedSessions`) : contenu daté, passé ou du jour, hors évaluations
 * (devoirs, contrôles) et hors activités non pédagogiques, plafonné par le
 * nombre de créneaux du même jour de la semaine. Une date ne peut donc pas
 * compter plus de séances qu'il n'y en a d'attendues ce jour-là, et une double
 * séance se compte deux fois dès que les deux contenus sont saisis.
 */
export const countLoggedSessions = (
    entries: readonly { data?: { type?: unknown; date?: unknown } }[],
    options: LoggedSessionOptions = {},
): number => {
    const today = options.today ?? new Date().toISOString().slice(0, 10);
    const sessionsByWeekday = new Map<number, number>();
    for (const slot of options.slots ?? []) {
        sessionsByWeekday.set(slot.weekday, (sessionsByWeekday.get(slot.weekday) ?? 0) + Math.max(1, Math.trunc(slot.sessions ?? 1)));
    }
    const entriesByDate = new Map<string, number>();
    for (const entry of entries) {
        const date = typeof entry.data?.date === 'string' ? entry.data.date : '';
        if (!date || date > today) continue;
        if (isNonCourseActivity(entry.data?.type) || isEvaluationEntry(entry)) continue;
        entriesByDate.set(date, (entriesByDate.get(date) ?? 0) + 1);
    }
    let total = 0;
    for (const [date, filled] of entriesByDate) {
        // `weekday` suit la convention JS `getDay()` : 0 = dimanche (voir types.ts).
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        total += Math.min(filled, sessionsByWeekday.get(weekday) ?? 1);
    }
    return total;
};

interface ChapterProgress {
    title: string;
    total: number;
    planned: number;
    rate: number;
}

export interface ProgressionStats {
    totalItems: number;
    plannedCount: number;
    completionRate: number;
    sessionsCount: number;
    unplannedItems: { data: any; indices: any; elementType: string }[];
    lastDate: string | null;
    perChapter: ChapterProgress[];
}

const progressionCache = new WeakMap<LessonsData, ProgressionStats>();
/** Les éléments datés sont mis en cache à part : le comptage des séances dépend
 * des créneaux, alors que le reste des statistiques n'en dépend pas. */
const plannedCache = new WeakMap<LessonsData, { data: any; elementType: string }[]>();

const plannedEntries = (lessonsData: LessonsData) => {
    const cached = plannedCache.get(lessonsData);
    if (cached) return cached;
    const planned = flattenLessons(lessonsData).filter(isContentEntry).filter(entry => !!entry.data?.date);
    plannedCache.set(lessonsData, planned);
    return planned;
};

export const computeProgressionStats = (lessonsData: LessonsData, sessions?: LoggedSessionOptions): ProgressionStats => {
    const cached = progressionCache.get(lessonsData);
    if (cached) {
        return sessions ? { ...cached, sessionsCount: countLoggedSessions(plannedEntries(lessonsData), sessions) } : cached;
    }
    const allEntries = flattenLessons(lessonsData);
    const contentItems = allEntries.filter(isContentEntry);

    const totalItems = contentItems.length;
    const plannedItems = contentItems.filter(entry => !!entry.data?.date);
    const plannedCount = plannedItems.length;

    /*
     * Séances = séances réellement tenues (voir `countLoggedSessions`), et non
     * plus un simple comptage de dates distinctes : les devoirs et les dates
     * futures gonflaient le total, alors qu'une double séance n'était comptée
     * qu'une fois.
     */
    const uniqueDates = new Set(plannedItems.map(entry => entry.data.date as string).filter(Boolean));
    const sessionsCount = countLoggedSessions(plannedItems, sessions);

    const completionRate = totalItems === 0 ? 0 : Math.round((plannedCount / totalItems) * 100);
    const unplannedItems = contentItems.filter(entry => !entry.data?.date);

    let lastDate: string | null = null;
    for (const date of uniqueDates) {
        if (!lastDate || date > lastDate) lastDate = date;
    }

    const perChapter: ChapterProgress[] = lessonsData.map((chapter, index) => {
        const chapterItems = flattenLessons([chapter]).filter(isContentEntry);
        const total = chapterItems.length;
        const planned = chapterItems.filter(entry => !!entry.data?.date).length;
        return {
            title: chapter.title || `Chapitre ${index + 1}`,
            total,
            planned,
            rate: total === 0 ? 0 : Math.round((planned / total) * 100),
        };
    });

    const result = { totalItems, plannedCount, completionRate, sessionsCount, unplannedItems, lastDate, perChapter };
    progressionCache.set(lessonsData, result);
    return result;
};

const computeClassSnapshot = (
    classInfo: ClassInfo,
    lessonsData: LessonsData,
    schedule?: ClassSchedule
): ClassSnapshot => {
    const slots = schedule?.slots ?? [];
    const stats = computeProgressionStats(lessonsData, { slots });
    return {
        id: classInfo.id,
        name: classInfo.name,
        subject: classInfo.subject,
        cycle: classInfo.cycle,
        totalItems: stats.totalItems,
        plannedCount: stats.plannedCount,
        completionRate: stats.completionRate,
        sessionsCount: stats.sessionsCount,
        lastDate: stats.lastDate,
        weekdays: slots.map(slot => slot.weekday),
        scheduleSlots: slots.map(slot => ({
            weekday: slot.weekday,
            sessions: Math.max(1, Math.trunc(slot.sessions ?? 1)),
        })),
        sessionsPerWeek: slots.reduce((sum, slot) => sum + (slot.sessions ?? 1), 0),
        updatedAt: new Date().toISOString(),
    };
};

export const computeTeacherSnapshot = (
    user: { id?: string; phone: string; nom: string; prenom: string },
    classes: ClassInfo[],
    schedules: ClassSchedule[] | undefined,
    notificationSettings: NotificationSettings | undefined,
    readLessons: (classId: string) => LessonsData,
    absences?: AbsencePeriod[],
    schoolYearStart?: string,
    applicationLocale: AppLocale = 'ar',
    /** Identité affichée (nom d'usage, matières déclarées) telle que la voit la direction. */
    identity?: { displayName?: string; subjects?: string[] },
): TeacherSnapshot => ({
    phone: user.id ?? user.phone,
    nom: user.nom,
    prenom: user.prenom,
    ...(identity?.displayName?.trim() ? { displayName: identity.displayName.trim() } : {}),
    ...(identity?.subjects?.length ? { subjects: [...identity.subjects] } : {}),
    applicationLocale,
    lastSyncAt: new Date().toISOString(),
    absences: absences && absences.length > 0 ? absences : undefined,
    schoolYearStart,
    notifyPrefs: notificationSettings
        ? {
              enabled: notificationSettings.enabled,
              gapThreshold: notificationSettings.gapThreshold,
              inactivityThresholdDays: notificationSettings.inactivityThresholdDays,
              quietDuringVacations: notificationSettings.quietDuringVacations,
              pushEnabled: notificationSettings.pushEnabled,
          }
        : undefined,
    classes: classes.map(classInfo =>
        computeClassSnapshot(
            classInfo,
            readLessons(classInfo.id),
            schedules?.find(schedule => schedule.classId === classInfo.id)
        )
    ),
});
