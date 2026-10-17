import { reconcileClassRosters } from '../../domain/evaluations/classRosterSync.js';
import { AppConfig } from '../../types.js';
import { mergePedagogicalDocuments } from '../../domain/evaluations/documentSync.js';
import { sessionReminderMinutes } from '../../domain/notifications/sessionReminderTiming.js';

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
    | 'assessmentDocuments'
    | 'assessmentParticipants'
    | 'pedagogicalEvents'
    | 'manualAssessments'
    | 'removedAssessments'
    | 'assessmentOrder'
    | 'sessionRemarkOverrides'
    | 'schoolYearStart'
    | 'notificationDismissals'
> & {
    /** Shared class lists; pending edits are merged independently of other settings. */
    classRosters?: AppConfig['classRosters'];
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
    'assessmentDocuments',
    'assessmentParticipants',
    'classRosters',
    'pedagogicalEvents',
    'manualAssessments',
    'removedAssessments',
    'assessmentOrder',
    'sessionRemarkOverrides',
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
            // Migrate a legacy remote delay before a local version marker can mask it.
            ...(remote.notify.sessionReminderMinutes !== undefined ? {
                sessionReminderMinutes: sessionReminderMinutes(remote.notify),
                sessionReminderTimingVersion: 1,
            } : {}),
            // les états push et vibration restent ceux de CET appareil
            pushEnabled: local.notificationSettings?.pushEnabled ?? false,
            sessionVibration: local.notificationSettings?.sessionVibration ?? false,
        } as NonNullable<AppConfig['notificationSettings']>;
    }
    merged.classRosters = reconcileClassRosters(local.classRosters, remote.classRosters ?? local.classRosters);
    return mergeStudentFollowUpRecords(mergePedagogicalDocuments(merged, local), local);
};

type StampedRecord = { updatedAt?: string };
const recordStamp = (record?: StampedRecord) => (record?.updatedAt ? Date.parse(record.updatedAt) || 0 : -1);
const latestRecord = <T extends StampedRecord>(preferred?: T, other?: T): T | undefined =>
    recordStamp(other) > recordStamp(preferred) ? other : preferred;

function mergeClassAssessmentMap<T extends StampedRecord>(
    preferred: Record<string, Record<string, T>> | undefined,
    other: Record<string, Record<string, T>> | undefined,
    removedAssessments: AppConfig['removedAssessments'] | undefined,
): Record<string, Record<string, T>> | undefined {
    if (preferred === undefined && other === undefined) return undefined;
    const out: Record<string, Record<string, T>> = {};
    const classIds = new Set([...Object.keys(preferred ?? {}), ...Object.keys(other ?? {})]);
    for (const classId of classIds) {
        const first = preferred?.[classId] ?? {};
        const second = other?.[classId] ?? {};
        const removed = new Set(removedAssessments?.[classId]);
        const values: Record<string, T> = {};
        for (const id of new Set([...Object.keys(first), ...Object.keys(second)])) {
            if (removed.has(id)) continue;
            const picked = latestRecord(first[id], second[id]);
            if (picked) values[id] = picked;
        }
        out[classId] = values;
    }
    return out;
}

/**
 * Fusion granulaire par horodatage (`updatedAt`) des suivis d'élèves
 * (`assessmentParticipants`, `assessmentAbsences` et `pedagogicalEvents[*].students`)
 * afin que deux saisies sur des évaluations ou activités différentes ne s'écrasent pas.
 */
export function mergeStudentFollowUpRecords<
    T extends Pick<Partial<AppConfig>, 'assessmentParticipants' | 'assessmentAbsences' | 'pedagogicalEvents' | 'removedAssessments'>,
>(preferred: T, other: Pick<Partial<AppConfig>, 'assessmentParticipants' | 'assessmentAbsences' | 'pedagogicalEvents'>): T {
    const merged: T = { ...preferred };
    const participants = mergeClassAssessmentMap(preferred.assessmentParticipants, other.assessmentParticipants, preferred.removedAssessments);
    if (participants !== undefined) merged.assessmentParticipants = participants;
    const absences = mergeClassAssessmentMap(preferred.assessmentAbsences, other.assessmentAbsences, preferred.removedAssessments);
    if (absences !== undefined) merged.assessmentAbsences = absences;
    if (preferred.pedagogicalEvents) {
        merged.pedagogicalEvents = Object.fromEntries(
            Object.entries(preferred.pedagogicalEvents).map(([classId, events]) => {
                const previousStudents = new Map((other.pedagogicalEvents?.[classId] ?? []).map(event => [event.id, event.students]));
                return [
                    classId,
                    events.map(event => {
                        const students = latestRecord(event.students, previousStudents.get(event.id));
                        return students === event.students ? event : { ...event, students };
                    }),
                ];
            }),
        );
    }
    return merged;
}
