import { EMPTY_EVALUATION_POLICY } from '../../domain/evaluations/evaluationPolicy';
import type { EvaluationDocumentMode, EvaluationKindKey, EvaluationKindPolicy } from '../../types';
import type { AdminEvaluationPolicyState } from '../api';

export interface EvaluationPolicyManagerProps {
    onBack: () => void;
    /** Présent : personnalisation du compte. Absent : politique générale. */
    phone?: string;
}

export type Draft = Record<EvaluationKindKey, EvaluationKindPolicy>;

export const EMPTY_STATE: AdminEvaluationPolicyState = {
    evaluationPolicy: EMPTY_EVALUATION_POLICY,
    globalEvaluationPolicy: EMPTY_EVALUATION_POLICY,
    assignment: null,
};

/** Nom court et rôle de chaque nature, tels que la direction les lit. */
export const KIND_COPY: Record<EvaluationKindKey, { name: string; note: string }> = {
    evaluation_diagnostic: { name: 'Évaluation diagnostique', note: 'Évaluation de départ de la classe' },
    controle: { name: 'Devoir surveillé', note: 'Épreuve écrite en classe' },
    controle_court: { name: 'Devoir écrit court', note: 'Épreuve écrite courte' },
    controle_global: { name: 'Devoir écrit global', note: 'Épreuve écrite longue' },
    oral: { name: 'Évaluation orale', note: 'La classe prend la parole' },
    maison: { name: 'Devoir maison', note: 'Travail remis puis corrigé en classe' },
    colle: { name: 'Colle', note: 'Interrogation orale des classes préparatoires' },
    controle_cahiers: { name: 'Contrôle des cahiers', note: 'Constat noté dans la remarque de séance' },
    correction_controle_continu: { name: 'Correction du devoir surveillé', note: 'Séance de correction d’une épreuve' },
    examen_blanc: { name: 'Examen blanc', note: 'Épreuve en conditions d’examen' },
    olympiade: { name: 'Olympiade', note: 'Compétition ouverte aux élèves' },
    concours: { name: 'Concours', note: 'Préparation ou passage d’un concours' },
    soutien: { name: 'Soutien', note: 'Séance d’accompagnement' },
    remediation: { name: 'Remédiation', note: 'Reprise ciblée d’une notion' },
    rattrapage: { name: 'Rattrapage', note: 'Séance pour les élèves absents' },
    autre: { name: 'Autre activité', note: 'Activité libre de la classe' },
};

export const FEEDBACK_COPY = {
    levels: 'Niveau atteint par chaque élève',
    submission: 'Rendu ou non rendu',
    notebook: 'État du cahier de chaque élève',
} as const;

export const DOCUMENT_OPTIONS: ReadonlyArray<{ value: EvaluationDocumentMode; label: string }> = [
    { value: 'off', label: 'Sans contenu' },
    { value: 'optional', label: 'Facultatif' },
    { value: 'required', label: 'Requis' },
];

export const FIELDS = ['transmit', 'continuous', 'document', 'students', 'feedback', 'grades', 'absences', 'correction'] as const;

/** Les commandes que verra l'enseignant sur la ligne de cette nature, dans l'ordre de la feuille. */
export const previewFor = (kind: EvaluationKindKey, policy: EvaluationKindPolicy): { label: string; filled?: 'missing' }[] => {
    const items: { label: string; filled?: 'missing' }[] = [];
    if (policy.document !== 'off') items.push({ label: 'Contenu', filled: policy.document === 'required' ? 'missing' : undefined });
    if (policy.absences) items.push({ label: 'Absents' });
    if (policy.students) {
        items.push({ label: kind === 'maison' ? 'Remises' : kind === 'oral' || kind === 'colle' ? 'Suivi' : kind === 'controle_cahiers' ? 'Cahiers' : 'Élèves' });
    }
    return items;
};
