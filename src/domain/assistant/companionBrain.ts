import type { AdminMessage, ClassInfo, LessonsData } from '../../types';
import type { HolidayCalendar } from '../calendar/calendar';
import { diagnosePedagogicalState } from '../intelligence/pedagogicalBrain';
import { pendingAdminMessages } from '../messages/conversation';
import { guidanceAction, guidanceFromDiagnosis, type GuidanceAction, type GuidanceConfig } from './classGuidance';
import { decideCompanion, type CompanionDecision, type CompanionSignals } from './companionDecision';
import { resolvePedagogicalBehavior, type PedagogicalBehavior } from './companionPedagogicalBehavior';
import { orderCompanionClasses, resolveContentSuggestion } from './contentSuggestion';
import { companionCalendarNotice } from './companionCalendar';
import { companionHelpReference } from './companionHelp';
import type { NotebookActivity } from './notebookActivity';
import { createNotebookSnapshot } from './notebookSnapshot';
import { pedagogicalTasks } from './pedagogicalTasks';

type ServiceSignals = Omit<CompanionSignals, 'guidance' | 'hasContentSuggestion' | 'hasNotebookReader' | 'calendarNotice'>;
export interface CompanionBrainInput {
  classes: readonly ClassInfo[];
  config: GuidanceConfig;
  calendar: HolidayCalendar;
  today: string;
  now: number;
  services: ServiceSignals;
  preferredClassId?: string;
  visibleClassIds?: readonly string[];
  activeSessionClassIds?: readonly string[];
  selectedTaskId?: string;
  readLessons?: (id: string) => LessonsData;
  readActivity?: (id: string) => NotebookActivity | undefined;
  offersEnabled: boolean;
  messageHistory?: readonly AdminMessage[];
  contactedClassIds?: ReadonlySet<string>;
  ignoredClassIds?: ReadonlySet<string>;
}
export type CompanionAction = GuidanceAction | { type: 'retry-sync' | 'retry-inbox' | 'read-reply' | 'request-content' | 'none' };

function selectAction(decision: CompanionDecision, fallback: GuidanceAction, checking: boolean): CompanionAction {
  switch (decision.kind) {
    case 'sync-error': return { type: 'retry-sync' };
    case 'inbox-error': return { type: 'retry-inbox' };
    case 'reply': return { type: 'read-reply' };
    case 'offer': return { type: 'request-content' };
    case 'guidance': return checking ? { type: 'none' } : fallback;
    default: return { type: 'none' };
  }
}

/** One deterministic observation → prioritisation → action snapshot for the whole robot.
 * This module never mutates a notebook, sends a message, or creates its own cloud subscription. */
