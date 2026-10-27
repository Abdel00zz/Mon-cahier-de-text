import type { AdminMessage, ClassInfo, LessonsData, NotebookContentOrigin } from '../../types';
import { hasOnlyPristineStarterDiagnostic } from '../notebook/starterDiagnostic';
import { walkNotebook } from '../notebook/notebookTraversal';
import { isNonCourseActivity, validChapterDate } from '../curriculum/chapterLifecycle';
import type { NotebookActivity } from './notebookActivity';

export interface NotebookContentEvidence {
  empty: boolean;
  contentCount: number;
  assignedCount: number;
}

export interface ContentSuggestion {
  target: Pick<ClassInfo, 'id' | 'name'> & Partial<Pick<ClassInfo, 'subject'>>;
  origin: NotebookContentOrigin | 'unknown';
  evidence: NotebookContentEvidence;
  activity?: NotebookActivity;
}

/** Delay before proposing ready-to-use content on a newly created class (3 hours). */
export const CONTENT_OFFER_MIN_AGE_MS = 3 * 3_600_000;
/** Maximum course items considered "too brief" for proactive content assistance. */
export const BRIEF_CONTENT_MAX_ITEMS = 6;

const evidenceCache = new WeakMap<LessonsData, NotebookContentEvidence>();
const timestamp = (value: string | undefined, now: number): number => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) && parsed <= now ? parsed : 0;
};

/** True once a class has existed for at least a few hours (or has no valid recent creation timestamp). */
export function isClassMatureForContentOffer(
  target: { createdAt?: string } | undefined,
  now: number,
): boolean {
  if (!target?.createdAt) return true;
  const parsed = Date.parse(target.createdAt);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > now) return true;
  return now - parsed >= CONTENT_OFFER_MIN_AGE_MS;
}

/** True when a notebook is empty or its course content is still too brief. */
export function hasMissingOrBriefContent(evidence: NotebookContentEvidence): boolean {
  return evidence.empty || evidence.contentCount <= BRIEF_CONTENT_MAX_ITEMS;
}

/** Counts assigned course content, never "completed lessons" inferred from dates or assessments. */
export function notebookContentEvidence(lessons: LessonsData): NotebookContentEvidence {
  const cached = evidenceCache.get(lessons);
  if (cached) return cached;
  const evidence = { empty: !lessons.length || hasOnlyPristineStarterDiagnostic(lessons), contentCount: 0, assignedCount: 0 };
  walkNotebook(lessons, {
    onNode: ({ node, structural }) => {
      if (isNonCourseActivity(node.type) || node.type === 'free') return false;
      if (!structural) {
        evidence.contentCount++;
        if (validChapterDate(node.date)) evidence.assignedCount++;
      }
    },
    onBudgetExceeded: () => { throw new Error('Notebook exceeds analysis limits'); },
  });
  evidenceCache.set(lessons, evidence);
  return evidence;
}

/** Stable order independent of the dashboard's visual layout. Future/invalid timestamps carry no weight. */
export function orderCompanionClasses<T extends Pick<ClassInfo, 'id' | 'createdAt' | 'lastOpenedAt'>>(
  classes: readonly T[], preferredClassId?: string, now = Date.now(),
): T[] {
  return [...classes].sort((a, b) => Number(b.id === preferredClassId) - Number(a.id === preferredClassId)
    || timestamp(b.lastOpenedAt, now) - timestamp(a.lastOpenedAt, now)
    || timestamp(b.createdAt, now) - timestamp(a.createdAt, now)
    || a.id.localeCompare(b.id));
}

interface SuggestionOptions {
  classes: readonly ClassInfo[];
  readLessons?: (classId: string) => LessonsData;
  preferredClassId?: string;
  visibleClassIds?: readonly string[];
  messages?: readonly AdminMessage[];
  contactedClassIds?: ReadonlySet<string>;
  ignoredClassIds?: ReadonlySet<string>;
  now: number;
  readActivity?: (classId: string) => NotebookActivity | undefined;
}

/** Local evidence only. Unreadable notebooks, recent contacts, brand-new classes and rich notebooks never become suggestions. */
export function resolveContentSuggestion(options: SuggestionOptions): ContentSuggestion | undefined {
  if (!options.readLessons) return;
  const visible = options.visibleClassIds ? new Set(options.visibleClassIds) : undefined;
  const recentlyContacted = new Set(options.contactedClassIds);
  const ignored = new Set(options.ignoredClassIds);
  for (const message of options.messages ?? []) {
    const at = timestamp(message.createdAt, options.now);
    if (message.sender === 'teacher' && message.event === 'whatsapp-contact' && message.classId
      && at > 0 && options.now - at < 86_400_000) recentlyContacted.add(message.classId);
  }
  const candidates = orderCompanionClasses(options.classes.filter(item => (!visible || visible.has(item.id))
    && !recentlyContacted.has(item.id)
    && !ignored.has(item.id)), options.preferredClassId, options.now);
  let fallback: ContentSuggestion | undefined;
  for (const target of candidates) {
    if (!isClassMatureForContentOffer(target, options.now)) continue;
    try {
      const evidence = notebookContentEvidence(options.readLessons(target.id));
      const activity = options.readActivity?.(target.id);
      if (!hasMissingOrBriefContent(evidence) && !activity) continue;
      const storedOrigin = target.notebookContentOrigin;
      const origin = storedOrigin === 'personal' || storedOrigin === 'predefined' || storedOrigin === 'imported' ? storedOrigin : 'unknown';
      const suggestion: ContentSuggestion = { target, evidence, origin, activity };
      // Continue the class just used; otherwise a blank notebook is the clearest opportunity.
      if (target.id === options.preferredClassId || timestamp(target.lastOpenedAt, options.now) || evidence.empty) return suggestion;
      fallback ??= suggestion;
    } catch { /* Unknown/corrupt data is handled by recovery guidance, never guessed as empty. */ }
  }
  return fallback;
}
