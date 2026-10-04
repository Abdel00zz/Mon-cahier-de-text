/**
 * Mesures de vitesse, activées seulement en développement.
 *
 * Aucun coût en production : quand les mesures sont désactivées, `start` et
 * `end` ne font rien. Les durées s'affichent dans le journal de développement
 * (`[perf] nom : 1 200 ms`) et servent de référence avant/après optimisation.
 *
 * L'environnement est injectable, comme `startSafePwaAction` ou
 * `startIdlePrefetch`, pour que la mesure elle-même soit testable.
 */
export interface MeasurementEnvironment {
    enabled: boolean;
    now: () => number;
    log: (line: string) => void;
}

type MeasurementDetail = Record<string, string | number>;

export interface Measurements {
    start: (name: string) => void;
    /** Rend la durée mesurée, ou `null` si le chronomètre n'existe pas ou est désactivé. */
    end: (name: string, detail?: MeasurementDetail) => number | null;
}

export function createMeasurements(environment: MeasurementEnvironment): Measurements {
    const started = new Map<string, number>();
    const detailLine = (detail?: MeasurementDetail) => detail
        ? ' ' + Object.entries(detail).map(([key, value]) => `${key}=${value}`).join(' ')
        : '';
    return {
        start(name: string) {
            if (!environment.enabled) return;
            started.set(name, environment.now());
        },
        end(name: string, detail?: MeasurementDetail) {
            if (!environment.enabled) return null;
            const from = started.get(name);
            started.delete(name);
            if (from === undefined) return null;
            const duration = Math.round(environment.now() - from);
            environment.log(`${name}: ${duration} ms${detailLine(detail)}`);
            return duration;
        },
    };
}

const browserEnvironment = (): MeasurementEnvironment => ({
    enabled: Boolean(import.meta.env?.DEV),
    now: () => performance.now(),
    log: line => console.info('[perf]', line),
});

export const measurements = createMeasurements(browserEnvironment());

/** Libellés des étapes mesurées, en un seul endroit pour comparer les relevés. */
export const MEASURES = {
    loginStart: 'connexion/debut',
    loginReady: 'connexion/prete',
    syncStart: 'synchronisation/debut',
    syncTimetable: 'synchronisation/emploi-du-temps',
    syncClasses: 'synchronisation/classes',
    notebook: 'cahier/ouverture',
} as const;
