import { produce } from 'immer';
import type { AppConfig, Indices, LessonsData } from '../../types';
import { findItem } from '../notebook/dataUtils';
import { applySessionEdit, type SessionPatch } from '../notebook/sessionEditing';
import { sessionDateKey, sessionDateKeys } from './homeworkPlacement';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import type { SessionRemarkEntry } from './sessionActivityRemarks';
import { homeworkAssessmentId, withHomeworkCorrection } from './homeworkCycle';

export { homeworkAssessmentId };

/** Old automatic labels sometimes lived in free text. Keep the teacher's own
 * lines while migrating exact activity labels to their editable badges. */
export function withoutActivityCopies(text: string, entries: readonly SessionRemarkEntry[]): string {
  const automatic = new Set(entries.flatMap(entry => [entry.originalText, entry.text]).map(value => value.trim()));
  return text.split('\n').filter(line => !automatic.has(line.trim())).join('\n').trim();
}

/**
 * ATTRIBUER UN DEVOIR MAISON — une seule écriture, quelle que soit la porte :
 * la pastille « Devoir maison N donné » de la remarque, ou la carte « Devoir
 * maison » de l'ajout de contenu. Le devoir rejoint la feuille « Contrôle
 * continu et activités » (document, remise élève par élève), sa séance porte
 * l'annotation, et une attribution supprimée puis reposée renaît.
 *
 * `base` permet d'enchaîner sur un patch déjà calculé (même transaction).
 */
export function assignHomeworkPatch(config: AppConfig, classId: string, dateISO: string, num: number,
  base: Partial<AppConfig> = {}): Partial<AppConfig> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO) || !Number.isInteger(num) || num < 1) return base;
  const result: Partial<AppConfig> = { ...base };
  const id = homeworkAssessmentId(dateISO, num);
  const schoolYear = schoolYearLabelFromDate(dateISO);
  const semester = id.includes(':s2-') ? 2 : 1;
  const manual = [...(result.manualAssessments?.[classId] ?? config.manualAssessments?.[classId] ?? [])];
  const dates = { ...(result.assessmentDates?.[classId] ?? config.assessmentDates?.[classId]) };
  const index = manual.findIndex(item => item.id === id);
  const entry = { id, schoolYear, type: 'maison' as const, num, dateISO, semestre: semester as 1 | 2 };
  if (index >= 0) manual[index] = { ...manual[index], ...entry };
  else manual.push(entry);
  dates[id] = dateISO;
  result.manualAssessments = { ...config.manualAssessments, ...result.manualAssessments, [classId]: manual };
  result.assessmentDates = { ...config.assessmentDates, ...result.assessmentDates, [classId]: dates };
  // On ne réécrit la liste des supprimés que s'il y avait vraiment à la purger.
  const currentRemoved = result.removedAssessments?.[classId] ?? config.removedAssessments?.[classId] ?? [];
  if (currentRemoved.includes(id)) {
    result.removedAssessments = { ...config.removedAssessments, [classId]: currentRemoved.filter(entryId => entryId !== id) };
  }
  return result;
}

/** Synchronize activity references after a session edit. Clearing some rows of
 * a date must not hide the activities of other contents still taught that day. */
