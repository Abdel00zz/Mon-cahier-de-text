import { LessonsData } from '../types.js';
import { flattenLessons } from './dataUtils.js';

const CONTAINER_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection']);

interface SessionIndexEntry {
    date: string;
    titles: string[];
    /** Dernier intitulé dans l'ordre réel du tableau pour cette séance. */
    lastTitle: string | null;
    itemCount: number;
}

interface UnscheduledContent {
    /** Intitulé de la ligne de contenu qui suit directement la dernière ligne datée. */
    nextTitle: string | null;
}

export interface SessionIndex {
    sessions: SessionIndexEntry[];
    /** Dernière séance passée ou du jour, jamais une simple planification future. */
    previous: SessionIndexEntry | null;
    /** Premier contenu déjà daté après aujourd'hui, distinct du prochain créneau horaire. */
    nextPlanned: SessionIndexEntry | null;
    /** Contenu non daté sous la dernière ligne de contenu datée. */
    toSchedule: UnscheduledContent | null;
    latestDate: string | null;
}

const cleanText = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const text = value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    return text || null;
};

const isContentEntry = (entry: { data: any; elementType: string }): boolean =>
    !CONTAINER_TYPES.has(entry.elementType) && !CONTAINER_TYPES.has(entry.data?.type);

const entryTitle = (data: any, elementType: string): string | null => {
    if (CONTAINER_TYPES.has(elementType) || CONTAINER_TYPES.has(data?.type)) return null;
    return cleanText(data?.title) ?? cleanText(data?.name) ?? cleanText(data?.content) ?? cleanText(data?.description);
};

/** Index linéaire partagé par la carte et son modal d'informations. */
export const buildSessionIndex = (lessons: LessonsData, todayISO: string): SessionIndex => {
    const grouped = new Map<string, { titles: string[]; seenTitles: Set<string>; lastTitle: string | null; itemCount: number }>();
    const ensure = (date: string) => {
        let group = grouped.get(date);
        if (!group) {
            group = { titles: [], seenTitles: new Set(), lastTitle: null, itemCount: 0 };
            grouped.set(date, group);
        }
        return group;
    };

    const entries = flattenLessons(lessons);
    const contentEntries = entries.filter(isContentEntry);

    for (const entry of entries) {
        const date = cleanText(entry.data?.date);
        if (date) {
            const group = ensure(date);
            if (isContentEntry(entry)) group.itemCount += 1;
            const title = entryTitle(entry.data, entry.elementType);
            if (title) group.lastTitle = title;
            if (title && !group.seenTitles.has(title) && group.titles.length < 3) {
                group.seenTitles.add(title);
                group.titles.push(title);
            }
        }
        const separatorDate = cleanText(entry.data?.separatorAfter?.date);
        if (separatorDate) ensure(separatorDate);
    }

    // Une ligne vide au milieu d'une séance ne signifie pas nécessairement
    // « à programmer ». Seules les lignes placées APRÈS la dernière ligne de
    // contenu effectivement datée constituent la suite pédagogique à préparer.
    let lastDatedContentIndex = -1;
    for (let index = contentEntries.length - 1; index >= 0; index -= 1) {
        if (cleanText(contentEntries[index].data?.date)) {
            lastDatedContentIndex = index;
            break;
        }
    }
    const directNextEntry = contentEntries[lastDatedContentIndex + 1];
    const directNextUnscheduledEntry = directNextEntry && !cleanText(directNextEntry.data?.date)
        ? directNextEntry
        : null;

    const sessions = [...grouped.entries()]
        .map(([date, group]) => ({ date, titles: group.titles, lastTitle: group.lastTitle, itemCount: group.itemCount }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        sessions,
        previous: [...sessions].reverse().find(session => session.date <= todayISO) ?? null,
        nextPlanned: sessions.find(session => session.date > todayISO) ?? null,
        toSchedule: directNextUnscheduledEntry
            ? { nextTitle: entryTitle(directNextUnscheduledEntry.data, directNextUnscheduledEntry.elementType) }
            : null,
        latestDate: sessions.at(-1)?.date ?? null,
    };
};
