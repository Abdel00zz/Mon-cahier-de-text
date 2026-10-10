import type { LessonsData } from '../../types';
import { buildLessonRows, type LessonRow } from '../notebook/lessonRows';
import { addDaysIso, parseDateInput } from '../notebook/dataUtils';
import { EVALUATION_TYPES } from '../notebook/contentNumbering';

export const isHomeworkRow = (row: LessonRow): boolean =>
  'type' in row.data && (row.data.type === 'devoir_maison' || String(row.data.type) === 'maison');

/** Hide historical homework blocks without destroying their identity, date or
 * nested teaching content. Corrections remain independent notebook rows. */
export const visibleNotebookRows = (lessons: LessonsData): LessonRow[] =>
  buildLessonRows(lessons).filter(row => !isHomeworkRow(row));

export function sessionDateKey(raw?: string): string {
  const first = raw?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/)?.[0] ?? raw;
  return first && parseDateInput(first) ? addDaysIso(first, 0) : '';
}

export const sessionDateKeys = (raw?: string): string[] => [...new Set(
  (raw?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/g) ?? []).map(sessionDateKey).filter(Boolean),
)];

export function getLastNotebookDate(lessons?: LessonsData): string | undefined {
  if (!lessons || !lessons.length) return undefined;
  const rows = visibleNotebookRows(lessons);
  for (let i = rows.length - 1; i >= 0; i--) {
    const raw = rows[i].data.date;
    if (typeof raw === 'string' && raw.trim()) {
      const parsed = sessionDateKey(raw);
      if (parsed) return parsed;
    }
  }
  return undefined;
}

/** Latest taught course session on/before the assignment date. Binary lookup
 * avoids scanning the notebook once for each homework/document. No future
 * session, assessment or medical leave is used as a teaching session. */
export function homeworkSessionResolver(lessons?: LessonsData): (date: string, exact?: boolean) => string {
  if (!lessons) return sessionDateKey;
  const sessions = new Map<string, string>();
  for (const row of buildLessonRows(lessons)) {
    const type = String('type' in row.data ? row.data.type : row.elementType);
    if (EVALUATION_TYPES.test(type) || ['maison', 'oral', 'absence', 'medical_leave', 'conge_maladie', 'remediation', 'controle_cahiers'].includes(type)) continue;
    // Only the course hierarchy and its children are eligible.
    if (lessons[row.indices.chapterIndex]?.type !== 'chapter') continue;
    const dates = (row.data.date?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/g) ?? [])
      .map(sessionDateKey).filter(Boolean).sort();
    for (const date of dates) sessions.set(date, dates[0]);
  }
  const dates = [...sessions.keys()].sort();
  return (raw, exact = false) => {
    const date = sessionDateKey(raw);
    let lo = 0, hi = dates.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (dates[mid] <= date) lo = mid + 1; else hi = mid; }
    const result = lo ? sessions.get(dates[lo - 1])! : '';
    return exact && result !== date && dates[lo - 1] !== date ? '' : result;
  };
}

/** Date of the last dated course content in document order, for a new assignment. */
export function lastCourseSessionDate(lessons: LessonsData): string {
  const rows = visibleNotebookRows(lessons);
  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index];
    if (lessons[row.indices.chapterIndex]?.type !== 'chapter') continue;
    const type = String('type' in row.data ? row.data.type : row.elementType);
    if (EVALUATION_TYPES.test(type) || ['oral', 'remediation', 'controle_cahiers'].includes(type)) continue;
    const dates = row.data.date?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/g);
    const date = sessionDateKey(dates?.at(-1));
    if (date) return date;
  }
  return '';
}
