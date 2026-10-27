import { useTeacherMessaging } from '@/contexts/TeacherMessagingContext';
import { conversationCopy } from '@/features/messages/conversationCopy';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { AppLocale, ClassEvaluationEntry, ClassInfo, LessonsData } from '@/types';
import type { GuidanceConfig } from '@/domain/assistant/classGuidance';
import { AssistantPopover } from './AssistantPopover';
import { PwaInstallModal } from './PwaInstallModal';
import { useCompanionRevision } from './useCompanionRevision';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useSync } from '@/contexts/SyncContext';
import { isNetworkOnline } from '@/platform/networkStatus';
import {
  getPwaInstallSnapshot,
  markPwaInstalled,
  setPwaGuideOpen,
  subscribePwaInstall,
  triggerPwaInstall,
} from '@/platform/pwaInstall';
import { WhatsAppContact } from '@/features/messages/WhatsAppContact';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import { hasSupportWhatsApp } from '@/constants/support';
import { readNotebookActivity } from '@/infrastructure/storage/companionActivity';
import { useCompanionGuide } from './useCompanionGuide';
import { getBundledCalendar, loadHolidayCalendar } from '@/domain/calendar/calendar';
import { createCompanionEvaluation } from '@/domain/assistant/companionBrain';
import { companionLabels } from './companionCopy';
import { companionMessage } from './companionPresentation';

const TeacherConversation = lazy(() => import('@/features/messages/TeacherConversation').then(module => ({ default: module.TeacherConversation })));

interface ClassAssistantProps {
  locale: AppLocale;
  classes: readonly ClassInfo[];
  config: GuidanceConfig;
  preferredClassId?: string;
  visibleClassIds?: readonly string[];
  activeSessionClassIds?: readonly string[];
  readLessons?: (classId: string) => LessonsData;
  onCreateClass: () => void;
  onOpenSchedule?: () => void;
  onOpenClass: (classInfo: ClassInfo) => void;
  onOpenEvaluations?: (classInfo: ClassInfo, entry?: ClassEvaluationEntry) => void;
  onConfigureClass?: (classInfo: ClassInfo) => void;
}

