import { AbsencePeriod, ClassInfo, ClassSchedule, ClassSnapshot, LessonsData, NotificationSettings, TeacherSnapshot } from '../types';
import { flattenLessons } from './dataUtils';

// Réplique exacte du filtre historique d'AnalysisModal : un « élément de contenu »
// est tout nœud aplati dont le type n'est pas un conteneur nommé.
const isContentEntry = (entry: { data: any }): boolean => {
    const type = entry.data?.type;
    return type !== 'chapter' && type !== 'section' && type !== 'subsection' && type !== 'subsubsection';
};

export interface ChapterProgress {
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

export const computeProgressionStats = (lessonsData: LessonsData): ProgressionStats => {
    const contentItems = flattenLessons(lessonsData).filter(isContentEntry);

    const totalItems = contentItems.length;
    const plannedItems = contentItems.filter(entry => !!entry.data?.date);
    const plannedCount = plannedItems.length;

    const uniqueDates = new Set(plannedItems.map(entry => entry.data.date as string).filter(Boolean));
    const sessionsCount = uniqueDates.size;

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

    return { totalItems, plannedCount, completionRate, sessionsCount, unplannedItems, lastDate, perChapter };
};

export const computeClassSnapshot = (
    classInfo: ClassInfo,
    lessonsData: LessonsData,
    schedule?: ClassSchedule
): ClassSnapshot => {
    const stats = computeProgressionStats(lessonsData);
    const slots = schedule?.slots ?? [];
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
        sessionsPerWeek: slots.reduce((sum, slot) => sum + (slot.sessions ?? 1), 0),
        updatedAt: new Date().toISOString(),
    };
};

export const computeTeacherSnapshot = (
    user: { phone: string; nom: string; prenom: string },
    classes: ClassInfo[],
    schedules: ClassSchedule[] | undefined,
    notificationSettings: NotificationSettings | undefined,
    readLessons: (classId: string) => LessonsData,
    absences?: AbsencePeriod[]
): TeacherSnapshot => ({
    phone: user.phone,
    nom: user.nom,
    prenom: user.prenom,
    lastSyncAt: new Date().toISOString(),
    absences: absences && absences.length > 0 ? absences : undefined,
    notifyPrefs: notificationSettings
        ? {
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
