import { produce } from 'immer';
import type { LessonsData } from '../../types';

/** Legacy generated certificates are administrative records in config.absences.
 * Hide their old copies from the pedagogical tree; never match a translated title
 * or remove a manually written free line. Raw backups remain recoverable.
 */
export function separateAbsenceContent(data: LessonsData): LessonsData {
    return produce(data, draft => {
        const visit = (list: unknown[]) => {
            for (let index = list.length - 1; index >= 0; index--) {
                const node = list[index];
                if (!node || typeof node !== 'object') continue;
                const record = node as Record<string, unknown>;
                if (record.type === 'free' && typeof record._tempId === 'string'
                    && record._tempId.startsWith('free-absence-')) {
                    list.splice(index, 1);
                    continue;
                }
                for (const key of ['items', 'sections', 'subsections', 'subsubsections']) {
                    const children = record[key];
                    if (Array.isArray(children)) visit(children);
                }
            }
        };
        visit(draft);
    });
}
