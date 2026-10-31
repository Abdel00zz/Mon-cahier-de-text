import { isNetworkOnline } from './networkStatus';
import { startSafePwaAction } from './safeUpdate';

/*
 * Vérification de la version publiée, indépendante du cache PWA. Un
 * rechargement demandé reste différé tant qu'une saisie ou une modale est ouverte.
 */
export type WebUpdateState = 'idle' | 'checking' | 'current' | 'downloaded' | 'pending' | 'applying' | 'offline' | 'unavailable' | 'error';

export interface WebUpdateEnvironment {
    online(): boolean;
    /** Version publiée, ou null si `/version.json` est indisponible. */
    publishedVersion(): Promise<string | null>;
    /** Version compilée dans cette page. */
    currentVersion(): string;
    reload(): void;
    schedule(action: () => void): () => void;
}

declare const __APP_VERSION__: string;

/** Bound the complete response, including its body, on slow mobile networks. */
export async function readPublishedWebVersion(fetcher: typeof fetch = fetch, timeoutMs = 8_000): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetcher('/version.json', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return null;
        const payload: unknown = await response.json();
        if (controller.signal.aborted) throw new DOMException('Version request timed out', 'AbortError');
        const version = payload && typeof payload === 'object' ? (payload as { version?: unknown }).version : null;
        return typeof version === 'string' && version.trim() ? version.trim() : null;
    } finally {
        clearTimeout(timeout);
    }
}

const browserEnvironment = (): WebUpdateEnvironment => ({
    online: () => isNetworkOnline(),
    publishedVersion: () => readPublishedWebVersion(),
    currentVersion: () => (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'),
    reload: () => window.location.reload(),
    schedule: action => startSafePwaAction(action),
});

/** Un seul contrôleur pour les vérifications automatiques de version. */
export function createWebUpdateControl(environment: WebUpdateEnvironment = browserEnvironment()) {
    let state: WebUpdateState = 'idle';
    let cancelApply: (() => void) | undefined;
    let inFlight: Promise<void> | undefined;
    const listeners = new Set<() => void>();
    const set = (next: WebUpdateState) => {
        if (state === next) return;
        state = next;
        listeners.forEach(listener => listener());
    };
    return {
        getSnapshot: () => state,
        subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
        check(): Promise<void> {
            if (inFlight) return inFlight;
            // A focus/network event must not overwrite a queued reload's state.
            if (state === 'pending' || state === 'applying') return Promise.resolve();
            if (!environment.online()) { set('offline'); return Promise.resolve(); }
            set('checking');
            inFlight = environment.publishedVersion()
                .then(published => {
                    if (published === null) return set('unavailable');
                    set(published === environment.currentVersion() ? 'current' : 'downloaded');
                })
                .catch(() => set('error'))
                .finally(() => { inFlight = undefined; });
            return inFlight;
        },
        /** Applique la mise à jour dès que l'interface est au calme. */
        apply() {
            if (state !== 'downloaded' || cancelApply) return;
            set('pending');
            cancelApply = environment.schedule(() => {
                cancelApply = undefined;
                set('applying');
                environment.reload();
            });
        },
        cancel() {
            if (cancelApply) { cancelApply(); cancelApply = undefined; }
            if (state === 'pending') set('downloaded');
        },
    };
}

const webUpdates = createWebUpdateControl();

/**
 * Vérifie au retour dans la page, au plus une fois par heure : aucun minuteur
 * permanent, aucune requête en arrière-plan.
 */
export function startAppUpdateChecks(env?: { active: () => boolean; now: () => number; subscribe: (check: () => void) => () => void }, control: { check: () => Promise<void> | void } = webUpdates) {
    const environment = env ?? {
        active: () => document.visibilityState === 'visible' && isNetworkOnline()
            && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
        now: () => Date.now(),
        subscribe: (check: () => void) => {
            document.addEventListener('visibilitychange', check);
            window.addEventListener('online', check);
            window.addEventListener('focus', check);
            return () => {
                document.removeEventListener('visibilitychange', check);
                window.removeEventListener('online', check);
                window.removeEventListener('focus', check);
            };
        },
    };
    let stopped = false;
    let nextCheck = 0;
    const check = () => {
        if (stopped || !environment.active() || environment.now() < nextCheck) return;
        nextCheck = environment.now() + 3600_000;
        void control.check();
    };
    const unsubscribe = environment.subscribe(check);
    check();
    return () => { stopped = true; unsubscribe(); };
}
