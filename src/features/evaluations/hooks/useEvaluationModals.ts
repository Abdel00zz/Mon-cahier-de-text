import { useState } from 'react';
import type { AssessmentLink } from '@/domain/evaluations/assessmentSync';
import type { ManualAssessment, PedagogicalEvent } from '@/types';
import type { EvaluationKind } from '../kindCatalog';

export type EvaluationDocumentTarget = { kind: 'assessment'; link: AssessmentLink } | { kind: 'event'; event: PedagogicalEvent };
type ModalState =
    | { type: 'absences' | 'oral'; link: AssessmentLink }
    | { type: 'document'; target: EvaluationDocumentTarget }
    | { type: 'students'; event: PedagogicalEvent }
    | { type: 'manual'; assessment: ManualAssessment | null }
    | { type: 'create'; chosenKind: EvaluationKind | null; manualFormOpen: boolean; wizardStep: 1 | 2 }
    | null;

/** One active child dialog. Opening another releases the previous target. */
export function useEvaluationModals() {
    const [modal, setModal] = useState<ModalState>(null);
    const close = (type: NonNullable<ModalState>['type']) => setModal(previous => previous?.type === type ? null : previous);
    const openKindChooser = (kind: EvaluationKind | null = null) => setModal({ type: 'create', chosenKind: kind, manualFormOpen: false, wizardStep: kind ? 2 : 1 });
    return {
        absencesFor: modal?.type === 'absences' ? modal.link : null,
        oralFor: modal?.type === 'oral' ? modal.link : null,
        documentFor: modal?.type === 'document' ? modal.target : null,
        studentsFor: modal?.type === 'students' ? modal.event : null,
        editingAssessment: modal?.type === 'manual' ? modal.assessment : null,
        manualEditorOpen: modal?.type === 'manual',
        kindChooserOpen: modal?.type === 'create',
        chosenKind: modal?.type === 'create' ? modal.chosenKind : null,
        manualFormOpen: modal?.type === 'create' && modal.manualFormOpen,
        wizardStep: modal?.type === 'create' ? modal.wizardStep : 1,
        openKindChooser, closeKindChooser: () => close('create'),
        setAbsencesFor: (link: AssessmentLink | null) => link ? setModal({ type: 'absences', link }) : close('absences'),
        setOralFor: (link: AssessmentLink | null) => link ? setModal({ type: 'oral', link }) : close('oral'),
        setDocumentFor: (target: EvaluationDocumentTarget | null) => target ? setModal({ type: 'document', target }) : close('document'),
        setStudentsFor: (event: PedagogicalEvent | null) => event ? setModal({ type: 'students', event }) : close('students'),
        setEditingAssessment: (assessment: ManualAssessment | null) => assessment ? setModal({ type: 'manual', assessment }) : close('manual'),
        setManualEditorOpen: (open: boolean) => { if (!open) close('manual'); },
        setChosenKind: (chosenKind: EvaluationKind | null) => setModal(previous => previous?.type === 'create' ? { ...previous, chosenKind } : previous),
        setWizardStep: (wizardStep: 1 | 2) => setModal(previous => previous?.type === 'create' ? { ...previous, wizardStep } : previous),
        setManualFormOpen: (manualFormOpen: boolean) => setModal(previous => previous?.type === 'create' ? { ...previous, manualFormOpen } : previous),
    };
}
