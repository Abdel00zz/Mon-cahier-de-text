import { LessonsData } from '../types.js';
import { flattenLessons } from './dataUtils.js';

const CONTAINER_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection']);

export interface NotebookPoint {
    title: string;
    breadcrumb: string;
    date?: string;
}

export interface NotebookSearchMatch extends NotebookPoint {
    snippet: string;
}

export interface TeachingResume {
    last?: NotebookPoint;
    next?: NotebookPoint;
}

export const normalizeNotebookSearch = (value: unknown): string =>
    String(value ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .toLocaleLowerCase('fr')
        .replace(/\s+/g, ' ')
        .trim();

const labelOf = (data: any): string => {
    const value = data?.title ?? data?.name ?? data?.content ?? data?.description ?? '';
    return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
};

const breadcrumbFor = (lessons: LessonsData, indices: any): string => {
    const labels: string[] = [];
    const chapter = lessons[indices.chapterIndex];
    if (!chapter) return '';
    const push = (value: unknown) => {
        const text = String(value ?? '').trim();
        if (text && labels[labels.length - 1] !== text) labels.push(text);
    };
    push(chapter.title);
    const section = indices.sectionIndex === undefined ? undefined : chapter.sections?.[indices.sectionIndex];
    push(section?.name);
    const subsection = indices.subsectionIndex === undefined ? undefined : section?.subsections?.[indices.subsectionIndex];
    push(subsection?.name);
    const subsubsection = indices.subsubsectionIndex === undefined ? undefined : subsection?.subsubsections?.[indices.subsubsectionIndex];
    push(subsubsection?.name);
    return labels.join(' › ');
};

const pointOf = (lessons: LessonsData, entry: ReturnType<typeof flattenLessons>[number]): NotebookPoint => ({
    title: labelOf(entry.data) || 'Élément sans titre',
    breadcrumb: breadcrumbFor(lessons, entry.indices),
    date: typeof entry.data?.date === 'string' && entry.data.date ? entry.data.date : undefined,
});

/** Dernier élément daté et premier contenu non daté qui le suit dans l'ordre pédagogique. */
export const getTeachingResume = (lessons: LessonsData): TeachingResume => {
    const content = flattenLessons(lessons).filter(entry => {
        const isContainer = CONTAINER_TYPES.has(entry.elementType) || CONTAINER_TYPES.has(entry.data?.type);
        const hasChildren = ['sections', 'subsections', 'subsubsections', 'items']
            .some(key => Array.isArray(entry.data?.[key]) && entry.data[key].length > 0);
        // Un chapitre vide issu d'un programme officiel reste un point de
        // progression réel ; un conteneur structurant avec enfants ne l'est pas.
        return !isContainer || !hasChildren;
    });
    let lastIndex = -1;
    let lastDate = '';
    content.forEach((entry, index) => {
        const date = typeof entry.data?.date === 'string' ? entry.data.date : '';
        if (date && (date > lastDate || (date === lastDate && index > lastIndex))) {
            lastDate = date;
            lastIndex = index;
        }
    });

    const nextEntry = content.slice(lastIndex + 1).find(entry => !entry.data?.date)
        ?? content.find(entry => !entry.data?.date);
    return {
        last: lastIndex >= 0 ? pointOf(lessons, content[lastIndex]) : undefined,
        next: nextEntry ? pointOf(lessons, nextEntry) : undefined,
    };
};

/** Recherche accent-insensible dans titres, contenu, descriptions, remarques, pages et dates. */
export const searchNotebook = (lessons: LessonsData, rawQuery: string, limit = 4): NotebookSearchMatch[] => {
    const query = normalizeNotebookSearch(rawQuery);
    if (!query) return [];

    const matches: NotebookSearchMatch[] = [];
    for (const entry of flattenLessons(lessons)) {
        const fields = [
            entry.data?.title,
            entry.data?.name,
            entry.data?.content,
            entry.data?.description,
            entry.data?.remark,
            entry.data?.number,
            entry.data?.page,
            entry.data?.date,
        ].filter(value => value !== undefined && value !== null).map(String);
        const matchedField = fields.find(field => normalizeNotebookSearch(field).includes(query));
        if (!matchedField) continue;
        const point = pointOf(lessons, entry);
        matches.push({
            ...point,
            snippet: matchedField.length > 120 ? `${matchedField.slice(0, 117).trim()}…` : matchedField,
        });
        if (matches.length >= limit) break;
    }
    return matches;
};
