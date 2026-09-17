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
    | 'contentNumbering'
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
    'contentNumbering',
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

/**
 * Dates de devoirs imposées par la direction : une classe protégée garde la
 * valeur du serveur tant que le professeur n'a pas poussé des réglages plus
 * récents que le filigrane. Sans cette règle, un appareil resté hors ligne
 * pouvait écraser silencieusement une date imposée en poussant ses anciens
 * réglages (les imports de cahier sont déjà protégés de la même manière).
 *
 * @param incoming dates reçues de l'appareil
 * @param server dates actuellement stockées (dont celles de la direction)
 * @param watermarks date d'imposition par classe (`adminAssessmentDatesUpdatedAt`)
 * @param submittedAt horodatage du push de réglages
 * @returns les dates à conserver et les filigranes encore actifs
 */
export const mergeAdminAssessmentDates = (
    incoming: Record<string, unknown> | undefined,
    server: Record<string, unknown> | undefined,
    watermarks: Record<string, string> | undefined,
    submittedAt: string,
): { assessmentDates: Record<string, unknown>; watermarks: Record<string, string> } => {
    const assessmentDates: Record<string, unknown> = { ...(incoming ?? {}) };
    const remaining: Record<string, string> = {};
    for (const [classId, watermark] of Object.entries(watermarks ?? {})) {
        // Le professeur a poussé des réglages postérieurs à l'imposition : sa
        // version fait foi et la protection se libère.
        if (!watermark || submittedAt > watermark) continue;
        remaining[classId] = watermark;
        const imposed = server?.[classId];
        if (!imposed || typeof imposed !== 'object' || Array.isArray(imposed)) continue;
        const current = assessmentDates[classId];
        assessmentDates[classId] = {
            ...(current && typeof current === 'object' && !Array.isArray(current) ? current as Record<string, unknown> : {}),
            ...(imposed as Record<string, unknown>),
        };
    }
    return { assessmentDates, watermarks: remaining };
};

/** Fusionne des réglages venus du cloud dans la config locale (le push local reste prioritaire pour l'état push). */export const mergeSyncableSettings = (local: Partial<AppConfig>, remote: SyncableSettings | undefined): Partial<AppConfig> => {
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
