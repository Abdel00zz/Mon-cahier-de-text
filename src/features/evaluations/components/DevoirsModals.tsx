import React, { useMemo } from 'react';
import { toast } from 'sonner';
import type { AppConfig, AppLocale, ClassInfo, DevoirType, ManualAssessment } from '@/types';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { resolveKindPolicy } from '@/domain/evaluations/evaluationPolicy';
import { retainHomeworkOutcomes } from '@/domain/evaluations/homeworkSubmissions';
import { retainOralGrades, retainOralOutcomes } from '@/domain/evaluations/studentRoster';
import { numberFormat } from '@/lib/formatters';
import { useLocale } from '@/i18n/LocaleProvider';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { bidiIsolate } from '@/lib/text/textDirection';
import { ContentDocumentModal } from './ContentDocumentModal';
import { EventDateModal } from './EventDateModal';
import { StudentNamesEditor } from './StudentNamesEditor';
import { StudentReviewDialog } from './StudentReviewDialog';
import { ManualAssessmentEditor } from './ManualAssessmentEditor';
import { PEDAGOGICAL_EVENT_CONFIG } from '../kindCatalog';
import type { useEvaluationActions } from '../hooks/useEvaluationActions';
import type { useEvaluationModals } from '../hooks/useEvaluationModals';

/*
 * LA PILE DE FENÊTRES DE L'ÉCRAN DES ÉVALUATIONS.
 *
 * Extraite de `DevoirsView` : la vue garde la page (plateau, lignes, actions),
 * ce fichier garde TOUTES les fenêtres — assistant de création, éditeurs,
 * suivis d'élèves, documents, dates et confirmations. Le contrat est simple :
 * l'état vient du hook `useEvaluationModals` (une seule fenêtre active à la
 * fois), les écritures viennent de `useEvaluationActions`, et la vue fournit
 * les fonctions déjà câblées au cahier (`saveAssessment`, `setAssessmentDate`…)
 * pour que la matérialisation garde UNE seule implémentation.
 */

const formatLongDate = (iso: string, locale: AppLocale): string => {
  if (!iso) return '—';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
};

interface DevoirsModalsProps {
  classInfo: ClassInfo;
  classDisplayName: string;
  config: AppConfig;
  today: string;
  assessments: { id: string; type: DevoirType; num?: number; semestre?: 1 | 2 }[];
  modals: ReturnType<typeof useEvaluationModals>;
  actions: ReturnType<typeof useEvaluationActions>;
  saveAssessment: (manual: ManualAssessment) => void;
  setAssessmentDate: (id: string, dateISO: string) => void;
  deletePedagogicalEvent: (id: string) => void;
  deleteAssessment: (id: string) => void;
}

