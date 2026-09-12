import { AppConfig } from '../types.js';

/**
 * Sous-ensemble de la configuration qui appartient AU PROFESSEUR et doit
 * suivre son compte d'un appareil à l'autre (synchronisé dans le blob
 * `classes:{phone}`).
 *
 * On exclut ce qui est spécifique à l'appareil : `pushEnabled` (un téléphone
 * donné peut être abonné et un autre non) et `sessionVibration`. Ces deux
 * valeurs peuvent toutefois être REMONTÉES en lecture seule vers
 * l'administration via `TeacherSnapshot.notifyPrefs` (voir utils/progression.ts).
 */
export type SyncableSettings = Pick<
    AppConfig,
    | 'establishmentName'
    | 'defaultTeacherName'
    | 'academyRegion'
    | 'educationProvince'
    | 'applicationLocale'
    | 'selectedCycles'
    | 'selectedSubjects'
    | 'showAllCycles'
    | 'showAllSubjects'
    | 'hasCompletedWelcome'
    | 'showGettingStarted'
    | 'firstNotebookOpened'
    | 'screenDescriptionMode'
    | 'screenDescriptionTypes'
    | 'printDescriptionMode'
    | 'printDescriptionTypes'
    | 'schedules'
    | 'timetable'
    | 'dashboardClassOrder'
    | 'absences'
    | 'assessmentDates'
    | 'assessmentAbsences'
    | 'pedagogicalEvents'
    | 'manualAssessments'
    | 'removedAssessments'
    | 'assessmentOrder'
    | 'schoolYearStart'
    | 'notificationDismissals'
> & {
    /** préférences de notification hors états locaux à l'appareil (push, vibration) */
    notify?: Omit<NonNullable<AppConfig['notificationSettings']>, 'pushEnabled' | 'sessionVibration'>;
};

/** Clés de configuration synchronisées cloud, toute modification de l'une
 *  d'elles doit marquer le blob classes comme sale (markClassesListDirty). */
export const SYNCABLE_KEYS: (keyof SyncableSettings)[] = [
    'establishmentName',
    'defaultTeacherName',
    'academyRegion',
    'educationProvince',
    'applicationLocale',
    'selectedCycles',
    'selectedSubjects',
    'showAllCycles',
    'showAllSubjects',
    'hasCompletedWelcome',
    'showGettingStarted',
    'firstNotebookOpened',
    'screenDescriptionMode',
    'screenDescriptionTypes',
    'printDescriptionMode',
    'printDescriptionTypes',
    'schedules',
    'timetable',
    'dashboardClassOrder',
    'absences',
    'assessmentDates',
    'assessmentAbsences',
    'pedagogicalEvents',
    'manualAssessments',
    'removedAssessments',
    'assessmentOrder',
    'schoolYearStart',
    'notificationDismissals',
];

export const extractSyncableSettings = (config: Partial<AppConfig>): SyncableSettings => {
    const out: any = {};
    for (const key of SYNCABLE_KEYS) {
        if (config[key as keyof AppConfig] !== undefined) out[key] = config[key as keyof AppConfig];
    }
    if (config.notificationSettings) {
        const { pushEnabled: _ignored, sessionVibration: _ignored2, ...rest } = config.notificationSettings;
        delete (rest as Record<string, unknown>).autoOpenCurrentClass;
        out.notify = rest;
    }
    return out as SyncableSettings;
};

/** Fusionne des réglages venus du cloud dans la config locale (le push local reste prioritaire pour l'état push). */
export const mergeSyncableSettings = (local: Partial<AppConfig>, remote: SyncableSettings | undefined): Partial<AppConfig> => {
    if (!remote) return local;
    const merged: Partial<AppConfig> = { ...local };
    for (const key of SYNCABLE_KEYS) {
        if (remote[key as keyof SyncableSettings] !== undefined) {
            (merged as any)[key] = remote[key as keyof SyncableSettings];
        }
    }
    if (remote.notify) {
        const localNotify = { ...(local.notificationSettings ?? {}) } as Record<string, unknown>;
        const remoteNotify = { ...remote.notify } as Record<string, unknown>;
        delete localNotify.autoOpenCurrentClass;
        delete remoteNotify.autoOpenCurrentClass;
        merged.notificationSettings = {
            ...localNotify,
            ...remoteNotify,
            // les états push et vibration restent ceux de CET appareil
            pushEnabled: local.notificationSettings?.pushEnabled ?? false,
            sessionVibration: local.notificationSettings?.sessionVibration ?? false,
        } as NonNullable<AppConfig['notificationSettings']>;
    }
    return merged;
};
