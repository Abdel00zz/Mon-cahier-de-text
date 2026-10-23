import type { GuideReference } from '../../constants/guide/model';
import type { ClassGuidance } from './classGuidance';
import type { CompanionDecision } from './companionDecision';
import type { ContentSuggestion } from './contentSuggestion';

/** Documentation follows the visible decision, not a lower-priority marketing suggestion. */
export function companionHelpReference(
  decision: CompanionDecision,
  guidance: ClassGuidance,
  suggestion?: ContentSuggestion,
): GuideReference {
  switch (decision.kind) {
    case 'sync-error': case 'offline': return { chapterId: 'devices', sectionId: 'data-safety' };
    case 'syncing': case 'checking': return { chapterId: 'devices', sectionId: 'sync-status' };
    case 'inbox-error': case 'reply': return { chapterId: 'troubleshooting', sectionId: 'support' };
    case 'offer':
      if (suggestion?.evidence.empty) return { chapterId: 'content', sectionId: 'prepare' };
      if (suggestion?.activity?.kind === 'dates') return { chapterId: 'dates', sectionId: 'assign' };
      if (suggestion?.activity?.kind === 'order') return { chapterId: 'editor', sectionId: 'move' };
      return { chapterId: 'content', sectionId: suggestion?.origin === 'imported' ? 'transfer' : 'prepare' };
    case 'guidance': break;
  }
  switch (guidance.step) {
    case 'create': return { chapterId: 'classes' };
    case 'schedule': return { chapterId: 'schedule' };
    case 'active-session': return { chapterId: 'dates', sectionId: 'assign' };
    case 'notebook-followup': return { chapterId: 'notifications', sectionId: 'followup' };
    case 'notebook-empty': return { chapterId: 'content', sectionId: 'prepare' };
    case 'notebook-unavailable': return { chapterId: 'troubleshooting' };
    case 'checking': return { chapterId: 'devices', sectionId: 'sync-status' };
    case 'ready': return { chapterId: 'editor' };
    case 'notebook-issue':
      switch (guidance.issueCode) {
        case 'unclosedFormula': return { chapterId: 'math', sectionId: 'formulas' };
        case 'outOfOrderSessions': return { chapterId: 'dates', sectionId: 'assign' };
        case 'emptyStructure': return { chapterId: 'types' };
        case 'duplicateBlocks': return { chapterId: 'editor' };
        case 'controlCharacters': return { chapterId: 'troubleshooting' };
      }
  }
}
