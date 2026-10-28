import type { ClassEvaluationEntry, LessonsData, NotificationSettings } from '../../types';
import { diagnosePedagogicalState, type PedagogicalBrainConfig, type PedagogicalDiagnosis } from '../intelligence/pedagogicalBrain';
import type { NotebookAdvice } from '../intelligence/notebookAdvisor';
import type { EvaluationConflict } from '../evaluations/evaluationConflicts';
import type { HolidayCalendar } from '../calendar/calendar';
import type { FollowupClass, NotebookFollowup } from './notebookFollowup';

export type GuidanceAction =
  | { type: 'create-class' }
  | { type: 'schedule' }
  | { type: 'open-class'; classId: string }
  | { type: 'open-evaluations'; classId: string; entry?: ClassEvaluationEntry }
  | { type: 'configure-roster'; classId: string };

export type ClassGuidance =
  | { step: 'create' }
  | { step: 'schedule'; classId: string; className: string; remaining: number }
  | { step: 'active-session'; classId: string; className: string }
  | { step: 'notebook-issue'; classId: string; className: string; issueCode: NotebookAdvice['code']; count: number; remaining: number }
  | { step: 'evaluation-conflict'; classId: string; className: string; conflictKind: EvaluationConflict['kind']; count: number; remaining: number }
  | { step: 'roster-incomplete'; classId: string; className: string; reason: 'missing-roster' | 'unmerged-names'; count: number; remaining: number }
  | { step: 'notebook-empty'; classId: string; className: string; remaining: number }
  | { step: 'notebook-unavailable'; classId: string; className: string; remaining: number }
  | ({ step: 'notebook-followup'; classId: string; className: string; remaining: number } & NotebookFollowup)
  | { step: 'checking'; classId: string; className: string }
  | { step: 'ready'; classId: string; className: string };

export interface GuidanceBrainContext {
  activeSessionClassIds?: readonly string[];
  readLessons?: (classId: string) => LessonsData;
  notebooksLoading?: boolean;
  today?: string;
  calendar?: HolidayCalendar;
}

export type GuidanceConfig = PedagogicalBrainConfig & {
  notificationSettings?: Partial<NotificationSettings>;
};

/**
 * Moteur décisionnel du compagnon connecté au cerveau pédagogique central.
 * Analyse la structure, l'emploi du temps, les séances en cours et la qualité des cahiers.
 */
export function resolveClassGuidance(
  classes: readonly FollowupClass[],
  config: GuidanceConfig,
  preferredClassId?: string,
  context?: GuidanceBrainContext
): ClassGuidance {
  const diagnosis = diagnosePedagogicalState({
    classes,
    config,
    preferredClassId,
    activeSessionClassIds: context?.activeSessionClassIds,
    readLessons: context?.readLessons,
    notebooksLoading: context?.notebooksLoading,
    today: context?.today,
    calendar: context?.calendar,
  });

  return guidanceFromDiagnosis(diagnosis);
}

