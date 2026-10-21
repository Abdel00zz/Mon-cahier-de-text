import { useTeacherMessaging } from '@/contexts/TeacherMessagingContext';
import { conversationCopy } from '@/features/messages/conversationCopy';
import { lazy, Suspense, useMemo, useState } from 'react';
import type { AppConfig, AppLocale, ClassInfo, LessonsData } from '@/types';
import { guidanceAction, guidanceKey, resolveClassGuidance } from '@/domain/assistant/classGuidance';
import { AssistantPopover } from './AssistantPopover';
import { resolvePedagogicalBehavior } from '@/domain/assistant/companionPedagogicalBehavior';
import { classGuidanceMessage } from './companionCopy';
import { useCompanionRevision } from './useCompanionRevision';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { pendingTeacherRequests } from '@/domain/messages/conversation';

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
  const [contact, setContact] = useState<{ target?: Pick<ClassInfo, 'id' | 'name'>; kind: 'help' | 'custom-content'; context?: string }>({ kind: 'help' });
  const revision = useCompanionRevision();
  const progress = useSyncProgress();
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

  const reply = messaging?.messages.find(message => message.replyTo);
  const ready = guidance.step === 'ready';
  const pending = pendingTeacherRequests(messaging?.history ?? []).find(item => item.requestKind === 'custom-content');
  const ordinaryMessage = classGuidanceMessage(guidance, locale);
  const message = reply ? { id: reply.id, title: copy.reply, detail: reply.body.length > 150 ? `${reply.body.slice(0, 147)}…` : reply.body, subject: reply.className, action: copy.read }
    : ready && pending ? { id: pending.id, title: copy.pending, detail: copy.sent, subject: pending.className, action: copy.history }
    : ready ? { ...ordinaryMessage, title: copy.ready, detail: copy.offer, action: copy.custom } : ordinaryMessage;
  const openContact = () => {
    const target = reply?.classId ? classes.find(item => item.id === reply.classId)
      : ready && pending?.classId ? classes.find(item => item.id === pending.classId)
      : 'classId' in guidance ? classes.find(item => item.id === guidance.classId) : undefined;
    setContact({ target, kind: ready && !reply ? 'custom-content' : 'help', context: !ready && !reply ? ordinaryMessage.detail : undefined });
    setContactStarted(true);
    setContactOpen(true);
  };
  return (
    <>
    <AssistantPopover
      locale={locale}
      message={message}
      greeting={copy.greeting}
      teacherName={messaging?.teacherName?.trim().slice(0, 80)}
      contactLabel={!ready && !reply ? copy.contact : undefined}
      onContact={openContact}
      mood={behavior.mood}
      robotAction={reply ? 'inspect' : behavior.robotAction}
      problemCount={behavior.problemCount + (messaging?.messages.filter(item => item.replyTo).length ?? 0)}
      antennaFlash={behavior.antennaFlash}
      headRoundness={behavior.headRoundness}
      autoSleepMs={behavior.autoSleepMs}
      attentionKey={reply?.id ?? (['ready', 'checking', 'active-session'].includes(guidance.step) ? undefined : guidanceKey(guidance))}
      onAction={
        reply || ready ? openContact : guidance.step === 'schedule' && !onOpenSchedule
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
    {contactStarted && <Suspense fallback={<p role="status">{copy.loading}</p>}>
      <TeacherConversation key={`${messaging?.owner ?? 'guest'}:${contact.target?.id ?? ''}:${contact.kind}`} open={contactOpen} onClose={() => setContactOpen(false)} locale={locale} {...contact} />
    </Suspense>}
    </>
  );
}
