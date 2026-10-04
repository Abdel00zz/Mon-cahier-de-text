/**
 * Préchargement des écrans pendant l'inactivité.
 *
 * Objectif : la navigation ne doit plus afficher d'écran de chargement. L'ordre
 * suit les gestes attendus — le retour à l'accueil, puis l'éditeur, puis les
 * autres onglets — et l'écran déjà affiché passe en dernier.
 *
 * Une connexion économe (hors ligne, « économiseur de données », 2G) ne
 * précharge rien : le bénéfice serait annulé par le coût.
 */
export type PrefetchTarget = 'dashboard' | 'editor' | 'settings' | 'notifications' | 'evaluations' | 'guide';

export const PREFETCH_ORDER: readonly PrefetchTarget[] = [
    'dashboard',
    'editor',
    'settings',
    'notifications',
    'evaluations',
    'guide',
];

const loaders: Record<PrefetchTarget, () => Promise<unknown>> = {
    dashboard: () => import('../features/dashboard/Dashboard'),
    editor: () => import('../features/editor/Editor'),
    settings: () => import('../features/settings/SettingsPage'),
    notifications: () => import('../features/dashboard/NotificationsPage'),
    evaluations: () => import('../features/evaluations/DevoirsView'),
    guide: () => import('../features/guide/GuideModal'),
};

/** Charge un écran ; un module indisponible ne doit jamais casser la préparation. */
const loadScreen = (target: PrefetchTarget): Promise<unknown> =>
    loaders[target]().catch(() => undefined);

export interface PrefetchEnvironment {
    online: boolean;
    saveData: boolean;
    effectiveType: string;
    visible: boolean;
    requestIdle: (task: () => void) => number;
    cancelIdle: (handle: number) => void;
}

const browserEnvironment = (): PrefetchEnvironment => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const idle = window as unknown as {
        requestIdleCallback?: (task: () => void) => number;
        cancelIdleCallback?: (handle: number) => void;
    };
    return {
        online: navigator.onLine,
        saveData: connection?.saveData === true,
        effectiveType: connection?.effectiveType ?? '',
        visible: document.visibilityState === 'visible',
        // `requestIdleCallback` et `cancelIdleCallback` exigent que `this` soit
        // `window` : appelées détachées, elles lèvent « Illegal invocation »
        // (contrairement à setTimeout, qui tolère un appel direct).
        requestIdle: task => idle.requestIdleCallback ? idle.requestIdleCallback(task) : window.setTimeout(task, 1200),
        cancelIdle: handle => {
            if (idle.cancelIdleCallback) idle.cancelIdleCallback(handle);
            else window.clearTimeout(handle);
        },
    };
};

export interface PrefetchOptions {
    /** Écran affiché au démarrage : il est déjà chargé, tout le reste est préparé. */
    initialView?: string;
    environment?: PrefetchEnvironment;
    load?: (target: PrefetchTarget) => Promise<unknown>;
}

/** Lance la préparation et renvoie sa fonction d'annulation. */
export const startIdlePrefetch = (options: PrefetchOptions = {}): (() => void) => {
    const environment = options.environment ?? browserEnvironment();
    if (!environment.online || environment.saveData || /^(?:slow-)?2g$/.test(environment.effectiveType)) {
        return () => {};
    }
    const load = options.load ?? loadScreen;
    const order: readonly PrefetchTarget[] = options.initialView === 'editor'
        ? ['dashboard', ...PREFETCH_ORDER.filter(target => target !== 'dashboard')]
        : [...PREFETCH_ORDER];
    const handle = environment.requestIdle(() => {
        if (!environment.visible) return;
        for (const target of order) void load(target);
    });
    return () => environment.cancelIdle(handle);
};
