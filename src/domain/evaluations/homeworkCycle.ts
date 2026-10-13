import type { AppConfig, ManualAssessment } from '../../types';
import { schoolYearLabelFromDate } from '../calendar/calendar';

/*
 * LE CYCLE D'UN DEVOIR MAISON — deux temps, une identité.
 *
 * Un devoir maison vit en DEUX séances : celle où il est DONNÉ (les élèves
 * l'emportent chez eux pour le travailler) et une séance ultérieure où il est
 * CORRIGÉ. La feuille d'évaluations ne stocke que l'attribution (`dateISO`) ;
 * la correction vit dans son propre champ (`correctionDateISO`) pour que chaque
 * séance reste un fait distinct, déplaçable indépendamment.
 *
 * Ce module expose l'état du cycle à l'écran de séance : quels devoirs ont été
 * donnés, lesquels attendent encore leur correction, et depuis quelle date.
 * Aucune dépendance UI : testable et réutilisable par l'API.
 */

export interface HomeworkMoment {
  id: string;
  num: number;
  /** Séance où le devoir a été donné (travail à la maison). */
  givenDateISO?: string;
  /** Séance où le devoir a été corrigé, quand elle a eu lieu. */
  correctionDateISO?: string;
}

/** Devoirs maison d'une classe avec leurs deux moments, dédoublonnés par identité. */
export function homeworkMoments(config: AppConfig, classId: string): HomeworkMoment[] {
  const dates = config.assessmentDates?.[classId] ?? {};
  const manual = config.manualAssessments?.[classId] ?? [];
  const removed = new Set(config.removedAssessments?.[classId] ?? []);
  const byId = new Map<string, HomeworkMoment>();
  for (const item of manual) {
    if (item.type !== 'maison' || removed.has(item.id)) continue;
    byId.set(item.id, {
      id: item.id,
      num: item.num,
      givenDateISO: dates[item.id] || item.dateISO || undefined,
      correctionDateISO: item.correctionDateISO || undefined,
    });
  }
  // Devoirs historiques sans entrée manuelle : l'identité vit dans les dates.
  for (const [id, date] of Object.entries(dates)) {
    if (byId.has(id) || removed.has(id)) continue;
    const numMatch = id.match(/maison-?(\d+)/i);
    if (!numMatch) continue;
    byId.set(id, { id, num: parseInt(numMatch[1], 10), givenDateISO: date || undefined });
  }
  return [...byId.values()];
}

/**
 * Devoirs donnés qui attendent encore leur séance de correction, du plus
 * récent au plus ancien. `before` est la date de la séance ouverte : on ne
 * propose pas de corriger un devoir dont l'attribution est postérieure (ou du
 * jour même — le devoir n'est pas encore entre les mains des élèves).
 */
export function pendingCorrections(moments: readonly HomeworkMoment[], before?: string): HomeworkMoment[] {
  return moments
    .filter(moment => moment.givenDateISO && !moment.correctionDateISO && (!before || moment.givenDateISO < before))
    .sort((a, b) => (b.givenDateISO ?? '').localeCompare(a.givenDateISO ?? ''));
}

const semesterOf = (dateISO: string): 1 | 2 => {
  const month = Number(dateISO.slice(5, 7));
  return month >= 2 && month <= 7 ? 2 : 1;
};

/** Identité annuelle d'un devoir maison : « 2026-2027:s1-maison3 » (même clé que la réconciliation du cahier). */
export const homeworkAssessmentId = (dateISO: string, num: number): string =>
  `${schoolYearLabelFromDate(dateISO)}:s${semesterOf(dateISO)}-maison${num}`;

/** Ce que la feuille sait déjà, hors entrées manuelles. */
export interface HomeworkCorrectionContext {
  /** Dates choisies par le professeur (`assessmentDates`) : un devoir du planning officiel est DONNÉ dès qu'il y figure. */
  dates?: Readonly<Record<string, string>>;
  /** Devoirs supprimés de la feuille : une correction ne les fait jamais renaître. */
  removed?: readonly string[];
}

