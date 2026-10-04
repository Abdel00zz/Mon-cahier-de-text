import { useSyncExternalStore } from 'react';
import { readSyncProgress, subscribeSyncProgress, type SyncProgress } from '../infrastructure/sync/syncBus';

const serverSnapshot = (): SyncProgress => ({ state: 'idle', total: 0, done: 0, classId: null });

/**
 * Avancement réel du rapatriement cloud, lu par les cartes de classe.
 *
 * Une carte sait ainsi si son cahier est encore en route : elle garde sa
 * géométrie et affiche un voile discret au lieu d'un écran de chargement.
 */
export const useSyncProgress = (): SyncProgress =>
    useSyncExternalStore(subscribeSyncProgress, readSyncProgress, serverSnapshot);
