import type { AppLocale, LessonsData, ManualAssessment, PedagogicalEvent } from '../../types';
import type { PlannedAssessment } from './assessments';
import { findNotebookAssessments, linkAssessments } from './assessmentSync';
import { buildLessonRows, type LessonRow } from '../notebook/lessonRows';
import { extractDateRange } from './notebookSyncBridge';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import { translateLocaleMessage } from '../../i18n/messages';
import type { DateWarning } from '../calendar/dateValidation';

export interface EvaluationSlot {
  /** Physical source distinguishes a duplicated row from its legitimate mirror. */
  key: string;
  id: string;
  family: 'assessment' | 'event';
  kind: string;
  label: string;
  start: string;
  end: string;
  number?: number;
  semester?: number;
  year?: string;
}
export interface EvaluationConflict {
  kind: 'identity' | 'binding' | 'duplicate' | 'overlap';
  candidate: EvaluationSlot;
  existing: EvaluationSlot;
}
const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/\s+/g, ' ').trim();
const rowTitle = (row: LessonRow) => 'title' in row.data ? row.data.title ?? '' : '';
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
const range = (date?: string, end?: string) => {
  const parsed = extractDateRange(date);
  const start = parsed.startDate ?? '';
  const finish = end || parsed.endDate || start;
  return validDate(start) && validDate(finish) && finish >= start ? { start, end: finish } : { start: '', end: '' };
};

export const assessmentSlot = (assessment: Pick<ManualAssessment, 'id' | 'type' | 'num' | 'semestre' | 'dateISO' | 'schoolYear'> & { label?: string }): EvaluationSlot => ({
  key: `assessment:${assessment.id}`, id: assessment.id, family: 'assessment', kind: assessment.type,
  label: assessment.label || `${assessment.type} ${assessment.num}`, number: assessment.num, semester: assessment.semestre,
  year: assessment.schoolYear || (assessment.dateISO ? schoolYearLabelFromDate(assessment.dateISO) : undefined), ...range(assessment.dateISO),
});
export const eventSlot = (event: PedagogicalEvent): EvaluationSlot => ({
  key: `event:${event.id}`, id: event.id, family: 'event', kind: event.type, label: event.title, ...range(event.date, event.endDate),
});

/** Class-scoped projection. A table row and its settings entry count once;
 * unassigned official predictions are not appointments made by the teacher. */
export function evaluationSlots(lessons: LessonsData, assessments: PlannedAssessment[], events: PedagogicalEvent[]): EvaluationSlot[] {
  const entries = findNotebookAssessments(lessons);
  const links = linkAssessments(assessments, entries, '');
  const used = new Set<string>();
  const slots = links.map(({ planned, entry }) => {
    const slot = assessmentSlot(planned);
    if (entry) {
      used.add(entry.key);
      return { ...slot, key: `row:${entry.key}`, kind: entry.type, number: entry.declaredNum ?? planned.num, label: entry.title, ...range(entry.date) };
    }
    return planned.predictionStatus === 'derived' || planned.predictionStatus === 'unresolved' ? { ...slot, start: '', end: '' } : slot;
  });
  for (const entry of entries) {
    if (used.has(entry.key)) continue;
    const dates = range(entry.date);
    slots.push({ key: `row:${entry.key}`, id: entry.assessmentId || `row:${entry.key}`, family: 'assessment', kind: entry.type,
      label: entry.title, number: entry.num, year: dates.start ? schoolYearLabelFromDate(dates.start) : undefined,
      semester: dates.start ? (Number(dates.start.slice(5, 7)) >= 2 && Number(dates.start.slice(5, 7)) <= 7 ? 2 : 1) : undefined, ...dates });
  }
  const rows = buildLessonRows(lessons).filter(row => row.elementType === 'evaluation_diagnostic' || row.elementType === 'correction_controle_continu' || row.data._tempId?.startsWith('event-'));
  const matched = new Set<string>();
  for (const event of events) {
    const exact = rows.filter(row => row.data._tempId === `event-${event.id}`);
    const legacy = rows.filter(row => !matched.has(row.key) && !row.data._tempId?.startsWith('event-') && row.elementType === event.type && normalize(rowTitle(row)) === normalize(event.title));
    const row = exact[0] ?? (legacy.length === 1 ? legacy[0] : undefined);
    if (row) matched.add(row.key);
    slots.push(row ? { ...eventSlot(event), key: `row:${row.key}`, label: rowTitle(row) || event.title, ...range(row.data.date) } : eventSlot(event));
  }
  for (const row of rows) {
    if (matched.has(row.key)) continue;
    slots.push({ key: `row:${row.key}`, id: row.data._tempId?.replace(/^event-/, '') || `row:${row.key}`, family: 'event', kind: row.elementType,
      label: rowTitle(row), ...range(row.data.date) });
  }
  return slots;
}

/** O(n) per edited item; same kind alone never implies a duplicate. */
export function detectEvaluationConflicts(candidate: EvaluationSlot, slots: readonly EvaluationSlot[]): EvaluationConflict[] {
  const conflicts: EvaluationConflict[] = [];
  for (const existing of slots) {
    if (candidate.key === existing.key || candidate.family !== existing.family) continue;
    if (candidate.id === existing.id) { conflicts.push({ kind: 'binding', candidate, existing }); continue; }
    if (candidate.kind !== existing.kind) continue;
    const sameIdentity = candidate.family === 'assessment' && candidate.number === existing.number &&
      !!candidate.year && candidate.year === existing.year && !!candidate.semester && candidate.semester === existing.semester;
    if (sameIdentity) conflicts.push({ kind: 'identity', candidate, existing });
    else if (candidate.start && existing.start && candidate.start <= existing.end && existing.start <= candidate.end) {
      const exact = candidate.start === existing.start && candidate.end === existing.end && normalize(candidate.label) === normalize(existing.label);
      conflicts.push({ kind: exact ? 'duplicate' : 'overlap', candidate, existing });
    }
  }
  return conflicts;
}

export function conflictMessage(conflict: EvaluationConflict, locale: AppLocale): string {
  return translateLocaleMessage(locale, `evaluations.conflict.${conflict.kind}`, {
    name: conflict.existing.label, date: conflict.existing.start || '—', end: conflict.existing.end || '—',
  });
}

/** Review only new conflicts: unrelated old inconsistencies never block an edit. */
export function newEvaluationWarnings(before: EvaluationSlot[], after: EvaluationSlot[], locale: AppLocale): DateWarning[] {
  const signature = (item: EvaluationConflict) => JSON.stringify([item.kind, ...[item.candidate, item.existing].map(slot => [slot.key, slot.start, slot.end]).sort()]);
  const previous = new Map(before.map(slot => [slot.key, slot]));
  const edited = after.filter(slot => JSON.stringify(previous.get(slot.key)) !== JSON.stringify(slot));
  const known = new Set<string>();
  const messages = new Map<string, DateWarning>();
  // O(n + edited*n): ordinary typing does not rescan every pair in the class.
  for (const slot of edited) for (const conflict of detectEvaluationConflicts(slot, after)) {
    const key = signature(conflict);
    if (known.has(key)) continue;
    known.add(key);
    const oldCandidate = previous.get(slot.key), oldExisting = previous.get(conflict.existing.key);
    if (oldCandidate && oldExisting && detectEvaluationConflicts(oldCandidate, [oldExisting]).some(old => signature(old) === key)) continue;
    const message = conflictMessage(conflict, locale);
    messages.set(message, { type: 'evaluation-conflict', message, blocking: conflict.kind === 'identity' || conflict.kind === 'binding' });
  }
  return [...messages.values()];
}
