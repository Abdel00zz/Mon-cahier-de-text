import { LessonsData } from '../types.js';
import { migrateLessonsData } from './dataUtils.js';

interface CachedNotebook {
    raw: string | null;
    lessons: LessonsData;
}

const cache = new Map<string, CachedNotebook>();

/**
 * Lecture partagée du cahier local. Plusieurs moteurs (carte, alertes,
 * progression) obtiennent la même référence tant que le JSON n'a pas changé,
 * ce qui évite les JSON.parse et migrations répétés.
 */
export const readCachedLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const cached = cache.get(classId);
        if (cached?.raw === raw) return cached.lessons;
        const parsed = raw ? JSON.parse(raw) : [];
        const lessons = migrateLessonsData(Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []));
        cache.set(classId, { raw, lessons });
        return lessons;
    } catch {
        return [];
    }
};