interface CorrectionCandidate {
  num: number;
  semester: 1 | 2;
  given: string;
  corrected?: string;
  /** Position dans les entrées manuelles ; absente pour un devoir du planning officiel. */
  index?: number;
  id: string;
  schoolYear?: string;
}

const HOMEWORK_NUM = /maison-?(\d+)$/i;
const YEAR_PREFIX = /^(\d{4}-\d{4}):/;

/**
 * Pose la date de correction d’un devoir maison : le SECOND temps du même
 * devoir, jamais un doublon.
 *
 *  - Le devoir est connu de la feuille, qu’il soit une entrée manuelle ou un
 *    devoir du planning officiel daté par le professeur : on date sa
 *    correction (le devoir du planning rejoint alors les entrées de la feuille).
 *  - Aucun devoir de ce numéro n’existe encore dans le semestre (cahier tenu
 *    sans attribution saisie) : la séance de correction l’atteste. Il est
 *    transmis à la feuille, sa date d’attribution reste à compléter.
 *
 * Renvoie la liste TELLE QUELLE (même référence) quand il n’y a rien à écrire :
 * correction déjà posée, devoir supprimé, devoir donné APRÈS la séance de
 * correction, ou correction sans numéro sans devoir en attente.
 */
export function withHomeworkCorrection(
  manual: readonly ManualAssessment[],
  date: string,
  num?: number,
  context: HomeworkCorrectionContext = {},
): readonly ManualAssessment[] {
  const year = schoolYearLabelFromDate(date);
  const semester = semesterOf(date);
  const dates = context.dates ?? {};
  const removed = new Set(context.removed ?? []);
  const isRemoved = (id: string) => removed.has(id) || removed.has(id.split(':').at(-1)!);
  const known = (id: string) => manual.some(item => item.id === id || id.endsWith(`:${item.id}`) || item.id.endsWith(`:${id}`));

  const pool: CorrectionCandidate[] = [];
  manual.forEach((item, index) => {
    if (item.type !== 'maison') return;
    pool.push({ num: item.num, semester: item.semestre ?? (item.dateISO ? semesterOf(item.dateISO) : semester),
      given: item.dateISO ?? '', corrected: item.correctionDateISO,
      index, id: item.id, schoolYear: item.schoolYear });
  });
  // Devoirs du planning DONNÉS (date choisie par le professeur), sans entrée manuelle.
  for (const [id, given] of Object.entries(dates)) {
    const match = id.match(HOMEWORK_NUM);
    if (!match || !given || known(id) || isRemoved(id)) continue;
    const legacy = id.split(':').at(-1)!;
    // L'identifiant historique « s1-maison1 » cède la place à l'identifiant annuel.
    if (id === legacy && Object.keys(dates).some(key => key !== id && key.endsWith(`:${legacy}`))) continue;
    pool.push({ num: parseInt(match[1], 10), semester: /(?:^|:)s2-/.test(id) ? 2 : 1, given, id,
      schoolYear: id.match(YEAR_PREFIX)?.[1] ?? schoolYearLabelFromDate(given) });
  }

  const sameYear = pool.filter(item => !item.schoolYear || item.schoolYear === year);
  const candidates = sameYear.filter(item => (num === undefined || item.num === num)
    && (!item.given || item.given <= date)
    // Un devoir corrigé lors d’un autre semestre est clos : il ne capte plus de correction.
    && (!item.corrected || item.corrected === date || item.semester === semester));
  // Un devoir déjà corrigé ne masque pas celui qui attend encore : à égalité,
  // la correction suit le devoir donné le plus récemment.
  const target = [...candidates].sort((a, b) =>
    Number(Boolean(a.corrected)) - Number(Boolean(b.corrected)) || b.given.localeCompare(a.given))[0];

  if (target) {
    if (target.corrected === date) return manual;
    if (target.index !== undefined) {
      return manual.map((item, index) => (index === target.index ? { ...item, correctionDateISO: date } : item));
    }
    return [...manual, { id: target.id, schoolYear: target.schoolYear ?? year, type: 'maison', num: target.num,
      dateISO: target.given, semestre: target.semester, correctionDateISO: date }];
  }

  // Sans numéro, on ne devine pas quel devoir la séance corrige.
  if (num === undefined || !Number.isInteger(num) || num < 1) return manual;
  const id = homeworkAssessmentId(date, num);
  // Ce devoir existe déjà dans le semestre (donné après la séance) ou a été supprimé : rien à transmettre.
  if (isRemoved(id) || sameYear.some(item => item.num === num && item.semester === semester)) return manual;
  return [...manual, { id, schoolYear: year, type: 'maison', num, dateISO: '', semestre: semester, correctionDateISO: date }];
}

