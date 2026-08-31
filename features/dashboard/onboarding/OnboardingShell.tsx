import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from '@/components/ui/icons';
import type { ThemeMode } from '@/types';
import type { ModalLang, OnboardingCopy, OnboardingStep } from './types';
import { ONBOARDING_TOTAL_STEPS } from './types';

interface OnboardingShellProps {
  lang: ModalLang;
  step: OnboardingStep;
  title: string;
  copy: OnboardingCopy;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onLanguageChange: (lang: ModalLang) => void;
  canContinue: boolean;
  finishing: boolean;
  primaryLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  children: ReactNode;
}

/** Same surfaces, type scale and quiet states as the class dashboard. */
export function OnboardingShell({
  lang,
  step,
  title,
  copy,
  theme,
  onThemeChange,
  onLanguageChange,
  canContinue,
  finishing,
  primaryLabel,
  onBack,
  onNext,
  onSkip,
  children,
}: OnboardingShellProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rtl = lang === 'ar';
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'nearest' });
  }, [step]);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="onboarding-keep flex min-h-dvh flex-col bg-white text-[#202124] dark:bg-[#202124] dark:text-[#e8eaed]"
    >
      <header className="border-b border-[#e0e0e0] dark:border-[#5f6368]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/icone.png"
              width="36"
              height="36"
              alt=""
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="text-sm font-semibold">{copy.brand}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex gap-1"
              role="group"
              aria-label={copy.sectionLanguage}
            >
              {(['fr', 'ar'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  lang={value}
                  disabled={finishing}
                  aria-pressed={value === lang}
                  onClick={() => onLanguageChange(value)}
                  className="keep-surface keep-choice min-h-11 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {value === 'fr' ? 'FR' : 'العربية'}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="onboarding-theme">
              {rtl ? 'المظهر' : 'Thème'}
            </label>
            <select
              id="onboarding-theme"
              value={theme}
              disabled={finishing}
              onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
              className="keep-surface min-h-11 max-w-32 px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <option value="light">{rtl ? 'فاتح' : 'Clair'}</option>
              <option value="dark">{rtl ? 'داكن' : 'Sombre'}</option>
              <option value="system">{rtl ? 'النظام' : 'Système'}</option>
            </select>
          </div>
        </div>
      </header>
      <main
        className={
          'mx-auto flex w-full flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 ' +
          (step === 4 ? 'max-w-5xl' : 'max-w-3xl')
        }
      >
        <div className="mb-5 flex items-center justify-between gap-3 text-sm text-[#5f6368] dark:text-[#bdc1c6]">
          <span>{copy.step(step, ONBOARDING_TOTAL_STEPS)}</span>
          <button
            type="button"
            disabled={finishing}
            onClick={onSkip}
            className="min-h-11 rounded-lg px-2 underline underline-offset-4 hover:bg-black/5 focus-visible:outline-2 dark:hover:bg-white/5"
          >
            {rtl ? 'الإعداد لاحقاً' : 'Configurer plus tard'}
          </button>
        </div>
        <div
          role="progressbar"
          aria-label={copy.step(step, ONBOARDING_TOTAL_STEPS)}
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_TOTAL_STEPS}
          aria-valuenow={step}
          className="mb-6 flex gap-1.5"
        >
          {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={
                'h-1 flex-1 rounded-full ' +
                (index < step
                  ? 'bg-stone-700 dark:bg-stone-300'
                  : 'bg-stone-200 dark:bg-stone-700')
              }
            />
          ))}
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mb-3 text-2xl font-semibold leading-snug tracking-tight outline-none sm:text-3xl"
        >
          {title}
        </h1>
        {step === 4 && (
          <p className="mb-5 text-sm leading-relaxed text-[#5f6368] dark:text-[#bdc1c6]">
            {copy.scheduleOptional}
          </p>
        )}
        <fieldset
          disabled={finishing}
          aria-busy={finishing}
          className="min-w-0 flex-1"
        >
          {children}
        </fieldset>
        <footer className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e0e0e0] bg-white py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-[#5f6368] dark:bg-[#202124]">
          <button
            type="button"
            disabled={step === 1 || finishing}
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium hover:bg-black/5 focus-visible:outline-2 disabled:invisible dark:hover:bg-white/5"
          >
            <ChevronLeft
              className="h-4 w-4 rtl:rotate-180"
              aria-hidden="true"
            />
            {copy.back}
          </button>
          <button
            type="button"
            disabled={!canContinue || finishing}
            onClick={onNext}
            className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
          >
            {finishing && (
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            <span>{finishing ? copy.finishing : primaryLabel}</span>
            <ChevronRight
              className="h-4 w-4 shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
          </button>
        </footer>
      </main>
    </div>
  );
}