/** Le compagnon branché au cerveau pédagogique central : adapte son comportement à l'état global. */
export function ClassAssistant({
  locale,
  classes,
  config,
  preferredClassId,
  visibleClassIds,
  activeSessionClassIds,
  readLessons,
  onCreateClass,
  onOpenSchedule,
  onOpenClass,
  onOpenEvaluations,
  onConfigureClass,
}: ClassAssistantProps) {
  const messaging = useTeacherMessaging();
  const { guide, openGuide, closeGuide } = useCompanionGuide(messaging?.owner);
  const copy = conversationCopy(locale);
  const labels = companionLabels(locale);
  const pwaState = useSyncExternalStore(subscribePwaInstall, getPwaInstallSnapshot, getPwaInstallSnapshot);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactStarted, setContactStarted] = useState(false);
  const [contactedClasses, setContactedClasses] = useState<ReadonlySet<string>>(() => new Set());
  const [ignoredClasses, setIgnoredClasses] = useState<ReadonlySet<string>>(() => new Set());
  const [skippedTasks, setSkippedTasks] = useState<ReadonlySet<string>>(() => new Set());
  const [skippedMessageKeys, setSkippedMessageKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const today = useMoroccoToday();
  const [calendar, setCalendar] = useState(getBundledCalendar);
  const [contact, setContact] = useState<{ owner?: string; target?: Pick<ClassInfo, 'id' | 'name'>; context?: string; initialReplyTo?: string }>({});
  const revision = useCompanionRevision();
  useEffect(() => { setSelectedTaskId(undefined); }, [revision, classes, config, today, calendar]);
  const progress = useSyncProgress();
  const { syncStatus, syncNow } = useSync();
  const [recovering, setRecovering] = useState(false);
  const recovery = useRef<object | null>(null);
  useEffect(() => {
    recovery.current = null; setRecovering(false);
    setContactOpen(false); setContactStarted(false); setContact({});
    setContactedClasses(new Set());
    setIgnoredClasses(new Set());
    setSkippedTasks(new Set());
    setSkippedMessageKeys(new Set());
    setSelectedTaskId(undefined);
    return () => { recovery.current = null; };
  }, [messaging?.owner]);
  useEffect(() => {
    let current = true;
    // Same shared request/cache as session notifications; no new Firebase subscription.
    void loadHolidayCalendar().then(value => { if (current) setCalendar(value); });
    return () => { current = false; };
  }, [today, revision]);
  const online = isNetworkOnline();
  const evaluate = useMemo(() => createCompanionEvaluation({
    classes, config, calendar, today, now: Date.now(), preferredClassId, visibleClassIds, activeSessionClassIds,
    readLessons, readActivity: readNotebookActivity, offersEnabled: hasSupportWhatsApp(),
    messageHistory: messaging?.history, contactedClassIds: contactedClasses, ignoredClassIds: ignoredClasses,
    pwaInstallRequired: pwaState.shouldAskInstall,
    skippedTaskIds: skippedTasks,
    skippedMessageKeys,
    services: { authenticated: Boolean(messaging?.enabled), online, syncStatus, transfer: progress.state,
      inboxLoaded: messaging?.loaded ?? false, inboxFailed: messaging?.failed ?? false, messages: messaging?.messages ?? [] },
  }), [classes, config, calendar, today, preferredClassId, visibleClassIds, activeSessionClassIds,
    readLessons, messaging?.owner, messaging?.enabled, messaging?.history, messaging?.loaded, messaging?.failed,
    messaging?.messages, contactedClasses, ignoredClasses, pwaState.shouldAskInstall, skippedTasks, skippedMessageKeys,
    online, syncStatus, progress.state, revision]);
  const brain = useMemo(() => evaluate(selectedTaskId), [evaluate, selectedTaskId]);
  const { decision, behavior, contentSuggestion } = brain;
  const reply = decision.kind === 'reply' ? decision.reply : undefined;
  const service = decision.kind !== 'guidance' && decision.kind !== 'offer' && decision.kind !== 'reply' && decision.kind !== 'calendar' && decision.kind !== 'install-app' ? decision.kind : undefined;
  const serviceError = service === 'sync-error' || service === 'inbox-error';
  const message = companionMessage(brain, locale, today, recovering);
  const retry = async () => {
    if (recovery.current || !isNetworkOnline()) return;
    const attempt = {};
    recovery.current = attempt; setRecovering(true);
    try {
      if (brain.action.type === 'retry-sync') await syncNow();
      else if (brain.action.type === 'retry-inbox') await messaging?.refresh();
    } catch {
      // The shared sync/inbox store retains its error; no optimistic success message.
    } finally {
      if (recovery.current === attempt) { recovery.current = null; setRecovering(false); }
    }
  };
  const openContact = () => {
    if (contentSuggestion) {
      setContactedClasses(current => new Set([...current, contentSuggestion.target.id]));
    }
    setContact({ owner: messaging?.owner, target: service ? undefined : brain.target, initialReplyTo: reply?.id,
      context: !reply ? message.detail : undefined });
    setContactStarted(true);
    setContactOpen(true);
  };
  const handleSkipCurrentMessage = () => {
    if (!brain.canSkip) return;
    if (decision.kind === 'offer' && contentSuggestion) {
      setIgnoredClasses(current => new Set([...current, contentSuggestion.target.id]));
    } else if (brain.selectedTask) {
      const nextId = brain.nextTaskId;
      setSkippedTasks(current => new Set([...current, brain.selectedTask!.id]));
      setSelectedTaskId(nextId);
    } else if (brain.skipKey) {
      setSkippedMessageKeys(current => new Set([...current, brain.skipKey!]));
    }
  };
  const isContentOffer = decision.kind === 'offer' && Boolean(contentSuggestion);
  const hasMoreTasksAfterSkip = decision.kind === 'guidance' && Boolean(brain.selectedTask) && brain.tasks.length > 1;
  const runAction = () => {
    const action = brain.action;
    if (action.type === 'install-app') { void triggerPwaInstall(); }
    else if (action.type === 'retry-sync' || action.type === 'retry-inbox') { void retry(); }
    else if (action.type === 'read-reply') openContact();
    else if (action.type === 'create-class') onCreateClass();
    else if (action.type === 'schedule') onOpenSchedule?.();
    else if (action.type === 'open-class') {
      const target = classes.find(item => item.id === action.classId);
      if (target) onOpenClass(target);
    } else if (action.type === 'open-evaluations') {
      const target = classes.find(item => item.id === action.classId);
      if (target) {
        if (onOpenEvaluations) onOpenEvaluations(target, action.entry);
        else onOpenClass(target);
      }
    } else if (action.type === 'configure-roster') {
      const target = classes.find(item => item.id === action.classId);
      if (target) {
        if (onConfigureClass) onConfigureClass(target);
        else onOpenClass(target);
      }
    }
  };
  return (
    <>
    <AssistantPopover
      locale={locale}
      message={message}
      tips={brain.showTips ? { day: today, initiallyOpen: true } : undefined}
      helpReference={brain.helpReference}
      onOpenGuide={openGuide}
      contactLabel={brain.canContactTeam ? copy.contact : undefined}
      primaryAction={isContentOffer && contentSuggestion ? <WhatsAppContact locale={locale} target={contentSuggestion.target}
        intent={contentSuggestion.evidence.empty ? 'create' : contentSuggestion.origin === 'predefined' ? 'adapt' : 'enrich'}
        label={locale === 'ar' ? 'طلب دروس مكيفة أو محتوى مخصص' : locale === 'en' ? 'Request adapted or custom lessons' : 'Demander un cours adapté ou sur mesure'}
        onOpened={() => setContactedClasses(current => new Set([...current, contentSuggestion.target.id]))} /> : undefined}
      dismissLabel={brain.canSkip ? labels.skip : undefined}
      onDismiss={brain.canSkip ? handleSkipCurrentMessage : undefined}
      keepOpenOnDismiss={hasMoreTasksAfterSkip}
      nextTaskLabel={brain.nextTaskId ? `${locale === 'ar' ? 'النقطة التالية' : locale === 'en' ? 'Next point' : 'Point suivant'} · ${new Intl.NumberFormat(locale).format(brain.taskPosition)}/${new Intl.NumberFormat(locale).format(brain.tasks.length)}` : undefined}
      onNextTask={brain.nextTaskId ? () => setSelectedTaskId(brain.nextTaskId) : undefined}
      onContact={openContact}
      mood={behavior.mood}
      robotAction={behavior.robotAction}
      problemCount={behavior.problemCount}
      antennaFlash={behavior.antennaFlash}
      headRoundness={behavior.headRoundness}
      autoSleepMs={behavior.autoSleepMs}
      attentionKey={brain.attentionKey}
      actionBusy={recovering || (decision.kind === 'install-app' && pwaState.installing)}
      keepOpenOnAction={serviceError}
      onAction={brain.action.type === 'none' || brain.action.type === 'request-content'
        || (brain.action.type === 'schedule' && !onOpenSchedule) ? undefined : runAction}
    />
    <PwaInstallModal
      open={pwaState.guideOpen}
      locale={locale}
      platform={pwaState.platform}
      onClose={() => setPwaGuideOpen(false)}
      onConfirmInstalled={markPwaInstalled}
    />
    {guide && <guide.Component isOpen onClose={closeGuide} initialReference={guide.reference} />}
    {contactStarted && contact.owner === messaging?.owner && <Suspense fallback={<p role="status">{copy.loading}</p>}>
      <TeacherConversation key={`${messaging?.owner ?? 'guest'}:${contact.target?.id ?? ''}:${contact.initialReplyTo ?? ''}`} open={contactOpen} onClose={() => setContactOpen(false)} locale={locale} {...contact} />
    </Suspense>}
    </>
  );
}