export const DevoirsModals: React.FC<DevoirsModalsProps> = ({
  classInfo,
  classDisplayName,
  config,
  today,
  assessments,
  modals,
  actions,
  saveAssessment,
  setAssessmentDate,
  deletePedagogicalEvent,
  deleteAssessment,
}) => {
  const { t, locale } = useLocale();
  const number = useMemo(() => numberFormat(locale), [locale]);
  const selectedClass = classInfo;
  const selectedClassDisplayName = classDisplayName;
  const {
    absencesFor, oralFor, submissionsFor, documentFor, studentsFor,
    editingAssessment, manualEditorOpen,
    deletingAssessment, deletingEvent, editingDateAssessment,
    setAbsencesFor, setOralFor, setSubmissionsFor, setDocumentFor, setStudentsFor,
    setEditingAssessment, setManualEditorOpen,
    setDeletingAssessment, setDeletingEvent, setEditingDateAssessment,
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

  const documentOf = (() => {
    if (!documentFor || !selectedClass) return undefined;
    if (documentFor.kind === 'event') return pedagogicalEvents.find(event => event.id === documentFor.event.id)?.document;
    const forClass = config.assessmentDocuments?.[selectedClass.id];
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

  const documentTitle = documentFor === null
    ? ''
    : documentFor.kind === 'event'
      ? (documentFor.event.title || t(PEDAGOGICAL_EVENT_CONFIG[documentFor.event.type].labelKey))
      : `${t(`evaluations.type.${documentFor.link.planned.type}`)} ${number.format(documentFor.link.planned.num)}`;

  /* « Classe · Devoir 2 » : chaque fragment isolé, l'arabe et le latin ne se réordonnent pas entre eux. */
  const contextOf = (...parts: string[]) => parts.filter(Boolean).map(bidiIsolate).join(' · ');

  return (
    <>
      {/* 2. Modal Ajout / Modification manuelle d'un devoir */}
      <Modal
        isOpen={manualEditorOpen}
        onClose={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
        maxWidth="md"
        className="evaluation-modal sm:rounded-xl"
        headerClassName="border-b-0 bg-background"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="border-t-0 bg-background"
        title={
          <div className="min-w-0">
            <span className="block text-base font-extrabold leading-tight tracking-[-0.015em] text-foreground rtl:tracking-normal sm:text-[17px]">
              {editingAssessment ? t('evaluations.editDevoir') : t('evaluations.addDevoir')}
            </span>
            {selectedClass && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground sm:text-xs" dir="auto">{selectedClassDisplayName}</p>
            )}
          </div>
        }
      >
        <ManualAssessmentEditor
          cycle={classInfo.cycle}
          today={today}
          initial={editingAssessment}
          assessments={assessments}
          onCancel={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
          onSave={saveAssessment}
        />
      </Modal>

      {/* 3. Modal Absences */}
      <StudentReviewDialog
        isOpen={absencesFor !== null}
        onClose={() => setAbsencesFor(null)}
        title={t('evaluations.absentees')}
        context={absencesFor ? contextOf(selectedClassDisplayName, `${t(`evaluations.type.${absencesFor.planned.type}`)} ${number.format(absencesFor.planned.num)}`) : undefined}
      >
        {absencesFor && selectedClass && (
          <StudentNamesEditor
            key={`${selectedClass.id}-${absencesFor.planned.id}`}
            variant="absent"
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
        key={documentFor?.kind === 'event' ? documentFor.event.id : documentFor?.link.planned.id ?? 'closed'}
        isOpen={documentFor !== null}
        onClose={() => setDocumentFor(null)}
        title={documentTitle}
        subtitle={selectedClass ? selectedClassDisplayName : undefined}
        document={documentOf}
        onSave={(source) => {
          if (documentFor?.kind === 'event') actions.saveEventDocument(documentFor.event.id, source);
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
            key={`oral-${selectedClass.id}-${oralFor.planned.id}`}
            variant="checked"
            trackOral={Boolean(oralPolicy?.feedback)}
            trackGrades={Boolean(oralPolicy?.grades)}
            initialNames={config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id]?.names ?? []}
            initialOralOutcomes={config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id]?.oralOutcomes}
            initialOralGrades={config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id]?.oralGrades}
            roster={config.classRosters?.[selectedClass.id]}
            reportTitle={oralTitle}
            reportContext={`${selectedClassDisplayName} · ${t(`evaluations.type.${oralFor.planned.type}`)} ${number.format(oralFor.planned.num)} · ${formatLongDate(oralFor.planned.dateISO, locale)}`}
            onCancel={() => setOralFor(null)}
            onSave={(names, _notebook, oralOutcomes, _hw, oralGrades) => {
              // Liste simple (retour désactivé) : les niveaux et notes déjà saisis sont conservés pour les élèves restants.
              const previous = config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id];
              actions.saveOral(oralFor.planned.id, names,
                oralOutcomes ?? retainOralOutcomes(names, previous?.oralOutcomes),
                oralGrades ?? retainOralGrades(names, previous?.oralGrades));
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
        title={t('evaluations.homework.title')}
        context={submissionsFor ? contextOf(selectedClassDisplayName, submissionsLabel) : undefined}
      >
        {submissionsFor && selectedClass && (
          <StudentNamesEditor
            key={`homework-${selectedClass.id}-${submissionsFor.planned.id}`}
            variant="checked"
            trackHomework={Boolean(homeworkPolicy?.feedback)}
            initialNames={config.assessmentParticipants?.[selectedClass.id]?.[submissionsFor.planned.id]?.names ?? []}
            initialHomeworkOutcomes={config.assessmentParticipants?.[selectedClass.id]?.[submissionsFor.planned.id]?.homeworkOutcomes}
            roster={config.classRosters?.[selectedClass.id]}
            reportContext={`${selectedClassDisplayName} · ${submissionsLabel} · ${formatLongDate(submissionsFor.planned.dateISO, locale)}`}
            onCancel={() => setSubmissionsFor(null)}
            onSave={(names, _notebook, _oral, homeworkOutcomes) => {
              const previous = config.assessmentParticipants?.[selectedClass.id]?.[submissionsFor.planned.id];
              actions.saveHomework(submissionsFor.planned.id, names, homeworkOutcomes ?? retainHomeworkOutcomes(names, previous?.homeworkOutcomes));
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
        context={studentsFor ? contextOf(selectedClassDisplayName, studentsFor.title || t(PEDAGOGICAL_EVENT_CONFIG[studentsFor.type].labelKey)) : undefined}
      >
        {studentsFor && (
          <StudentNamesEditor
            key={`students-${studentsFor.id}`}
            variant="checked"
            initialNames={studentsFor.students?.names ?? []}
            trackNotebookCondition={studentsReview && notebookCheck}
            initialNotebookConditions={studentsFor.students?.notebookConditions}
            trackOral={studentsReview && !notebookCheck}
            trackGrades={Boolean(studentsPolicy?.grades)}
            initialOralOutcomes={studentsFor.students?.oralOutcomes}
            initialOralGrades={studentsFor.students?.oralGrades}
            reportTitle={studentsFor.title || t(PEDAGOGICAL_EVENT_CONFIG[studentsFor.type].labelKey)}
            roster={studentsReview && notebookCheck && selectedClass ? config.classRosters?.[selectedClass.id] : undefined}
            reportContext={`${selectedClassDisplayName} · ${studentsFor.title || t(PEDAGOGICAL_EVENT_CONFIG[studentsFor.type].labelKey)} · ${formatLongDate(studentsFor.date, locale)}`}
            updatedAt={studentsFor.students?.updatedAt}
            onCancel={() => setStudentsFor(null)}
            onSave={(names, conditions, oralOutcomes, _hw, oralGrades) => {
              const activity = studentsFor.title || t(PEDAGOGICAL_EVENT_CONFIG[studentsFor.type].labelKey);
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

      {/* 9. Dialogue de sélection de date moderne pour un devoir */}
      <EventDateModal
        isOpen={Boolean(editingDateAssessment)}
        onClose={() => setEditingDateAssessment(null)}
        title={editingDateAssessment?.name}
        initialDate={editingDateAssessment?.date}
        allowRange={false}
        onApplyDate={(date) => {
          if (editingDateAssessment) {
            setAssessmentDate(editingDateAssessment.id, date);
            setEditingDateAssessment(null);
          }
        }}
      />
    </>
  );
};
