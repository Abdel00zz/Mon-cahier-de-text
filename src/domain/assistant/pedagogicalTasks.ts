import type { PedagogicalDiagnosis } from '../intelligence/pedagogicalBrain';
import type { ClassGuidance } from './classGuidance';

export interface PedagogicalTask {
  id: string;
  priority: number;
  guidance: ClassGuidance;
  /** Evidence describes findings, never an inferred failure to teach. */
  evidence: { rule: string; occurrences: number; samplePath?: string };
}
const ISSUE_PRIORITY = { unclosedFormula: 90, outOfOrderSessions: 85, duplicateBlocks: 82, controlCharacters: 70, emptyStructure: 40 } as const;

/** Rank every observed point, not only the first issue of the first class. */
export function pedagogicalTasks(diagnosis: PedagogicalDiagnosis, preferredClassId?: string): PedagogicalTask[] {
  const tasks: PedagogicalTask[] = [];
  const add = (guidance: ClassGuidance, priority: number, occurrences = 1, samplePath?: string) => {
    const scope = 'classId' in guidance ? guidance.classId : '_global';
    const rule = guidance.step === 'notebook-issue'
      ? guidance.issueCode
      : guidance.step === 'evaluation-conflict'
        ? `conflict-${guidance.conflictKind}`
        : guidance.step === 'roster-incomplete'
          ? guidance.reason
          : guidance.step === 'notebook-followup'
            ? guidance.reason
            : guidance.step;
    tasks.push({ id: `${scope}:${rule}`, priority, guidance, evidence: {
      rule: guidance.step === 'notebook-issue' ? guidance.issueCode : guidance.step,
      occurrences, ...(samplePath ? { samplePath } : {}),
    } });
  };
  if (diagnosis.step === 'create') add({ step: 'create' }, 100);
  if (diagnosis.activeSessionClass) add({ step: 'active-session', classId: diagnosis.activeSessionClass.id, className: diagnosis.activeSessionClass.name }, 120);
  for (const item of diagnosis.unreadableNotebookClasses ?? []) add({ step: 'notebook-unavailable', classId: item.id, className: item.name,
    remaining: diagnosis.unreadableNotebookClasses!.length }, item.id === diagnosis.activeSessionClass?.id ? 130 : 110);
  const issuesCount = diagnosis.notebookIssues.reduce((sum, item) => sum + item.advices.length, 0);
  for (const item of diagnosis.notebookIssues) {
    for (const advice of item.advices) add({ step: 'notebook-issue', classId: item.classInfo.id, className: item.classInfo.name,
      issueCode: advice.code, count: advice.count, remaining: issuesCount }, ISSUE_PRIORITY[advice.code], advice.count, advice.samplePath);
  }
  const conflictsCount = (diagnosis.evaluationConflicts ?? []).reduce((sum, item) => sum + item.conflictCount, 0);
  for (const item of diagnosis.evaluationConflicts ?? []) {
    add({
      step: 'evaluation-conflict',
      classId: item.classInfo.id,
      className: item.classInfo.name,
      conflictKind: item.topConflictKind,
      count: item.conflictCount,
      remaining: conflictsCount,
    }, 88, item.conflictCount, item.sampleLabel);
  }
  for (const item of diagnosis.unscheduledClasses) add({ step: 'schedule', classId: item.id, className: item.name,
    remaining: diagnosis.unscheduledClasses.length }, 80);
  const rostersCount = diagnosis.incompleteRosterClasses?.length ?? 0;
  for (const item of diagnosis.incompleteRosterClasses ?? []) {
    add({
      step: 'roster-incomplete',
      classId: item.classInfo.id,
      className: item.classInfo.name,
      reason: item.reason,
      count: item.missingCount,
      remaining: rostersCount,
    }, 75, item.missingCount);
  }
  for (const item of diagnosis.emptyNotebookClasses) add({ step: 'notebook-empty', classId: item.id, className: item.name,
    remaining: diagnosis.emptyNotebookClasses.length }, 60);
  for (const item of diagnosis.notebookFollowups ?? []) add({ step: 'notebook-followup', classId: item.classInfo.id, className: item.classInfo.name,
    remaining: diagnosis.notebookFollowups!.length, ...item.followup }, 50);
  const isPreferred = (task: PedagogicalTask) => 'classId' in task.guidance && task.guidance.classId === preferredClassId;
  return tasks.sort((a, b) => b.priority - a.priority || Number(isPreferred(b)) - Number(isPreferred(a)) || a.id.localeCompare(b.id));
}

