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
 *     signalé — le prof peut alors ALIGNER le calendrier sur son choix réel
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
    const byTypeAndNum = new Map<string, NotebookAssessmentEntry>();
    for (const entry of notebook) {
        const key = `${entry.type}:${entry.num}`;
        if (!byTypeAndNum.has(key)) byTypeAndNum.set(key, entry);
    }

    /* ordinal du devoir dans SON type sur l'année (s1-c1 → 1, s2-c1 → 4…) :
       c'est cette numérotation continue que suit l'auto-numérotation du cahier */
    const counters: Record<NotebookAssessmentEntry['type'], number> = { controle: 0, maison: 0 };

    return planned.map(assessment => {
        counters[assessment.type] += 1;
        const entry = byTypeAndNum.get(`${assessment.type}:${counters[assessment.type]}`);
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
