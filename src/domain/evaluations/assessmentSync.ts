import { ContentDocument, Indices, LessonsData, Section, SubSection, SubSubSection, LessonItem, EmbeddableTopLevelItem, DevoirType } from '../../types.js';
import { PlannedAssessment } from './assessments.js';
import { indicesKey } from '../notebook/lessonRows.js';

/**
 * Moteur de CORRESPONDANCE devoirs ↔ cahier de textes.
 *
 * Le calendrier des devoirs (planning ministériel + surcharges du prof) et le
 * cahier de textes (blocs « Contrôle continu N » / « Devoir maison N ») sont
 * deux saisies indépendantes. Ce module les met en regard :
 *   • le N-ième devoir d'un type dans le cahier correspond au N-ième devoir
 *     planifié du même type (même convention que l'auto-numérotation) ;
 *   • si le cahier porte une date différente du calendrier, l'écart est
 *     signalé, le prof peut alors ALIGNER le calendrier sur son choix réel
 *     (le cahier reste la source de vérité, le calendrier suit).
 * Fonctions pures : aucune dépendance UI, réutilisables partout.
 */

export interface NotebookAssessmentEntry {
    type: DevoirType;
    /** numéro d'ordre dans l'année (déclaré dans le titre, sinon ordre d'apparition) */
    num: number;
    title: string;
    date?: string;
    /** clé de la LIGNE du cahier qui porte ce devoir (voir `indicesKey`) */
    key: string;
    /** Persistent notebook-to-planning identity; independent of date and order. */
    assessmentId?: string;
    declaredNum?: number;
}

/** type de bloc du cahier → type de devoir du planning */
const NOTEBOOK_TYPE_MAP: Record<string, DevoirType> = {
    controle_continu: 'controle',
    controle: 'controle',
    controle_court: 'controle_court',
    controle_global: 'controle_global',
    oral: 'oral',
    devoir_maison: 'maison',
    maison: 'maison',
};

