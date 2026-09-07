import { useMemo, useDeferredValue } from 'react';
import type { LessonsData } from '../types';
import { buildLessonRows, filterLessonRows } from '../utils/lessonRows';

export const useLessonSearch = (lessonsData: LessonsData, searchQuery: string) => {
  const query = useDeferredValue(searchQuery.trim());
  const allRows = useMemo(() => buildLessonRows(lessonsData), [lessonsData]);
  const rows = useMemo(() => filterLessonRows(allRows, query), [allRows, query]);
  return { rows, query };
};
