/*
 * OUTILS PURS DU TABLEAU DE BORD — mémoire des filtres, export CSV, rythme du rafraîchissement.
 *
 * Aucune dépendance à React ni au DOM : le stockage est injecté, ce qui permet de tout
 * vérifier sans navigateur.
 */
const SORT_KEYS = ['severity', 'completion', 'activity', 'name', 'establishment'] as const;
type OverviewSort = (typeof SORT_KEYS)[number];

const SEVERITY_FILTERS = ['all', 'ok', 'notice', 'warning', 'critical', 'inactive', 'messages', 'blocked'] as const;
type OverviewSeverityFilter = (typeof SEVERITY_FILTERS)[number];

export interface OverviewFilters {
    /** Clé d'établissement, ou `null` pour tous. */
    school: string | null;
    cycle: string;
    subject: string;
    severity: OverviewSeverityFilter;
    sort: OverviewSort;
}

export const DEFAULT_OVERVIEW_FILTERS: OverviewFilters = { school: null, cycle: 'all', subject: 'all', severity: 'all', sort: 'severity' };

const STORAGE_KEY = 'admin.overview.filters.v1';
const MAX_VALUE_LENGTH = 200;

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

const text = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value.length <= MAX_VALUE_LENGTH ? value : fallback;

/** Relit les filtres du dernier passage ; tout ce qui est absent, ancien ou altéré retombe sur les valeurs par défaut. */
export const readOverviewFilters = (storage: ReadableStorage | undefined): OverviewFilters => {
    try {
        const raw = storage?.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_OVERVIEW_FILTERS;
        const value = JSON.parse(raw) as Record<string, unknown>;
        const severity = (SEVERITY_FILTERS as readonly string[]).includes(value.severity as string)
            ? value.severity as OverviewSeverityFilter : DEFAULT_OVERVIEW_FILTERS.severity;
        const sort = (SORT_KEYS as readonly string[]).includes(value.sort as string)
            ? value.sort as OverviewSort : DEFAULT_OVERVIEW_FILTERS.sort;
        return {
            school: typeof value.school === 'string' && value.school.length <= MAX_VALUE_LENGTH ? value.school : null,
            cycle: text(value.cycle, 'all'),
            subject: text(value.subject, 'all'),
            severity,
            sort,
        };
    } catch {
        return DEFAULT_OVERVIEW_FILTERS;
    }
};

export const writeOverviewFilters = (storage: WritableStorage | undefined, filters: OverviewFilters): void => {
    try {
        const isDefault = (Object.keys(DEFAULT_OVERVIEW_FILTERS) as Array<keyof OverviewFilters>)
            .every(key => filters[key] === DEFAULT_OVERVIEW_FILTERS[key]);
        if (isDefault) storage?.removeItem(STORAGE_KEY);
        else storage?.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch { /* stockage plein ou refusé : les filtres restent actifs pour cette session */ }
};

/** Vrai si un filtre autre que le tri est actif (la recherche libre est comptée à part). */
export const hasActiveFilters = (filters: OverviewFilters): boolean =>
    filters.school !== null || filters.cycle !== 'all' || filters.subject !== 'all' || filters.severity !== 'all';

// ── Export CSV ────────────────────────────────────────────────────────────────

export interface CsvTeacherRow {
    name: string;
    school: string;
    email: string;
    phone: string;
    classes: number;
    cycles: string;
    completion: number;
    status: string;
    lastSyncAt: string;
    pendingMessages: number;
    blocked: boolean;
}

/**
 * Une cellule CSV sûre. Les noms viennent des enseignants : une cellule qui commence par
 * `=`, `+`, `-`, `@` ou une tabulation serait exécutée comme formule à l'ouverture dans un
 * tableur. Elle est donc préfixée d'une apostrophe, puis protégée par des guillemets.
 */
export const csvCell = (value: string | number | boolean): string => {
    let cell = String(value).replace(/\r?\n|\r/g, ' ');
    if (/^[=+\-@\t]/.test(cell)) cell = `'${cell}`;
    return /[;"]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
};

const CSV_HEADER = ['Enseignant', 'Établissement', 'E-mail', 'Téléphone', 'Classes', 'Cycles', 'Complétion (%)', 'Statut', 'Dernière synchronisation', 'Lectures attendues', 'Compte bloqué'];

/** Séparateur « ; » et BOM : l'export s'ouvre directement, accents compris, dans un tableur en français. */
export const teachersToCsv = (rows: readonly CsvTeacherRow[]): string => {
    const lines = [CSV_HEADER, ...rows.map(row => [
        row.name, row.school, row.email, row.phone, row.classes, row.cycles, row.completion,
        row.status, row.lastSyncAt, row.pendingMessages, row.blocked ? 'oui' : 'non',
    ])];
    return '\uFEFF' + lines.map(line => line.map(csvCell).join(';')).join('\r\n');
};

// ── Fraîcheur ─────────────────────────────────────────────────────────────────

/** « Actualisé il y a 12 s » : la ligne qui dit à la direction si elle regarde des données vivantes. */
export const freshnessLabel = (updatedAt: number | null, now: number): string => {
    if (updatedAt === null) return 'Pas encore actualisé';
    const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));
    if (seconds < 10) return 'Actualisé à l’instant';
    if (seconds < 60) return `Actualisé il y a ${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Actualisé il y a ${minutes} min`;
    return `Actualisé il y a ${Math.floor(minutes / 60)} h`;
};
