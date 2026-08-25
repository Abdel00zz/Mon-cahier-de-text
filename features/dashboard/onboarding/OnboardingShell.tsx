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
    showIgnore?: boolean;
    onIgnore?: () => void;
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
    showIgnore = false,
    onIgnore,
    children,
}) => {
    const isLastStep = step === ONBOARDING_TOTAL_STEPS;
    const isRtl = lang === 'ar';

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#f5f7fa] font-sans text-slate-900 selection:bg-blue-600 selection:text-white dark:bg-slate-950 dark:text-slate-100">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_68%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_68%)]" />
                <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)] dark:opacity-15" />
            </div>

            <header className="relative z-10 flex items-center px-4 py-4 sm:px-8 sm:py-6">
                <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.22)]">
                        <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-white">{copy.brand}</span>
                </div>
            </header>

            <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-8 sm:pb-10">
                <main className={cn(
                    'relative m-auto flex w-full shrink-0 flex-col overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_24px_70px_rgba(0,0,0,0.28)]',
                    isLastStep ? 'max-w-[1180px]' : 'max-w-[780px]',
                )}>
                    <div className={cn('flex-1 px-5 pb-6 pt-7 sm:pb-8 sm:pt-9', isLastStep ? 'sm:px-8' : 'sm:px-10')}>
                        <div
                            role="progressbar"
                            aria-label={copy.step(step, ONBOARDING_TOTAL_STEPS)}
                            aria-valuemin={1}
                            aria-valuemax={ONBOARDING_TOTAL_STEPS}
                            aria-valuenow={step}
                            className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                        >
                            <div
                                className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
                                style={{ width: `${(step / ONBOARDING_TOTAL_STEPS) * 100}%` }}
                            />
                        </div>

                        <div className="mb-7 animate-fade-in text-start">
                            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{title}</h1>
                            {subtitle && <p className="text-base font-medium leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400">{subtitle}</p>}
                        </div>

                        {children}
                    </div>

                    <footer className="border-t border-slate-100 bg-slate-50/70 p-4 sm:px-10 sm:py-5 dark:border-white/10 dark:bg-slate-950/35">
                        <div className={cn('flex w-full flex-wrap items-center gap-3', step === 1 ? 'justify-end' : 'justify-between')}>
                            {step > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onBack}
                                    className="inline-flex h-11 min-w-[7rem] cursor-pointer items-center gap-2 rounded-xl border-slate-200/90 bg-white/90 px-4 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-white hover:text-indigo-950 sm:px-6 sm:text-base"
                                >
                                    <ChevronLeft className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                    {copy.back}
                                </Button>
                            )}

                            <div className="flex items-center gap-2.5">
                                {showIgnore && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onIgnore}
                                        className="h-11 cursor-pointer rounded-xl border-slate-200/90 bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-white sm:px-5 sm:text-base"
                                    >
                                        {copy.ignoreClass}
                                    </Button>
                                )}

                                {isLastStep && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onSkip}
                                        className="h-11 cursor-pointer rounded-xl border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 shadow-none hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 sm:px-5 sm:text-base dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                    >
                                        {copy.finishWithoutSchedule}
                                    </Button>
                                )}

                                {!isLastStep ? (
                                    <Button
                                        type="button"
                                        disabled={!canContinue}
                                        onClick={onNext}
                                        className="inline-flex h-11 min-w-[7.5rem] cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(37,99,235,0.22)] transition-all hover:bg-blue-700 hover:shadow-[0_8px_22px_rgba(37,99,235,0.28)] active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 sm:px-7 sm:text-base"
                                    >
                                        {copy.next}
                                        <ChevronRight className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        disabled={!canComplete || finishing}
                                        onClick={onComplete}
                                        className="inline-flex h-11 min-w-[8rem] cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(37,99,235,0.22)] transition-all hover:bg-blue-700 hover:shadow-[0_8px_22px_rgba(37,99,235,0.28)] active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 sm:px-7 sm:text-base"
                                    >
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
