import { startSafePwaAction } from './safeUpdate';

/*
 * Mise à jour du site web, sans service worker.
 *
 * Le service worker PWA a été retiré : la page ne peut plus « préparer » une
 * nouvelle version en arrière-plan. Elle compare donc la version publiée
 * (`/version.json`) à celle qu'elle exécute (`__APP_VERSION__`, injectée au
 * build) et propose un simple rechargement, différé tant qu'une saisie ou une
 * modale est en cours.
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

const browserEnvironment = (): WebUpdateEnvironment => ({
    online: () => navigator.onLine,
    publishedVersion: async () => {
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (!response.ok) return null;
        const payload: unknown = await response.json().catch(() => null);
        const version = payload && typeof payload === 'object' ? (payload as { version?: unknown }).version : null;
        return typeof version === 'string' && version ? version : null;
    },
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
        active: () => document.visibilityState === 'visible' && navigator.onLine
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
