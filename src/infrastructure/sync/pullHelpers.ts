import type { AppConfig, ClassInfo, ContentDirection, EvaluationPolicy, LessonsData, TimetableClockPolicy } from '../../types';
import type { SyncableSettings } from './syncSettings';
import { requestSyncJson, SyncRequestError } from './syncTransport';

/** Nettoie les références d'une classe supprimée, même si la suppression vient d'un autre appareil. */
export const removeDeletedClassReferences = (
    config: Partial<AppConfig>,
    deletedIds: Set<string>,
): { config: Partial<AppConfig>; changed: boolean } => {
    if (deletedIds.size === 0) return { config, changed: false };

    const next = { ...config };
    let changed = false;
    const filterByClass = <T extends { classId: string }>(entries: T[] | undefined): T[] | undefined => {
        if (!entries) return entries;
        const filtered = entries.filter(entry => !deletedIds.has(entry.classId));
        if (filtered.length !== entries.length) changed = true;
        return filtered;
    };
    next.timetable = filterByClass(next.timetable);
    next.schedules = filterByClass(next.schedules);
    if (next.dashboardClassOrder) {
        const filteredOrder = next.dashboardClassOrder.filter(id => !deletedIds.has(id));
        if (filteredOrder.length !== next.dashboardClassOrder.length) {
            next.dashboardClassOrder = filteredOrder;
            changed = true;
        }
    }

    for (const key of ['sessionRemarkOverrides', 'assessmentDates', 'assessmentAbsences', 'assessmentDocuments', 'assessmentParticipants', 'classRosters', 'pedagogicalEvents', 'manualAssessments', 'removedAssessments', 'assessmentOrder', 'notificationDismissals'] as const) {
        const records = next[key];
        if (!records) continue;
        const filtered = { ...records };
        for (const classId of deletedIds) delete filtered[classId];
        if (Object.keys(filtered).length !== Object.keys(records).length) {
            (next as Record<string, unknown>)[key] = filtered;
            changed = true;
        }
    }
    return { config: next, changed };
};

interface RemoteLessonsBlob {
    lessonsData?: LessonsData;
    contentDirection?: ContentDirection;
    updatedAt?: string;
}

export const fetchLessonsBlob = async (classId: string, owner: string, signal: AbortSignal): Promise<RemoteLessonsBlob | null> => {
    try {
        return await requestSyncJson<RemoteLessonsBlob>(`/api/sync?classId=${encodeURIComponent(classId)}`, {
            credentials: 'same-origin',
            headers: { 'X-Workspace-Owner': owner },
            signal,
        });
    } catch (error) {
        if (error instanceof SyncRequestError && error.status === 404) return null;
        throw error;
    }
};

/**
 * Conflit multi-appareils : la version perdante (locale ou cloud) est
 * archivée avant écrasement, aucune donnée n'est jamais détruite en silence.
 * Une seule copie par classe (la plus récente), récupérable via
 * `classDataConflict_v1_{classId}`.
 */
export const backupConflictVersion = (classId: string, lessonsData: unknown, source: 'local' | 'cloud'): void => {
    try {
        localStorage.setItem(
            `classDataConflict_v1_${classId}`,
            JSON.stringify({ savedAt: new Date().toISOString(), source, lessonsData })
        );
    } catch {
        // stockage plein : on privilégie les données vivantes
    }
};

export interface ServerClassesBlob {
    classes: ClassInfo[];
    schedules: AppConfig['schedules'];
    timetable: AppConfig['timetable'];
    settings?: SyncableSettings;
    settingsUpdatedAt?: string;
    /** Référentiel global imposé par la direction, indépendant des réglages professeur. */
    timetableClock?: TimetableClockPolicy;
    /** Politique du contrôle continu résolue pour ce compte ; autoritaire, jamais renvoyée au serveur. */
    evaluationPolicy?: EvaluationPolicy;
    classMeta: Record<string, { updatedAt: string }>;
    /** Classes administrées : leurs métadonnées restent prioritaires sur une copie locale périmée. */
    adminClassOverrides?: Record<string, ClassInfo>;
    /** Suppressions durables : empêchent un appareil périmé de recréer une classe. */
    deletedClasses?: Record<string, { deletedAt: string }>;
    updatedAt: string;
}

