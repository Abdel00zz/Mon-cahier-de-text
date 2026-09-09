import type { ClassInfo } from '../types.js';

/** Temporary presentation order, never persisted: O(n), stable in both groups.
 * When a session ends, the original order is restored without a settings write.
 */
export const prioritizeActiveClasses = <T extends { id: string }>(
    classes: T[], activeIds: ReadonlySet<string>,
): T[] => {
    if (activeIds.size === 0) return classes;
    const active: T[] = [];
    const remaining: T[] = [];
    let needsMove = false;
    for (const classInfo of classes) {
        if (activeIds.has(classInfo.id)) {
            if (remaining.length > 0) needsMove = true;
            active.push(classInfo);
        } else remaining.push(classInfo);
    }
    return needsMove ? [...active, ...remaining] : classes;
};

/**
 * Produit un ordre complet, unique et tolérant aux anciennes configurations.
 * Les nouvelles classes absentes de la préférence restent classées par création.
 */
export const resolveDashboardClassOrder = (
    classes: ClassInfo[],
    preferredOrder: string[] | undefined,
): string[] => {
    const fallback = [...classes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(classInfo => classInfo.id);
    const valid = new Set(fallback);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of preferredOrder ?? []) {
        if (valid.has(id) && !seen.has(id)) {
            seen.add(id);
            result.push(id);
        }
    }
    for (const id of fallback) {
        if (!seen.has(id)) result.push(id);
    }
    return result;
};
