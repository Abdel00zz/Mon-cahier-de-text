import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { LessonRow } from '@/domain/notebook/lessonRows';
import { lastDatedContentKey } from '@/domain/notebook/notebookOpening';

/** One placement per mounted editor, after its table is ready. A new card
 * opening mounts another editor; an edit or settings overlay does not. */
export function useNotebookOpeningFocus(classId: string, rows: readonly LessonRow[], ready: boolean,
  priorityFocus: MutableRefObject<string | null>, setFocusKey: Dispatch<SetStateAction<string | null>>) {
  const placed = useRef<string | null>(null);
  const clearTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!ready || placed.current === classId) return;
    placed.current = classId;
    if (priorityFocus.current !== null) return;
    const key = lastDatedContentKey(rows);
    if (!key) return;
    setFocusKey(key);
    clearTimer.current = window.setTimeout(() => {
      clearTimer.current = null;
      setFocusKey(current => current === key ? null : current);
    }, 1200);
  }, [classId, rows, ready, priorityFocus, setFocusKey]);
  useEffect(() => () => {
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
  }, []);
}
