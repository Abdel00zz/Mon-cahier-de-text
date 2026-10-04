import { useSyncExternalStore } from 'react';
import { bootstrapProgress, IDLE_BOOTSTRAP, type BootstrapSignals } from '../domain/sync/bootstrapProgress';
import { bootstrapStore } from '../infrastructure/sync/bootstrapStore';

const serverSnapshot = (): BootstrapSignals => IDLE_BOOTSTRAP;

/** Progression réelle du premier chargement, lue par l'écran d'attente. */
export function useBootstrapProgress() {
    return bootstrapProgress(useSyncExternalStore(bootstrapStore.subscribe, bootstrapStore.getSnapshot, serverSnapshot));
}
