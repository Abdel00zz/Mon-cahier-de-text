/* ── Constants ── Point d'entrée unifié ──────────────────────────────────── */

export {
  TYPE_MAP,
  BADGE_TEXT_MAP,
  BADGE_TOOLTIP_MAP,
  contentBadgeClass,
  SUBJECT_ABBREV_MAP,
  TOP_LEVEL_TYPE_CONFIG,
} from './type-maps';

export {
  getContentTypesForSubject,
} from './type-domains';

export {
  CLASS_LEVELS_BY_CYCLE,
  classLevelGroupsForCycle,
  formatClassDisplayName,
  formatClassLevelGroupLabel,
  formatLocalizedClassDisplayName,
  normalizeOfficialClassName,
} from './class-levels';
export type { ClassLevelGroupKey } from './class-levels';

export {
  SUBJECTS,
  formatLocalizedSubjectDisplayName,
} from './subjects';
