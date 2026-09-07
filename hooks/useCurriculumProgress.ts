import { useMemo } from 'react';
import type { AppConfig, ClassInfo, LessonsData } from '@/types';
import { computeOfficialProgression, findMatchingCurriculum } from '@/utils/officialCurriculum';
import { schoolYearLabelFromDate } from '@/utils/calendar';
import { useMoroccoToday } from './useMoroccoToday';

/** User-facing progress only uses confirmed links, never inferred title matches. */
export function useCurriculumProgress(classInfo: ClassInfo, config: AppConfig, lessonsData: LessonsData) {
  const today = useMoroccoToday();
  const curriculum = findMatchingCurriculum(classInfo, undefined, schoolYearLabelFromDate(config.schoolYearStart || today));
  return useMemo(() => {
    if (!curriculum) return null;
    return computeOfficialProgression(classInfo, lessonsData, { curriculum, config, today });
  }, [classInfo, config, lessonsData, today, curriculum]);
}
