/**
 * La grille et les cahiers sont enregistrés localement sans attendre le cloud.
 * Les changements synchronisables sont regroupés dans un cycle cloud espacé.
 */
export const CLOUD_SYNC_INTERVAL_MS = 3 * 60_000;

/** Clés de configuration qui doivent rejoindre la file de synchronisation cloud. */
const SYNCABLE_SETTINGS_KEYS: ReadonlySet<string> = new Set([
    'timetable',
    'schedules',
    'classRosters',
    'pedagogicalEvents',
    'manualAssessments',
    'assessmentDates',
    'assessmentParticipants',
    'assessmentDocuments',
    'assessmentAbsences',
    'removedAssessments',
    'sessionRemarkOverrides',
]);

export const touchesSyncableSettings = (keys: readonly string[] | undefined): boolean =>
    Boolean(keys?.some(key => SYNCABLE_SETTINGS_KEYS.has(key)));

/** Temps restant avant la prochaine fenêtre cloud; la première fenêtre s'ouvre dans trois minutes. */
export const cloudSyncDelay = (now: number, lastRequestAt: number): number =>
    lastRequestAt > 0
        ? Math.max(0, lastRequestAt + CLOUD_SYNC_INTERVAL_MS - now)
        : CLOUD_SYNC_INTERVAL_MS;
