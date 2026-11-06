import { separateAbsenceContent } from './separateAbsenceContent.js';
import { produce } from 'immer';
import { buildLessonRows } from './lessonRows';
import type { LessonsData } from '../../types.js';
import type { DataItem } from './dataUtilsTree';
import { logger } from '../../lib/logger.js';
import { memoize } from '../../lib/memoize.js';

/** Date lue telle quelle : ISO (yyyy-mm-dd, éventuellement horodatée),
 *  française (jj/mm/aaaa) ou date reconnue par le moteur. Aucune exception et
 *  aucune dérive de fuseau : les composantes sont lues directement. */
export const parseDateInput = (value: unknown): Date | null => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    if (!text) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text);
    const parts = iso ?? /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    if (parts) {
        const [year, month, day] = iso
            ? [Number(parts[1]), Number(parts[2]), Number(parts[3])]
            : [Number(parts[3]), Number(parts[2]), Number(parts[1])];
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Ajout (ou retrait) de jours sur une date, sans dépendre du fuseau local. */
export const addDaysIso = (value: unknown, offset: number): string => {
    const date = parseDateInput(value);
    if (!date) return typeof value === 'string' ? value : '';
    const shifted = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + offset));
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
};

// Compact date formatter: returns dd/mm/yyyy from ISO (yyyy-mm-dd) without timezone shifts
export const formatDateDDMMYYYY = memoize((dateString: string): string | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    // Prefer strict ISO split to avoid local timezone issues
    const m = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        const [, y, mo, d] = m;
        return `${d}/${mo}/${y}`;
    }
    // Fallback: try to parse a general date string
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = String(date.getFullYear());
        return `${dd}/${mm}/${yyyy}`;
    } catch {
        return null;
    }
});

export const migrateLessonsData = (data: any): LessonsData => {
    if (!Array.isArray(data)) {
        logger.warn("Migration attempted on non-array data. Returning empty array.", data);
        return [];
    }

    return produce(separateAbsenceContent(data), draft => {
        draft.forEach((item: any, index: number) => {
            if (typeof item !== 'object' || item === null) {
                logger.error(`Invalid data at index ${index}, skipping.`, item);
                return;
            }

            // Case 1: Oldest format with 'chapter' property (string) instead of 'title'
            if (typeof item.chapter === 'string' && item.title === undefined) {
                item.title = item.chapter;
                delete item.chapter;
            }

            // Case 2: Missing 'type' property. Default to 'chapter'.
            if (item.type === undefined) {
                item.type = 'chapter';
            }

            // Ensure title is a string. If it's missing or not a string, set to empty string.
            if (typeof item.title !== 'string') {
                item.title = '';
            }
        });
    }) as LessonsData;
};

export const flattenLessons = (data: LessonsData) => buildLessonRows(data)
    .map(({ data, indices, elementType }) => ({
        data: data as DataItem, indices,
        // Progression historically treats embedded assessments as lesson items.
        elementType: indices.itemIndex !== undefined && elementType !== 'chapter' ? 'item' : elementType,
    }));
