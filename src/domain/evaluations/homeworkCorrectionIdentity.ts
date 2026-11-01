import type { ManualAssessment } from '../../types';
import type { LessonRow } from '../notebook/lessonRows';
import { parseTrailingNumber } from './assessmentSync';
import { extractDateRange } from './dateRange';

export const correctionBlockId = (id: string) => `homework-correction:${id}`;

/** Stable identity first; ambiguous historical corrections are never guessed. */
export function correctionOwner(row: LessonRow, manual: readonly ManualAssessment[]): ManualAssessment | undefined {
  if (row.elementType !== 'correction_devoir_maison') return undefined;
  const exact = manual.find(item => item.type === 'maison' && row.data._tempId === correctionBlockId(item.id));
  if (exact) return exact;
  const num = parseTrailingNumber('title' in row.data ? row.data.title : undefined);
  const date = extractDateRange(row.data.date).startDate;
  const candidates = manual.filter(item => item.type === 'maison' && item.num === num && !!date && item.correctionDateISO === date);
  return candidates.length === 1 ? candidates[0] : undefined;
}
