import type { AbsenceSession } from '../../domain/notebook/absenceSessions';
import { LessonsData } from '../../types.js';
import { addDaysIso } from '../../domain/notebook/dataUtils.js';
import { visibleNotebookRows } from '../../domain/evaluations/homeworkPlacement.js';
import { buildContentNumbers } from '../../domain/notebook/contentNumbering.js';
import { buildLessonRows } from '../../domain/notebook/lessonRows.js';

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
    version: 2;
    lastPrintedAt: string | null;
    printedDates: string[];
    confirmedContent: Record<string, string>;
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
            // v1 recorded opening the preview, including cancelled jobs. Keep
            // layout preferences, but never treat those launches as a print.
            const confirmedContent = parsed.version === 2 && parsed.confirmedContent && typeof parsed.confirmedContent === 'object'
                ? Object.fromEntries(Object.entries(parsed.confirmedContent).filter(([date, signature]) => date.trim() && typeof signature === 'string' && /^[a-f0-9]{16}$/.test(signature)))
                : {};
            const printedDates = normalizeDateKeys(Object.keys(confirmedContent));
            const lastPrintedAt = parsed.version === 2 && typeof parsed.lastPrintedAt === 'string' && !Number.isNaN(Date.parse(parsed.lastPrintedAt))
                ? parsed.lastPrintedAt
                : null;
            return { version: 2, lastPrintedAt, printedDates, confirmedContent, prefs: normalizePrintPrefs(parsed.prefs) };
        }
    } catch {
        // corrompu : on repart de zéro
    }
    return { version: 2, lastPrintedAt: null, printedDates: [], confirmedContent: {} };
};

/** Call only after a completed native job or explicit confirmation on the web. */
export const recordPrint = (classId: string, signatures: Record<string, string>): boolean => {
    const existing = readPrintMeta(classId);
    const confirmedContent = { ...existing.confirmedContent, ...signatures };
    try {
        localStorage.setItem(
            key(classId),
            // préserve les préférences déjà mémorisées
            JSON.stringify({ version: 2, lastPrintedAt: new Date().toISOString(), printedDates: normalizeDateKeys(Object.keys(confirmedContent)), confirmedContent, prefs: existing.prefs } satisfies PrintMeta)
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
export const collectSessionDates = (lessonsData: LessonsData, absences: readonly AbsenceSession[] = []): string[] => {
    const dates = new Set<string>(absences.map(session => session.date));
    for (const entry of visibleNotebookRows(lessonsData)) {
        const date = (entry.data as any)?.date;
        if (typeof date === 'string' && date.trim()) dates.add(addDaysIso(date, 0));
    }
    return Array.from(dates).sort();
};

/** A content revision on the same date is new too. One traversal, bounded depth. */
export const sessionPrintSignatures = (lessonsData: LessonsData, absences: readonly AbsenceSession[] = [], annotations?: ReadonlyMap<string, string>): Record<string, string> => {
    const contextByKey = new Map<string, string>();
    const contentByDate = new Map<string, string[]>();
    for (const row of visibleNotebookRows(lessonsData)) {
        const scalarFields = Object.entries(row.data)
            .filter(([key, value]) => !key.startsWith('_') && key !== 'id' && key !== 'separatorAfter' && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))
            .sort(([a], [b]) => a.localeCompare(b));
        const own = JSON.stringify(scalarFields);
        contextByKey.set(row.key, own);
        const date = typeof row.data.date === 'string' ? addDaysIso(row.data.date, 0) : '';
        if (!date) continue;
        const content = JSON.stringify([...row.ancestorKeys.map(key => contextByKey.get(key)), own]);
        const pieces = contentByDate.get(date) ?? [];
        pieces.push(content); contentByDate.set(date, pieces);
    }
    for (const [date, pieces] of contentByDate) {
        const annotation = annotations?.get(date);
        if (annotation) pieces.push(JSON.stringify(['activity', annotation]));
    }
    for (const session of absences) {
        const pieces = contentByDate.get(session.date) ?? [];
        pieces.push(JSON.stringify(['absence', session.reasons]));
        contentByDate.set(session.date, pieces);
    }
    return Object.fromEntries([...contentByDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, pieces]) => {
        const content = JSON.stringify(pieces);
        let a = 2166136261, b = 3339675911;
        for (let index = 0; index < content.length; index++) {
            const value = content.charCodeAt(index);
            a = Math.imul(a ^ value, 16777619);
            b = Math.imul(b ^ value, 2246822519);
        }
        return [date, (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0')];
    }));
};

export const getNewDates = (lessonsData: LessonsData, classId: string, meta = readPrintMeta(classId), absences: readonly AbsenceSession[] = [], annotations?: ReadonlyMap<string, string>): string[] =>
    Object.entries(sessionPrintSignatures(lessonsData, absences, annotations)).filter(([date, signature]) => meta.confirmedContent[date] !== signature).map(([date]) => date);

const nodeHasKeptContent = (node: any, keep: Set<string>): boolean => {
    if (typeof node !== 'object' || node === null) return false;
    const date = typeof node.date === 'string' ? addDaysIso(node.date, 0) : '';
    if (date && keep.has(date)) return true;
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
    const ownDate = typeof clone.date === 'string' ? addDaysIso(clone.date, 0) : '';
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
    if (clone.separatorAfter) {
        delete clone.separatorAfter;
    }
    return clone as T;
};

/**
 * Ne garde que les branches contenant au moins une séance dont la date fait
 * partie de `dates` (les titres de chapitres/sections parents sont conservés
 * pour le contexte).
 */
export const filterLessonsByDates = (lessonsData: LessonsData, dates: string[]): LessonsData => {
    const keep = new Set(dates.map(date => addDaysIso(date, 0)).filter(Boolean));
    return lessonsData
        .filter(chapter => nodeHasKeptContent(chapter, keep))
        .map(chapter => pruneNode(chapter, keep));
};

/** Freeze displayed numbers before filtering/reindexing, without modifying the notebook. */
export const createPrintSelection = (lessons: LessonsData, dates: string[], numberingEnabled: boolean | import('../../types').ContentNumbering = true): LessonsData => {
    const numbers = buildContentNumbers(lessons, numberingEnabled);
    const byNode = new Map<object, string>();
    for (const row of buildLessonRows(lessons)) {
        const number = numbers.get(row.key);
        if (number) byNode.set(row.data, number);
    }
    const clone = (node: any): any => {
        const next = { ...node };
        const number = byNode.get(node);
        if (number) next.number = number;
        for (const key of ['sections', 'subsections', 'subsubsections', 'items']) {
            if (Array.isArray(node[key])) next[key] = node[key].map(clone);
        }
        return next;
    };
    return filterLessonsByDates(lessons.map(clone), dates);
};
