import { useState } from 'react';
import type { AssessmentLink } from '@/domain/evaluations/assessmentSync';
import type { ManualAssessment, PedagogicalEvent } from '@/types';

export type EvaluationDocumentTarget = { kind: 'assessment'; link: AssessmentLink } | { kind: 'event'; event: PedagogicalEvent };
type ModalState =
    | { type: 'absences' | 'oral' | 'submissions'; link: AssessmentLink }
    | { type: 'document'; target: EvaluationDocumentTarget }
    | { type: 'students'; event: PedagogicalEvent }
    | { type: 'manual'; assessment: ManualAssessment | null }
    | { type: 'delete-assessment'; target: { id: string; name: string } }
    | { type: 'delete-event'; target: { id: string; title: string } }
    | { type: 'edit-date'; target: { id: string; name: string; date: string } }
    | null;

/** One active child dialog. Opening another releases the previous target. */
export function useEvaluationModals() {
    const [modal, setModal] = useState<ModalState>(null);
    const close = (type: NonNullable<ModalState>['type']) => setModal(previous => previous?.type === type ? null : previous);
    return {
        absencesFor: modal?.type === 'absences' ? modal.link : null,
        oralFor: modal?.type === 'oral' ? modal.link : null,
        submissionsFor: modal?.type === 'submissions' ? modal.link : null,
        documentFor: modal?.type === 'document' ? modal.target : null,
        studentsFor: modal?.type === 'students' ? modal.event : null,
        editingAssessment: modal?.type === 'manual' ? modal.assessment : null,
        deletingAssessment: modal?.type === 'delete-assessment' ? modal.target : null,
        deletingEvent: modal?.type === 'delete-event' ? modal.target : null,
        editingDateAssessment: modal?.type === 'edit-date' ? modal.target : null,
        manualEditorOpen: modal?.type === 'manual',
        setAbsencesFor: (link: AssessmentLink | null) => link ? setModal({ type: 'absences', link }) : close('absences'),
        setOralFor: (link: AssessmentLink | null) => link ? setModal({ type: 'oral', link }) : close('oral'),
        setSubmissionsFor: (link: AssessmentLink | null) => link ? setModal({ type: 'submissions', link }) : close('submissions'),
        setDocumentFor: (target: EvaluationDocumentTarget | null) => target ? setModal({ type: 'document', target }) : close('document'),
        setStudentsFor: (event: PedagogicalEvent | null) => event ? setModal({ type: 'students', event }) : close('students'),
        setEditingAssessment: (assessment: ManualAssessment | null) => assessment ? setModal({ type: 'manual', assessment }) : close('manual'),
        setDeletingAssessment: (target: { id: string; name: string } | null) => target ? setModal({ type: 'delete-assessment', target }) : close('delete-assessment'),
        setDeletingEvent: (target: { id: string; title: string } | null) => target ? setModal({ type: 'delete-event', target }) : close('delete-event'),
        setEditingDateAssessment: (target: { id: string; name: string; date: string } | null) => target ? setModal({ type: 'edit-date', target }) : close('edit-date'),
        setManualEditorOpen: (open: boolean) => { if (!open) close('manual'); },
    };
}
