import { useTeacherMessaging } from '@/contexts/TeacherMessagingContext';
import { conversationCopy } from '@/features/messages/conversationCopy';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, AppLocale, ClassInfo, LessonsData } from '@/types';
import { guidanceAction, guidanceKey, resolveClassGuidance } from '@/domain/assistant/classGuidance';
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

const TeacherConversation = lazy(() => import('@/features/messages/TeacherConversation').then(module => ({ default: module.TeacherConversation })));


interface ClassAssistantProps {
  locale: AppLocale;
  classes: readonly ClassInfo[];
  config: Pick<AppConfig, 'timetable' | 'schedules'>;
  preferredClassId?: string;
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
  activeSessionClassIds,
  readLessons,
  onCreateClass,
  onOpenSchedule,
  onOpenClass,
}: ClassAssistantProps) {
  const messaging = useTeacherMessaging();
  const copy = conversationCopy(locale);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactStarted, setContactStarted] = useState(false);
  const [contact, setContact] = useState<{ owner?: string; target?: Pick<ClassInfo, 'id' | 'name'>; context?: string; initialReplyTo?: string }>({});
  const revision = useCompanionRevision();
  const progress = useSyncProgress();
  const { syncStatus, syncNow } = useSync();
  const [recovering, setRecovering] = useState(false);
  const recovery = useRef<object | null>(null);
  useEffect(() => {
    recovery.current = null; setRecovering(false);
    setContactOpen(false); setContactStarted(false); setContact({});
    return () => { recovery.current = null; };
  }, [messaging?.owner]);
  const notebooksLoading = progress.state === 'pulling' || progress.state === 'notebooks';
  const brainContext = useMemo(
    () => ({ activeSessionClassIds, readLessons, notebooksLoading }),
    [activeSessionClassIds, readLessons, notebooksLoading]
  );

  const guidance = useMemo(
    () => resolveClassGuidance(classes, config, preferredClassId, brainContext),
    [classes, config.timetable, config.schedules, preferredClassId, brainContext, revision]
  );

  const behavior = useMemo(() => resolvePedagogicalBehavior(guidance), [guidance]);

  const decision = decideCompanion({
    guidance, authenticated: Boolean(messaging?.enabled), online: isNetworkOnline(), syncStatus,
    transfer: progress.state, inboxLoaded: messaging?.loaded ?? false, inboxFailed: messaging?.failed ?? false,
    messages: messaging?.messages ?? [], hasNotebookReader: typeof readLessons === 'function',
  });
  const reply = decision.kind === 'reply' ? decision.reply : undefined;
  const ready = decision.kind === 'offer';
  const service = decision.kind !== 'guidance' && decision.kind !== 'offer' && decision.kind !== 'reply' ? decision.kind : undefined;
  const serviceError = service === 'sync-error' || service === 'inbox-error';
  const ordinaryMessage = classGuidanceMessage(guidance, locale);
  const message = service ? companionServiceMessage(service, locale, recovering)
    : reply ? { id: reply.id, title: copy.reply, detail: reply.body.length > 150 ? `${reply.body.slice(0, 147)}…` : reply.body, subject: reply.className, action: copy.read }
    : ready ? { ...ordinaryMessage, title: copy.ready, detail: copy.offer, detailEmphasis: locale === 'ar' ? 'واتساب' : 'WhatsApp', action: copy.whatsapp } : ordinaryMessage;
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
      : service ? undefined : 'classId' in guidance ? classes.find(item => item.id === guidance.classId) : undefined;
    setContact({ owner: messaging?.owner, target, initialReplyTo: reply?.id, context: !ready && !reply ? message.detail : undefined });
    setContactStarted(true);
    setContactOpen(true);
  };
  return (
    <>
    <AssistantPopover
      locale={locale}
      message={message}
      contactLabel={!reply ? copy.contact : undefined}
      primaryAction={ready && guidance.step === 'ready' ? <WhatsAppContact locale={locale} target={classes.find(item => item.id === guidance.classId)} /> : undefined}
      onContact={openContact}
      mood={behavior.mood}
      robotAction={service ? serviceError ? 'failure' : 'waiting' : reply ? 'inspect' : behavior.robotAction}
      problemCount={(service ? Number(serviceError) : behavior.problemCount) + (messaging?.messages.filter(item => item.replyTo).length ?? 0)}
      antennaFlash={service ? serviceError : !reply && behavior.antennaFlash}
      headRoundness={service ? serviceError ? 55 : 90 : behavior.headRoundness}
      autoSleepMs={service ? serviceError ? 0 : 30000 : behavior.autoSleepMs}
      attentionKey={service ? serviceError ? service : undefined : reply?.id ?? (['ready', 'checking', 'active-session'].includes(guidance.step) ? undefined : guidanceKey(guidance))}
      actionBusy={recovering}
      keepOpenOnAction={serviceError}
      onAction={
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
      }
    />
    {contactStarted && contact.owner === messaging?.owner && <Suspense fallback={<p role="status">{copy.loading}</p>}>
      <TeacherConversation key={`${messaging?.owner ?? 'guest'}:${contact.target?.id ?? ''}:${contact.initialReplyTo ?? ''}`} open={contactOpen} onClose={() => setContactOpen(false)} locale={locale} {...contact} />
    </Suspense>}
    </>
  );
}
