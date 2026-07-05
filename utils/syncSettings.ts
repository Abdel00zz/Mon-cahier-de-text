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
    /** préférences de notification hors état push local */
    notify?: Omit<NonNullable<AppConfig['notificationSettings']>, 'pushEnabled'>;
};

const SYNCABLE_KEYS: (keyof SyncableSettings)[] = [
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
        const { pushEnabled: _ignored, ...rest } = config.notificationSettings;
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
            // l'état push reste celui de CET appareil
            pushEnabled: local.notificationSettings?.pushEnabled ?? false,
        };
    }
    return merged;
};
