// Import RELATIF avec extension : ce module doit aussi pouvoir être chargé hors du
// bundle de l'application (l'alias `@/` n'existe pas dans l'API, voir `check:api`).
import type { ContentDocument, DevoirType, EvaluationPolicy, PedagogicalEventType } from '../../types.js';
import { documentRequirementFor, type DocumentRequirement } from './evaluationPolicy.js';

export type { DocumentRequirement };

/*
 * UNE SEULE RÈGLE POUR « CETTE ACTIVITÉ A-T-ELLE BESOIN D'UN DOCUMENT ? ».
 *
 * Avant, trois écrans répondaient chacun à leur façon (la feuille des devoirs,
 * la liste des activités et la fiche enseignant de la direction) : un contrôle
 * des cahiers proposait « Aucun document » côté direction, alors qu'il n'en
 * porte jamais — sa trace vit dans la remarque de la séance.
 *
 *   required : l'épreuve ne se tient pas sans son sujet (devoir surveillé,
 *              diagnostic, examen blanc, correction) → manquant = rouge ;
 *   optional : un support est possible, jamais attendu (oral, soutien,
 *              olympiade…) → absent = neutre, présent = vert ;
 *   none     : aucun document n'a de sens → le bouton n'existe pas.
 *
 * Les valeurs par défaut vivent dans `evaluationPolicy.ts` (une seule table pour
 * toutes les capacités d'une nature) ; la direction peut les infléchir nature par
 * nature, d'où le paramètre `policy` — absent, c'est le comportement historique.
 *
 * Module pur : aucune dépendance à React, utilisable côté écran comme côté
 * administration.
 */

/** Ce que le bouton « document » doit dire d'un coup d'œil. */
export type DocumentIndicator = 'none' | 'attached' | 'missing' | 'idle';

export const documentRequirementForAssessment = (type: DevoirType, policy?: EvaluationPolicy | null): DocumentRequirement =>
  documentRequirementFor(policy, type);

export const documentRequirementForEvent = (type: PedagogicalEventType, policy?: EvaluationPolicy | null): DocumentRequirement =>
  documentRequirementFor(policy, type);

/** Un document « existe » quand sa source contient du texte : un objet vide ne compte pas. */
const hasDocumentSource = (document?: Pick<ContentDocument, 'source'> | null): boolean =>
  typeof document?.source === 'string' && document.source.trim().length > 0;

export const documentIndicator = (
  requirement: DocumentRequirement,
  document?: Pick<ContentDocument, 'source'> | null,
): DocumentIndicator => {
  if (requirement === 'none') return 'none';
  if (hasDocumentSource(document)) return 'attached';
  return requirement === 'required' ? 'missing' : 'idle';
};
