/**
 * Mesures terrain des Core Web Vitals (LCP, CLS, INP, TTFB).
 *
 * Objectif : savoir ce que vivent réellement les enseignants sur un téléphone
 * d'entrée de gamme, sans dépendance externe et sans coût quand la mesure est
 * inutile. Les API natives `PerformanceObserver` suffisent ; l'envoi n'a lieu
 * que si un point de collecte est configuré (`VITE_WEB_VITALS_ENDPOINT`).
 *
 * L'environnement est injectable, comme `createMeasurements`, pour que la
 * logique de classement et d'agrégation soit testable sans navigateur.
 */
export type VitalName = 'LCP' | 'CLS' | 'INP' | 'TTFB';
export type VitalRating = 'good' | 'needs-improvement' | 'poor';

export interface VitalSample {
    name: VitalName;
    value: number;
    rating: VitalRating;
}

/** Seuils officiels web.dev : bonne valeur / valeur à corriger. */
export const VITAL_THRESHOLDS: Record<VitalName, readonly [number, number]> = {
    LCP: [2500, 4000],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    TTFB: [800, 1800],
};

export function rateVital(name: VitalName, value: number): VitalRating {
    const [good, poor] = VITAL_THRESHOLDS[name];
    if (value <= good) return 'good';
    return value <= poor ? 'needs-improvement' : 'poor';
}

export interface VitalsSink {
    log: (sample: VitalSample) => void;
    send?: (samples: VitalSample[]) => void;
}

export interface VitalsCollector {
    /** Enregistre une mesure ; seule la plus pénalisante est conservée. */
    record: (name: VitalName, value: number) => void;
    /** Vide le tampon et transmet les mesures accumulées. */
    flush: () => VitalSample[];
    /** Indicateurs en attente, sans les transmettre. */
    pending: () => VitalName[];
}

/**
 * Le tampon est borné par construction (4 indicateurs), ce qui évite toute
 * croissance mémoire sur une session longue comme une journée de cours.
 */
export function createVitalsCollector(sink: VitalsSink): VitalsCollector {
    const worst = new Map<VitalName, number>();
    return {
        record(name, value) {
            if (!Number.isFinite(value) || value < 0) return;
            const current = worst.get(name);
            // CLS est une somme de décalages : la plus grande valeur l'emporte.
            if (current === undefined || value > current) worst.set(name, value);
        },
        flush() {
            if (worst.size === 0) return [];
            const samples: VitalSample[] = [...worst.entries()].map(([name, value]) => ({
                name,
                value: Math.round(value * 1000) / 1000,
                rating: rateVital(name, value),
            }));
            worst.clear();
            for (const sample of samples) sink.log(sample);
            sink.send?.(samples);
            return samples;
        },
        pending: () => [...worst.keys()],
    };
}

interface PerformanceEntryLike {
    entryType?: string;
    value?: number;
    startTime?: number;
    responseStart?: number;
    duration?: number;
    hadRecentInput?: boolean;
    interactionId?: number;
    name?: string;
}

interface VitalsEnvironment {
    observe?: (type: string, handler: (entries: PerformanceEntryLike[]) => void, buffered?: boolean) => () => void;
    navigationEntry?: () => PerformanceEntryLike | undefined;
    onHidden?: (handler: () => void) => () => void;
}

const browserEnvironment = (): VitalsEnvironment => {
    const performanceRef = typeof performance === 'undefined' ? undefined : performance;
    const observer = typeof PerformanceObserver === 'undefined' ? undefined : PerformanceObserver;
    return {
        observe: observer && performanceRef
            ? (type, handler, buffered = true) => {
                const instance = new observer(list => handler(list.getEntries() as PerformanceEntryLike[]));
                // Certains types ne sont pas reconnus par tous les moteurs : on ignore
                // silencieusement plutôt que de casser le démarrage.
                try { instance.observe({ type, buffered } as PerformanceObserverInit); } catch { return () => {}; }
                return () => instance.disconnect();
            }
            : undefined,
        navigationEntry: () => performanceRef?.getEntriesByType?.('navigation')?.[0] as PerformanceEntryLike | undefined,
        onHidden: typeof document === 'undefined'
            ? undefined
            : (handler) => {
                const onVisibility = () => { if (document.visibilityState === 'hidden') handler(); };
                document.addEventListener('visibilitychange', onVisibility);
                window.addEventListener('pagehide', handler);
                return () => {
                    document.removeEventListener('visibilitychange', onVisibility);
                    window.removeEventListener('pagehide', handler);
                };
            },
    };
};

export interface WebVitalsOptions {
    sink?: VitalsSink;
    environment?: VitalsEnvironment;
}

/**
 * Démarre la collecte et rend une fonction d'arrêt. Sans `PerformanceObserver`
 * (navigateur ancien, environnement de test), l'appel ne fait rien.
 */
export function initWebVitals(options: WebVitalsOptions = {}): () => void {
    const environment = options.environment ?? browserEnvironment();
    const sink = options.sink ?? defaultSink();
    const collector = createVitalsCollector(sink);
    const dispose: Array<() => void> = [];

    const listen = (type: string, handler: (entries: PerformanceEntryLike[]) => void) => {
        const stop = environment.observe?.(type, handler);
        if (stop) dispose.push(stop);
    };

    listen('largest-contentful-paint', entries => {
        for (const entry of entries) collector.record('LCP', entry.startTime ?? 0);
    });
    listen('layout-shift', entries => {
        for (const entry of entries) {
            if (!entry.hadRecentInput) collector.record('CLS', entry.value ?? 0);
        }
    });
    listen('event', entries => {
        for (const entry of entries) {
            if (entry.interactionId) collector.record('INP', entry.duration ?? 0);
        }
    });
    listen('first-input', entries => {
        for (const entry of entries) collector.record('INP', entry.duration ?? 0);
    });

    const navigation = environment.navigationEntry?.();
    if (navigation) {
        const responseStart = (navigation as { responseStart?: number }).responseStart;
        if (typeof responseStart === 'number') collector.record('TTFB', responseStart);
    }

    const stopHidden = environment.onHidden?.(() => collector.flush());
    if (stopHidden) dispose.push(stopHidden);

    return () => {
        for (const stop of dispose.splice(0)) stop();
        collector.flush();
    };
}

function defaultSink(): VitalsSink {
    const endpoint = import.meta.env?.VITE_WEB_VITALS_ENDPOINT;
    const dev = Boolean(import.meta.env?.DEV);
    return {
        log: sample => {
            if (dev) console.info('[vitals]', `${sample.name} ${sample.value} (${sample.rating})`);
        },
        send: endpoint
            ? samples => {
                // `keepalive` : la mesure la plus utile est souvent celle de la
                // sortie de page, quand l'enseignant ferme l'onglet.
                void fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ samples, path: location.pathname, at: Date.now() }),
                    keepalive: true,
                }).catch(() => {});
            }
            : undefined,
    };
}
