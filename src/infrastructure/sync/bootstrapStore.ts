import { createStore } from 'zustand/vanilla';
import { IDLE_BOOTSTRAP, type BootstrapSignals } from '../../domain/sync/bootstrapProgress';

/**
 * Signaux du premier chargement, partagés hors React via Zustand vanilla :
 * la synchronisation les marque depuis un contexte, l'écran de chargement les lit.
 * Les étapes ne reviennent jamais en arrière pendant la session, sinon la barre reculerait.
 */
const vanillaBootstrapStore = createStore<BootstrapSignals>(() => IDLE_BOOTSTRAP);

const publish = (next: BootstrapSignals) => {
    const current = vanillaBootstrapStore.getState();
    if (next.timetable === current.timetable && next.classes === current.classes) return;
    vanillaBootstrapStore.setState(next, true);
};

export const bootstrapStore = {
    subscribe(listener: () => void): () => void {
        return vanillaBootstrapStore.subscribe(() => listener());
    },
    getSnapshot: (): BootstrapSignals => vanillaBootstrapStore.getState(),
    /** L'emploi du temps et les réglages viennent d'être appliqués localement. */
    markTimetable: () => publish({ ...vanillaBootstrapStore.getState(), timetable: true }),
    /** La liste des classes vient d'être appliquée localement. */
    markClasses: () => publish({ ...vanillaBootstrapStore.getState(), classes: true }),
    /** Déconnexion ou changement de compte : le prochain chargement repart de zéro. */
    reset: () => publish(IDLE_BOOTSTRAP),
};
