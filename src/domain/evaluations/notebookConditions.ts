import type { NotebookCondition } from '../../types';

export const NOTEBOOK_CONDITIONS: readonly NotebookCondition[] = ['good', 'average', 'needs_work', 'missing'];

/** Les états ne vivent que pour les élèves encore présents dans la liste. */
export const retainNotebookConditions = (names: readonly string[], conditions: Readonly<Record<string, NotebookCondition>> = {}): Record<string, NotebookCondition> =>
    Object.fromEntries(names.filter(name => Object.hasOwn(conditions, name) && NOTEBOOK_CONDITIONS.includes(conditions[name]))
        .map(name => [name, conditions[name]]));

export const countNotebookConditions = (names: readonly string[], conditions: Readonly<Record<string, NotebookCondition>> = {}): Record<NotebookCondition, number> => {
    const counts: Record<NotebookCondition, number> = { good: 0, average: 0, needs_work: 0, missing: 0 };
    for (const name of names) if (Object.hasOwn(conditions, name) && NOTEBOOK_CONDITIONS.includes(conditions[name])) counts[conditions[name]]++;
    return counts;
};
