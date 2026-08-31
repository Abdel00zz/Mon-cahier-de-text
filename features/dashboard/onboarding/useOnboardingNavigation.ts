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
    goToTheme: () => void;
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
        if (step === 1) return true; // Language
        if (step === 2) return true; // Theme
        if (step === 3) return isProfileValid; // Profile
        if (step === 4) return isSubjectValid; // Subjects
        if (step === 5) return isClassesValid; // Classes
        if (step === 6) return true; // Schedule
        return false;
    }, [isClassesValid, isProfileValid, isSubjectValid, step]);

    const goToTheme = useCallback(() => setStep(2), []);

    const next = useCallback(() => {
        if (!canContinue || step >= ONBOARDING_TOTAL_STEPS) return;
        setStep(current => Math.min(ONBOARDING_TOTAL_STEPS, current + 1) as OnboardingStep);
    }, [canContinue, step]);

    const back = useCallback(() => {
        setStep(current => Math.max(1, current - 1) as OnboardingStep);
    }, []);

    return { step, canContinue, goToTheme, next, back };
};
