import { produce } from 'immer';
import type { AppConfig, Indices, LessonsData, PedagogicalEvent } from '../../types';
import { findItem } from '../notebook/dataUtils';
import { applySessionEdit, type SessionPatch } from '../notebook/sessionEditing';
import { sessionDateKey, sessionDateKeys } from './homeworkPlacement';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import type { SessionRemarkEntry } from './sessionActivityRemarks';
import { homeworkAssessmentId } from './homeworkCycle';
import { buildLessonRows } from '../notebook/lessonRows';
import { detectEventsFromRemarks } from './notebookReconciliation';
import { normalizeActivityText } from './pedagogicalActivities';

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
  let overridesModified = Object.keys(changes).length > 0;
  const result: Partial<AppConfig> = {};

  // Réconcilier les activités pédagogiques de séance (Contrôle des cahiers, Remédiation, Soutien, Rattrapage)
  // dès l'édition de la remarque ou de la date, pour alimenter immédiatement la feuille d'évaluations et le suivi.
  const beforeRemarkEvents = buildLessonRows(source).flatMap(row => detectEventsFromRemarks(row, classId, config.evaluationPolicy));
  const afterRemarkEvents = buildLessonRows(next).flatMap(row => detectEventsFromRemarks(row, classId, config.evaluationPolicy));
  if (beforeRemarkEvents.length > 0 || afterRemarkEvents.length > 0) {
    const baseEvents = config.pedagogicalEvents?.[classId] ?? [];
    const nextEvents: PedagogicalEvent[] = [...baseEvents];
    const matchedIds = new Set<string>();
    for (const rev of afterRemarkEvents) {
      const explicitDuplicate = nextEvents.find(e =>
        !e.id.startsWith('remark-')
        && (e.type === rev.type || normalizeActivityText(e.title).includes(normalizeActivityText(rev.title)))
        && e.date === rev.date
      );
      if (explicitDuplicate) {
        if (overrides[`event:${explicitDuplicate.id}`]?.hidden) {
          delete overrides[`event:${explicitDuplicate.id}`];
          overridesModified = true;
        }
        continue;
      }
      const existing = nextEvents.find(e => e.id === rev.id);
      const mergedEvent: PedagogicalEvent = {
        ...existing,
        ...rev,
        createdAt: existing?.createdAt ?? rev.createdAt,
        status: existing?.status ?? rev.status,
      };
      const idx = nextEvents.findIndex(e => e.id === rev.id);
      if (idx >= 0) nextEvents[idx] = mergedEvent;
      else nextEvents.push(mergedEvent);
      matchedIds.add(rev.id);
      if (overrides[`event:${rev.id}`]?.hidden) {
        delete overrides[`event:${rev.id}`];
        overridesModified = true;
      }
    }
    const beforeIds = new Set(beforeRemarkEvents.map(e => e.id));
    for (let i = nextEvents.length - 1; i >= 0; i--) {
      const ev = nextEvents[i];
      if (ev.id.startsWith('remark-') && beforeIds.has(ev.id) && !matchedIds.has(ev.id)) {
        nextEvents.splice(i, 1);
      }
    }
    if (JSON.stringify(nextEvents) !== JSON.stringify(baseEvents)) {
      result.pedagogicalEvents = { ...config.pedagogicalEvents, [classId]: nextEvents };
    }
  }

  if (overridesModified && JSON.stringify(overrides) !== JSON.stringify(config.sessionRemarkOverrides?.[classId] ?? {})) {
    result.sessionRemarkOverrides = { ...config.sessionRemarkOverrides, [classId]: overrides };
  }

  const nextDates = sessionDateKeys(patch.date);
  /*
   * La pastille « Devoir maison N donné » se pose depuis la REMARQUE, sans
   * toucher à la date de la séance : sa matérialisation ne peut donc pas
   * dépendre d'un déplacement de date. On ne sort tôt que s'il n'y a NI
   * nouvelle date NI devoir à créer sur la date de la séance ciblée.
   */
  const materializesHomework = Boolean(patch.homeworkGiven) && sourceDates.size > 0;
  if (!nextDates.length && !materializesHomework) return result;
  const oldDates = [...sourceDates].sort();
  const attached = oldDates.filter(date => !remainingDates.has(date)).flatMap(date => entries.get(date) ?? []);
  const destination = (raw?: string) => {
    const index = oldDates.indexOf(sessionDateKey(raw));
    return nextDates[Math.min(Math.max(index, 0), nextDates.length - 1)];
  };
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
