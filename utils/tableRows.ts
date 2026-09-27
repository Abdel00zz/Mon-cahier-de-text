import type { LessonRow } from './lessonRows';
import { toDisplayText } from './textValue';
import { FREE_TYPE } from './freeLineType';

export interface DateMergeMeta {
  isMerged: boolean;
  mergeType?: 'date' | 'content';
  isStart: boolean;
  isContinuation: boolean;
  isEnd: boolean;
  count: number;
  indexInGroup: number;
  shouldMergeRemark?: boolean;
  /** Remarque unique de la séance (vide si aucune). */
  sharedRemark?: string;
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
  const date = (item.data as any).date;
  return typeof date === 'string' && date.trim() ? date.trim() : null;
};

export const getMergeableRemark = (item: FlatDataItem): string => {
  const remark = (item.data as any).remark;
  return typeof remark === 'string' ? remark.trim() : '';
};

/** Normalisation partagée par toutes les comparaisons de fusion : Unicode NFC */
const normalizeIdentityText = (value: unknown): string =>
  toDisplayText(value).normalize('NFC').trim().replace(/\s+/g, ' ');

const STRUCTURAL_ELEMENT_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection']);

/**
 * Garde-fou de PERFORMANCE, pas limite pédagogique : sur un cahier
 * pathologique (des milliers de lignes), une fusion n'absorbe pas une suite
 * sans fin. 24 était trop bas : une journée de 25 contenus voyait sa
 * dernière ligne détachée avec sa propre date et sa propre remarque.
 */
const MAX_MERGE_RUN = 120;
const FREE_IDENTITY_PREFIX = FREE_TYPE + ':';

/**
 * Identité pédagogique normalisée pour la fusion intelligente.
 */
const getPedagogicalIdentity = (item: FlatDataItem): string | null => {
  if (STRUCTURAL_ELEMENT_TYPES.has(item.elementType)) return null;
  const data = item.data as any;
  const type = normalizeIdentityText(data.type).toLowerCase();
  const title = normalizeIdentityText(data.title);

  if (type === FREE_TYPE) {
    const text = `${title}\n${normalizeIdentityText(data.description)}`.trim();
    return text ? FREE_IDENTITY_PREFIX + text : null;
  }

  if (!type && !title) return null;
  return JSON.stringify([
    type,
    normalizeIdentityText(data.number),
    title,
    normalizeIdentityText(data.description),
    normalizeIdentityText(data.page),
  ]);
};

/**
 * Fusion intelligente des séances et contenus (Optimisée)
 */
const applyDateMerges = (items: FlatDataItem[]): FlatDataItem[] => {
  const dates = items.map(getMergeableDate);
  const identities = items.map(getPedagogicalIdentity);

  const follows = (index: number): boolean =>
    items[index].position === items[index - 1].position + 1;

  let start = 0;
  while (start < items.length) {
    const dateStart = dates[start];
    const identityStart = identities[start];
    const isDatedSequenceStart = Boolean(dateStart && (start === 0 || !dates[start - 1]));

    if (!dateStart && !identityStart) {
      items[start].dateMerge = {
        isMerged: false,
        mergeType: 'date',
        isStart: true,
        isContinuation: false,
        isEnd: true,
        count: 1,
        indexInGroup: 0,
        isDatedSequenceStart: !!isDatedSequenceStart,
        isDatedSequenceEnd: start === items.length - 1 || !dates[start + 1],
      };
      start += 1;
      continue;
    }

    let sameDateEnd = start + 1;
    let sameContentEnd = start + 1;

    // 1. MÊME DATE — toute la suite de contenus consécutifs qui partagent la
    //    même date forme UNE séance. La seule borne est le garde-fou de
    //    performance (MAX_MERGE_RUN) : une journée bien remplie ne doit pas
    //    voir sa dernière ligne détachée avec sa propre date et sa remarque.
    while (sameDateEnd < items.length && sameDateEnd < start + MAX_MERGE_RUN && follows(sameDateEnd)) {
      const nextDate = dates[sameDateEnd];
      if (!nextDate || nextDate !== dateStart) break;

      // Une séquence de contenu répété (même intitulé, autres dates) commence
      // ici : elle aura sa propre fusion, la séance s'arrête avant elle.
      const followingIndex = sameDateEnd + 1;
      if (followingIndex < items.length
          && follows(followingIndex)
          && identities[followingIndex] !== null
          && identities[followingIndex] === identities[sameDateEnd]
          && dates[followingIndex] !== null
          && dates[followingIndex] !== nextDate) break;

      sameDateEnd += 1;
    }
    // 2. MÊME CONTENU
    if (identityStart && dateStart) {
      let previousDate = dateStart;
      while (sameContentEnd < items.length && sameContentEnd < start + MAX_MERGE_RUN && follows(sameContentEnd)) {
        if (identities[sameContentEnd] !== identityStart) break;
        const nextDate = dates[sameContentEnd];
        if (!nextDate || nextDate === previousDate) break;
        previousDate = nextDate;
        sameContentEnd += 1;
      }
    }

    const mergeContent = (sameContentEnd - start) > 1;
    const end = mergeContent ? sameContentEnd : ((sameDateEnd - start) > 1 ? sameDateEnd : start + 1);
    
    const count = end - start;
    const isMerged = count > 1;
    const group = items.slice(start, end);
    // La séance porte UNE remarque, comme elle porte une date : soit le même
    // texte partout, soit un seul contenu annoté et les autres vides (cas le
    // plus fréquent : « absents » pour la séance). Deux remarques DIFFÉRENTES
    // restent séparées : on ne peut pas en afficher une à la place de l'autre.
    const presentRemarks = Array.from(new Set(group.map(getMergeableRemark).filter(Boolean)));
    const shouldMergeRemark = isMerged && presentRemarks.length <= 1;
    const sharedRemark = presentRemarks[0] ?? '';
    const isDatedSequenceEnd = end === items.length || !dates[end];

    for (let index = start; index < end; index += 1) {
      items[index].dateMerge = {
        isMerged,
        mergeType: mergeContent ? 'content' : 'date',
        isStart: index === start,
        isContinuation: index !== start,
        isEnd: index === end - 1,
        count,
        indexInGroup: index - start,
        shouldMergeRemark,
        sharedRemark: shouldMergeRemark ? sharedRemark : undefined,
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
