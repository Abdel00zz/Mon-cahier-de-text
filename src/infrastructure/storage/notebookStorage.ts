import { ContentDirection, LessonsData } from '../../types.js';
import { migrateLessonsData } from '../../domain/notebook/dataUtils.js';
import { assertNotebookStructure } from '../../domain/notebook/notebookValidation.js';
import { isContentDirection } from '../../domain/notebook/contentDirection.js';
import { LocalSyncDataError } from './localJson.js';

interface CachedNotebook {
    raw: string | null;
    notebook: { lessonsData: LessonsData; contentDirection?: ContentDirection };
}

const cache = new Map<string, CachedNotebook>();
const MAX_CACHED_NOTEBOOKS = 24;

/**
 * Lecture partagée du cahier local. Plusieurs moteurs (carte, alertes,
 * progression) obtiennent la même référence tant que le JSON n'a pas changé,
 * ce qui évite les JSON.parse et migrations répétés.
 */
export const readStoredNotebook = (classId: string, storage: Pick<Storage, 'getItem'> = localStorage) => {
    const key = `classData_v1_${classId}`;
    try {
        const raw = storage.getItem(key);
        const cached = cache.get(classId);
        if (cached?.raw === raw) {
            cache.delete(classId);
            cache.set(classId, cached);
            return cached.notebook;
        }
        const parsed = raw === null ? [] : JSON.parse(raw);
        const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        const lessons = Array.isArray(parsed) ? parsed : record?.lessonsData;
        const direction = record?.contentDirection;
        if (direction !== undefined && !isContentDirection(direction)) throw new Error('Sens du contenu invalide.');
        assertNotebookStructure(lessons);
        const notebook = { lessonsData: migrateLessonsData(lessons), ...(isContentDirection(direction) ? { contentDirection: direction } : {}) };
        cache.delete(classId);
        cache.set(classId, { raw, notebook });
        if (cache.size > MAX_CACHED_NOTEBOOKS) cache.delete(cache.keys().next().value!);
        return notebook;
    } catch (cause) {
        throw new LocalSyncDataError(key, cause);
    }
};

/** Rendering may degrade to an empty view; a sync/write path must use the strict reader. */
export const readCachedLessons = (classId: string): LessonsData => {
    try { return readStoredNotebook(classId).lessonsData; }
    catch {
        return [];
    }
};
