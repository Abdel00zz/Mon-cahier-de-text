import type { DevoirType, TopLevelItem } from '../../types.js';
import type { LessonRow } from '../notebook/lessonRows.js';
import { schoolYearLabelFromDate } from '../calendar/calendar.js';
import type { SessionActivityType } from './pedagogicalActivities.js';

/*
 * IDENTITÉ UNIQUE TABLEAU ↔ ÉVALUATIONS.
 *
 * Un seul endroit définit :
 *   - les préfixes d'identifiants (`dev-block-`, `event-`, `notebook-`, `remark-`) ;
 *   - la correspondance exacte entre une ligne du tableau et un événement / devoir ;
 *   - les listes de natures partagées (blocs événements, devoirs liables, blocs supprimables).
 *
 * Ainsi, une nature ajoutée ou créée depuis le tableau ne peut plus être oubliée
 * dans `linkAssessments`, `evaluationConflicts`, `activityDocumentPreviews` ou
 * `removeEventFromNotebook`.
 */

export const EVENT_BLOCK_TYPES = [
  'evaluation_diagnostic',
  'correction_controle_continu',
  'examen_blanc',
  'olympiade',
  'concours',
] as const;

const EVENT_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(EVENT_BLOCK_TYPES);

/** Vrai si la ligne du cahier porte un bloc événement (né au tableau ou matérialisé par la feuille). */
export const isEventBlockRow = (row: Pick<LessonRow, 'elementType' | 'data'>): boolean =>
  EVENT_BLOCK_TYPE_SET.has(row.elementType) || Boolean(row.data._tempId?.startsWith('event-'));

/** Tous les devoirs du catalogue sont liables à leur ligne du cahier (y compris la colle). */
export const LINKABLE_DEVOIR_TYPES: readonly DevoirType[] = [
  'controle',
  'controle_court',
  'controle_global',
  'oral',
  'maison',
  'colle',
];

const LINKABLE_DEVOIR_SET: ReadonlySet<string> = new Set(LINKABLE_DEVOIR_TYPES);
export const isLinkableDevoirType = (type: string): type is DevoirType => LINKABLE_DEVOIR_SET.has(type);

/** Devoirs ÉCRITS matérialisés par la feuille en bloc daté (l'oral et le devoir maison ne créent jamais de bloc depuis la feuille). */
export const WRITTEN_TEST_BLOCK: Partial<Record<DevoirType, TopLevelItem['type']>> = {
  controle: 'controle_continu',
  controle_court: 'controle_court',
  controle_global: 'controle_global',
  colle: 'colle',
};

/** Blocs de devoir présents dans le tableau qui doivent partir lors d'une suppression depuis la feuille (inclut l'oral né au tableau). */
export const REMOVABLE_ASSESSMENT_BLOCK: Partial<Record<DevoirType, TopLevelItem['type']>> = {
  ...WRITTEN_TEST_BLOCK,
  oral: 'oral',
};

/** Semestre scolaire marocain : février à juillet = S2, août à janvier = S1. */
export const semesterFromIsoDate = (dateISO: string): 1 | 2 => {
  const month = Number(dateISO.slice(5, 7));
  return month >= 2 && month <= 7 ? 2 : 1;
};

/** Identifiant annuel canonique d'un devoir : ex. `2026-2027:s1-controle1`. */
export const annualAssessmentId = (dateISO: string, type: DevoirType, num: number): string =>
  `${schoolYearLabelFromDate(dateISO)}:s${semesterFromIsoDate(dateISO)}-${type}${num}`;

/** Identifiant d'événement projeté depuis une ligne bloc du tableau. */
export const eventIdForRow = (row: Pick<LessonRow, 'key' | 'data'>): string =>
  row.data._tempId?.startsWith('event-')
    ? row.data._tempId.slice(6)
    : `notebook-${row.data._tempId ?? row.key}`;

/**
 * Vrai si une ligne du cahier correspond exactement à `eventId`, que l'événement
 * ait été matérialisé par la feuille (`_tempId = "event-<id>"`) OU créé depuis
 * le tableau (`eventId = "notebook-<_tempId>"` ou `"notebook-<key>"`).
 */
export const rowMatchesEventId = (row: Pick<LessonRow, 'key' | 'data'>, eventId: string): boolean => {
  if (!eventId) return false;
  if (row.data._tempId === `event-${eventId}`) return true;
  if (eventId.startsWith('notebook-')) {
    const token = eventId.slice(9);
    if (!token) return false;
    return row.data._tempId === token || (!row.data._tempId && row.key === token);
  }
  return false;
};

const REMARK_EVENT_ID_RE = /^remark-(controle_cahiers|remediation|soutien|rattrapage)-(.+)$/;

/** Décompose l'identifiant d'une activité issue d'une remarque (`remark-<type>-<rowId>`). */
export const parseRemarkEventId = (
  eventId: string,
): { type: SessionActivityType; rowId: string } | null => {
  const match = REMARK_EVENT_ID_RE.exec(eventId);
  if (!match) return null;
  return { type: match[1] as SessionActivityType, rowId: match[2] };
};

/** Vrai si la ligne correspond à la clé `rowId` encodée dans `remark-<type>-<rowId>`. */
export const rowMatchesRemarkId = (row: Pick<LessonRow, 'key' | 'data'>, rowId: string): boolean =>
  row.data._tempId === rowId || (!row.data._tempId && row.key === rowId);