/** Shared projection: standalone callers and the central brain use the same guidance contract. */
export function guidanceFromDiagnosis(diagnosis: PedagogicalDiagnosis): ClassGuidance {

  if (diagnosis.step === 'create') {
    return { step: 'create' };
  }

  if (diagnosis.step === 'schedule') {
    return {
      step: 'schedule',
      classId: diagnosis.targetClass!.id,
      className: diagnosis.targetClass!.name,
      remaining: diagnosis.unscheduledClasses.length,
    };
  }

  if (diagnosis.step === 'active-session') {
    return {
      step: 'active-session',
      classId: diagnosis.targetClass!.id,
      className: diagnosis.targetClass!.name,
    };
  }

  if (diagnosis.step === 'notebook-issue') {
    const topIssue = diagnosis.notebookIssues.find(item => item.classInfo.id === diagnosis.targetClass?.id)!;
    return {
      step: 'notebook-issue',
      classId: topIssue.classInfo.id,
      className: topIssue.classInfo.name,
      issueCode: topIssue.topAdvice.code,
      count: topIssue.topAdvice.count,
      remaining: diagnosis.problemCount,
    };
  }

  if (diagnosis.step === 'evaluation-conflict') {
    const targetConflict = diagnosis.evaluationConflicts!.find(item => item.classInfo.id === diagnosis.targetClass?.id)!;
    return {
      step: 'evaluation-conflict',
      classId: targetConflict.classInfo.id,
      className: targetConflict.classInfo.name,
      conflictKind: targetConflict.topConflictKind,
      count: targetConflict.conflictCount,
      remaining: diagnosis.problemCount,
    };
  }

  if (diagnosis.step === 'roster-incomplete') {
    const targetRoster = diagnosis.incompleteRosterClasses!.find(item => item.classInfo.id === diagnosis.targetClass?.id)!;
    return {
      step: 'roster-incomplete',
      classId: targetRoster.classInfo.id,
      className: targetRoster.classInfo.name,
      reason: targetRoster.reason,
      count: targetRoster.missingCount,
      remaining: diagnosis.problemCount,
    };
  }

  if (diagnosis.step === 'checking') return {
    step: 'checking', classId: diagnosis.targetClass!.id, className: diagnosis.targetClass!.name,
  };
  if (diagnosis.step === 'notebook-unavailable') return {
    step: 'notebook-unavailable', classId: diagnosis.targetClass!.id, className: diagnosis.targetClass!.name,
    remaining: diagnosis.problemCount,
  };

  if (diagnosis.step === 'notebook-empty') {
    return {
      step: 'notebook-empty',
      classId: diagnosis.targetClass!.id,
      className: diagnosis.targetClass!.name,
      remaining: diagnosis.emptyNotebookClasses.length,
    };
  }

  if (diagnosis.step === 'notebook-followup') {
    const target = diagnosis.notebookFollowups!.find(item => item.classInfo.id === diagnosis.targetClass?.id)!;
    return { step: 'notebook-followup', classId: target.classInfo.id, className: target.classInfo.name,
      remaining: diagnosis.problemCount, ...target.followup };
  }

  return {
    step: 'ready',
    classId: diagnosis.targetClass!.id,
    className: diagnosis.targetClass!.name,
  };
}

export function guidanceAction(guidance: ClassGuidance): GuidanceAction {
  if (guidance.step === 'create') return { type: 'create-class' };
  if (guidance.step === 'schedule') return { type: 'schedule' };
  if (guidance.step === 'evaluation-conflict') return { type: 'open-evaluations', classId: guidance.classId, entry: 'all' };
  if (guidance.step === 'roster-incomplete') return { type: 'configure-roster', classId: guidance.classId };
  return { type: 'open-class', classId: guidance.classId };
}

/** Une nouvelle classe ou un problème renouvelé rafraîchit le signal d'attention. */
export function guidanceKey(guidance: ClassGuidance): string {
  if (guidance.step === 'create') return 'create';
  if (guidance.step === 'ready') return `ready:${guidance.classId}`;
  if (guidance.step === 'active-session') return `session:${guidance.classId}`;
  if (guidance.step === 'checking') return `checking:${guidance.classId}`;
  if (guidance.step === 'notebook-unavailable') return `unavailable:${guidance.classId}:${guidance.remaining}`;
  if (guidance.step === 'notebook-issue') return `issue:${guidance.classId}:${guidance.issueCode}:${guidance.count}:${guidance.remaining}`;
  if (guidance.step === 'evaluation-conflict') return `eval-conflict:${guidance.classId}:${guidance.conflictKind}:${guidance.count}:${guidance.remaining}`;
  if (guidance.step === 'roster-incomplete') return `roster:${guidance.classId}:${guidance.reason}:${guidance.count}:${guidance.remaining}`;
  if (guidance.step === 'notebook-empty') return `empty:${guidance.classId}:${guidance.remaining}`;
  if (guidance.step === 'notebook-followup') return `followup:${guidance.classId}:${guidance.reason}:${guidance.lastSessionDate ?? 'first'}`;
  return `${guidance.step}:${guidance.classId}:${guidance.remaining}`;
}

