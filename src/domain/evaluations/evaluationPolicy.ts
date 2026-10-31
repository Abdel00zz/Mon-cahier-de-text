// Imports RELATIFS avec extension : module pur, aussi chargé par l'API (voir `check:api`).
import { sumBy } from 'es-toolkit';
import type {
  DevoirType,
  EvaluationDocumentMode,
  EvaluationKindKey,
  EvaluationKindOverrides,
  EvaluationKindPolicy,
  EvaluationPolicy,
  EvaluationPolicyAssignment,
} from '../../types.js';

/*
 * LA POLITIQUE DU CONTRÔLE CONTINU — ce que la direction décide, nature par nature.
 *
 * Le cahier de textes (tableau) et la feuille « Contrôle continu et activités »
 * partagent seize natures d'éléments : six devoirs (qui nourrissent le bulletin)
 * et dix activités. Pour chacune, la direction choisit :
 *
 *   transmit    le cahier la transmet-il à la feuille ?
 *   continuous  est-elle traitée comme contrôle continu ?
 *   document    contenu rédigé : absent, facultatif ou obligatoire
 *   students    liste d'élèves
 *   feedback    retour par élève (niveau, remise, état du cahier)
 *   grades      note /20 par élève
 *   absences    liste des absents
 *   correction  devoir maison seulement : la séance de correction est datée sur la feuille
 *
 * LES VALEURS PAR DÉFAUT REPRODUISENT LE COMPORTEMENT HISTORIQUE À L'IDENTIQUE :
 * une politique absente ne change rien. Seuls les ÉCARTS sont stockés
 * (`EvaluationKindOverrides`), ce qui garde le document minuscule et laisse les
 * défauts évoluer sans réécrire ce que la direction a publié.
 *
 * Deux règles de cohérence, appliquées à chaque lecture :
 *   - la note suppose le retour par élève, qui suppose la liste d'élèves ;
 *   - une capacité que la nature ne sait pas porter (note d'un devoir maison,
 *     absents d'une activité) reste éteinte, quoi qu'on publie.
 *
 * Module pur : aucune dépendance à React.
 */

export type DocumentRequirement = 'required' | 'optional' | 'none';
/** Forme du retour par élève, fixée par la nature (jamais choisie à la volée). */
type FeedbackMode = 'levels' | 'submission' | 'notebook';

/** Ordre de lecture : celui de la feuille (le contrôle continu d'abord). */
export const EVALUATION_KIND_ORDER: readonly EvaluationKindKey[] = [
  'evaluation_diagnostic', 'controle', 'controle_court', 'controle_global', 'oral', 'maison', 'colle',
  'controle_cahiers', 'correction_controle_continu',
  'examen_blanc', 'olympiade', 'concours', 'soutien', 'remediation', 'rattrapage', 'autre',
];

const DEVOIR_KINDS: ReadonlySet<string> = new Set<DevoirType>(['controle', 'controle_court', 'controle_global', 'oral', 'maison', 'colle']);
const KIND_SET: ReadonlySet<string> = new Set(EVALUATION_KIND_ORDER);

export const isEvaluationKind = (value: unknown): value is EvaluationKindKey =>
  typeof value === 'string' && KIND_SET.has(value);
export const isDevoirKind = (value: unknown): value is DevoirType =>
  typeof value === 'string' && DEVOIR_KINDS.has(value);

/** Ce qu'une nature sait porter : le reste ne peut être activé par personne. */
export interface KindSupport {
  feedback: FeedbackMode;
  grades: boolean;
  absences: boolean;
  /** La nature a un second temps (la correction) que la feuille peut dater. */
  correction: boolean;
}

export const kindSupport = (kind: EvaluationKindKey): KindSupport => {
  // Le devoir maison n'a pas d'absents : sa feuille propose le contenu, la date limite, les élèves qui n'ont pas rendu.
  if (kind === 'maison') return { feedback: 'submission', grades: false, absences: false, correction: true };
  if (kind === 'controle_cahiers') return { feedback: 'notebook', grades: false, absences: false, correction: false };
  if (isDevoirKind(kind)) return { feedback: 'levels', grades: true, absences: true, correction: false };
  return { feedback: 'levels', grades: true, absences: false, correction: false };
};

type KindDefaults = EvaluationKindPolicy;
const policy = (p: Partial<KindDefaults> & Pick<KindDefaults, 'document'>): KindDefaults => ({
  transmit: true, continuous: false, students: false, feedback: false, grades: false, absences: false, correction: false, ...p,
});