/*
 * DEUX ENTRÉES, UN SEUL DEVOIR.
 *
 * Sur la feuille, un devoir maison s'affiche en DEUX entrées, et deux seulement :
 *
 *   « Devoir maison N »              (assigné aux élèves)  document · date limite de rendu · corbeille
 *   « Correction du devoir maison N » (second temps)        document · élèves n'ayant pas rendu · corbeille
 *
 * Elles partagent la même identité (`id`) : un seul enregistrement dans les devoirs
 * manuels (`dateISO` = donné, `dueDateISO` = date limite, `correctionDateISO` = corrigé),
 * donc rien de plus à synchroniser avec le cloud. Seul le document du corrigé a sa clé :
 * `<id>:correction`, dans `assessmentDocuments`.
 */
export interface HomeworkSchedulePatch {
  /** Date limite de rendu ; chaîne vide = l'effacer. */
  dueDateISO?: string;
  /** Date de la séance de correction ; chaîne vide = l'effacer. */
  correctionDateISO?: string;
}

export interface HomeworkIdentity {
  id: string;
  legacyId?: string;
  schoolYear: string;
  semestre: 1 | 2;
  num: number;
}

/**
 * Écrit la date limite et/ou la date de correction d'UN devoir maison, par son identité.
 * Le devoir du planning officiel qui n'est pas encore une entrée manuelle le devient (avec la
 * date d'attribution choisie par le professeur, ou aucune : une date prévisionnelle ne doit
 * jamais annoncer « devoir donné »). Une chaîne vide efface le champ. Même référence si rien ne change.
 */
export function withHomeworkSchedule(
  manual: readonly ManualAssessment[],
  homework: HomeworkIdentity,
  givenDateISO: string,
  patch: HomeworkSchedulePatch,
): readonly ManualAssessment[] {
  const apply = (item: ManualAssessment): ManualAssessment => {
    const next: ManualAssessment = { ...item };
    for (const field of ['dueDateISO', 'correctionDateISO'] as const) {
      if (patch[field] === undefined) continue;
      if (patch[field]) next[field] = patch[field];
      else delete next[field];
    }
    return next;
  };
  const index = manual.findIndex(item => item.type === 'maison'
    && (item.id === homework.id || (homework.legacyId !== undefined && item.id === homework.legacyId)));
  if (index >= 0) {
    const next = apply(manual[index]);
    const unchanged = next.dueDateISO === manual[index].dueDateISO && next.correctionDateISO === manual[index].correctionDateISO;
    return unchanged ? manual : manual.map((item, position) => (position === index ? next : item));
  }
  if (!patch.dueDateISO && !patch.correctionDateISO) return manual;
  return [...manual, apply({
    id: homework.id, schoolYear: homework.schoolYear, type: 'maison', num: homework.num,
    dateISO: givenDateISO, semestre: homework.semestre,
  })];
}
