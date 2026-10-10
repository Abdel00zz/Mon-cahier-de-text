import { useMemo } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../../../types';
import { useClassAssessments } from '../../../hooks/useAssessments';
import { useMoroccoToday } from '../../../hooks/useMoroccoToday';
import { findNotebookAssessments, linkAssessments, notebookDocumentPreviews, type NotebookDocumentPreview } from '../../../domain/evaluations/assessmentSync';
import { activityDocumentPreviews } from '@/domain/evaluations/activityDocumentPreviews';
import { useLocale } from '@/i18n/LocaleProvider';

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
    const hasDocuments = (!!documents && Object.keys(documents).length > 0) || events?.some(event => event.document?.source.trim());

    return useMemo(() => {
        if (!hasDocuments || lessonsData.length === 0) return NO_PREVIEWS;
        const entries = findNotebookAssessments(lessonsData);
        const links = linkAssessments(assessments, entries, today);
        const previews = activityDocumentPreviews(config, classInfo.id, lessonsData, links, t);
        notebookDocumentPreviews(links.filter(link => link.planned.type !== 'maison'), documents).forEach((preview, key) => previews.rows.set(key, preview));
        return previews;
    }, [hasDocuments, documents, assessments, lessonsData, today, config, classInfo.id, t]);
};
