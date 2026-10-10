import { produce } from 'immer';
import type { AppConfig, Indices, LessonsData } from '../../types';
import { findItem } from '../notebook/dataUtils';
import { applySessionEdit, type SessionPatch } from '../notebook/sessionEditing';
import { sessionDateKey, sessionDateKeys } from './homeworkPlacement';
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
  if (!nextDates.length) return result;
  const oldDates = [...sourceDates].sort();
  const attached = oldDates.filter(date => !remainingDates.has(date)).flatMap(date => entries.get(date) ?? []);
  const destination = (raw?: string) => {
    const index = oldDates.indexOf(sessionDateKey(raw));
    return nextDates[Math.min(Math.max(index, 0), nextDates.length - 1)];
  };
  const assessmentIds = new Set(attached.filter(entry => entry.id.startsWith('assessment:')).map(entry => entry.id.slice(11)));
  if (assessmentIds.size) {
    const dates = { ...config.assessmentDates?.[classId] };
    const manual = config.manualAssessments?.[classId] ?? [];
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
