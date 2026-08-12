/* ── Constants ── Point d'entrée unifié ──────────────────────────────────── */

export {
  TYPE_MAP,
  BADGE_TEXT_MAP,
  BADGE_COLOR_MAP,
  BADGE_TOOLTIP_MAP,
  SUBJECT_ABBREV_MAP,
  TOP_LEVEL_TYPE_CONFIG,
  normalizeContentType,
} from './constants/type-maps';

export {
  CONTENT_TYPES_BY_DOMAIN,
  resolveContentDomain,
  getContentTypesForSubject,
} from './constants/type-domains';
export type { ContentDomain } from './constants/type-domains';

export {
  CLASS_LEVELS_BY_CYCLE,
  formatClassDisplayName,
  formatLocalizedClassDisplayName,
  normalizeOfficialClassName,
} from './constants/class-levels';

export {
  SUBJECTS,
  formatLocalizedSubjectDisplayName,
} from './constants/subjects';

export {
  GUIDE_FR,
  GUIDE_AR,
} from './constants/guides';
