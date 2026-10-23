import { useTeacherMessaging } from '@/contexts/TeacherMessagingContext';
import { conversationCopy } from '@/features/messages/conversationCopy';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { AppLocale, ClassInfo, LessonsData } from '@/types';
import { guidanceAction, guidanceKey, resolveClassGuidance, type GuidanceConfig } from '@/domain/assistant/classGuidance';
import { AssistantPopover } from './AssistantPopover';
import { resolvePedagogicalBehavior } from '@/domain/assistant/companionPedagogicalBehavior';
import { classGuidanceMessage } from './companionCopy';
import { useCompanionRevision } from './useCompanionRevision';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useSync } from '@/contexts/SyncContext';
import { isNetworkOnline } from '@/platform/networkStatus';
import { decideCompanion } from '@/domain/assistant/companionDecision';
import { companionServiceMessage } from './companionServiceCopy';
import { WhatsAppContact } from '@/features/messages/WhatsAppContact';
import { orderCompanionClasses, resolveContentSuggestion } from '@/domain/assistant/contentSuggestion';
import { contentSuggestionMessage } from './contentSuggestionCopy';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import { hasSupportWhatsApp } from '@/constants/support';
import { pendingAdminMessages } from '@/domain/messages/conversation';
import { readNotebookActivity } from '@/infrastructure/storage/companionActivity';
import { companionHelpReference } from '@/domain/assistant/companionHelp';
import { useCompanionGuide } from './useCompanionGuide';
import { getBundledCalendar, loadHolidayCalendar } from '@/domain/calendar/calendar';

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
}: ClassAssistantProps) {
  const messaging = useTeacherMessaging();
  const { guide, openGuide, closeGuide } = useCompanionGuide(messaging?.owner);
  const copy = conversationCopy(locale);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactStarted, setContactStarted] = useState(false);
  const [contactedClasses, setContactedClasses] = useState<ReadonlySet<string>>(() => new Set());
  const [ignoredClasses, setIgnoredClasses] = useState<ReadonlySet<string>>(() => new Set());
  const today = useMoroccoToday();
  const [calendar, setCalendar] = useState(getBundledCalendar);
  const [contact, setContact] = useState<{ owner?: string; target?: Pick<ClassInfo, 'id' | 'name'>; context?: string; initialReplyTo?: string }>({});
  const revision = useCompanionRevision();
  const progress = useSyncProgress();
  const { syncStatus, syncNow } = useSync();
  const [recovering, setRecovering] = useState(false);
  const recovery = useRef<object | null>(null);
  useEffect(() => {
    recovery.current = null; setRecovering(false);
    setContactOpen(false); setContactStarted(false); setContact({});
    setContactedClasses(new Set());
    setIgnoredClasses(new Set());
    return () => { recovery.current = null; };
  }, [messaging?.owner]);
  const notebooksLoading = progress.state === 'pulling' || progress.state === 'notebooks';
  useEffect(() => {
    let current = true;
    // Same shared request/cache as session notifications; no new Firebase subscription.
    void loadHolidayCalendar().then(value => { if (current) setCalendar(value); });
    return () => { current = false; };
  }, [today, revision]);
  const brainContext = useMemo(
    () => ({ activeSessionClassIds, readLessons, notebooksLoading, today, calendar }),
    [activeSessionClassIds, readLessons, notebooksLoading, today, calendar]
  );

  const guidance = useMemo(
    () => resolveClassGuidance(orderCompanionClasses(classes, preferredClassId), config, preferredClassId, brainContext),
    [classes, config.timetable, config.schedules, config.absences, config.schoolYearStart, config.notificationSettings, preferredClassId, brainContext, revision]
  );

  const behavior = useMemo(() => resolvePedagogicalBehavior(guidance), [guidance]);
  const contentSuggestion = useMemo(() => notebooksLoading || !hasSupportWhatsApp() ? undefined : resolveContentSuggestion({
    classes, readLessons, preferredClassId, visibleClassIds, messages: messaging?.history,
    contactedClassIds: contactedClasses, ignoredClassIds: ignoredClasses, now: Date.now(), readActivity: readNotebookActivity,
  }), [classes, readLessons, preferredClassId, visibleClassIds, messaging?.history, contactedClasses, ignoredClasses, notebooksLoading, revision, today]);

  const decision = decideCompanion({
    guidance, authenticated: Boolean(messaging?.enabled), online: isNetworkOnline(), syncStatus,
    transfer: progress.state, inboxLoaded: messaging?.loaded ?? false, inboxFailed: messaging?.failed ?? false,
    messages: messaging?.messages ?? [], hasNotebookReader: typeof readLessons === 'function',
    hasContentSuggestion: Boolean(contentSuggestion),
  });
  const reply = decision.kind === 'reply' ? decision.reply : undefined;
  const ready = decision.kind === 'offer' && Boolean(contentSuggestion);
  const service = decision.kind !== 'guidance' && decision.kind !== 'offer' && decision.kind !== 'reply' ? decision.kind : undefined;
  const serviceError = service === 'sync-error' || service === 'inbox-error';
  const ordinaryMessage = classGuidanceMessage(guidance, locale);
  const message = service ? companionServiceMessage(service, locale, recovering)
    : reply ? { id: reply.id, title: reply.replyTo ? copy.reply : locale === 'ar' ? 'رسالة من الفريق' : locale === 'en' ? 'A message from the team' : 'Un message de l’équipe', detail: reply.body.length > 150 ? `${reply.body.slice(0, 147)}…` : reply.body, subject: reply.className, action: copy.read }
    : ready && contentSuggestion ? contentSuggestionMessage(contentSuggestion, locale, today) : ordinaryMessage;
  const retry = async () => {
    if (recovery.current || !isNetworkOnline()) return;
    const attempt = {};
    recovery.current = attempt; setRecovering(true);
    try {
      if (service === 'sync-error') await syncNow();
      else if (service === 'inbox-error') await messaging?.refresh();
    } catch {
      // The shared sync/inbox store retains its error; no optimistic success message.
    } finally {
      if (recovery.current === attempt) { recovery.current = null; setRecovering(false); }
    }
  };
  const openContact = () => {
    const target = reply?.classId ? classes.find(item => item.id === reply.classId)
      : service ? undefined : ready ? contentSuggestion?.target : 'classId' in guidance ? classes.find(item => item.id === guidance.classId) : undefined;
    setContact({ owner: messaging?.owner, target, initialReplyTo: reply?.id, context: !ready && !reply ? message.detail : undefined });
    setContactStarted(true);
    setContactOpen(true);
  };
  const dismissSuggestion = () => {
    if (contentSuggestion) {
      setIgnoredClasses(current => new Set([...current, contentSuggestion.target.id]));
    }
  };
  const isContentOffer = ready && Boolean(contentSuggestion);
  return (
    <>
    <AssistantPopover
      locale={locale}
      message={message}
      helpReference={!isContentOffer ? companionHelpReference(decision, guidance, contentSuggestion) : undefined}
      onOpenGuide={!isContentOffer ? openGuide : undefined}
      contactLabel={!reply && !isContentOffer ? copy.contact : undefined}
      primaryAction={isContentOffer && contentSuggestion ? <WhatsAppContact locale={locale} target={contentSuggestion.target}
        intent={contentSuggestion.evidence.empty ? 'create' : contentSuggestion.origin === 'predefined' ? 'adapt' : 'enrich'}
        label={locale === 'ar' ? 'طلب دروس مكيفة أو محتوى مخصص' : locale === 'en' ? 'Request adapted or custom lessons' : 'Demander un cours adapté ou sur mesure'}
        onOpened={() => setContactedClasses(current => new Set([...current, contentSuggestion.target.id]))} /> : undefined}
      dismissLabel={isContentOffer ? (locale === 'ar' ? 'ليس الآن، شكراً' : locale === 'en' ? 'Not now, thanks' : 'Pas maintenant, merci') : undefined}
      onDismiss={isContentOffer ? dismissSuggestion : undefined}
      onContact={openContact}
      mood={behavior.mood}
      robotAction={service ? serviceError ? 'failure' : 'waiting' : reply ? 'inspect' : ready ? 'success' : behavior.robotAction}
      problemCount={(service ? Number(serviceError) : ready ? 0 : behavior.problemCount) + pendingAdminMessages(messaging?.messages ?? []).length}
      antennaFlash={service ? serviceError : !reply && !ready && behavior.antennaFlash}
      headRoundness={service ? serviceError ? 55 : 90 : ready ? 100 : behavior.headRoundness}
      autoSleepMs={service ? serviceError ? 0 : 30000 : ready ? 25000 : behavior.autoSleepMs}
      attentionKey={service ? serviceError ? service : undefined : reply?.id ?? (ready || ['ready', 'checking', 'active-session'].includes(guidance.step) ? undefined : guidanceKey(guidance))}
      actionBusy={recovering}
      keepOpenOnAction={serviceError}
      onAction={
        !isContentOffer ? (
          service ? serviceError ? () => { void retry(); } : undefined : reply ? openContact : ready ? undefined : guidance.step === 'schedule' && !onOpenSchedule
            ? undefined
            : () => {
                const action = guidanceAction(guidance);
                if (action.type === 'create-class') onCreateClass();
                else if (action.type === 'schedule') onOpenSchedule?.();
                else {
                  const target = classes.find(item => item.id === action.classId);
                  if (target) onOpenClass(target);
                }
              }
        ) : undefined
      }
    />
    {guide && <guide.Component isOpen onClose={closeGuide} initialReference={guide.reference} />}
    {contactStarted && contact.owner === messaging?.owner && <Suspense fallback={<p role="status">{copy.loading}</p>}>
      <TeacherConversation key={`${messaging?.owner ?? 'guest'}:${contact.target?.id ?? ''}:${contact.initialReplyTo ?? ''}`} open={contactOpen} onClose={() => setContactOpen(false)} locale={locale} {...contact} />
    </Suspense>}
    </>
  );
}
