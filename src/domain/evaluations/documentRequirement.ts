// Import RELATIF avec extension : ce module doit aussi pouvoir être chargé hors du
// bundle de l'application (l'alias `@/` n'existe pas dans l'API, voir `check:api`).
import type { ContentDocument, DevoirType, PedagogicalEventType } from '../../types.js';

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
 * Module pur : aucune dépendance à React, utilisable côté écran comme côté
 * administration.
 */
export type DocumentRequirement = 'required' | 'optional' | 'none';

/** Ce que le bouton « document » doit dire d'un coup d'œil. */
export type DocumentIndicator = 'none' | 'attached' | 'missing' | 'idle';

const ASSESSMENT_REQUIREMENT: Record<DevoirType, DocumentRequirement> = {
  controle: 'required',
  controle_court: 'required',
  controle_global: 'required',
  maison: 'required',
  oral: 'optional',
  colle: 'optional',
};

const EVENT_REQUIREMENT: Record<PedagogicalEventType, DocumentRequirement> = {
  evaluation_diagnostic: 'required',
  examen_blanc: 'required',
  correction_controle_continu: 'required',
  olympiade: 'optional',
  concours: 'optional',
  soutien: 'optional',
  remediation: 'optional',
  rattrapage: 'optional',
  autre: 'optional',
  // Un fait de séance (cahiers contrôlés), consigné dans la remarque : jamais un document.
  controle_cahiers: 'none',
};

export const documentRequirementForAssessment = (type: DevoirType): DocumentRequirement =>
  ASSESSMENT_REQUIREMENT[type] ?? 'optional';

export const documentRequirementForEvent = (type: PedagogicalEventType): DocumentRequirement =>
  EVENT_REQUIREMENT[type] ?? 'optional';

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
