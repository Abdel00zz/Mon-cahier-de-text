import type { AdminMessage, ClassInfo, LessonsData } from '../../types';
import type { HolidayCalendar } from '../calendar/calendar';
import { diagnosePedagogicalState } from '../intelligence/pedagogicalBrain';
import { pendingAdminMessages } from '../messages/conversation';
import { guidanceAction, guidanceFromDiagnosis, type GuidanceAction, type GuidanceConfig } from './classGuidance';
import { decideCompanion, type CompanionDecision, type CompanionNotificationPrompt, type CompanionSignals } from './companionDecision';
import { resolvePedagogicalBehavior, type PedagogicalBehavior } from './companionPedagogicalBehavior';
import { isClassMatureForContentOffer, orderCompanionClasses, resolveContentSuggestion } from './contentSuggestion';
import { companionCalendarNotice } from './companionCalendar';
import { companionHelpReference } from './companionHelp';
import type { NotebookActivity } from './notebookActivity';
import { createNotebookSnapshot } from './notebookSnapshot';
import { pedagogicalTasks } from './pedagogicalTasks';

type ServiceSignals = Omit<
  CompanionSignals,
  'guidance' | 'hasContentSuggestion' | 'hasNotebookReader' | 'calendarNotice' | 'pwaInstallRequired' | 'notificationPrompt'
>;
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
  pwaInstallRequired?: boolean;
  notificationPrompt?: CompanionNotificationPrompt;
  skippedTaskIds?: ReadonlySet<string>;
  skippedMessageKeys?: ReadonlySet<string>;
}
export type CompanionAction =
  | GuidanceAction
  | { type: 'install-app' | 'retry-sync' | 'retry-inbox' | 'read-reply' | 'request-content' | 'none' }
  | { type: 'enable-notifications'; mode: CompanionNotificationPrompt };

