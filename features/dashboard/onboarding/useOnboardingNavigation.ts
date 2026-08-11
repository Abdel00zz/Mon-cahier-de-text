import { useCallback, useMemo, useState } from 'react';
import { ONBOARDING_TOTAL_STEPS, type OnboardingStep } from './types';

interface UseOnboardingNavigationOptions {
    isProfileValid: boolean;
    isSubjectValid: boolean;
    isClassesValid: boolean;
}

export interface OnboardingNavigation {
    step: OnboardingStep;
    canContinue: boolean;
    goToProfile: () => void;
    next: () => void;
    back: () => void;
}

/** La navigation ne connaît pas la persistance : elle ne gère que les étapes. */
export const useOnboardingNavigation = ({
    isProfileValid,
    isSubjectValid,
    isClassesValid,
}: UseOnboardingNavigationOptions): OnboardingNavigation => {
    const [step, setStep] = useState<OnboardingStep>(1);

    const canContinue = useMemo(() => {
        if (step === 1) return true;
        if (step === 2) return isProfileValid;
        if (step === 3) return isSubjectValid;
        if (step === 4) return isClassesValid;
        return false;
    }, [isClassesValid, isProfileValid, isSubjectValid, step]);

    const goToProfile = useCallback(() => setStep(2), []);
    const next = useCallback(() => {
        if (!canContinue || step >= ONBOARDING_TOTAL_STEPS) return;
        setStep(current => (current + 1) as OnboardingStep);
    }, [canContinue, step]);
    const back = useCallback(() => {
        setStep(current => Math.max(1, current - 1) as OnboardingStep);
    }, []);

    return { step, canContinue, goToProfile, next, back };
};
