import type { LessonRow } from './lessonRows';

export interface DateMergeMeta {
  isMerged: boolean;
  mergeType?: 'date' | 'content';
  isStart: boolean;
  isContinuation: boolean;
  isEnd: boolean;
  count: number;
  indexInGroup: number;
  shouldMergeRemark?: boolean;
  isDatedSequenceStart?: boolean;
  isDatedSequenceEnd?: boolean;
}

export interface FlatDataItem extends LessonRow {
    dateMerge?: DateMergeMeta;
}

export type RenderRow =
    | { kind: 'single'; item: FlatDataItem; key: string; flatIndex: number }
    | { kind: 'session'; items: FlatDataItem[]; key: string; flatIndex: number };


export const getMergeableDate = (item: FlatDataItem): string | null => {
    if (item.elementType === 'separator') return null;
    const date = (item.data as any).date;
    return typeof date === 'string' && date.trim() ? date.trim() : null;
};

export const getMergeableRemark = (item: FlatDataItem): string => {
    const remark = (item.data as any).remark;
    return typeof remark === 'string' ? remark.trim() : '';
};

/**
 * Identité pédagogique normalisée pour la fusion intelligente :
 * Type, numéro, titre, description et page. La casse du titre est conservée
 * pour ne pas confondre deux variables mathématiques.
 * Un séparateur, un chapitre, une section ou un contenu différent brise
 * immédiatement la continuité.
 */
const getPedagogicalIdentity = (item: FlatDataItem): string | null => {
    if (item.elementType !== 'item' && ['chapter', 'section', 'subsection', 'subsubsection', 'separator'].includes(item.elementType)) return null;
    const data = item.data as any;
    const normType = (data.type || '').toString().trim().toLowerCase();
    const normNumber = (data.number ?? '').toString().trim();
    const normTitle = (data.title || '').toString().normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!normType && !normTitle) return null;
    return JSON.stringify([normType, normNumber, normTitle, data.description ?? '', data.page ?? '']);
};

/**
 * Fusion intelligente des séances et contenus :
 * 1. Même date : toutes les lignes consécutives ayant la même date de séance
 *    sont fusionnées dans une cellule de date commune.
 * 2. Même contenu multi-dates : les lignes consécutives de même identité pédagogique
 *    (type, numéro, titre, description, page) sur leurs différentes dates sont regroupées avec MultiDateCard.
 */
const applyDateMerges = (items: FlatDataItem[]): FlatDataItem[] => {
    let start = 0;
    while (start < items.length) {
        const itemStart = items[start];
        const dateStart = getMergeableDate(itemStart);
        const identityStart = getPedagogicalIdentity(itemStart);
        const isDatedSequenceStart = Boolean(dateStart && (start === 0 || !getMergeableDate(items[start - 1])));

        if ((!dateStart && !identityStart) || itemStart.elementType === 'separator') {
            const isDatedSequenceEnd = start === items.length - 1 || !getMergeableDate(items[start + 1]);
            itemStart.dateMerge = {
                isMerged: false,
                mergeType: 'date',
                isStart: true,
                isContinuation: false,
                isEnd: true,
                count: 1,
                indexInGroup: 0,
                isDatedSequenceStart: !!isDatedSequenceStart,
                isDatedSequenceEnd: !!isDatedSequenceEnd,
            };
            start += 1;
            continue;
        }

        // 1. Détection des lignes consécutives de MÊME DATE
        let sameDateEnd = start + 1;
        while (sameDateEnd < items.length && sameDateEnd < start + 24) {
            const nextItem = items[sameDateEnd];
            const nextDate = getMergeableDate(nextItem);
            if (nextItem.position !== items[sameDateEnd - 1].position + 1 || nextItem.elementType === 'separator' || !nextDate || nextDate !== dateStart) {
                break;
            }
            // Laisser au prochain contenu répété sa propre cellule multi-date.
            const following = items[sameDateEnd + 1];
            const nextIdentity = getPedagogicalIdentity(nextItem);
            if (following && following.position === nextItem.position + 1 && nextIdentity
                && nextIdentity === getPedagogicalIdentity(following) && getMergeableDate(following)) break;
            sameDateEnd += 1;
        }

        // 2. Détection des lignes consécutives de MÊME CONTENU sur dates distinctes (Multi-date)
        let sameContentEnd = start + 1;
        if (identityStart) {
            while (sameContentEnd < items.length && sameContentEnd < start + 24) {
                const nextItem = items[sameContentEnd];
                const nextIdentity = getPedagogicalIdentity(nextItem);

                if (nextItem.position !== items[sameContentEnd - 1].position + 1 || nextItem.elementType === 'separator' || !nextIdentity || nextIdentity !== identityStart || Boolean(getMergeableDate(nextItem)) !== Boolean(dateStart)) {
                    break;
                }
                sameContentEnd += 1;
            }
        }

        const sameDateCount = sameDateEnd - start;
        const sameContentCount = sameContentEnd - start;

        let end = start + 1;
        let mergeType: 'date' | 'content' = 'date';

        if (sameContentCount > 1) {
            end = sameContentEnd;
            mergeType = 'content';
        } else if (sameDateCount > 1) {
            end = sameDateEnd;
            mergeType = 'date';
        } else {
            end = start + 1;
            mergeType = 'date';
        }

        const count = end - start;
        const isMerged = count > 1;
        const group = items.slice(start, end);
        const firstRemark = getMergeableRemark(group[0]);
        const shouldMergeRemark = isMerged && group.every(item => getMergeableRemark(item) === firstRemark);
        const isDatedSequenceEnd = end === items.length || !getMergeableDate(items[end]);

        for (let index = start; index < end; index += 1) {
            items[index].dateMerge = {
                isMerged,
                mergeType,
                isStart: index === start,
                isContinuation: index !== start,
                isEnd: index === end - 1,
                count,
                indexInGroup: index - start,
                shouldMergeRemark,
                isDatedSequenceStart: !!isDatedSequenceStart && index === start,
                isDatedSequenceEnd: !!isDatedSequenceEnd && index === end - 1,
            };
        }

        start = end;
    }
    return items;
};

export function groupLessonRows(source: LessonRow[]) {
    const flatData = applyDateMerges(source.map(row => ({ ...row })));
    const rows: RenderRow[] = [];

    for (let index = 0; index < flatData.length; index += 1) {
        const item = flatData[index];

        if (item.dateMerge?.isMerged && item.dateMerge.isStart) {
            const group = flatData.slice(index, index + item.dateMerge.count);
            rows.push({
                kind: 'session',
                items: group,
                key: `session-${item.key}`,
                flatIndex: index,
            });
            index += item.dateMerge.count - 1;
            continue;
        }

        rows.push({
            kind: 'single',
            item,
            key: item.key,
            flatIndex: index,
        });
    }

    return { flatData, renderRows: rows };

}
