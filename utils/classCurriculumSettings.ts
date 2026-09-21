import type { ClassInfo } from '../types.js';

/** These teacher-owned fields are a snapshot: absence also means an explicit clear. */
export function withCurriculumSettings(base: ClassInfo, settings: ClassInfo): ClassInfo {
  return {
    ...base,
    color: settings.color || base.color,
    courseStartDate: settings.courseStartDate,
    curriculumSourceId: settings.curriculumSourceId,
    curriculumChapterMatches: settings.curriculumChapterMatches,
  };
}
