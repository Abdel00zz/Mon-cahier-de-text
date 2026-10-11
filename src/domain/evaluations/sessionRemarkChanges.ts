import { produce } from 'immer';
import type { AppConfig, Indices, LessonsData } from '../../types';
import { findItem } from '../notebook/dataUtils';
import { applySessionEdit, type SessionPatch } from '../notebook/sessionEditing';
import { sessionDateKey, sessionDateKeys } from './homeworkPlacement';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import type { SessionRemarkEntry } from './sessionActivityRemarks';

/** Old automatic labels sometimes lived in free text. Keep the teacher's own
 * lines while migrating exact activity labels to their editable badges. */
export function withoutActivityCopies(text: string, entries: readonly SessionRemarkEntry[]): string {
  const automatic = new Set(entries.flatMap(entry => [entry.originalText, entry.text]).map(value => value.trim()));
  return text.split('\n').filter(line => !automatic.has(line.trim())).join('\n').trim();
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
    if (date) {
      const schoolYear = schoolYearLabelFromDate(date);
      const semester = Number(date.slice(5, 7)) >= 2 && Number(date.slice(5, 7)) <= 7 ? 2 : 1;
      const id = `${schoolYear}:s${semester}-maison${patch.homeworkGiven}`;
      const manual = [...(result.manualAssessments?.[classId] ?? config.manualAssessments?.[classId] ?? [])];
      const dates = { ...(result.assessmentDates?.[classId] ?? config.assessmentDates?.[classId]) };
      const index = manual.findIndex(item => item.id === id);
      const entry = { id, schoolYear, type: 'maison' as const, num: patch.homeworkGiven, dateISO: date, semestre: semester as 1 | 2 };
      if (index >= 0) manual[index] = { ...manual[index], ...entry };
      else manual.push(entry);
      dates[id] = date;
      result.manualAssessments = { ...config.manualAssessments, [classId]: manual };
      result.assessmentDates = { ...config.assessmentDates, [classId]: dates };
      // On ne réécrit la liste des supprimés que s'il y avait vraiment à la purger.
      const currentRemoved = result.removedAssessments?.[classId] ?? config.removedAssessments?.[classId] ?? [];
      if (currentRemoved.includes(id)) {
        result.removedAssessments = { ...config.removedAssessments, [classId]: currentRemoved.filter(entryId => entryId !== id) };
      }
    }
  }

  /*
   * Correction du devoir pendant la séance : le devoir a déjà été DONNÉ (c'est
   * la séance d'attribution qui l'a créé). La correction est le SECOND temps du
   * même devoir : on pose seulement sa date de correction, sans toucher à la
   * date d'attribution. S'il n'existe pas encore — cahier historique sans
   * attribution saisie — on ne fabrique pas un devoir fantôme : c'est
   * l'attribution qui crée, la correction qui date.
   */
  if (patch.homeworkCorrection && patch.homeworkCorrection > 0) {
    // Même repli que l'attribution : la séance de correction porte elle-même
    // sa date quand la remarque est saisie sans déplacer la séance.
    const date = sessionDateKeys(patch.date ?? '')[0] ?? [...sourceDates][0] ?? '';
    if (date) {
      const manual = result.manualAssessments?.[classId] ?? config.manualAssessments?.[classId] ?? [];
      const candidates = manual
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.type === 'maison' && item.num === patch.homeworkCorrection
          && (!item.dateISO || item.dateISO <= date));
      // Un devoir de ce numéro déjà corrigé ne masque pas celui encore en
      // attente ; à égalité, la correction suit le devoir donné le plus récent.
      const target = candidates.sort((a, b) => {
        const corrected = Number(Boolean(a.item.correctionDateISO)) - Number(Boolean(b.item.correctionDateISO));
        return corrected || (b.item.dateISO || '').localeCompare(a.item.dateISO || '');
      })[0];
      if (target && target.item.correctionDateISO !== date) {
        const next = [...manual];
        next[target.index] = { ...target.item, correctionDateISO: date };
        result.manualAssessments = { ...config.manualAssessments, [classId]: next };
        const currentRemoved = result.removedAssessments?.[classId] ?? config.removedAssessments?.[classId] ?? [];
        if (currentRemoved.includes(target.item.id)) {
          result.removedAssessments = { ...config.removedAssessments, [classId]: currentRemoved.filter(entryId => entryId !== target.item.id) };
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
