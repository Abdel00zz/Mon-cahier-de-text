import { dequal } from 'dequal';
import { needsProfilePhoneSync } from '../../domain/auth/profilePhone';
import { mergeClassMetadata } from '../../domain/classes/classMetadata';
import { reconcileClassRosters } from '../../domain/evaluations/classRosterSync';
import { mergePedagogicalDocuments, pedagogicalDocumentsEqual } from '../../domain/evaluations/documentSync';
import { reconcileClassesEvaluationConfig } from '../../domain/evaluations/notebookReconciliation';
import { rostersForClasses } from '../../domain/evaluations/studentRoster';
import type { AppConfig, ClassInfo, ContentDirection, EvaluationPolicy, LessonsData, TimetableClockPolicy } from '../../types';
import { mergeStudentFollowUpRecords, mergeSyncableSettings, type SyncableSettings } from './syncSettings';
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

export interface PullDecision {
    serverClass: ClassInfo;
    serverUpdatedAt?: string;
    localIndex: number;
    action: 'apply' | 'requeue' | 'none';
    conflict: boolean;
    hasAdminOverride: boolean;
    serverIsNewer: boolean;
}

/** Fusionne les métadonnées des classes distantes et les surcharges administratives avec les classes locales visibles. */
export const mergeRemoteClassList = (
    localVisibleClasses: ClassInfo[],
    localTotalCount: number,
    server: Pick<ServerClassesBlob, 'classes' | 'adminClassOverrides'>,
): {
    mergedClasses: ClassInfo[];
    localChanged: boolean;
    metadataNeedsPush: boolean;
} => {
    const mergedClasses = [...localVisibleClasses];
    let localChanged = mergedClasses.length !== localTotalCount;
    let metadataNeedsPush = false;
    for (const remote of server.classes ?? []) {
        const index = mergedClasses.findIndex(item => item.id === remote.id);
        if (index < 0) continue;
        const previous = mergedClasses[index];
        const merged = mergeClassMetadata(previous, remote, server.adminClassOverrides?.[remote.id], 'incoming');
        if (!dequal(previous, merged)) {
            mergedClasses[index] = merged;
            localChanged = true;
        }
        if (merged === previous && previous.metadataUpdatedAt !== remote.metadataUpdatedAt) {
            metadataNeedsPush = true;
        }
    }
    return { mergedClasses, localChanged, metadataNeedsPush };
};

/** Phase 1 du pull : décisions synchrones LWW et détection des conflits multi-appareils. */
export const computePullDecisions = (
    server: Pick<ServerClassesBlob, 'classes' | 'classMeta' | 'adminClassOverrides'>,
    mergedClasses: readonly ClassInfo[],
    deletedIds: ReadonlySet<string>,
    syncMeta: Readonly<Record<string, { localUpdatedAt?: string; lastSyncedAt?: string }>>,
    queuedClassIds: ReadonlySet<string>,
): PullDecision[] =>
    (server.classes ?? [])
        .filter(serverClass => !deletedIds.has(serverClass.id))
        .map(serverClass => {
            const serverUpdatedAt = server.classMeta?.[serverClass.id]?.updatedAt;
            const meta = syncMeta[serverClass.id];
            const localUpdatedAt = meta?.localUpdatedAt;
            const lastSyncedAt = meta?.lastSyncedAt;
            const localIndex = mergedClasses.findIndex(c => c.id === serverClass.id);

            const serverIsNewer =
                !!serverUpdatedAt && (!localUpdatedAt || serverUpdatedAt > localUpdatedAt);

            const conflict =
                localIndex !== -1 &&
                ((queuedClassIds.has(serverClass.id) && serverIsNewer) ||
                (!!serverUpdatedAt && !!localUpdatedAt && !!lastSyncedAt &&
                serverUpdatedAt > lastSyncedAt && localUpdatedAt > lastSyncedAt &&
                serverUpdatedAt !== localUpdatedAt));
            const hasAdminOverride = !!server.adminClassOverrides?.[serverClass.id];

            const action: PullDecision['action'] =
                localIndex === -1 || serverIsNewer || hasAdminOverride
                    ? 'apply'
                    : localUpdatedAt && (!serverUpdatedAt || localUpdatedAt > serverUpdatedAt)
                        ? 'requeue'
                        : 'none';

            return { serverClass, serverUpdatedAt, localIndex, action, conflict, hasAdminOverride, serverIsNewer };
        });

