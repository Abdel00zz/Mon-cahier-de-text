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
        <div dir={isRtl ? 'rtl' : 'ltr'} className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-slate-950 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
            {/* Colorful ambient background glows & blur blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                {/* Background base radial gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/60 via-slate-950 to-slate-950" />
                {/* Indigo/Violet top-left blob */}
                <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-gradient-to-br from-indigo-500/30 via-violet-600/25 to-purple-600/20 blur-3xl opacity-40" />
                {/* Cyan/Blue center-right blob */}
                <div className="absolute -right-32 top-1/4 h-[34rem] w-[34rem] rounded-full bg-gradient-to-bl from-blue-500/25 via-indigo-500/20 to-teal-500/15 blur-3xl opacity-35" />
                {/* Purple bottom-left blob */}
                <div className="absolute -bottom-40 left-1/3 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-violet-600/30 via-purple-500/20 to-pink-500/15 blur-3xl opacity-35" />
                {/* Subtle grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            <header className="relative z-10 flex items-center px-4 py-4 sm:px-8 sm:py-6">
                <div className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-white shadow-lg backdrop-blur-md">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_0_12px_rgba(99,102,241,0.5)]">
                        <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-bold tracking-tight text-white sm:text-base">{copy.brand}</span>
                </div>
            </header>

            <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-8 sm:pb-10">
                <main className={cn(
                    'relative m-auto flex w-full shrink-0 flex-col overflow-hidden rounded-[26px] border border-white/[0.12] bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.4),0_0_40px_rgba(99,102,241,0.12)] backdrop-blur-2xl ring-1 ring-white/20',
                    isLastStep ? 'max-w-[1180px]' : 'max-w-[780px]',
                )}>
                    <div className={cn('flex-1 px-5 pb-6 pt-7 sm:pb-8 sm:pt-9', isLastStep ? 'sm:px-8' : 'sm:px-10')}>
                        <div
                            role="progressbar"
                            aria-label={copy.step(step, ONBOARDING_TOTAL_STEPS)}
                            aria-valuemin={1}
                            aria-valuemax={ONBOARDING_TOTAL_STEPS}
                            aria-valuenow={step}
                            className="mb-8 h-2 w-full overflow-hidden rounded-full bg-slate-100/90 shadow-inner"
                        >
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-[width] duration-500 ease-out"
                                style={{ width: `${(step / ONBOARDING_TOTAL_STEPS) * 100}%` }}
                            />
                        </div>

                        <div className="mb-7 animate-fade-in text-start">
                            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
                            {subtitle && <p className="text-base font-medium leading-relaxed text-slate-500 sm:text-lg">{subtitle}</p>}
                        </div>

                        {children}
                    </div>

                    <footer className="border-t border-slate-100 bg-slate-50/80 p-4 backdrop-blur-sm sm:px-10 sm:py-5">
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
                                        {copy.understood}
                                    </Button>
                                )}

                                {!isLastStep ? (
                                    <Button
                                        type="button"
                                        disabled={!canContinue}
                                        onClick={onNext}
                                        className="inline-flex h-11 min-w-[7.5rem] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(99,102,241,0.35)] transition-all hover:from-indigo-600 hover:to-violet-700 hover:shadow-[0_8px_25px_rgba(99,102,241,0.45)] active:scale-[0.98] disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 sm:px-7 sm:text-base"
                                    >
                                        {copy.next}
                                        <ChevronRight className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        disabled={!canComplete || finishing}
                                        onClick={onComplete}
                                        className="inline-flex h-11 min-w-[8rem] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(99,102,241,0.35)] transition-all hover:from-indigo-600 hover:to-violet-700 hover:shadow-[0_8px_25px_rgba(99,102,241,0.45)] active:scale-[0.98] disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 sm:px-7 sm:text-base"
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
