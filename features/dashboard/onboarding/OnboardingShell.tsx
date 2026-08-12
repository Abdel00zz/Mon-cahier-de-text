import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BookOpen } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { ModalLang, OnboardingCopy, OnboardingStep } from './types';
import { ONBOARDING_TOTAL_STEPS } from './types';

interface OnboardingShellProps {
    lang: ModalLang;
    step: OnboardingStep;
    title: string;
    subtitle?: string;
    canContinue: boolean;
    finishing: boolean;
    canComplete: boolean;
    copy: OnboardingCopy;
    onBack: () => void;
    onNext: () => void;
    onComplete: () => void;
    onSkip: () => void;
    children: ReactNode;
}

/** Cadre visuel, progression et navigation partagés par toutes les étapes. */
export const OnboardingShell: React.FC<OnboardingShellProps> = ({
    lang,
    step,
    title,
    subtitle,
    canContinue,
    finishing,
    canComplete,
    copy,
    onBack,
    onNext,
    onComplete,
    onSkip,
    children,
}) => {
    const isLastStep = step === ONBOARDING_TOTAL_STEPS;
    const isRtl = lang === 'ar';

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#eef2ff] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -left-48 -top-40 h-[34rem] w-[34rem] rounded-full border-[52px] border-indigo-100/80 blur-[2px]" />
                <div className="absolute -bottom-56 -right-40 h-[36rem] w-[36rem] rounded-full border-[44px] border-indigo-100/70 blur-[3px]" />
            </div>

            <header className="relative z-10 flex items-center px-4 py-4 sm:px-8 sm:py-6">
                <div className="flex items-center gap-2 text-slate-900">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8" />
                    <span className="text-lg font-bold tracking-tight sm:text-xl">{copy.brand}</span>
                </div>
            </header>

            <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-4 sm:px-8 sm:pb-10">
                <main className={cn(
                    'relative m-auto flex w-full shrink-0 flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/95 shadow-[0_24px_64px_rgba(30,41,59,0.14)] backdrop-blur-sm',
                    isLastStep ? 'max-w-[1180px]' : 'max-w-[760px]',
                )}>
                    <div className={cn('flex-1 px-5 pb-6 pt-7 sm:pb-8 sm:pt-9', isLastStep ? 'sm:px-8' : 'sm:px-10')}>
                        <div
                            role="progressbar"
                            aria-label={copy.step(step, ONBOARDING_TOTAL_STEPS)}
                            aria-valuemin={1}
                            aria-valuemax={ONBOARDING_TOTAL_STEPS}
                            aria-valuenow={step}
                            className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:h-2"
                        >
                            <div
                                className="h-full rounded-full bg-[#423ed8] shadow-none transition-[width] duration-500 ease-out"
                                style={{ width: `${(step / ONBOARDING_TOTAL_STEPS) * 100}%` }}
                            />
                        </div>

                        <div className="mb-7 animate-fade-in text-start">
                            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
                            {subtitle && <p className="text-base font-medium leading-relaxed text-slate-500 sm:text-lg">{subtitle}</p>}
                        </div>

                        {children}
                    </div>

                    <footer className="bg-slate-50/80 p-4 sm:px-10 sm:py-5">
                        <div className={cn('flex w-full flex-wrap items-center gap-3', step === 1 ? 'justify-end' : 'justify-between')}>
                            {step > 1 && (
                                <Button type="button" variant="outline" onClick={onBack} className="inline-flex h-11 min-w-[7rem] items-center gap-2 rounded-lg border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white sm:px-6 sm:text-base">
                                    <ChevronLeft className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                    {copy.back}
                                </Button>
                            )}

                            <div className="flex items-center gap-2">
                                {isLastStep && (
                                    <Button type="button" variant="outline" onClick={onSkip} className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white sm:px-5 sm:text-base">
                                        {copy.later}
                                    </Button>
                                )}

                                {!isLastStep ? (
                                    <Button type="button" disabled={!canContinue} onClick={onNext} className="inline-flex h-11 min-w-[7rem] items-center gap-2 rounded-lg bg-[#5064df] px-5 text-sm font-bold text-white shadow-[0_6px_14px_rgba(80,100,223,0.22)] transition-all hover:bg-[#4357c9] disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-100 sm:px-7 sm:text-base">
                                        {copy.next}
                                        <ChevronRight className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                    </Button>
                                ) : (
                                    <Button type="button" disabled={!canComplete || finishing} onClick={onComplete} className="inline-flex h-11 min-w-[7rem] items-center gap-2 rounded-lg bg-[#5064df] px-5 text-sm font-bold text-white shadow-[0_6px_14px_rgba(80,100,223,0.22)] transition-all hover:bg-[#4357c9] disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-100 sm:px-7 sm:text-base">
                                        {finishing ? copy.finishing : copy.start}
                                        <ChevronRight className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
};
