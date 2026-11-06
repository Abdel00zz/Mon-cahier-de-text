import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import { useClassManager } from '@/hooks/useClassManager';
import { classRosterPatch, historicalStudentNames } from '@/domain/evaluations/classRosterSync';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { AppLocale } from '@/types';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { resolveKindPolicy } from '@/domain/evaluations/evaluationPolicy';
import { localizedActivityTitle } from '@/domain/evaluations/activityTitle';
import { retainHomeworkOutcomes } from '@/domain/evaluations/homeworkSubmissions';
import { homeworkCorrectionDocumentId } from '@/domain/evaluations/homeworkIds';
import { retainOralGrades, retainOralOutcomes } from '@/domain/evaluations/studentRoster';
import { numberFormat } from '@/lib/formatters';
import { useLocale } from '@/i18n/LocaleProvider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { bidiIsolate, textDirectionAttribute } from '@/lib/text/textDirection';
import { translateLocaleMessage } from '@/i18n/messages';
import { formatLocalizedClassDisplayName } from '@/constants';
import { detectDocumentContentDirection } from '@/domain/evaluations/documentSheet';
import { ContentDocumentModal } from './ContentDocumentModal';
import { StudentNamesEditor } from './StudentNamesEditor';
import { StudentReviewDialog } from './StudentReviewDialog';
import { formatLongDate, type DevoirsModalsProps } from './devoirsModalsModel';

/*
 * LA PILE DE FENÊTRES DE L'ÉCRAN DES ÉVALUATIONS.
 *
 * Extraite de `DevoirsView` : la vue garde la page (plateau, lignes, actions),
 * ce fichier garde TOUTES les fenêtres — assistant de création, éditeurs,
 * suivis d'élèves, documents, dates et confirmations. Le contrat est simple :
 * l'état vient du hook `useEvaluationModals` (une seule fenêtre active à la
 * fois), les écritures viennent de `useEvaluationActions`, et la vue fournit
 * les fonctions déjà câblées au cahier (documents, élèves et suppressions)
 * pour que la matérialisation garde UNE seule implémentation.
 */


