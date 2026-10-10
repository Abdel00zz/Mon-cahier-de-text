import { useMemo, useDeferredValue } from 'react';
import type { LessonsData } from '../../../types';
import { filterLessonRows } from '../../../domain/notebook/lessonRows';
import { visibleNotebookRows } from '../../../domain/evaluations/homeworkPlacement';

export const useLessonSearch = (lessonsData: LessonsData, searchQuery: string) => {
  const query = useDeferredValue(searchQuery.trim());
  const allRows = useMemo(() => visibleNotebookRows(lessonsData), [lessonsData]);
  const rows = useMemo(() => filterLessonRows(allRows, query), [allRows, query]);
  return { rows, allRows, query };
};