/** Comportement historique, nature par nature. */
const DEFAULTS: Record<EvaluationKindKey, KindDefaults> = {
  // Épreuves écrites : sujet obligatoire, absents consignés.
  controle: policy({ continuous: true, document: 'required', absences: true }),
  controle_court: policy({ continuous: true, document: 'required', absences: true }),
  controle_global: policy({ continuous: true, document: 'required', absences: true }),
  // Oral et colle : liste, niveau et note dans une seule fenêtre.
  oral: policy({ continuous: true, document: 'optional', students: true, feedback: true, grades: true }),
  colle: policy({ continuous: true, document: 'optional', students: true, feedback: true, grades: true }),
  // Devoir maison : remise élève par élève.
  maison: policy({ continuous: true, document: 'required', students: true, feedback: true, correction: true }),
  evaluation_diagnostic: policy({ continuous: true, document: 'required', students: true }),
  // Fait de séance consigné dans la remarque : jamais un document.
  controle_cahiers: policy({ continuous: true, document: 'off', students: true, feedback: true }),
  correction_controle_continu: policy({ continuous: true, document: 'required', students: true }),
  examen_blanc: policy({ document: 'required', students: true }),
  olympiade: policy({ document: 'optional', students: true }),
  concours: policy({ document: 'optional', students: true }),
  soutien: policy({ document: 'optional', students: true }),
  remediation: policy({ document: 'optional', students: true }),
  rattrapage: policy({ document: 'optional', students: true }),
  autre: policy({ document: 'optional', students: true }),
};

export const defaultKindPolicy = (kind: EvaluationKindKey): EvaluationKindPolicy => ({ ...DEFAULTS[kind] });

/** Applique les règles de cohérence : jamais d'état impossible, quelle que soit la source. */
export const clampKindPolicy = (kind: EvaluationKindKey, value: EvaluationKindPolicy): EvaluationKindPolicy => {
  const support = kindSupport(kind);
  const students = value.students;
  const feedback = students && value.feedback;
  return {
    transmit: value.transmit,
    continuous: value.continuous,
    document: value.document,
    students,
    feedback,
    grades: feedback && support.grades && value.grades,
    absences: support.absences && value.absences,
    // La correction est le second temps d'un devoir transmis : sans le devoir, elle n'a rien à dater.
    correction: support.correction && value.transmit && value.correction,
  };
};

export const EMPTY_EVALUATION_POLICY: EvaluationPolicy = { kinds: {}, version: 0, updatedAt: null };

/** Politique effective d'une nature : défaut, puis écarts publiés, puis cohérence. */
export const resolveKindPolicy = (policyValue: EvaluationPolicy | undefined | null, kind: EvaluationKindKey): EvaluationKindPolicy =>
  // Une nature inconnue (donnée d'une version plus récente) se comporte comme « autre ».
  clampKindPolicy(kind, { ...(DEFAULTS[kind] ?? DEFAULTS.autre), ...(policyValue?.kinds?.[kind] ?? {}) } as EvaluationKindPolicy);

// ── Lecture indulgente (disque, réseau) et validation stricte (API) ─────────────

const FLAG_FIELDS = ['transmit', 'continuous', 'students', 'feedback', 'grades', 'absences', 'correction'] as const;
const DOCUMENT_MODES: readonly EvaluationDocumentMode[] = ['off', 'optional', 'required'];
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Retire tout ce qui n'est pas une nature connue ou un champ valide ; ne lève jamais. */
const normalizeEvaluationKindOverrides = (raw: unknown): EvaluationKindOverrides => {
  const result: EvaluationKindOverrides = {};
  if (!isPlainObject(raw)) return result;
  for (const kind of EVALUATION_KIND_ORDER) {
    const source = raw[kind];
    if (!isPlainObject(source)) continue;
    const entry: Partial<EvaluationKindPolicy> = {};
    for (const field of FLAG_FIELDS) if (typeof source[field] === 'boolean') entry[field] = source[field] as boolean;
    if (DOCUMENT_MODES.includes(source.document as EvaluationDocumentMode)) entry.document = source.document as EvaluationDocumentMode;
    if (Object.keys(entry).length) result[kind] = entry;
  }
  return result;
};