export const DevoirsModals: React.FC<DevoirsModalsProps> = ({
  classInfo,
  classDisplayName,
  config,
  onConfigChange,
  modals,
  actions,
  deletePedagogicalEvent,
  deleteAssessment,
  deleteHomeworkCorrection,
}) => {
  const { t, locale } = useLocale();
  const [classSettingsOpen, setClassSettingsOpen] = useState(false);
  const { classes, updateClass } = useClassManager();
  const openClassSettings = () => setClassSettingsOpen(true);
  const number = useMemo(() => numberFormat(locale), [locale]);
  const selectedClass = classInfo;
  const selectedClassDisplayName = classDisplayName;
  const {
    absencesFor, oralFor, submissionsFor, documentFor, studentsFor,
    deletingAssessment, deletingEvent, deletingCorrection,
    setAbsencesFor, setOralFor, setSubmissionsFor, setDocumentFor, setStudentsFor,
    setDeletingAssessment, setDeletingEvent, setDeletingCorrection,
  } = modals;

  const pedagogicalEvents = useMemo(
    () => (config.pedagogicalEvents?.[classInfo.id] ?? []),
    [config.pedagogicalEvents, classInfo.id],
  );

  const absencesRecord =
    absencesFor && selectedClass
      ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.id]
        ?? (absencesFor.planned.legacyId ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.legacyId] : undefined)
      : undefined;

  const submissionsRecord = submissionsFor
    ? config.assessmentParticipants?.[classInfo.id]?.[submissionsFor.planned.id]
      ?? (submissionsFor.planned.legacyId ? config.assessmentParticipants?.[classInfo.id]?.[submissionsFor.planned.legacyId] : undefined)
    : undefined;

  const documentOf = (() => {
    if (!documentFor || !selectedClass) return undefined;
    if (documentFor.kind === 'event') return pedagogicalEvents.find(event => event.id === documentFor.event.id)?.document;
    const forClass = config.assessmentDocuments?.[selectedClass.id];
    // Le corrigé suit la même identité annuelle et le même repli historique que le devoir.
    if (documentFor.part === 'correction') return forClass?.[homeworkCorrectionDocumentId(documentFor.link.planned.id)]
      ?? (documentFor.link.planned.legacyId ? forClass?.[homeworkCorrectionDocumentId(documentFor.link.planned.legacyId)] : undefined);
    return forClass?.[documentFor.link.planned.id]
      ?? (documentFor.link.planned.legacyId ? forClass?.[documentFor.link.planned.legacyId] : undefined);
  })();

  // La direction décide ce que chaque fenêtre de suivi propose : liste, retour par élève, notes.
  const policy = config.evaluationPolicy;
  const oralPolicy = oralFor ? resolveKindPolicy(policy, oralFor.planned.type) : null;
  const homeworkPolicy = submissionsFor ? resolveKindPolicy(policy, submissionsFor.planned.type) : null;
  const studentsPolicy = studentsFor ? resolveKindPolicy(policy, studentsFor.type) : null;
  const notebookCheck = studentsFor?.type === REMARK_EVENT_TYPE;
  const studentsReview = Boolean(studentsPolicy?.feedback);

  /** La colle et l'oral ont chacun leur nom ; tout autre devoir suivi par élève porte le titre commun. */
  const oralTitle = t(oralFor?.planned.type === 'colle' ? 'evaluations.colle.title'
    : oralFor?.planned.type === 'oral' ? 'evaluations.oral.title' : 'evaluations.track.title');
  /** « Devoir maison 2 » : la remise se rattache toujours à SON devoir. */
  const submissionsLabel = submissionsFor
    ? `${t(`evaluations.type.${submissionsFor.planned.type}`)} ${number.format(submissionsFor.planned.num)}`
    : '';

  const documentDir = detectDocumentContentDirection(documentOf?.source) ?? textDirectionAttribute(documentOf?.source);
  const docLocale: AppLocale = documentDir === 'ltr' ? 'fr' : documentDir === 'rtl' ? 'ar' : locale;
  const docNumber = numberFormat(docLocale);

  const documentTitle = documentFor === null
    ? ''
    : documentFor.kind === 'event'
      ? localizedActivityTitle(documentFor.event.title, documentFor.event.type, docLocale)
      : documentFor.part === 'correction'
        ? `${translateLocaleMessage(docLocale, 'manageLessons.type.correction_devoir_maison')} ${docNumber.format(documentFor.link.planned.num)}`
        : `${translateLocaleMessage(docLocale, `evaluations.type.${documentFor.link.planned.type}`)} ${docNumber.format(documentFor.link.planned.num)}`;

  const documentClassDisplayName = selectedClass
    ? formatLocalizedClassDisplayName(selectedClass.name, docLocale)
    : undefined;

  /* « Classe · Devoir 2 » : chaque fragment isolé, l'arabe et le latin ne se réordonnent pas entre eux. */
  const contextOf = (...parts: string[]) => parts.filter(Boolean).map(bidiIsolate).join(' · ');

  return (
    <>
      {/* 3. Modal Absences */}
      <StudentReviewDialog
        isOpen={absencesFor !== null}
        onClose={() => setAbsencesFor(null)}
        title={t('evaluations.absentees')}
        context={absencesFor ? contextOf(selectedClassDisplayName, `${t(`evaluations.type.${absencesFor.planned.type}`)} ${number.format(absencesFor.planned.num)}`) : undefined}
      >
        {absencesFor && selectedClass && (
          <StudentNamesEditor
            onManageStudents={openClassSettings}
            key={`${selectedClass.id}-${absencesFor.planned.id}`}
            variant="absent"
            roster={config.classRosters?.[selectedClass.id]}
            initialNames={absencesRecord?.names ?? []}
            updatedAt={absencesRecord?.updatedAt}
            onCancel={() => setAbsencesFor(null)}
            onSave={(names) => {
              actions.saveAbsences(absencesFor.planned.id, names, absencesFor.planned.legacyId);
              setAbsencesFor(null);
            }}
          />
        )}
      </StudentReviewDialog>

      {/* 4. Modal Document Pédagogique */}
      <ContentDocumentModal
        key={documentFor?.kind === 'event' ? documentFor.event.id : documentFor ? `${documentFor.link.planned.id}${documentFor.part ?? ''}` : 'closed'}
        isOpen={documentFor !== null}
        onClose={() => setDocumentFor(null)}
        title={documentTitle}
        heading={documentFor?.kind === 'assessment' && documentFor.part === 'correction' ? t('evaluations.action.correctionContent') : undefined}
        subtitle={documentClassDisplayName}
        document={documentOf}
        onSave={(source) => {
          if (documentFor?.kind === 'event') actions.saveEventDocument(documentFor.event.id, source);
          else if (documentFor?.kind === 'assessment' && documentFor.part === 'correction') actions.saveAssessmentDocument(homeworkCorrectionDocumentId(documentFor.link.planned.id), source, documentFor.link.planned.legacyId ? homeworkCorrectionDocumentId(documentFor.link.planned.legacyId) : undefined);
          else if (documentFor?.kind === 'assessment') actions.saveAssessmentDocument(documentFor.link.planned.id, source, documentFor.link.planned.legacyId);
          setDocumentFor(null);
        }}
      />

      {/* 5. Modal Évaluation Orale */}
      <StudentReviewDialog
        isOpen={oralFor !== null}
        onClose={() => setOralFor(null)}
        tracking={Boolean(oralPolicy?.feedback)}
        title={oralTitle}
        context={oralFor ? contextOf(selectedClassDisplayName, `${t(`evaluations.type.${oralFor.planned.type}`)} ${number.format(oralFor.planned.num)}`) : undefined}
      >
        {oralFor && selectedClass && (
          <StudentNamesEditor
            onManageStudents={openClassSettings}
            key={`oral-${selectedClass.id}-${oralFor.planned.id}`}
            variant="checked"
            trackOral={Boolean(oralPolicy?.feedback)}
            trackGrades={Boolean(oralPolicy?.grades)}
            initialNames={(config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id] ?? (oralFor.planned.legacyId ? config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.legacyId] : undefined))?.names ?? []}
            initialOralOutcomes={(config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id] ?? (oralFor.planned.legacyId ? config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.legacyId] : undefined))?.oralOutcomes}
            initialOralGrades={(config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id] ?? (oralFor.planned.legacyId ? config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.legacyId] : undefined))?.oralGrades}
            roster={config.classRosters?.[selectedClass.id]}
            reportTitle={oralTitle}
            reportContext={`${selectedClassDisplayName} · ${t(`evaluations.type.${oralFor.planned.type}`)} ${number.format(oralFor.planned.num)} · ${formatLongDate(oralFor.planned.dateISO, locale)}`}
            onCancel={() => setOralFor(null)}
            onSave={(names, _notebook, oralOutcomes, _hw, oralGrades) => {
              // Liste simple (retour désactivé) : les niveaux et notes déjà saisis sont conservés pour les élèves restants.
              const previous = (config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id] ?? (oralFor.planned.legacyId ? config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.legacyId] : undefined));
              actions.saveOral(oralFor.planned.id, names,
                oralOutcomes ?? retainOralOutcomes(names, previous?.oralOutcomes),
                oralGrades ?? retainOralGrades(names, previous?.oralGrades), oralFor.planned.legacyId);
              setOralFor(null);
              toast.success(t(names.length ? 'evaluations.students.savedMany' : 'evaluations.students.cleared', {
                count: number.format(names.length), activity: oralTitle,
              }));
            }}
          />
        )}
      </StudentReviewDialog>

      {/* 5bis. Modal Remise du devoir maison */}
      <StudentReviewDialog
        isOpen={submissionsFor !== null}
        onClose={() => setSubmissionsFor(null)}
        tracking={Boolean(homeworkPolicy?.feedback)}
        title={t('evaluations.homework.notReturnedTitle')}
        context={submissionsFor ? contextOf(selectedClassDisplayName, submissionsLabel) : undefined}
      >
        {submissionsFor && selectedClass && (
          <StudentNamesEditor
            onManageStudents={openClassSettings}
            key={`homework-${selectedClass.id}-${submissionsFor.planned.id}`}
            variant="checked"
            trackHomework={Boolean(homeworkPolicy?.feedback)}
            initialNames={submissionsRecord?.names ?? []}
            initialHomeworkOutcomes={submissionsRecord?.homeworkOutcomes}
            roster={config.classRosters?.[selectedClass.id]}
            reportContext={`${selectedClassDisplayName} · ${submissionsLabel} · ${formatLongDate(submissionsFor.planned.dateISO, locale)}`}
            onCancel={() => setSubmissionsFor(null)}
            onSave={(names, _notebook, _oral, homeworkOutcomes) => {
              const previous = submissionsRecord;
              actions.saveHomework(submissionsFor.planned.id, names, homeworkOutcomes ?? retainHomeworkOutcomes(names, previous?.homeworkOutcomes), submissionsFor.planned.legacyId);
              setSubmissionsFor(null);
              toast.success(t(names.length ? 'evaluations.students.savedMany' : 'evaluations.students.cleared', {
                count: number.format(names.length), activity: `${t('evaluations.homework.title')} · ${submissionsLabel}`,
              }));
            }}
          />
        )}
      </StudentReviewDialog>

      {/* 6. Modal Contrôle des cahiers & suivi participants */}
      <StudentReviewDialog
        isOpen={studentsFor !== null}
        onClose={() => setStudentsFor(null)}
        tracking={studentsReview}
        title={t(studentsReview ? (notebookCheck ? 'evaluations.notebook.title' : 'evaluations.track.title') : 'evaluations.students.open')}
        context={studentsFor ? contextOf(selectedClassDisplayName, localizedActivityTitle(studentsFor.title, studentsFor.type, locale)) : undefined}
      >
        {studentsFor && (
          <StudentNamesEditor
            onManageStudents={openClassSettings}
            key={`students-${studentsFor.id}`}
            variant="checked"
            initialNames={studentsFor.students?.names ?? []}
            trackNotebookCondition={studentsReview && notebookCheck}
            initialNotebookConditions={studentsFor.students?.notebookConditions}
            trackOral={studentsReview && !notebookCheck}
            trackGrades={Boolean(studentsPolicy?.grades)}
            initialOralOutcomes={studentsFor.students?.oralOutcomes}
            initialOralGrades={studentsFor.students?.oralGrades}
            reportTitle={localizedActivityTitle(studentsFor.title, studentsFor.type, locale)}
            roster={config.classRosters?.[selectedClass.id]}
            reportContext={`${selectedClassDisplayName} · ${localizedActivityTitle(studentsFor.title, studentsFor.type, locale)} · ${formatLongDate(studentsFor.date, locale)}`}
            updatedAt={studentsFor.students?.updatedAt}
            onCancel={() => setStudentsFor(null)}
            onSave={(names, conditions, oralOutcomes, _hw, oralGrades) => {
              const activity = localizedActivityTitle(studentsFor.title, studentsFor.type, locale);
              actions.saveEventStudents(studentsFor.id, names, conditions, { oralOutcomes, oralGrades });
              toast.success(names.length > 0
                ? t(names.length === 1 ? 'evaluations.students.savedOne' : 'evaluations.students.savedMany', {
                    count: number.format(names.length),
                    activity,
                  })
                : t('evaluations.students.cleared'));
              setStudentsFor(null);
            }}
          />
        )}
      </StudentReviewDialog>

      <CreateClassModal isOpen={classSettingsOpen} onClose={() => setClassSettingsOpen(false)}
        onCreate={() => {}} editingClass={classes.find(item => item.id === classInfo.id) ?? classInfo}
        existingClasses={classes} teacherSubjects={config.selectedSubjects} teacherCycles={config.selectedCycles}
        initialSection="students" roster={config.classRosters?.[classInfo.id]}
        suggestedStudentNames={historicalStudentNames(config, classInfo.id)}
        onRosterSave={(base, names) => onConfigChange(classRosterPatch(config, classInfo.id, base, names))}
        onUpdate={(id, updates) => { if (!updateClass(id, updates)) throw new Error(t('common.error')); }} />

      {/* 7. Dialogue de confirmation suppression d'un devoir */}
      <ConfirmDialog
        open={Boolean(deletingAssessment)}
        onOpenChange={(open) => { if (!open) setDeletingAssessment(null); }}
        title={t('evaluations.deleteTitle', { name: deletingAssessment?.name ?? '' })}
        description={t('evaluations.deleteAssessmentDescription')}
        confirmLabel={t('evaluations.deleteAssessmentAction')}
        confirmationPhrase={deletingAssessment?.name}
        onConfirm={() => {
          if (!deletingAssessment) return;
          deleteAssessment(deletingAssessment.id);
          setDeletingAssessment(null);
        }}
      />

      {/* 8. Dialogue de confirmation suppression d'une activité */}
      <ConfirmDialog
        open={Boolean(deletingEvent)}
        onOpenChange={(open) => { if (!open) setDeletingEvent(null); }}
        title={t('evaluations.deleteTitle', { name: deletingEvent?.title ?? '' })}
        description={t('evaluations.deleteEventDescription')}
        confirmLabel={t('evaluations.deleteEventAction')}
        confirmationPhrase={deletingEvent?.title}
        onConfirm={() => {
          if (!deletingEvent) return;
          deletePedagogicalEvent(deletingEvent.id);
          setDeletingEvent(null);
        }}
      />

      {/* 10. Corbeille de « Correction du devoir maison » : la correction seule, jamais le devoir */}
      <ConfirmDialog
        open={Boolean(deletingCorrection)}
        onOpenChange={(open) => { if (!open) setDeletingCorrection(null); }}
        title={t('evaluations.deleteTitle', { name: deletingCorrection ? `${t('manageLessons.type.correction_devoir_maison')} ${number.format(deletingCorrection.planned.num)}` : '' })}
        description={t('evaluations.deleteCorrectionDescription')}
        confirmLabel={t('evaluations.deleteCorrectionAction')}
        onConfirm={() => {
          if (!deletingCorrection) return;
          deleteHomeworkCorrection(deletingCorrection);
          setDeletingCorrection(null);
        }}
      />
    </>
  );
};