export function createCompanionEvaluation(input: Omit<CompanionBrainInput, 'selectedTaskId'>) {
  const snapshot = createNotebookSnapshot(input.readLessons);
  const loading = input.services.transfer === 'pulling' || input.services.transfer === 'notebooks';
  const diagnosis = diagnosePedagogicalState({
    classes: orderCompanionClasses(input.classes, input.preferredClassId, input.now), config: input.config,
    preferredClassId: input.preferredClassId, activeSessionClassIds: input.activeSessionClassIds,
    readLessons: snapshot.read, notebooksLoading: loading, calendar: input.calendar, today: input.today,
    inspectDuringSession: true,
  });
  const tasks = loading ? [] : pedagogicalTasks(diagnosis, input.preferredClassId);
  if (!loading && !snapshot.read && diagnosis.targetClass) tasks.push({
    id: '_global:reader-unavailable', priority: 55,
    guidance: { step: 'notebook-unavailable', classId: diagnosis.targetClass.id, className: diagnosis.targetClass.name, remaining: 1 },
    evidence: { rule: 'reader-unavailable', occurrences: 1 },
  });
  // Browsing findings only re-ranks this captured observation; it never re-reads local JSON.
  return (selectedTaskId?: string) => {
    // Explicit browsing cannot displace an ongoing lesson; a corrected/deleted task drops out automatically.
    const selectedTask = tasks[0]?.guidance.step === 'active-session' ? tasks[0]
      : tasks.find(task => task.id === selectedTaskId) ?? tasks[0];
    const guidance = selectedTask?.guidance ?? guidanceFromDiagnosis(diagnosis);
    const calendarTarget = 'classId' in guidance ? input.classes.find(item => item.id === guidance.classId) : undefined;
    const calendarNotice = guidance.step === 'ready'
      ? companionCalendarNotice(input.calendar, input.today, input.config, calendarTarget) : undefined;
    const contentSuggestion = guidance.step === 'ready' && !calendarNotice && input.offersEnabled && !loading ? resolveContentSuggestion({
      classes: input.classes, readLessons: snapshot.read, readActivity: input.readActivity,
      preferredClassId: input.preferredClassId, visibleClassIds: input.visibleClassIds,
      messages: input.messageHistory, contactedClassIds: input.contactedClassIds, ignoredClassIds: input.ignoredClassIds, now: input.now,
    }) : undefined;
    const decision = decideCompanion({ ...input.services, guidance, calendarNotice,
      hasNotebookReader: Boolean(snapshot.read), hasContentSuggestion: Boolean(contentSuggestion) });
    const reply = decision.kind === 'reply' ? decision.reply : undefined;
    const targetId = reply?.classId ?? (decision.kind === 'offer' ? contentSuggestion?.target.id
      : 'classId' in guidance ? guidance.classId : undefined);
    const target = input.classes.find(item => item.id === targetId);
    const serviceError = decision.kind === 'sync-error' || decision.kind === 'inbox-error';
    const service = !['guidance', 'offer', 'reply', 'calendar'].includes(decision.kind);
    const pendingTasks = tasks.filter(task => task.guidance.step !== 'active-session');
    const unreadReplies = input.services.authenticated ? pendingAdminMessages(input.services.messages).length : 0;
    const attentionCount = pendingTasks.length + unreadReplies + Number(serviceError);
    let behavior: PedagogicalBehavior = resolvePedagogicalBehavior(guidance);
    if (service) behavior = { problemCount: attentionCount, severity: serviceError ? 'critical' : 'minor',
      mood: serviceError ? 'sad' : 'attentive', robotAction: serviceError ? 'failure' : 'waiting',
      antennaFlash: serviceError, headRoundness: serviceError ? 55 : 90, autoSleepMs: serviceError ? 0 : 30000 };
    else if (reply) behavior = { ...behavior, robotAction: 'inspect', antennaFlash: false };
    const index = selectedTask ? tasks.indexOf(selectedTask) : -1;
    const nextTaskId = decision.kind === 'guidance' && guidance.step !== 'active-session' && tasks.length > 1
      ? tasks[(index + 1) % tasks.length].id : undefined;
    const coverage = {
      total: input.classes.length,
      read: [...snapshot.reads.values()].filter(value => value.status === 'read').length,
      unavailable: [...snapshot.reads.values()].filter(value => value.status === 'unavailable').length,
      state: loading ? 'loading' as const : !snapshot.read ? 'disconnected' as const
        : snapshot.reads.size < input.classes.length ? 'partial' as const : 'complete' as const,
    };
    return {
      diagnosis, tasks, selectedTask, guidance, decision, contentSuggestion, target, coverage,
      taskPosition: index + 1,
      action: selectAction(decision, guidanceAction(guidance), guidance.step === 'checking'),
      behavior: { ...behavior, problemCount: attentionCount }, nextTaskId,
      attentionKey: service ? serviceError ? decision.kind : undefined : reply?.id
        ?? (decision.kind === 'guidance' && selectedTask && guidance.step !== 'active-session'
          ? `${selectedTask.id}:${selectedTask.evidence.occurrences}:${guidance.step === 'notebook-followup' ? guidance.lastSessionDate ?? 'first' : selectedTask.evidence.samplePath ?? ''}` : undefined),
      calendarNotice: decision.kind === 'calendar' ? decision.notice : undefined,
      showTips: decision.kind === 'guidance' && guidance.step === 'ready',
      helpReference: companionHelpReference(decision, guidance),
      // Explanations can be inspected without exposing text, names of pupils or provider secrets.
      trace: { rule: selectedTask && decision.kind === 'guidance' ? selectedTask.evidence.rule : decision.kind,
        evidence: selectedTask && decision.kind === 'guidance' ? selectedTask.evidence : undefined,
        pending: pendingTasks.length, observedAt: input.now },
    };
  };
}

export function evaluateCompanion(input: CompanionBrainInput) {
  return createCompanionEvaluation(input)(input.selectedTaskId);
}
export type CompanionBrainSnapshot = ReturnType<typeof evaluateCompanion>;
