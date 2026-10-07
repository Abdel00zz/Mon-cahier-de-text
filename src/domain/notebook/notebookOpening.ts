import type { LessonRow } from './lessonRows';
import { parseDateInput } from './dataUtils';

/** Resume at the bottom of the dated course, in source order. The dates in
 * the notebook are the persisted progress on every device; pixel positions
 * and a second cloud cursor would become stale after edits or imports. */
export function lastDatedContentKey(rows: readonly LessonRow[]): string | null {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const date = rows[index].data.date;
    if (typeof date === 'string' && parseDateInput(date.trim())) return rows[index].key;
  }
  return null;
}
