import type { AppConfig, LessonsData, PedagogicalEvent } from '../../types';
import { buildLessonRows, type LessonRow } from '../notebook/lessonRows';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import { findNotebookAssessments, linkAssessments, type NotebookAssessmentEntry } from './assessmentSync';
import type { PlannedAssessment } from './assessments';
import { extractDateRange } from './notebookSyncBridge';

interface ReconcileOptions {
  previousLessons?: LessonsData;
  planned?: PlannedAssessment[];
  eventArchive?: ReadonlyMap<string, PedagogicalEvent>;
}
const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
const validDate = (value?: string): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
const eventType = (row: LessonRow) => row.elementType === 'evaluation_diagnostic' || row.elementType === 'correction_controle_continu' || row.data._tempId?.startsWith('event-');

/** Reconcile an explicit notebook edit, not the absence of rows during loading.
 * Deletion needs the previous snapshot; identities never depend on the new date.
 * Documents and student records remain attached to their stable identifiers. */
export function syncNotebookToEvaluations(classId: string, config: AppConfig, lessons: LessonsData, options: ReconcileOptions = {}) {
  const patch: Partial<AppConfig> = {};
  const rows = buildLessonRows(lessons);
  const previousRows = buildLessonRows(options.previousLessons ?? lessons);
  const entries = findNotebookAssessments(lessons);
  const oldEntries = findNotebookAssessments(options.previousLessons ?? lessons);
  const dates = { ...config.assessmentDates?.[classId] };
  const removed = new Set(config.removedAssessments?.[classId]);
  const manual = [...(config.manualAssessments?.[classId] ?? [])];
  const links = linkAssessments(options.planned ?? [], oldEntries, '');
  const consumed = new Set<NotebookAssessmentEntry>();
  const identity = (entry: NotebookAssessmentEntry) => {
    const known = links.find(link => link.entry === entry)?.planned;
    if (entry.assessmentId) return { id: entry.assessmentId, legacyId: known?.legacyId };
    if (known) return known;
    const matches = manual.filter(item => item.type === entry.type && item.num === entry.num);
    if (matches.length === 1) return { id: matches[0].id };
    const date = extractDateRange(entry.date).startDate;
    if (!validDate(date)) return undefined;
    const semester = Number(date.slice(5, 7)) >= 2 && Number(date.slice(5, 7)) <= 7 ? 2 : 1;
    return { id: `${schoolYearLabelFromDate(date)}:s${semester}-${entry.type}${entry.num}` };
  };
  const update = (entry: NotebookAssessmentEntry, target: { id: string; legacyId?: string }) => {
    const date = extractDateRange(entry.date).startDate;
    if (validDate(date)) dates[target.id] = date;
    else delete dates[target.id];
    if (target.legacyId) delete dates[target.legacyId];
    removed.delete(target.id);
    if (target.legacyId) removed.delete(target.legacyId);
    const index = manual.findIndex(item => item.id === target.id);
    const planned = options.planned?.find(item => item.id === target.id);
    if (index >= 0) manual[index] = { ...manual[index], schoolYear: manual[index].schoolYear ?? schoolYearLabelFromDate(manual[index].dateISO),
      type: entry.type, num: entry.num, dateISO: validDate(date) ? date : '' };
    else if ((validDate(date) && !planned) || (planned && (!validDate(date) || planned.type !== entry.type || planned.num !== entry.num))) {
      manual.push({ id: target.id, schoolYear: planned?.schoolYear ?? schoolYearLabelFromDate(date!), type: entry.type, num: entry.num,
        dateISO: validDate(date) ? date : '', semestre: planned?.semestre ?? (/:s2-/.test(target.id) ? 2 : 1) });
    }
  };
  for (const old of oldEntries) {
    const oldRow = previousRows.find(row => row.key === old.key);
    const stableId = oldRow?.data._tempId;
    const candidates = entries.filter(entry => !consumed.has(entry) && (stableId
      ? rows.find(row => row.key === entry.key)?.data._tempId === stableId
      : entry.type === old.type && entry.title === old.title));
    const current = candidates.length === 1 ? candidates[0] : undefined;
    const target = identity(old);
    if (current) {
      consumed.add(current);
      if (target) update(current, target);
    } else if (options.previousLessons && candidates.length === 0 && target) {
      removed.add(target.id);
      delete dates[target.id];
      if (target.legacyId) { removed.add(target.legacyId); delete dates[target.legacyId]; }
    }
  }
  for (const entry of entries) {
    if (consumed.has(entry)) continue;
    const target = identity(entry);
    if (target) update(entry, target);
  }
  if (changed(dates, config.assessmentDates?.[classId] ?? {})) patch.assessmentDates = { ...config.assessmentDates, [classId]: dates };
  if (changed(manual, config.manualAssessments?.[classId] ?? [])) patch.manualAssessments = { ...config.manualAssessments, [classId]: manual };
  if (changed([...removed], config.removedAssessments?.[classId] ?? [])) patch.removedAssessments = { ...config.removedAssessments, [classId]: [...removed] };

  const currentEvents = config.pedagogicalEvents?.[classId] ?? [];
  const events = [...currentEvents];
  const matched = new Set<string>();
  const findEvent = (row: LessonRow) => {
    const id = row.data._tempId?.startsWith('event-') ? row.data._tempId.slice(6) : `notebook-${row.data._tempId ?? row.key}`;
    const direct = events.find(event => event.id === id) ?? options.eventArchive?.get(id);
    if (direct) return direct;
    if (row.data._tempId?.startsWith('event-')) return undefined;
    const previous = previousRows.find(old => old.data._tempId && old.data._tempId === row.data._tempId);
    const candidates = events.filter(event => event.type === row.elementType && !matched.has(event.id)
      && ('title' in row.data && (event.title === row.data.title || (previous && 'title' in previous.data && event.title === previous.data.title))));
    return candidates.length === 1 ? candidates[0] : undefined;
  };
  for (const row of rows.filter(eventType)) {
    const existing = findEvent(row);
    const { startDate, endDate } = extractDateRange(row.data.date);
    if (!existing && !validDate(startDate)) continue;
    const id = existing?.id ?? (row.data._tempId?.startsWith('event-') ? row.data._tempId.slice(6) : `notebook-${row.data._tempId ?? row.key}`);
    const event: PedagogicalEvent = { ...existing, id, type: existing?.type ?? row.elementType as PedagogicalEvent['type'],
      title: ('title' in row.data ? row.data.title : '')?.trim() || existing?.title || 'Évaluation',
      date: validDate(startDate) ? startDate : '', endDate: validDate(endDate) ? endDate : undefined,
      note: row.data.remark?.trim() || undefined, status: existing?.status ?? 'planned', createdAt: existing?.createdAt ?? new Date().toISOString() };
    const index = events.findIndex(item => item.id === id);
    if (index >= 0) events[index] = event; else events.push(event);
    matched.add(id);
  }
  if (options.previousLessons) {
    for (const row of previousRows.filter(eventType)) {
      const event = findEvent(row);
      if (event && !matched.has(event.id)) {
        const index = events.findIndex(item => item.id === event.id);
        if (index >= 0) events.splice(index, 1);
      }
    }
  }
  if (changed(events, currentEvents)) patch.pedagogicalEvents = { ...config.pedagogicalEvents, [classId]: events };
  return { patch, updated: Object.keys(patch).length > 0 };
}

export function syncNotebookSessionToEvaluations(classId: string, config: AppConfig, _item: unknown, lessons: LessonsData) {
  return syncNotebookToEvaluations(classId, config, lessons);
}
