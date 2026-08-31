import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatLocalizedClassDisplayName } from '@/constants';
import type { ClassInfo, Cycle } from '@/types';
import { normalizeTeacherCycles } from '@/utils/teacherCycles';
import { OnboardingShell } from './onboarding/OnboardingShell';
import { copyFor, subjectOptionsFor } from './onboarding/content';
import { initialOnboardingStep } from './onboarding/navigation';
import { useOnboardingNavigation } from './onboarding/useOnboardingNavigation';
import { ClassesStep } from './onboarding/steps/ClassesStep';
import { ProfileStep } from './onboarding/steps/ProfileStep';
import { SubjectsStep } from './onboarding/steps/SubjectsStep';
import { CreateClassModal } from './modals/CreateClassModal';
import type { ModalLang, OnboardingPageProps } from './onboarding/types';

const ScheduleStep = lazy(() =>
  import('./onboarding/steps/ScheduleStep').then((module) => ({
    default: module.ScheduleStep,
  })),
);
const EMPTY_SUBJECTS: string[] = [];

export const OnboardingPage = ({
  config,
  onConfigChange,
  classes,
  onCreateClass,
  onDeleteClass,
  onComplete,
  onSkip,
}: OnboardingPageProps) => {
  const lang: ModalLang = config.applicationLocale === 'ar' ? 'ar' : 'fr';
  const copy = useMemo(() => copyFor(lang), [lang]);
  const selectedCycles = useMemo(
    () => normalizeTeacherCycles(config.selectedCycles),
    [config.selectedCycles],
  );
  const selectedSubjects = config.selectedSubjects ?? EMPTY_SUBJECTS;
  const subjectOptions = useMemo(
    () => subjectOptionsFor(config.selectedSubjects),
    [config.selectedSubjects],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const [initialStep] = useState(() => initialOnboardingStep(config, classes));
  const navigation = useOnboardingNavigation({
    initialStep,
    isProfileValid: selectedCycles.length > 0,
    isSubjectValid: selectedSubjects.some(subject => subject.trim()),
  });
  const { step } = navigation;

  const handleCyclesChange = useCallback(
    (cycles: Cycle[]) =>
      onConfigChange({ selectedCycles: cycles, showAllCycles: false }),
    [onConfigChange],
  );
  const handleSubjectToggle = useCallback(
    (subject: string) =>
      onConfigChange({
        selectedSubjects: selectedSubjects.includes(subject)
          ? selectedSubjects.filter((s) => s !== subject)
          : [...selectedSubjects, subject],
        showAllSubjects: false,
      }),
    [onConfigChange, selectedSubjects],
  );
  const handleRemove = useCallback(
    (classInfo: ClassInfo) => {
      onDeleteClass(classInfo.id);
      toast.success(
        copy.classRemoved(
          formatLocalizedClassDisplayName(classInfo.name, lang),
        ),
      );
    },
    [onDeleteClass, copy, lang],
  );
  const finish = async (action: () => Promise<void> | void) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    try {
      await action();
      toast.success(copy.configurationCompleted);
    } catch {
      toast.error(copy.configurationError);
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  };
  const titles = [
    copy.sectionProfile,
    copy.sectionSubjects,
    copy.sectionClasses,
    copy.sectionSchedule,
  ];
  const firstClassAction = step === 3 && classes.length === 0;
  const next = () => {
    if (firstClassAction) setCreateOpen(true);
    else if (step === 4) void finish(onComplete);
    else navigation.next();
  };

  return (
    <>
      <OnboardingShell
        lang={lang}
        step={step}
        title={titles[step - 1]}
        copy={copy}
        theme={config.theme ?? 'light'}
        onThemeChange={(theme) => onConfigChange({ theme })}
        onLanguageChange={(applicationLocale) =>
          onConfigChange({ applicationLocale })
        }
        canContinue={navigation.canContinue}
        finishing={finishing}
        primaryLabel={
          firstClassAction ? copy.addClass : step === 4 ? copy.start : copy.next
        }
        onBack={navigation.back}
        onNext={next}
        onSkip={() => void finish(onSkip)}
      >
        {step === 1 && (
          <ProfileStep
            teacherName={config.defaultTeacherName ?? ''}
            establishmentName={config.establishmentName ?? ''}
            cycles={selectedCycles}
            copy={copy}
            onTeacherNameChange={(defaultTeacherName) =>
              onConfigChange({ defaultTeacherName })
            }
            onEstablishmentChange={(establishmentName) =>
              onConfigChange({ establishmentName })
            }
            onCyclesChange={handleCyclesChange}
          />
        )}
        {step === 2 && (
          <SubjectsStep
            subjects={subjectOptions}
            selectedSubjects={selectedSubjects}
            teacherName={config.defaultTeacherName ?? ''}
            lang={lang}
            copy={copy}
            onToggle={handleSubjectToggle}
          />
        )}
        {step === 3 && (
          <ClassesStep
            classes={classes}
            lang={lang}
            copy={copy}
            onAdd={() => setCreateOpen(true)}
            onRemove={handleRemove}
          />
        )}
        {step === 4 && (
          <Suspense
            fallback={
              <div
                role="status"
                aria-label={copy.sectionSchedule}
                className="keep-surface min-h-64 p-4"
              >
                <div className="mb-4 h-6 w-1/3 rounded-lg skeleton-shimmer" />
                <div className="h-44 rounded-lg skeleton-shimmer" />
              </div>
            }
          >
            <ScheduleStep
              classes={classes}
              config={config}
              onConfigChange={onConfigChange}
            />
          </Suspense>
        )}
      </OnboardingShell>
      <CreateClassModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCycle={selectedCycles[0] ?? 'college'}
        teacherCycles={selectedCycles}
        teacherSubjects={selectedSubjects}
        existingClasses={classes}
        onCreate={(details) => {
          onCreateClass(details);
          toast.success(copy.classAdded);
        }}
      />
    </>
  );
};
