import { LessonsData } from '../types';
import { flattenLessons } from './dataUtils';

/**
 * Mémoire d'impression par classe : quelles dates de séances ont déjà été
 * imprimées ? Permet de proposer intelligemment de n'imprimer que les
 * nouveautés (économie de papier, gain de temps).
 */

export interface PrintMeta {
    lastPrintedAt: string | null;
    printedDates: string[];
}

const key = (classId: string) => `printMeta_v1_${classId}`;

export const readPrintMeta = (classId: string): PrintMeta => {
    try {
        const raw = localStorage.getItem(key(classId));
        if (raw) {
            const parsed = JSON.parse(raw) as PrintMeta;
            return { lastPrintedAt: parsed.lastPrintedAt ?? null, printedDates: parsed.printedDates ?? [] };
        }
    } catch {
        // corrompu : on repart de zéro
    }
    return { lastPrintedAt: null, printedDates: [] };
};

export const recordPrint = (classId: string, printedDates: string[]): void => {
    const existing = readPrintMeta(classId);
    const merged = Array.from(new Set([...existing.printedDates, ...printedDates])).sort();
    try {
        localStorage.setItem(
            key(classId),
            JSON.stringify({ lastPrintedAt: new Date().toISOString(), printedDates: merged } satisfies PrintMeta)
        );
    } catch {
        // stockage plein : l'impression fonctionne quand même
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
    const keep = new Set(dates);
    return lessonsData
        .filter(chapter => nodeHasKeptContent(chapter, keep))
        .map(chapter => pruneNode(chapter, keep));
};
