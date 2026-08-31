import type { AppConfig, ClassInfo } from '@/types';
import { normalizeTeacherCycles } from '@/utils/teacherCycles';
import type { OnboardingStep } from './types';

/** Resume at the first useful action; appearance and language never block entry. */
export function initialOnboardingStep(
  config: Partial<AppConfig>,
  classes: ClassInfo[],
): OnboardingStep {
  if (normalizeTeacherCycles(config.selectedCycles).length === 0) return 1;
  if (!config.selectedSubjects?.some((subject) => subject.trim())) return 2;
  return classes.length > 0 ? 4 : 3;
}

export function canAdvanceOnboarding(
  step: OnboardingStep,
  profile: boolean,
  subjects: boolean,
): boolean {
  if (step === 1) return profile;
  if (step === 2) return subjects;
  return true;
}