/** Réconcilie les réglages, documents pédagogiques, suivis d'élèves et cahiers tirés. */
export const reconcilePulledSettings = (
    localConfig: Partial<AppConfig>,
    server: Pick<ServerClassesBlob, 'settings' | 'schedules' | 'timetable' | 'settingsUpdatedAt' | 'updatedAt'>,
    deletedIds: Set<string>,
    settingsMeta: { localUpdatedAt?: string; lastSyncedAt?: string },
    mergedClasses: ClassInfo[],
    readLessons: (classId: string) => LessonsData,
): {
    nextConfig: Partial<AppConfig>;
    configChanged: boolean;
    appliedSettingsAt?: string;
    settingsNeedPush: boolean;
} => {
    const cleanedConfig = removeDeletedClassReferences(localConfig, deletedIds);
    let nextConfig = cleanedConfig.config;
    let configChanged = cleanedConfig.changed;
    const settings: SyncableSettings | undefined =
        server.settings ??
        (server.schedules || server.timetable
            ? ({ schedules: server.schedules, timetable: server.timetable } as SyncableSettings)
            : undefined);
    const remoteSettingsAt = server.settingsUpdatedAt || server.updatedAt || '';
    const localHasSettings =
        (nextConfig.schedules?.length ?? 0) > 0 ||
        (nextConfig.timetable?.length ?? 0) > 0 ||
        !!nextConfig.establishmentName ||
        Object.keys(nextConfig.assessmentDates ?? {}).length > 0 ||
        Object.keys(nextConfig.assessmentDocuments ?? {}).length > 0 ||
        Object.keys(nextConfig.pedagogicalEvents ?? {}).length > 0 ||
        Object.keys(nextConfig.manualAssessments ?? {}).length > 0 ||
        Object.keys(nextConfig.assessmentParticipants ?? {}).length > 0 ||
        Object.keys(nextConfig.assessmentAbsences ?? {}).length > 0 ||
        Object.keys(nextConfig.classRosters ?? {}).length > 0;
    const shouldApplyRemoteSettings =
        !!settings &&
        (
            (!localHasSettings && !settingsMeta.localUpdatedAt) ||
            (!!remoteSettingsAt && !!settingsMeta.localUpdatedAt && remoteSettingsAt > settingsMeta.localUpdatedAt
                && remoteSettingsAt !== settingsMeta.lastSyncedAt)
        );
    let appliedSettingsAt: string | undefined;
    let settingsNeedPush = false;
    if (settings && shouldApplyRemoteSettings) {
        nextConfig = mergeSyncableSettings(nextConfig, settings);
        if (remoteSettingsAt) appliedSettingsAt = remoteSettingsAt;
        configChanged = true;
    } else if (settings && localHasSettings && !settingsMeta.localUpdatedAt && remoteSettingsAt) {
        settingsNeedPush = true;
    }

    if (needsProfilePhoneSync(nextConfig.teacherPhone, settings?.teacherPhone)) settingsNeedPush = true;

    const withDocuments = removeDeletedClassReferences(
        mergeStudentFollowUpRecords(mergePedagogicalDocuments(nextConfig, settings ?? {}), settings ?? {}),
        deletedIds,
    ).config;
    if (
        !pedagogicalDocumentsEqual(nextConfig, withDocuments) ||
        !dequal(nextConfig.assessmentParticipants ?? {}, withDocuments.assessmentParticipants ?? {}) ||
        !dequal(nextConfig.assessmentAbsences ?? {}, withDocuments.assessmentAbsences ?? {})
    ) {
        configChanged = true;
    }
    nextConfig = withDocuments;
    if (!pedagogicalDocumentsEqual(nextConfig, settings ?? {})) settingsNeedPush = true;

    if (settings?.classRosters !== undefined) {
        const classRosters = rostersForClasses(
            reconcileClassRosters(localConfig.classRosters, settings.classRosters),
            mergedClasses.map(item => item.id),
        );
        if (!dequal(nextConfig.classRosters ?? {}, classRosters)) {
            nextConfig = { ...nextConfig, classRosters };
            configChanged = true;
        }
        if (Object.values(classRosters).some(roster => roster.edit)) settingsNeedPush = true;
    }

    const reconciledNotebooks = reconcileClassesEvaluationConfig(
        mergedClasses,
        nextConfig,
        readLessons,
    );
    if (reconciledNotebooks.updated) {
        nextConfig = reconciledNotebooks.config;
        configChanged = true;
        settingsNeedPush = true;
    }

    return { nextConfig, configChanged, appliedSettingsAt, settingsNeedPush };
};

