/**
 * Remontée d'erreurs : une erreur vue par un enseignant doit laisser une trace
 * exploitable, sans dépendance externe ni fuite de données personnelles.
 *
 * Règles :
 * - on ne transmet que le message, la pile, la route et l'horodatage ;
 * - une même erreur n'est signalée qu'une fois par session (pas de tempête) ;
 * - le tampon est plafonné, et rien ne part si aucun point de collecte n'est
 *   configuré (`VITE_ERROR_ENDPOINT`).
 */
export interface ErrorReport {
    message: string;
    stack?: string;
    componentStack?: string;
    route?: string;
    at: number;
}

export interface ErrorReporterOptions {
    endpoint?: string;
    /** Journal local (console) : activé en développement, silencieux en production. */
    log?: (report: ErrorReport) => void;
    send?: (report: ErrorReport) => void;
    now?: () => number;
    currentRoute?: () => string | undefined;
    /** Nombre maximal de signalements par session. */
    maxReports?: number;
}

const DEFAULT_MAX_REPORTS = 20;
// Les piles contiennent des chemins de build, pas des données d'élèves :
// la troncature évite d'envoyer des charges inutiles.
const MAX_TEXT = 2000;

export function createErrorReporter(options: ErrorReporterOptions = {}) {
    const seen = new Set<string>();
    const now = options.now ?? (() => Date.now());
    const route = options.currentRoute ?? (() => {
        if (typeof window === 'undefined') return undefined;
        return `${window.location.pathname}${window.location.hash}`;
    });
    const log = options.log;
    const send = options.send ?? (options.endpoint
        ? (report: ErrorReport) => {
            void fetch(options.endpoint as string, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report),
                keepalive: true,
            }).catch(() => {});
        }
        : undefined);

    return (error: Error, info?: { componentStack?: string | null }) => {
        const message = String(error?.message ?? error ?? 'Erreur inconnue');
        const key = `${message}|${error?.name ?? ''}`;
        if (seen.has(key)) return;
        if (seen.size >= (options.maxReports ?? DEFAULT_MAX_REPORTS)) return;
        seen.add(key);
        const report: ErrorReport = {
            message: message.slice(0, MAX_TEXT),
            stack: error?.stack?.slice(0, MAX_TEXT),
            componentStack: info?.componentStack?.slice(0, MAX_TEXT),
            route: route(),
            at: now(),
        };
        log?.(report);
        send?.(report);
    };
}

export const reportAppError = createErrorReporter({
    endpoint: import.meta.env?.VITE_ERROR_ENDPOINT,
    log: import.meta.env?.DEV ? report => console.warn('[erreur]', report.message) : undefined,
});
