import { useState } from 'react';
import type { AssessmentLink } from '@/domain/evaluations/assessmentSync';
import type { PedagogicalEvent } from '@/types';

/** `part: 'correction'` : le corrigé d'un devoir maison (son propre document, sous `<devoir>:correction`). */
export type EvaluationDocumentTarget = { kind: 'assessment'; link: AssessmentLink; part?: 'correction' } | { kind: 'event'; event: PedagogicalEvent };
type ModalState =
    | { type: 'absences' | 'oral' | 'submissions'; link: AssessmentLink }
    | { type: 'document'; target: EvaluationDocumentTarget }
    | { type: 'students'; event: PedagogicalEvent }
    | { type: 'delete-assessment'; target: { id: string; name: string } }
    | { type: 'delete-event'; target: { id: string; title: string } }
    | { type: 'delete-correction'; link: AssessmentLink }
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
        deletingAssessment: modal?.type === 'delete-assessment' ? modal.target : null,
        deletingEvent: modal?.type === 'delete-event' ? modal.target : null,
        deletingCorrection: modal?.type === 'delete-correction' ? modal.link : null,
        setAbsencesFor: (link: AssessmentLink | null) => link ? setModal({ type: 'absences', link }) : close('absences'),
        setOralFor: (link: AssessmentLink | null) => link ? setModal({ type: 'oral', link }) : close('oral'),
        setSubmissionsFor: (link: AssessmentLink | null) => link ? setModal({ type: 'submissions', link }) : close('submissions'),
        setDocumentFor: (target: EvaluationDocumentTarget | null) => target ? setModal({ type: 'document', target }) : close('document'),
        setStudentsFor: (event: PedagogicalEvent | null) => event ? setModal({ type: 'students', event }) : close('students'),
        setDeletingAssessment: (target: { id: string; name: string } | null) => target ? setModal({ type: 'delete-assessment', target }) : close('delete-assessment'),
        setDeletingEvent: (target: { id: string; title: string } | null) => target ? setModal({ type: 'delete-event', target }) : close('delete-event'),
        setDeletingCorrection: (link: AssessmentLink | null) => link ? setModal({ type: 'delete-correction', link }) : close('delete-correction'),
    };
}
