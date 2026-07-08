import { AppConfig } from '../types';

/**
 * Sous-ensemble de la configuration qui appartient AU PROFESSEUR et doit
 * suivre son compte d'un appareil à l'autre (synchronisé dans le blob
 * `classes:{phone}`). On exclut ce qui est spécifique à l'appareil
 * (ex. `pushEnabled` d'un téléphone donné).
 */
export type SyncableSettings = Pick<
    AppConfig,
    | 'establishmentName'
    | 'defaultTeacherName'
    | 'selectedCycles'
    | 'selectedSubjects'
    | 'showAllCycles'
    | 'showAllSubjects'
    | 'screenDescriptionMode'
    | 'screenDescriptionTypes'
    | 'printDescriptionMode'
    | 'printDescriptionTypes'
    | 'schedules'
    | 'timetable'
    | 'absences'
    | 'assessmentDates'
    | 'schoolYearStart'
> & {
    /** préférences de notification hors états locaux à l'appareil (push, vibration) */
    notify?: Omit<NonNullable<AppConfig['notificationSettings']>, 'pushEnabled' | 'sessionVibration'>;
};

/** Clés de configuration synchronisées cloud — toute modification de l'une
 *  d'elles doit marquer le blob classes comme sale (markClassesListDirty). */
export const SYNCABLE_KEYS: (keyof SyncableSettings)[] = [
    'establishmentName',
    'defaultTeacherName',
    'selectedCycles',
    'selectedSubjects',
    'showAllCycles',
    'showAllSubjects',
    'screenDescriptionMode',
    'screenDescriptionTypes',
    'printDescriptionMode',
    'printDescriptionTypes',
    'schedules',
    'timetable',
    'absences',
    'assessmentDates',
    'schoolYearStart',
];

export const extractSyncableSettings = (config: Partial<AppConfig>): SyncableSettings => {
    const out: any = {};
    for (const key of SYNCABLE_KEYS) {
        if (config[key as keyof AppConfig] !== undefined) out[key] = config[key as keyof AppConfig];
    }
    if (config.notificationSettings) {
        const { pushEnabled: _ignored, sessionVibration: _ignored2, ...rest } = config.notificationSettings;
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
        merged.notificationSettings = {
            ...(local.notificationSettings ?? ({} as NonNullable<AppConfig['notificationSettings']>)),
            ...remote.notify,
            // les états push et vibration restent ceux de CET appareil
            pushEnabled: local.notificationSettings?.pushEnabled ?? false,
            sessionVibration: local.notificationSettings?.sessionVibration ?? false,
        };
    }
    return merged;
};
