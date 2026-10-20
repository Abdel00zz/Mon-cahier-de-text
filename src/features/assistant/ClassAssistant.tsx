import { useMemo } from 'react';
import type { AppConfig, AppLocale, ClassInfo, LessonsData } from '@/types';
import { guidanceAction, guidanceKey, resolveClassGuidance } from '@/domain/assistant/classGuidance';
import { AssistantPopover } from './AssistantPopover';
import { resolvePedagogicalBehavior } from '@/domain/assistant/companionPedagogicalBehavior';
import { classGuidanceMessage } from './companionCopy';
import { useCompanionRevision } from './useCompanionRevision';
import { useSyncProgress } from '@/hooks/useSyncProgress';

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

  return (
    <AssistantPopover
      locale={locale}
      message={classGuidanceMessage(guidance, locale)}
      mood={behavior.mood}
      robotAction={behavior.robotAction}
      problemCount={behavior.problemCount}
      antennaFlash={behavior.antennaFlash}
      headRoundness={behavior.headRoundness}
      autoSleepMs={behavior.autoSleepMs}
      attentionKey={['ready', 'checking', 'active-session'].includes(guidance.step) ? undefined : guidanceKey(guidance)}
      onAction={
        guidance.step === 'schedule' && !onOpenSchedule
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
  );
}
