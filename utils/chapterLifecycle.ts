import type { LessonsData } from '../types.js';
import { normalizeContentType } from '../constants/type-keys.js';
import { buildLessonRows } from './lessonRows.js';

export const validChapterDate = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;

/** Non-course activities never define chapter boundaries, even when nested. */
export function isNonCourseActivity(type: unknown): boolean {
  const key = normalizeContentType(typeof type === 'string' ? type.trim().toLowerCase() : '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
  return /^(?:evaluation|devoir|controle|correction|examen|diagnostic|activite|soutien|remediation|rattrapage|olympiade|concours|revision|assessment|homework|test|exam|activity|support|remedial|autre)(?:_|$)/.test(key)
    || /^(?:dm|ds|cc|فرض|تقويم|دعم|نشاط|تصحيح|امتحان)(?:_|$)/.test(key);
}

interface ChapterEvidence { titleDate?: string; contentDates: (string | undefined)[] }
interface LifecyclePeriod { start: string; end: string; today: string }
interface NotebookLifecycle { chapters: ReadonlyMap<number, Readonly<ChapterLifecycle>>; diagnosticDates: readonly string[] }
interface NotebookEvidence {
  chapters: Map<number, ChapterEvidence>;
  diagnosticDates: string[];
  lastEvaluation?: { period: LifecyclePeriod; result: NotebookLifecycle };
}
const evidenceCache = new WeakMap<LessonsData, NotebookEvidence>();

/** One cached pass over the same preorder used by screen/print; no second tree order. */
function readEvidence(lessons: LessonsData): NotebookEvidence {
  const cached = evidenceCache.get(lessons);
  if (cached) return cached;
  const chapters = new Map<number, ChapterEvidence>();
  const diagnosticDates: string[] = [];
  const excluded = new Set<string>();
  const diagnostics = new Set<string>();
  for (const row of buildLessonRows(lessons)) {
    const type = 'type' in row.data ? row.data.type : '';
    if (type === 'evaluation_diagnostic' || row.ancestorKeys.some(key => diagnostics.has(key))) {
      diagnostics.add(row.key);
      if (row.elementType !== 'separator' && validChapterDate(row.data.date)) diagnosticDates.push(row.data.date);
    }
    if (isNonCourseActivity(type) || row.ancestorKeys.some(key => excluded.has(key))) {
      excluded.add(row.key); continue;
    }
    if (row.elementType === 'chapter') chapters.set(row.indices.chapterIndex, { titleDate: row.data.date, contentDates: [] });
    if (row.elementType === 'item') chapters.get(row.indices.chapterIndex)?.contentDates.push(row.data.date);
  }
  const evidence = { chapters, diagnosticDates };
  evidenceCache.set(lessons, evidence);
  return evidence;
}

type ChapterState = 'not_started' | 'scheduled' | 'in_progress' | 'completed' | 'inconsistent';
interface ChapterLifecycle {
  startDate?: string;
  endDate?: string;
  itemsCount: number;
  completionRate: number | null;
  state: ChapterState;
  issue: 'missing_start' | 'invalid_date' | 'chronology' | null;
}

export function detectChapterLifecycles(lessons: LessonsData, period: LifecyclePeriod): NotebookLifecycle {
  const evidence = readEvidence(lessons);
  const previous = evidence.lastEvaluation;
  if (previous && previous.period.start === period.start && previous.period.end === period.end && previous.period.today === period.today) return previous.result;
  // At most one evaluation per immutable notebook snapshot: no growing day/account cache.
  // Many rows share a session date; parse that date only once during this evaluation.
  const dateValidity = new Map<string, boolean>();
  const inYear = (date: unknown): date is string => {
    if (typeof date !== 'string' || !date) return false;
    const cached = dateValidity.get(date);
    if (cached !== undefined) return cached;
    const valid = validChapterDate(date) && date >= period.start && date <= period.end;
    dateValidity.set(date, valid);
    return valid;
  };
  const chapters = new Map<number, ChapterLifecycle>();
  for (const [index, entry] of evidence.chapters) {
    const startDate = inYear(entry.titleDate) ? entry.titleDate : undefined;
    const terminalDate = entry.contentDates.at(-1);
    const endDate = inYear(terminalDate) ? terminalDate : undefined;
    let invalid = Boolean(entry.titleDate && !inYear(entry.titleDate));
    let hasDatedContent = false;
    let chronology = false;
    let reached = 0;
    entry.contentDates.forEach((date, i) => {
      if (!date) return;
      if (!inYear(date)) { invalid = true; return; }
      hasDatedContent = true;
      if (startDate && (date < startDate || (endDate && date > endDate))) chronology = true;
      if (date <= period.today) reached = i + 1;
    });
    let issue: ChapterLifecycle['issue'] = null;
    if (invalid) issue = 'invalid_date';
    else if (!startDate && hasDatedContent) issue = 'missing_start';
    else if (chronology) issue = 'chronology';
    const started = Boolean(startDate && startDate <= period.today);
    const completed = started && Boolean(endDate && endDate <= period.today) && !issue;
    // Dating the final pedagogical item means completion, even if intermediate dates are blank.
    // While ongoing, the last reached position provides an estimate, not measured teaching hours.
    chapters.set(index, {
      startDate, endDate, itemsCount: entry.contentDates.length,
      completionRate: issue || !entry.contentDates.length ? null : !started ? 0 : reached / entry.contentDates.length,
      state: issue ? 'inconsistent' : completed ? 'completed' : started ? 'in_progress' : startDate ? 'scheduled' : 'not_started',
      issue,
    });
  }
  const result = { chapters, diagnosticDates: evidence.diagnosticDates.filter(date => inYear(date) && date <= period.today) };
  evidence.lastEvaluation = { period: { ...period }, result };
  return result;
}