function selectAction(decision: CompanionDecision, fallback: GuidanceAction, checking: boolean): CompanionAction {
  switch (decision.kind) {
    case 'install-app': return { type: 'install-app' };
    case 'enable-notifications': return { type: 'enable-notifications', mode: decision.mode };
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
  const rawTasks = loading ? [] : pedagogicalTasks(diagnosis, input.preferredClassId);
  if (!loading && !snapshot.read && diagnosis.targetClass) rawTasks.push({
    id: '_global:reader-unavailable', priority: 55,
    guidance: { step: 'notebook-unavailable', classId: diagnosis.targetClass.id, className: diagnosis.targetClass.name, remaining: 1 },
    evidence: { rule: 'reader-unavailable', occurrences: 1 },
  });
  const tasks = input.skippedTaskIds?.size
    ? rawTasks.filter(task => !input.skippedTaskIds!.has(task.id))
    : rawTasks;
  // Browsing findings only re-ranks this captured observation; it never re-reads local JSON.
  return (selectedTaskId?: string) => {
    // Explicit browsing cannot displace an ongoing lesson; a corrected/deleted task drops out automatically.
    const selectedTask = tasks[0]?.guidance.step === 'active-session' ? tasks[0]
      : tasks.find(task => task.id === selectedTaskId) ?? tasks[0];
    const allTasksSkipped = rawTasks.length > 0 && tasks.length === 0;
    const skippedFallback = diagnosis.targetClass
      ? { step: 'ready' as const, classId: diagnosis.targetClass.id, className: diagnosis.targetClass.name }
      : { step: 'create' as const };
    const guidance = selectedTask?.guidance ?? (allTasksSkipped ? skippedFallback : guidanceFromDiagnosis(diagnosis));
    const calendarTarget = 'classId' in guidance ? input.classes.find(item => item.id === guidance.classId) : undefined;
    const rawCalendarNotice = guidance.step === 'ready'
      ? companionCalendarNotice(input.calendar, input.today, input.config, calendarTarget) : undefined;
    const calendarKey = rawCalendarNotice ? `calendar:${rawCalendarNotice.kind}:${rawCalendarNotice.start}:${rawCalendarNotice.name}` : undefined;
    const calendarNotice = calendarKey && input.skippedMessageKeys?.has(calendarKey) ? undefined : rawCalendarNotice;
    const contentSuggestion = guidance.step === 'ready' && !calendarNotice && input.offersEnabled && !loading ? resolveContentSuggestion({
      classes: input.classes, readLessons: snapshot.read, readActivity: input.readActivity,
      preferredClassId: input.preferredClassId, visibleClassIds: input.visibleClassIds,
      messages: input.messageHistory, contactedClassIds: input.contactedClassIds, ignoredClassIds: input.ignoredClassIds, now: input.now,
    }) : undefined;
    const filteredMessages = input.skippedMessageKeys?.size
      ? input.services.messages.filter(msg => !input.skippedMessageKeys!.has(`reply:${msg.id}`))
      : input.services.messages;
    const effectiveNotificationPrompt = loading || input.skippedMessageKeys?.has('enable-notifications')
      ? undefined
      : input.notificationPrompt;
    const decision = decideCompanion({
      ...input.services,
      messages: filteredMessages,
      guidance,
      calendarNotice,
      hasNotebookReader: Boolean(snapshot.read),
      hasContentSuggestion: Boolean(contentSuggestion),
      pwaInstallRequired: input.pwaInstallRequired,
      notificationPrompt: effectiveNotificationPrompt,
    });
    const isInstallApp = decision.kind === 'install-app';
    const isEnableNotifications = decision.kind === 'enable-notifications';
    const isDeviceSetup = isInstallApp || isEnableNotifications;
    const reply = decision.kind === 'reply' ? decision.reply : undefined;
    const targetId = isDeviceSetup ? undefined : reply?.classId ?? (decision.kind === 'offer' ? contentSuggestion?.target.id
      : 'classId' in guidance ? guidance.classId : undefined);
    const target = input.classes.find(item => item.id === targetId);
    const serviceError = decision.kind === 'sync-error' || decision.kind === 'inbox-error';
    const service = !['guidance', 'offer', 'reply', 'calendar', 'install-app', 'enable-notifications'].includes(decision.kind);
    const guidanceProblem = decision.kind === 'guidance' && (
      guidance.step === 'notebook-unavailable'
      || guidance.step === 'notebook-issue'
      || guidance.step === 'evaluation-conflict'
      || guidance.step === 'roster-incomplete'
      || guidance.step === 'notebook-followup'
    );
    const delayedEmptyContent = decision.kind === 'guidance'
      && guidance.step === 'notebook-empty'
      && isClassMatureForContentOffer(target, input.now);
    const delayedBriefContent = decision.kind === 'offer' && Boolean(contentSuggestion);
    const canContactTeam = !isDeviceSetup && (serviceError || guidanceProblem || delayedEmptyContent || delayedBriefContent);
    const pendingTasks = tasks.filter(task => task.guidance.step !== 'active-session');
    const unreadReplies = input.services.authenticated ? pendingAdminMessages(filteredMessages).length : 0;
    const attentionCount = pendingTasks.length + unreadReplies + Number(serviceError) + Number(isDeviceSetup);
    let behavior: PedagogicalBehavior = resolvePedagogicalBehavior(guidance);
    if (isDeviceSetup) {
      behavior = {
        problemCount: Math.max(1, attentionCount),
        severity: 'minor',
        mood: 'attentive',
        robotAction: 'inspect',
        antennaFlash: true,
        headRoundness: 90,
        autoSleepMs: 0,
      };
    } else if (service) {
      behavior = { problemCount: attentionCount, severity: serviceError ? 'critical' : 'minor',
        mood: serviceError ? 'sad' : 'attentive', robotAction: serviceError ? 'failure' : 'waiting',
        antennaFlash: serviceError, headRoundness: serviceError ? 55 : 90, autoSleepMs: serviceError ? 0 : 30000 };
    } else if (reply) {
      behavior = { ...behavior, robotAction: 'inspect', antennaFlash: false };
    }
    const index = selectedTask ? tasks.indexOf(selectedTask) : -1;
    const nextTaskId = !isDeviceSetup && decision.kind === 'guidance' && guidance.step !== 'active-session' && tasks.length > 1
      ? tasks[(index + 1) % tasks.length].id : undefined;
    const isTransientLoading = decision.kind === 'checking' || decision.kind === 'syncing'
      || (decision.kind === 'guidance' && guidance.step === 'checking');
    const canSkip = !isInstallApp && !isTransientLoading;
    const skipKey = isInstallApp ? undefined
      : isEnableNotifications ? 'enable-notifications'
      : decision.kind === 'offer' && contentSuggestion ? `offer:${contentSuggestion.target.id}`
      : decision.kind === 'calendar' && calendarKey ? calendarKey
      : decision.kind === 'reply' && reply ? `reply:${reply.id}`
      : selectedTask ? `task:${selectedTask.id}`
      : `msg:${decision.kind}:${guidance.step}`;
    const coverage = {
      total: input.classes.length,
      read: [...snapshot.reads.values()].filter(value => value.status === 'read').length,
      unavailable: [...snapshot.reads.values()].filter(value => value.status === 'unavailable').length,
      state: loading ? 'loading' as const : !snapshot.read ? 'disconnected' as const
        : snapshot.reads.size < input.classes.length ? 'partial' as const : 'complete' as const,
    };
    return {
      diagnosis, tasks, selectedTask, guidance, decision, contentSuggestion, target, coverage,
      canContactTeam,
      canSkip,
      skipKey,
      taskPosition: index + 1,
      action: selectAction(decision, guidanceAction(guidance), guidance.step === 'checking'),
      behavior: { ...behavior, problemCount: attentionCount }, nextTaskId,
      attentionKey: isInstallApp ? 'install-app'
        : isEnableNotifications ? `enable-notifications:${decision.mode}`
        : service ? serviceError ? decision.kind : undefined : reply?.id
        ?? (decision.kind === 'guidance' && selectedTask && guidance.step !== 'active-session'
          ? `${selectedTask.id}:${selectedTask.evidence.occurrences}:${guidance.step === 'notebook-followup' ? guidance.lastSessionDate ?? 'first' : selectedTask.evidence.samplePath ?? ''}` : undefined),
      calendarNotice: decision.kind === 'calendar' ? decision.notice : undefined,
      showTips: !isDeviceSetup && decision.kind === 'guidance' && guidance.step === 'ready',
      helpReference: isDeviceSetup ? undefined : companionHelpReference(decision, guidance),
      // Explanations can be inspected without exposing text, names of pupils or provider secrets.
      trace: { rule: isInstallApp ? 'install-app' : isEnableNotifications ? 'enable-notifications' : selectedTask && decision.kind === 'guidance' ? selectedTask.evidence.rule : decision.kind,
        evidence: !isDeviceSetup && selectedTask && decision.kind === 'guidance' ? selectedTask.evidence : undefined,
        pending: pendingTasks.length, observedAt: input.now },
    };
  };
}

export function evaluateCompanion(input: CompanionBrainInput) {
  return createCompanionEvaluation(input)(input.selectedTaskId);
}
export type CompanionBrainSnapshot = ReturnType<typeof evaluateCompanion>;
