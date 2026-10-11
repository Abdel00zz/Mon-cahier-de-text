import type { AppConfig, ManualAssessment } from '../../types';

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

/**
 * Pose la date de correction d’un devoir maison : le SECOND temps du même
 * devoir, jamais un devoir de plus. Renvoie la liste TELLE QUELLE (même
 * référence) si aucun devoir attribué n’attend sa correction — c’est
 * l’attribution qui crée, la correction qui date : pas de devoir fantôme.
 *
 * `num` est le numéro déclaré quand le titre le porte ; à défaut, c’est le
 * devoir en attente le plus récent qui est servi.
 */
export function withHomeworkCorrection(
  manual: readonly ManualAssessment[],
  date: string,
  num?: number,
): readonly ManualAssessment[] {
  const candidates = manual
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === 'maison'
      && (num === undefined || item.num === num)
      && (!item.dateISO || item.dateISO <= date));
  if (candidates.length === 0) return manual;
  // Un devoir déjà corrigé ne masque pas celui qui attend encore : à égalité,
  // la correction suit le devoir donné le plus récemment.
  const target = [...candidates].sort((a, b) =>
    Number(Boolean(a.item.correctionDateISO)) - Number(Boolean(b.item.correctionDateISO))
    || (b.item.dateISO ?? '').localeCompare(a.item.dateISO ?? ''))[0];
  if (target.item.correctionDateISO === date) return manual;
  return manual.map((item, index) => (index === target.index ? { ...item, correctionDateISO: date } : item));
}
