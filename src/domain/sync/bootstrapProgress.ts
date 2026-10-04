/**
 * Progression du premier chargement d'un espace enseignant.
 *
 * Sur une nouvelle machine, l'espace se reconstruit depuis le cloud : les
 * réglages et l'emploi du temps d'abord (ils ouvrent l'espace), puis la liste
 * des classes. Ce module est pur : il ne connaît ni le réseau, ni React, et
 * l'écran de chargement affiche exactement ce qui a réellement été appliqué.
 */
export const BOOTSTRAP_STEPS = ['timetable', 'classes'] as const;
export type BootstrapStep = typeof BOOTSTRAP_STEPS[number];

export interface BootstrapSignals {
    /** Réglages + emploi du temps appliqués localement. */
    timetable: boolean;
    /** Liste des classes appliquée localement. */
    classes: boolean;
}

export const IDLE_BOOTSTRAP: BootstrapSignals = { timetable: false, classes: false };

/**
 * Poids indicatifs, pas des octets : l'emploi du temps ouvre l'espace, la liste
 * des classes le complète. Les cahiers ne comptent pas ici — ils se téléchargent
 * à la demande, quand une classe est ouverte.
 */
const WEIGHTS: Record<BootstrapStep, number> = { timetable: 55, classes: 45 };

export interface BootstrapProgress {
    steps: readonly BootstrapStep[];
    /** Étape en cours ; la dernière reste affichée une fois le chargement fini. */
    step: BootstrapStep;
    index: number;
    percent: number;
    complete: boolean;
}

export function bootstrapProgress(signals: BootstrapSignals): BootstrapProgress {
    const complete = signals.timetable && signals.classes;
    const step: BootstrapStep = signals.timetable ? 'classes' : 'timetable';
    const percent = (signals.timetable ? WEIGHTS.timetable : 0) + (signals.classes ? WEIGHTS.classes : 0);
    return { steps: BOOTSTRAP_STEPS, step, index: BOOTSTRAP_STEPS.indexOf(step), percent, complete };
}
