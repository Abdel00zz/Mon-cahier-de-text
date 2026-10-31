import { useMemo } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../../../types';
import { useClassAssessments } from '../../../hooks/useAssessments';
import { useMoroccoToday } from '../../../hooks/useMoroccoToday';
import { findNotebookAssessments, linkAssessments, notebookDocumentPreviews, type NotebookDocumentPreview } from '../../../domain/evaluations/assessmentSync';
import { activityDocumentPreviews } from '@/domain/evaluations/activityDocumentPreviews';
import { useLocale } from '@/i18n/LocaleProvider';
import { buildLessonRows } from '@/domain/notebook/lessonRows';

/*
 * Sujets écrits par le professeur, rangés par la LIGNE du cahier qui les porte.
 *
 * Le cahier est la table des matières : « Devoir maison 2 » y est une ligne, le
 * sujet vit dans les évaluations sous l'identifiant du devoir planifié. Ce hook
 * fait la jointure avec le MÊME moteur que les écarts de date
 * (`linkAssessments`) : la ligne qui ouvre un aperçu est exactement celle qui
 * affiche déjà l'alerte de date. Aucune correspondance parallèle, donc aucune
 * divergence possible entre les deux écrans.
 *
 * Coût : nul tant que la classe n'a aucun document, et une seule carte par
 * ligne (aucun parcours du cahier à l'affichage d'une rangée) — la table
 * mémoïsée ne reçoit qu'une fonction de lecture stable.
 */

/** Référence partagée : « aucun document » ne crée pas de nouvelle Map à
 *  chaque rendu (sinon les mémoïsations de la table se cassent). */
const NO_PREVIEWS = { rows: new Map<string, NotebookDocumentPreview>(), sessions: new Map<string, NotebookDocumentPreview[]>() };

const EVALUATION_TYPES = new Set<string>([
    'devoir_maison',
    'maison',
    'controle_continu',
    'controle',
    'controle_court',
    'controle_global',
    'oral',
    'evaluation_diagnostic',
    'correction_devoir_maison',
    'correction_controle_continu',
    'examen_blanc',
    'olympiade',
    'concours',
    'colle',
]);

const hasInlineAssessmentContent = (lessons: LessonsData): boolean => {
    return buildLessonRows(lessons).some(row => {
        const isEval = EVALUATION_TYPES.has(row.elementType)
            || ('type' in row.data && typeof row.data.type === 'string' && EVALUATION_TYPES.has(row.data.type));
        return isEval && 'description' in row.data && typeof row.data.description === 'string' && row.data.description.trim().length > 0;
    });
};

export const useNotebookDocumentPreviews = (
    classInfo: ClassInfo,
    config: AppConfig,
    lessonsData: LessonsData,
) => {
    const { t } = useLocale();
    const documents = config.assessmentDocuments?.[classInfo.id];
    const events = config.pedagogicalEvents?.[classInfo.id];
    const { assessments } = useClassAssessments(classInfo, config);
    const today = useMoroccoToday();
    const hasDocuments = (!!documents && Object.keys(documents).length > 0)
        || events?.some(event => event.document?.source?.trim())
        || hasInlineAssessmentContent(lessonsData);

    return useMemo(() => {
        if (!hasDocuments || lessonsData.length === 0) return NO_PREVIEWS;
        const entries = findNotebookAssessments(lessonsData);
        const links = linkAssessments(assessments, entries, today);
        const previews = activityDocumentPreviews(config, classInfo.id, lessonsData, links, t);
        notebookDocumentPreviews(links, documents).forEach((preview, key) => previews.rows.set(key, preview));

        // Détection de contenu direct saisi sur la ligne d'évaluation du cahier (sujet ou énoncé en description)
        const notebookRows = buildLessonRows(lessonsData);
        for (const row of notebookRows) {
            if (previews.rows.has(row.key)) continue;
            const isEvaluation = EVALUATION_TYPES.has(row.elementType)
                || ('type' in row.data && typeof row.data.type === 'string' && EVALUATION_TYPES.has(row.data.type));
            if (!isEvaluation) continue;
            const desc = 'description' in row.data && typeof row.data.description === 'string' ? row.data.description.trim() : '';
            if (!desc) continue;
            const rowTitle = ('title' in row.data && typeof row.data.title === 'string' && row.data.title.trim())
                ? row.data.title.trim()
                : (t(`evaluations.type.${row.elementType}`) || 'Document');
            previews.rows.set(row.key, {
                document: { source: desc, updatedAt: '' },
                title: rowTitle,
                assessmentId: row.data._tempId ?? row.key,
            });
        }

        return previews;
    }, [hasDocuments, documents, assessments, lessonsData, today, config, classInfo.id, t]);
};
