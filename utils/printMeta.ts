import { LessonsData } from '../types.js';
import { flattenLessons } from './dataUtils.js';

/**
 * Mémoire d'impression par classe : quelles dates de séances ont déjà été
 * imprimées ? Permet de proposer intelligemment de n'imprimer que les
 * nouveautés (économie de papier, gain de temps).
 */

/** Dernières préférences de mise en page choisies pour l'impression d'une classe. */
export interface PrintPrefs {
    textSize: 's' | 'm' | 'l';
    lineSpacing: 'compact' | 'normal' | 'aere';
    pageNumbers: boolean;
    /** en-tête administratif : première page, toutes les pages ou masqué */
    headerMode: 'first' | 'all' | 'none';
}

export interface PrintMeta {
    lastPrintedAt: string | null;
    printedDates: string[];
    /** préférences d'impression mémorisées (taille, aération, pagination) */
    prefs?: PrintPrefs;
}

const key = (classId: string) => `printMeta_v1_${classId}`;

const normalizeDateKeys = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .filter((date): date is string => typeof date === 'string')
            .map(date => date.trim())
            .filter(Boolean)
    )).sort();
};

const normalizePrintPrefs = (value: unknown): PrintPrefs | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    const prefs = value as Partial<PrintPrefs>;
    const textSize = prefs.textSize === 's' || prefs.textSize === 'm' || prefs.textSize === 'l' ? prefs.textSize : 'm';
    const lineSpacing = prefs.lineSpacing === 'compact' || prefs.lineSpacing === 'normal' || prefs.lineSpacing === 'aere' ? prefs.lineSpacing : 'normal';
    const headerMode = prefs.headerMode === 'all' || prefs.headerMode === 'none' ? prefs.headerMode : 'first';
    if (typeof prefs.pageNumbers !== 'boolean') return undefined;
    return { textSize, lineSpacing, pageNumbers: prefs.pageNumbers, headerMode };
};

export const readPrintMeta = (classId: string): PrintMeta => {
    try {
        const raw = localStorage.getItem(key(classId));
        if (raw) {
            const parsed = JSON.parse(raw) as PrintMeta;
            const printedDates = normalizeDateKeys(parsed.printedDates);
            const lastPrintedAt = typeof parsed.lastPrintedAt === 'string' && !Number.isNaN(Date.parse(parsed.lastPrintedAt))
                ? parsed.lastPrintedAt
                : null;
            return { lastPrintedAt, printedDates, prefs: normalizePrintPrefs(parsed.prefs) };
        }
    } catch {
        // corrompu : on repart de zéro
    }
    return { lastPrintedAt: null, printedDates: [] };
};

export const recordPrint = (classId: string, printedDates: string[]): boolean => {
    const existing = readPrintMeta(classId);
    const merged = normalizeDateKeys([...existing.printedDates, ...printedDates]);
    try {
        localStorage.setItem(
            key(classId),
            // préserve les préférences déjà mémorisées
            JSON.stringify({ lastPrintedAt: new Date().toISOString(), printedDates: merged, prefs: existing.prefs } satisfies PrintMeta)
        );
        return true;
    } catch {
        // stockage plein : l'impression fonctionne quand même
        return false;
    }
};

/** Mémorise les préférences d'impression sans toucher à l'historique des dates imprimées. */
export const savePrintPrefs = (classId: string, prefs: PrintPrefs): void => {
    const existing = readPrintMeta(classId);
    try {
        localStorage.setItem(key(classId), JSON.stringify({ ...existing, prefs } satisfies PrintMeta));
    } catch {
        // stockage plein : sans conséquence
    }
};

/** Toutes les dates de séances distinctes présentes dans le cahier. */
export const collectSessionDates = (lessonsData: LessonsData): string[] => {
    const dates = new Set<string>();
    for (const entry of flattenLessons(lessonsData)) {
        const date = (entry.data as any)?.date;
        if (typeof date === 'string' && date.trim()) dates.add(date.trim());
        const sepDate = (entry.data as any)?.separatorAfter?.date;
        if (typeof sepDate === 'string' && sepDate.trim()) dates.add(sepDate.trim());
    }
    return Array.from(dates).sort();
};

/** Dates jamais imprimées jusqu'ici. */
export const getNewDates = (lessonsData: LessonsData, classId: string): string[] => {
    const printed = new Set(readPrintMeta(classId).printedDates);
    return collectSessionDates(lessonsData).filter(date => !printed.has(date));
};

const nodeHasKeptContent = (node: any, keep: Set<string>): boolean => {
    if (typeof node !== 'object' || node === null) return false;
    const date = typeof node.date === 'string' ? node.date.trim() : '';
    if (date && keep.has(date)) return true;
    const separatorDate = typeof node.separatorAfter?.date === 'string' ? node.separatorAfter.date.trim() : '';
    if (separatorDate && keep.has(separatorDate)) return true;
    for (const childKey of ['sections', 'subsections', 'subsubsections', 'items'] as const) {
        const children = node[childKey];
        if (Array.isArray(children) && children.some((child: any) => nodeHasKeptContent(child, keep))) {
            return true;
        }
    }
    return false;
};

const pruneNode = <T extends Record<string, any>>(node: T, keep: Set<string>): T => {
    const clone: any = { ...node };
    const ownDate = typeof clone.date === 'string' ? clone.date.trim() : '';
    // Un parent peut rester pour donner le contexte d'une séance retenue,
    // mais sa propre date ne doit jamais réapparaître dans un tirage filtré.
    if (ownDate && !keep.has(ownDate)) delete clone.date;
    for (const childKey of ['sections', 'subsections', 'subsubsections', 'items'] as const) {
        const children = clone[childKey];
        if (Array.isArray(children)) {
            clone[childKey] = children
                .filter((child: any) => nodeHasKeptContent(child, keep))
                .map((child: any) => pruneNode(child, keep));
        }
    }
    // séparateur : conservé seulement si sa date fait partie de la sélection
    if (clone.separatorAfter) {
        const sepDate = typeof clone.separatorAfter.date === 'string' ? clone.separatorAfter.date.trim() : '';
        if (!sepDate || !keep.has(sepDate)) delete clone.separatorAfter;
    }
    return clone as T;
};

/**
 * Ne garde que les branches contenant au moins une séance dont la date fait
 * partie de `dates` (les titres de chapitres/sections parents sont conservés
 * pour le contexte).
 */
export const filterLessonsByDates = (lessonsData: LessonsData, dates: string[]): LessonsData => {
    const keep = new Set(dates.map(date => date.trim()).filter(Boolean));
    return lessonsData
        .filter(chapter => nodeHasKeptContent(chapter, keep))
        .map(chapter => pruneNode(chapter, keep));
};
