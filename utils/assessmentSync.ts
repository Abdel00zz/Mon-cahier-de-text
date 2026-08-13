import { LessonsData, Section, SubSection, SubSubSection, LessonItem, EmbeddableTopLevelItem } from '../types.js';
import { PlannedAssessment } from './assessments.js';

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
    type: 'controle' | 'maison';
    /** numéro d'ordre dans l'année (déclaré dans le titre, sinon ordre d'apparition) */
    num: number;
    title: string;
    date?: string;
}

/** type de bloc du cahier → type de devoir du planning */
const NOTEBOOK_TYPE_MAP: Record<string, NotebookAssessmentEntry['type']> = {
    controle_continu: 'controle',
    devoir_maison: 'maison',
};

const parseTrailingNumber = (title: string | undefined): number | null => {
    const match = (title ?? '').trim().match(/(\d+)\s*$/);
    return match ? parseInt(match[1], 10) : null;
};

/**
 * Extrait tous les devoirs saisis dans un cahier, dans l'ordre du document
 * (les blocs de premier niveau ET les devoirs imbriqués dans les sections).
 */
export const findNotebookAssessments = (lessons: LessonsData): NotebookAssessmentEntry[] => {
    const raw: { type: NotebookAssessmentEntry['type']; title: string; date?: string; declaredNum: number | null }[] = [];

    const visitItem = (item: LessonItem | EmbeddableTopLevelItem): void => {
        const mapped = NOTEBOOK_TYPE_MAP[item.type];
        if (mapped) {
            const title = 'title' in item ? (item.title ?? '') : '';
            raw.push({ type: mapped, title, date: item.date, declaredNum: parseTrailingNumber(title) });
        }
    };

    const visitSubSub = (sss: SubSubSection): void => { (sss.items ?? []).forEach(visitItem); };
    const visitSub = (ss: SubSection): void => {
        (ss.items ?? []).forEach(visitItem);
        (ss.subsubsections ?? []).forEach(visitSubSub);
    };
    const visitSection = (s: Section): void => {
        (s.items ?? []).forEach(visitItem);
        (s.subsections ?? []).forEach(visitSub);
    };

    for (const top of lessons) {
        const mapped = NOTEBOOK_TYPE_MAP[top.type];
        if (mapped) {
            raw.push({ type: mapped, title: top.title, date: top.date, declaredNum: parseTrailingNumber(top.title) });
        }
        (top.sections ?? []).forEach(visitSection);
    }

    /* numérotation finale PAR TYPE : le numéro déclaré dans le titre prime,
       les titres sans numéro prennent le premier ordinal libre (ordre du doc) */
    const result: NotebookAssessmentEntry[] = [];
    for (const type of ['controle', 'maison'] as const) {
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
            result.push({ type, num, title: entry.title, date: entry.date });
        }
    }
    return result;
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
        const isLinkable = assessment.type === 'controle' || assessment.type === 'maison';
        // Le numéro recommence au semestre 2. On garde donc toutes les entrées
        // homonymes et on choisit d'abord la date la plus proche, sans réutiliser
        // un même bloc pour deux devoirs.
        const candidates = isLinkable
            ? notebook.filter(entry => !used.has(entry) && entry.type === assessment.type && entry.num === assessment.num)
            : [];
        let entry = candidates.sort((a, b) => distance(a.date, assessment.dateISO) - distance(b.date, assessment.dateISO))[0];
        // Compatibilité avec les anciens cahiers numérotés en continu sur l'année.
        if (!entry && isLinkable) {
            entry = notebook
                .filter(candidate => !used.has(candidate) && candidate.type === assessment.type)
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
            status = assessment.dateISO >= todayISO ? 'upcoming' : 'missing';
        }
        return { planned: assessment, entry, status };
    });
};
