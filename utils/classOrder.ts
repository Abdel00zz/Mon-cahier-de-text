import type { ClassInfo } from '../types.js';

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

/** Réordonne seulement le sous-ensemble visible, sans déplacer les classes filtrées. */
export const moveVisibleDashboardClass = (
    fullOrder: string[],
    visibleOrder: string[],
    draggedId: string,
    targetId: string,
): string[] => {
    if (draggedId === targetId) return fullOrder;
    const visible = visibleOrder.filter((id, index, values) => values.indexOf(id) === index);
    const from = visible.indexOf(draggedId);
    const to = visible.indexOf(targetId);
    if (from < 0 || to < 0) return fullOrder;
    visible.splice(from, 1);
    visible.splice(to, 0, draggedId);
    const visibleSet = new Set(visibleOrder);
    let cursor = 0;
    return fullOrder.map(id => visibleSet.has(id) ? visible[cursor++] : id);
};
