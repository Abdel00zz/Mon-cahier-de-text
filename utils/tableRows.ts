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
    const date = (item.data as any).date;
    return typeof date === 'string' && date.trim() ? date.trim() : null;
};

export const getMergeableRemark = (item: FlatDataItem): string => {
    const remark = (item.data as any).remark;
    return typeof remark === 'string' ? remark.trim() : '';
};

/** Normalisation partagée par toutes les comparaisons de fusion : Unicode NFC
 *  (arabe et accents), espaces parasites retirés, espaces internes réduits —
 *  « Exo  1 » et « Exo 1 » désignent donc le même contenu. */
const normalizeIdentityText = (value: unknown): string =>
    typeof value === 'string' || typeof value === 'number'
        ? String(value).normalize('NFC').trim().replace(/\s+/g, ' ')
        : '';

/** Types structurels : ils n'ont pas d'identité de contenu et coupent toujours
 *  la continuité (un chapitre ou une section sépare deux groupes). */
const STRUCTURAL_ELEMENT_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection']);

/** Préfixe des lignes libres. Impossible à confondre avec l'identité JSON d'un
 *  contenu pédagogique, qui commence par « [ ». */
const FREE_IDENTITY_PREFIX = 'free:';

/**
 * Identité pédagogique normalisée pour la fusion intelligente :
 * type, numéro, titre, description et page, tous normalisés. La casse du titre
 * est conservée pour ne pas confondre deux variables mathématiques.
 * Un chapitre, une section ou un contenu différent brise la continuité.
 *
 * Ligne libre : son identité est le texte réellement affiché (titre +
 * description). Une ligne libre vide n'a aucune identité — sans texte il n'y a
 * rien à comparer, donc rien à fusionner.
 */
const getPedagogicalIdentity = (item: FlatDataItem): string | null => {
    if (STRUCTURAL_ELEMENT_TYPES.has(item.elementType)) return null;
    const data = item.data as any;
    const type = normalizeIdentityText(data.type).toLowerCase();
    const title = normalizeIdentityText(data.title);

    if (type === 'free') {
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
 * Fusion intelligente des séances et contenus :
 * 1. MÊME DATE — les lignes consécutives d'une même séance partagent une seule
 *    cellule de date ; chaque ligne garde son propre contenu.
 * 2. MÊME CONTENU SUR DES DATES DISTINCTES — le même contenu donné sur
 *    plusieurs séances est affiché une fois, ses dates réunies (MultiDateCard).
 *    La fusion n'a lieu que si chaque ligne porte une date différente de la
 *    précédente : une répétition le même jour, ou sans date, reste donc
 *    toujours visible — jamais absorbée ni masquée.
 *
 * Les deux axes s'excluent (dates distinctes d'un côté, date unique de
 * l'autre) : aucune priorité arbitraire entre eux n'est nécessaire. Le plafond
 * de 24 lignes borne le coût de rendu d'une très grande journée.
 */
const applyDateMerges = (items: FlatDataItem[]): FlatDataItem[] => {
    // Une seule passe de normalisation : les balayages imbriqués ci-dessous
    // comparent des valeurs déjà calculées. Chaque appel de getPedagogicalIdentity
    // normalise cinq chaînes ; les recalculer à chaque comparaison rendait le
    // regroupement inutilement coûteux (et O(n²) sur une grande séance).
    const dates = items.map(getMergeableDate);
    const identities = items.map(getPedagogicalIdentity);

    /** Deux lignes ne fusionnent que si elles se suivent réellement dans le
     *  cahier : une recherche peut afficher deux lignes voisines qu'un contenu
     *  masqué sépare dans la source. */
    const follows = (index: number): boolean =>
        items[index].position === items[index - 1].position + 1;

    let start = 0;
    while (start < items.length) {
        const dateStart = dates[start];
        const identityStart = identities[start];
        const isDatedSequenceStart = Boolean(dateStart && (start === 0 || !dates[start - 1]));

        if (!dateStart && !identityStart) {
            const isDatedSequenceEnd = start === items.length - 1 || !dates[start + 1];
            items[start].dateMerge = {
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

        // 1. Lignes consécutives de MÊME DATE (séance commune).
        let sameDateEnd = start + 1;
        while (sameDateEnd < items.length && sameDateEnd < start + 24 && follows(sameDateEnd)) {
            const nextDate = dates[sameDateEnd];
            if (!nextDate || nextDate !== dateStart) break;
            // Laisser au contenu répété qui commence ici sa propre cellule
            // multi-date : sans cela la première ligne d'une fusion multi-date
            // serait absorbée par la séance précédente et le regroupement perdu.
            const followingIndex = sameDateEnd + 1;
            if (followingIndex < items.length
                && follows(followingIndex)
                && identities[followingIndex] !== null
                && identities[followingIndex] === identities[sameDateEnd]
                && dates[followingIndex] !== null
                && dates[followingIndex] !== nextDate) break;
            sameDateEnd += 1;
        }

        // 2. MÊME CONTENU sur des DATES DISTINCTES (fusion multi-date).
        let sameContentEnd = start + 1;
        if (identityStart && dateStart) {
            let previousDate = dateStart;
            while (sameContentEnd < items.length && sameContentEnd < start + 24 && follows(sameContentEnd)) {
                if (identities[sameContentEnd] !== identityStart) break;
                const nextDate = dates[sameContentEnd];
                // Sans date, ou date déjà rencontrée : c'est un doublon de la
                // même séance, il doit rester visible.
                if (!nextDate || nextDate === previousDate) break;
                previousDate = nextDate;
                sameContentEnd += 1;
            }
        }

        const sameDateCount = sameDateEnd - start;
        const sameContentCount = sameContentEnd - start;
        const mergeContent = sameContentCount > 1;
        const end = mergeContent ? sameContentEnd : (sameDateCount > 1 ? sameDateEnd : start + 1);

        const count = end - start;
        const isMerged = count > 1;
        const group = items.slice(start, end);
        const firstRemark = getMergeableRemark(group[0]);
        const shouldMergeRemark = isMerged && group.every(item => getMergeableRemark(item) === firstRemark);
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
