import type { AppConfig, ClassInfo, LessonsData } from '../../types';
import { diagnosePedagogicalState } from '../intelligence/pedagogicalBrain';
import type { NotebookAdvice } from '../intelligence/notebookAdvisor';

export type GuidanceAction = { type: 'create-class' } | { type: 'schedule' } | { type: 'open-class'; classId: string };

export type ClassGuidance =
  | { step: 'create' }
  | { step: 'schedule'; classId: string; className: string; remaining: number }
  | { step: 'active-session'; classId: string; className: string }
  | { step: 'notebook-issue'; classId: string; className: string; issueCode: NotebookAdvice['code']; count: number; remaining: number }
  | { step: 'notebook-empty'; classId: string; className: string; remaining: number }
  | { step: 'notebook-unavailable'; classId: string; className: string; remaining: number }
  | { step: 'checking'; classId: string; className: string }
  | { step: 'ready'; classId: string; className: string };

export interface GuidanceBrainContext {
  activeSessionClassIds?: readonly string[];
  readLessons?: (classId: string) => LessonsData;
  notebooksLoading?: boolean;
}

type GuidanceConfig = Pick<AppConfig, 'timetable' | 'schedules'>;

/**
 * Moteur décisionnel du compagnon connecté au cerveau pédagogique central.
 * Analyse la structure, l'emploi du temps, les séances en cours et la qualité des cahiers.
 */
export function resolveClassGuidance(
  classes: readonly Pick<ClassInfo, 'id' | 'name'>[],
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
  });

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

  return {
    step: 'ready',
    classId: diagnosis.targetClass!.id,
    className: diagnosis.targetClass!.name,
  };
}

export function guidanceAction(guidance: ClassGuidance): GuidanceAction {
  if (guidance.step === 'create') return { type: 'create-class' };
  if (guidance.step === 'schedule') return { type: 'schedule' };
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
  if (guidance.step === 'notebook-empty') return `empty:${guidance.classId}:${guidance.remaining}`;
  return `${guidance.step}:${guidance.classId}:${guidance.remaining}`;
}