const parseTrailingNumber = (title: string | undefined): number | null => {
    const normalized = (title ?? '').replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit >= '۰' ? 0x6F0 : 0x660)));
    const match = normalized.trim().match(/(\d+)\s*$/);
    if (match) return parseInt(match[1], 10);
    const middle = normalized.match(/(?:devoir\s+maison|maison|الفرض\s+المنزلي|فرض\s+منزلي|dm)(?:\s*(?:n[°o.]?|رقم|#))?\s*(\d+)/i);
    return middle ? parseInt(middle[1], 10) : null;
};

/**
 * Extrait tous les devoirs saisis dans un cahier, dans l'ordre du document
 * (les blocs de premier niveau ET les devoirs imbriqués dans les sections).
 */
export const findNotebookAssessments = (lessons: LessonsData): NotebookAssessmentEntry[] => {
    const raw: { type: NotebookAssessmentEntry['type']; title: string; date?: string; declaredNum: number | null; key: string; assessmentId?: string }[] = [];

    const visitItem = (item: LessonItem | EmbeddableTopLevelItem, indices: Indices): void => {
        const mapped = NOTEBOOK_TYPE_MAP[item.type];
        if (mapped) {
            const title = 'title' in item ? (item.title ?? '') : '';
            raw.push({ type: mapped, title, date: item.date, declaredNum: parseTrailingNumber(title), key: indicesKey(indices), ...(item._tempId?.startsWith('dev-block-') ? { assessmentId: item._tempId.slice(10) } : {}) });
        }
    };

    const visitSubSub = (sss: SubSubSection, base: Indices): void => {
        (sss.items ?? []).forEach((item, itemIndex) => visitItem(item, { ...base, itemIndex }));
    };
    const visitSub = (ss: SubSection, base: Indices): void => {
        (ss.items ?? []).forEach((item, itemIndex) => visitItem(item, { ...base, itemIndex }));
        (ss.subsubsections ?? []).forEach((sss, subsubsectionIndex) => visitSubSub(sss, { ...base, subsubsectionIndex }));
    };
    const visitSection = (section: Section, base: Indices): void => {
        (section.items ?? []).forEach((item, itemIndex) => visitItem(item, { ...base, itemIndex }));
        (section.subsections ?? []).forEach((ss, subsectionIndex) => visitSub(ss, { ...base, subsectionIndex }));
    };

    lessons.forEach((top, chapterIndex) => {
        const base: Indices = { chapterIndex };
        const mapped = NOTEBOOK_TYPE_MAP[top.type];
        if (mapped) {
            raw.push({ type: mapped, title: top.title, date: top.date, declaredNum: parseTrailingNumber(top.title), key: indicesKey(base), ...(top._tempId?.startsWith('dev-block-') ? { assessmentId: top._tempId.slice(10) } : {}) });
        }
        (top.items ?? []).forEach((item, itemIndex) => visitItem(item, { ...base, itemIndex }));
        (top.sections ?? []).forEach((section, sectionIndex) => visitSection(section, { ...base, sectionIndex }));
    });

    /* numérotation finale PAR TYPE : le numéro déclaré dans le titre prime,
       les titres sans numéro prennent le premier ordinal libre (ordre du doc) */
    const result: NotebookAssessmentEntry[] = [];
    for (const type of ['controle', 'controle_court', 'controle_global', 'oral', 'maison'] as const) {
        const ofType = raw.filter(e => e.type === type);
        const taken = new Set(ofType.map(e => e.declaredNum).filter((n): n is number => n !== null));
        let cursor = 1;
        for (const entry of ofType) {
            let num = entry.declaredNum;
            if (num === null) {
                while (taken.has(cursor)) cursor += 1;
                num = cursor;
                taken.add(num);
            }
            result.push({ type, num, title: entry.title, date: entry.date, key: entry.key, ...(entry.declaredNum !== null ? { declaredNum: entry.declaredNum } : {}), ...(entry.assessmentId ? { assessmentId: entry.assessmentId } : {}) });
        }
    }
    return result;
};

/** Ce qu'une ligne du cahier porte comme document rédigé. */
export interface NotebookDocumentPreview {
    /** Sujet, corrigé ou fiche écrit par le professeur. */
    document: ContentDocument;
    /** Titre à afficher : celui du cahier, sinon le libellé du planning. */
    title: string;
    /** Devoir planifié correspondant (identifiant annuel stable). */
    assessmentId: string;
}

/**
 * Documents des devoirs indexés par la LIGNE du cahier qui les porte.
 *
 * Le cahier écrit « Contrôle continu 2 », les évaluations rangent le sujet sous
 * l'identifiant du devoir planifié : la correspondance se fait avec le MÊME
 * moteur que les écarts de date (`linkAssessments`), donc la ligne qui affiche
 * « Écart de date avec le cahier » est exactement celle qui porte le sujet.
 *
 * Aucun document vide : une ligne sans sujet n'apparaît pas dans la table
 * (`source` blanche = pas de document).
 */
export const notebookDocumentPreviews = (
    links: readonly AssessmentLink[],
    documents: Record<string, ContentDocument> | undefined,
): Map<string, NotebookDocumentPreview> => {
    const previews = new Map<string, NotebookDocumentPreview>();
    if (!documents) return previews;
    for (const link of links) {
        const entry = link.entry;
        if (!entry) continue;
        const document = documents[link.planned.id]
            ?? (link.planned.legacyId ? documents[link.planned.legacyId] : undefined);
        if (!document?.source?.trim()) continue;
        previews.set(entry.key, {
            document,
            title: entry.title.trim() || link.planned.label,
            assessmentId: link.planned.id,
        });
    }
    return previews;
};

type AssessmentLinkStatus =
    /** saisi dans le cahier, date identique au calendrier */
    | 'done'
    /** saisi dans le cahier mais à une AUTRE date que le calendrier → proposer l'alignement */
    | 'mismatch'
    /** pas encore dans le cahier, date à venir */
    | 'upcoming'
    /** pas dans le cahier alors que la date est passée */
    | 'missing';

export interface AssessmentLink {
    planned: PlannedAssessment;
    /** entrée correspondante du cahier (même type, même ordinal), si elle existe */
    entry?: NotebookAssessmentEntry;
    status: AssessmentLinkStatus;
}

/**
 * Met en regard le planning (déjà trié par date, surcharges appliquées) et le
 * cahier : le N-ième devoir planifié d'un type ↔ le devoir « … N » du cahier.
 */
export const linkAssessments = (
    planned: PlannedAssessment[],
    notebook: NotebookAssessmentEntry[],
    todayISO: string
): AssessmentLink[] => {
    const used = new Set<NotebookAssessmentEntry>();
    const distance = (left: string | undefined, right: string): number => {
        if (!left) return Number.MAX_SAFE_INTEGER;
        const [ly, lm, ld] = left.split('-').map(Number);
        const [ry, rm, rd] = right.split('-').map(Number);
        return Math.abs(Date.UTC(ly, lm - 1, ld) - Date.UTC(ry, rm - 1, rd));
    };

    return planned.map(assessment => {
        const isLinkable = assessment.type === 'controle'
            || assessment.type === 'maison'
            || assessment.type === 'controle_court'
            || assessment.type === 'controle_global'
            || assessment.type === 'oral';
        // Le numéro recommence au semestre 2. On garde donc toutes les entrées
        // homonymes et on choisit d'abord la date la plus proche, sans réutiliser
        // un même bloc pour deux devoirs.
        const exact = notebook.find(entry => !used.has(entry) && entry.assessmentId && (entry.assessmentId === assessment.id || entry.assessmentId === assessment.legacyId));
        const belongsToAnotherDate = (entry: NotebookAssessmentEntry) => entry.date !== assessment.dateISO
            && planned.some(other => other.id !== assessment.id && other.type === entry.type && other.num === entry.num && other.dateISO === entry.date);
        const candidates = isLinkable
            ? notebook.filter(entry => !used.has(entry) && !entry.assessmentId && entry.type === assessment.type && entry.num === assessment.num && !belongsToAnotherDate(entry))
            : [];
        let entry = exact ?? candidates.sort((a, b) => distance(a.date, assessment.dateISO) - distance(b.date, assessment.dateISO))[0];
        // Compatibilité avec les anciens cahiers numérotés en continu sur l'année.
        if (!entry && isLinkable) {
            entry = notebook
                .filter(candidate => !used.has(candidate) && !candidate.assessmentId && candidate.type === assessment.type && candidate.date === assessment.dateISO)
                .sort((a, b) => distance(a.date, assessment.dateISO) - distance(b.date, assessment.dateISO))[0];
        }
        if (entry) used.add(entry);
        let status: AssessmentLinkStatus;
        if (entry?.date) {
            status = entry.date === assessment.dateISO ? 'done' : 'mismatch';
        } else if (entry) {
            // bloc créé mais pas encore daté : considéré comme à venir
            status = 'upcoming';
        } else {
            status = !assessment.dateISO || assessment.dateISO >= todayISO ? 'upcoming' : 'missing';
        }
        return { planned: assessment, entry, status };
    });
};
