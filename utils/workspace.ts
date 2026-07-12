import { resetSyncState } from './syncBus.js';

/**
 * Sépare deux utilisateurs d'un même appareil en supprimant le poste de
 * travail local à la déconnexion. Les données déjà synchronisées sont
 * récupérées automatiquement à la prochaine connexion du bon compte.
 */
export const clearLocalWorkspace = (): void => {
    const prefixes = [
        'classData_v1_', 'editJournal_v1_', 'printMeta_v1_', 'archive_',
        'assessmentSnooze_', 'latenessSnooze_',
    ];
    const exactKeys = [
        'appConfig_v1', 'classManager_v1', 'app_first_launch_v1',
        'syncMeta_v1', 'settingsSyncMeta_v1', 'archives_v1_index',
    ];

    try {
        const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
            .filter((key): key is string => Boolean(key));
        for (const key of keys) {
            if (exactKeys.includes(key) || prefixes.some(prefix => key.startsWith(prefix))) {
                localStorage.removeItem(key);
            }
        }
    } catch {
        // Le reset mémoire ci-dessous évite tout de même une synchronisation croisée.
    }
    resetSyncState();
};
