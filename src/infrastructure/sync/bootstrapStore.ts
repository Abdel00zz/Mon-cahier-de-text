import { IDLE_BOOTSTRAP, type BootstrapSignals } from '../../domain/sync/bootstrapProgress';

/**
 * Signaux du premier chargement, partagés hors React : la synchronisation les
 * marque depuis un contexte, l'écran de chargement les lit. Les étapes ne
 * reviennent jamais en arrière pendant la session, sinon la barre reculerait.
 */
let signals: BootstrapSignals = IDLE_BOOTSTRAP;
const listeners = new Set<() => void>();

const publish = (next: BootstrapSignals) => {
    if (next.timetable === signals.timetable && next.classes === signals.classes) return;
    signals = next;
    listeners.forEach(listener => listener());
};

export const bootstrapStore = {
    subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
    getSnapshot: (): BootstrapSignals => signals,
    /** L'emploi du temps et les réglages viennent d'être appliqués localement. */
    markTimetable: () => publish({ ...signals, timetable: true }),
    /** La liste des classes vient d'être appliquée localement. */
    markClasses: () => publish({ ...signals, classes: true }),
    /** Déconnexion ou changement de compte : le prochain chargement repart de zéro. */
    reset: () => publish(IDLE_BOOTSTRAP),
};
