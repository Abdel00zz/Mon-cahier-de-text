import { useCallback, useMemo, useState } from 'react';
import { ONBOARDING_TOTAL_STEPS, type OnboardingStep } from './types';
import { canAdvanceOnboarding } from './navigation';

interface UseOnboardingNavigationOptions {
    isProfileValid: boolean;
    isSubjectValid: boolean;
    initialStep: OnboardingStep;
}

export interface OnboardingNavigation {
    step: OnboardingStep;
    canContinue: boolean;
    next: () => void;
    back: () => void;
}

/** La navigation ne connaît pas la persistance : elle ne gère que les étapes. */
export const useOnboardingNavigation = ({
    isProfileValid,
    isSubjectValid,
    initialStep,
}: UseOnboardingNavigationOptions): OnboardingNavigation => {
    const [step, setStep] = useState<OnboardingStep>(initialStep);

    const canContinue = useMemo(() => {
        return canAdvanceOnboarding(step, isProfileValid, isSubjectValid);
    }, [isProfileValid, isSubjectValid, step]);

    const next = useCallback(() => {
        if (!canContinue || step >= ONBOARDING_TOTAL_STEPS) return;
        // Two clicks before React commits must not skip an unvalidated step.
        setStep(Math.min(ONBOARDING_TOTAL_STEPS, step + 1) as OnboardingStep);
    }, [canContinue, step]);

    const back = useCallback(() => {
        setStep(current => Math.max(1, current - 1) as OnboardingStep);
    }, []);

    return { step, canContinue, next, back };
};