/** Même lecture, mais une entrée inconnue ou mal typée est une ERREUR (réponse 400). */
export const validateEvaluationKindOverrides = (raw: unknown): { ok: true; kinds: EvaluationKindOverrides } | { ok: false; error: string } => {
  if (!isPlainObject(raw)) return { ok: false, error: 'Politique invalide.' };
  for (const [kind, source] of Object.entries(raw)) {
    if (!isEvaluationKind(kind)) return { ok: false, error: `Nature inconnue : ${kind.slice(0, 40)}.` };
    if (!isPlainObject(source)) return { ok: false, error: `Réglages invalides pour ${kind}.` };
    for (const [field, value] of Object.entries(source)) {
      const valid = field === 'document'
        ? DOCUMENT_MODES.includes(value as EvaluationDocumentMode)
        : (FLAG_FIELDS as readonly string[]).includes(field) && typeof value === 'boolean';
      if (!valid) return { ok: false, error: `Réglage invalide : ${kind}.${field.slice(0, 40)}.` };
    }
  }
  return { ok: true, kinds: normalizeEvaluationKindOverrides(raw) };
};

const timestamp = (value: unknown): string | null =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;

export const normalizeEvaluationPolicy = (raw: unknown): EvaluationPolicy => {
  if (!isPlainObject(raw)) return EMPTY_EVALUATION_POLICY;
  const version = Number.isSafeInteger(raw.version) && Number(raw.version) >= 0 ? Number(raw.version) : 0;
  return { kinds: normalizeEvaluationKindOverrides(raw.kinds), version, updatedAt: timestamp(raw.updatedAt) };
};

export const normalizeEvaluationAssignment = (raw: unknown): EvaluationPolicyAssignment => normalizeEvaluationPolicy(raw);

/** Politique d'un compte : la générale, puis les écarts propres au compte, champ par champ. */
export const resolveEvaluationPolicy = (
  global: EvaluationPolicy | undefined | null,
  assignment: EvaluationPolicyAssignment | undefined | null,
): EvaluationPolicy => {
  const base = global ?? EMPTY_EVALUATION_POLICY;
  const own = assignment ?? EMPTY_EVALUATION_POLICY;
  const kinds: EvaluationKindOverrides = {};
  for (const kind of EVALUATION_KIND_ORDER) {
    const merged = { ...(base.kinds[kind] ?? {}), ...(own.kinds[kind] ?? {}) };
    if (Object.keys(merged).length) kinds[kind] = merged;
  }
  const updatedAt = [base.updatedAt, own.updatedAt].filter((value): value is string => !!value).sort().at(-1) ?? null;
  return { kinds, version: base.version + own.version, updatedAt };
};

/** Écarts d'une politique complète (une par nature) par rapport à une base : le plus petit document équivalent. */
export const diffKindPolicies = (
  full: Record<EvaluationKindKey, EvaluationKindPolicy>,
  base: EvaluationPolicy | undefined | null,
): EvaluationKindOverrides => {
  const result: EvaluationKindOverrides = {};
  for (const kind of EVALUATION_KIND_ORDER) {
    const reference = resolveKindPolicy(base, kind);
    const entry: Partial<EvaluationKindPolicy> = {};
    for (const field of [...FLAG_FIELDS, 'document'] as const) {
      if (full[kind][field] !== reference[field]) (entry as Record<string, unknown>)[field] = full[kind][field];
    }
    if (Object.keys(entry).length) result[kind] = entry;
  }
  return result;
};

/** Toutes les natures résolues, dans l'ordre de lecture. */
export const resolveAllKindPolicies = (policyValue: EvaluationPolicy | undefined | null): Record<EvaluationKindKey, EvaluationKindPolicy> =>
  Object.fromEntries(EVALUATION_KIND_ORDER.map(kind => [kind, resolveKindPolicy(policyValue, kind)])) as Record<EvaluationKindKey, EvaluationKindPolicy>;

export const countPolicyChanges = (policyValue: EvaluationPolicy | undefined | null): number =>
  sumBy(Object.values(policyValue?.kinds ?? {}), entry => Object.keys(entry ?? {}).length);

// ── Questions posées par les écrans (une seule réponse pour tous) ────────────────

export const kindTransmits = (policyValue: EvaluationPolicy | undefined | null, kind: EvaluationKindKey): boolean =>
  resolveKindPolicy(policyValue, kind).transmit;

export const documentRequirementFor = (policyValue: EvaluationPolicy | undefined | null, kind: EvaluationKindKey): DocumentRequirement => {
  const mode = resolveKindPolicy(policyValue, kind).document;
  return mode === 'off' ? 'none' : mode;
};

/** Éléments du contrôle continu (en tête de feuille), dans l'ordre de lecture. */
export const continuousKinds = (policyValue: EvaluationPolicy | undefined | null): EvaluationKindKey[] =>
  EVALUATION_KIND_ORDER.filter(kind => resolveKindPolicy(policyValue, kind).continuous);