export function sessionRemarkSettingsPatch(config: AppConfig, classId: string, source: LessonsData,
  targets: readonly Indices[], patch: SessionPatch, entries: ReadonlyMap<string, readonly SessionRemarkEntry[]>): Partial<AppConfig> {
  const sourceDates = new Set(targets.flatMap(indices => sessionDateKeys(findItem(source, indices).item?.date)));
  const next = produce(source, draft => { applySessionEdit(draft, targets, patch); });
  const remainingDates = new Set<string>();
  // The remaining dated rows, including nested course content, protect shared sessions.
  const visit = (nodes: readonly unknown[]) => nodes.forEach(raw => {
    const node = raw as { date?: string; items?: unknown[]; sections?: unknown[]; subsections?: unknown[]; subsubsections?: unknown[] };
    sessionDateKeys(node.date).forEach(date => remainingDates.add(date));
    for (const children of [node.items, node.sections, node.subsections, node.subsubsections]) if (children) visit(children);
  });
  visit(next.filter(node => node.type === 'chapter'));
  const changes = { ...patch.activityRemarks };
  if (patch.date === '') for (const date of sourceDates) {
    if (!remainingDates.has(date)) for (const entry of entries.get(date) ?? []) changes[entry.id] = null;
  }
  const overrides = { ...config.sessionRemarkOverrides?.[classId] };
  for (const [id, text] of Object.entries(changes)) overrides[id] = text === null || !text.trim()
    ? { hidden: true } : { text: text.trim(), hidden: false };
  const result: Partial<AppConfig> = Object.keys(changes).length
    ? { sessionRemarkOverrides: { ...config.sessionRemarkOverrides, [classId]: overrides } } : {};
  const nextDates = sessionDateKeys(patch.date);
  /*
   * La pastille « Devoir maison N donné » se pose depuis la REMARQUE, sans
   * toucher à la date de la séance : sa matérialisation ne peut donc pas
   * dépendre d'un déplacement de date. On ne sort tôt que s'il n'y a NI
   * nouvelle date NI devoir à créer sur la date de la séance ciblée.
   */
  const materializesHomework = Boolean(patch.homeworkGiven || patch.homeworkCorrection) && sourceDates.size > 0;
  if (!nextDates.length && !materializesHomework) return result;
  const oldDates = [...sourceDates].sort();
  const attached = oldDates.filter(date => !remainingDates.has(date)).flatMap(date => entries.get(date) ?? []);
  const destination = (raw?: string) => {
    const index = oldDates.indexOf(sessionDateKey(raw));
    return nextDates[Math.min(Math.max(index, 0), nextDates.length - 1)];
  };
  /*
   * Les annotations de correction portent l'identité `assessment:<id>:correction` :
   * elles se déplacent avec la séance comme les autres, mais vers un AUTRE champ —
   * la date de correction du devoir, jamais sa date d'attribution.
   */
  const correctionIds = new Set(attached
    .filter(entry => entry.id.startsWith('assessment:') && entry.id.endsWith(':correction'))
    .map(entry => entry.id.slice(11, -11)));
  if (correctionIds.size) {
    const manual = result.manualAssessments?.[classId] ?? config.manualAssessments?.[classId] ?? [];
    result.manualAssessments = { ...config.manualAssessments, [classId]: manual.map(item => {
      const id = [...correctionIds].find(key => key === item.id || key.endsWith(`:${item.id}`));
      return id && item.correctionDateISO ? { ...item, correctionDateISO: destination(item.correctionDateISO) } : item;
    }) };
  }
  const assessmentIds = new Set(attached
    .filter(entry => entry.id.startsWith('assessment:') && !entry.id.endsWith(':correction'))
    .map(entry => entry.id.slice(11)));
  if (assessmentIds.size) {
    const dates = { ...(result.assessmentDates?.[classId] ?? config.assessmentDates?.[classId]) };
    const manual = result.manualAssessments?.[classId] ?? config.manualAssessments?.[classId] ?? [];
    const owner = (id: string) => manual.find(item => item.id === id || (id.endsWith(`:${item.id}`) && (!item.schoolYear || id.startsWith(`${item.schoolYear}:`))));
    assessmentIds.forEach(id => { const item = owner(id); dates[id] = destination(dates[id] || (item && dates[item.id]) || item?.dateISO); });
    result.assessmentDates = { ...config.assessmentDates, [classId]: dates };
    result.manualAssessments = { ...config.manualAssessments, [classId]: manual.map(item => {
      const id = [...assessmentIds].find(key => owner(key) === item);
      return id ? { ...item, dateISO: dates[id] } : item;
    }) };
  }
  const eventIds = new Set(attached.filter(entry => entry.id.startsWith('event:')).map(entry => entry.id.slice(6)));
  if (eventIds.size) result.pedagogicalEvents = { ...config.pedagogicalEvents, [classId]: (config.pedagogicalEvents?.[classId] ?? [])
    .map(event => eventIds.has(event.id) && !event.endDate ? { ...event, date: destination(event.date) } : event) };

  /*
   * Devoir maison donné pendant la séance : la pastille ne doit pas rester un
   * texte orphelin. On crée (ou on recharge) le devoir de la feuille
   * d'évaluations avec LA MÊME identité que la réconciliation du cahier
   * (« 2026-2027:s1-maison1 ») : le devoir existe donc une seule fois, daté à
   * la séance, visible dans le contrôle continu, le suivi et la direction.
   */
  if (patch.homeworkGiven && patch.homeworkGiven > 0) {
    // Sans déplacement de date (saisie de la remarque), c'est la séance ciblée
    // qui fournit la date d'attribution.
    const date = sessionDateKeys(patch.date ?? '')[0] ?? [...sourceDates][0] ?? '';
    if (date) Object.assign(result, assignHomeworkPatch(config, classId, date, patch.homeworkGiven, result));
  }

  /*
   * Correction du devoir pendant la séance : le SECOND temps du même devoir.
   * On pose seulement sa date de correction, sans toucher à la date
   * d'attribution — même règle que le bloc « Correction du devoir maison » du
   * cahier (`withHomeworkCorrection`) : un devoir du planning officiel daté par
   * le professeur est servi, et un devoir jamais saisi est transmis à la feuille
   * par sa séance de correction.
   */
  if (patch.homeworkCorrection && patch.homeworkCorrection > 0) {
    // Même repli que l'attribution : la séance de correction porte elle-même
    // sa date quand la remarque est saisie sans déplacer la séance.
    const date = sessionDateKeys(patch.date ?? '')[0] ?? [...sourceDates][0] ?? '';
    if (date) {
      const manual = result.manualAssessments?.[classId] ?? config.manualAssessments?.[classId] ?? [];
      const currentRemoved = result.removedAssessments?.[classId] ?? config.removedAssessments?.[classId] ?? [];
      const next = withHomeworkCorrection(manual, date, patch.homeworkCorrection, {
        dates: result.assessmentDates?.[classId] ?? config.assessmentDates?.[classId],
        removed: currentRemoved,
      });
      if (next !== manual) {
        result.manualAssessments = { ...config.manualAssessments, ...result.manualAssessments, [classId]: [...next] };
        // Le devoir servi est la seule entrée réécrite (ou ajoutée en fin de liste).
        const target = next.find((item, index) => item !== manual[index]);
        if (target && currentRemoved.includes(target.id)) {
          result.removedAssessments = { ...config.removedAssessments, [classId]: currentRemoved.filter(entryId => entryId !== target.id) };
        }
      }
    }
  }
  return result;
}

