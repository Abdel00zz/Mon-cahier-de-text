import type { GuideReference } from '../../constants/guide/model';
import type { ClassGuidance } from './classGuidance';
import type { CompanionDecision } from './companionDecision';

/** Offer instructions only for an actionable procedure covered by the guide.
 * Status updates, conversations, offers and routine reminders need no extra how-to. */
export function companionHelpReference(
  decision: CompanionDecision,
  guidance: ClassGuidance,
): GuideReference | undefined {
  switch (decision.kind) {
    case 'sync-error': return { chapterId: 'devices', sectionId: 'data-safety' };
    case 'guidance': break;
    default: return undefined;
  }
  switch (guidance.step) {
    case 'create': return { chapterId: 'classes' };
    case 'schedule': return { chapterId: 'schedule' };
    case 'active-session': return { chapterId: 'dates', sectionId: 'assign' };
    case 'notebook-followup': return guidance.reason === 'first-session'
      ? { chapterId: 'dates', sectionId: 'assign' } : undefined;
    case 'notebook-empty': return { chapterId: 'content', sectionId: 'prepare' };
    case 'notebook-unavailable': return { chapterId: 'troubleshooting' };
    case 'checking': case 'ready': return undefined;
    case 'notebook-issue':
      switch (guidance.issueCode) {
        case 'unclosedFormula': return { chapterId: 'math', sectionId: 'formulas' };
        case 'outOfOrderSessions': return { chapterId: 'dates', sectionId: 'assign' };
        case 'emptyStructure': return { chapterId: 'types' };
        // A generic chapter does not explain how to resolve these particular findings.
        case 'duplicateBlocks': case 'controlCharacters': return undefined;
      }
  }
}