/** Restore only this transaction's changed activity identities. A later cloud
 * edit of the same identity takes precedence; other classes/activities survive. */
export function restoreSessionRemarkSettings(current: AppConfig, classId: string, from: Partial<AppConfig>, to: Partial<AppConfig>): Partial<AppConfig> {
  const result: Partial<AppConfig> = {};
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  for (const key of ['sessionRemarkOverrides', 'assessmentDates'] as const) {
    if (from[key] === undefined && to[key] === undefined) continue;
    const previous = from[key]?.[classId] ?? {};
    const target = to[key]?.[classId] ?? {};
    const active = { ...current[key]?.[classId] } as Record<string, unknown>;
    for (const id of new Set([...Object.keys(previous), ...Object.keys(target)])) {
      const prior = (previous as Record<string, unknown>)[id], next = (target as Record<string, unknown>)[id];
      if (equal(prior, next) || !equal(active[id], prior)) continue;
      if (next === undefined) delete active[id]; else active[id] = next;
    }
    if (!equal(active, current[key]?.[classId] ?? {})) Object.assign(result, { [key]: { ...current[key], [classId]: active } });
  }
  for (const key of ['manualAssessments', 'pedagogicalEvents'] as const) {
    if (from[key] === undefined && to[key] === undefined) continue;
    const previous = new Map((from[key]?.[classId] ?? []).map(item => [item.id, item]));
    const target = new Map((to[key]?.[classId] ?? []).map(item => [item.id, item]));
    const active = new Map((current[key]?.[classId] ?? []).map(item => [item.id, item]));
    for (const id of new Set([...previous.keys(), ...target.keys()])) {
      if (equal(previous.get(id), target.get(id)) || !equal(active.get(id), previous.get(id))) continue;
      if (target.has(id)) active.set(id, target.get(id)!); else active.delete(id);
    }
    const restored = [...active.values()];
    if (!equal(restored, current[key]?.[classId] ?? [])) Object.assign(result, { [key]: { ...current[key], [classId]: restored } });
  }
  return result;
}
