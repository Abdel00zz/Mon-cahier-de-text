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
      className="onboarding-keep flex min-h-dvh flex-col bg-[#fcfcfc] text-[#18181b] dark:bg-[#121212] dark:text-[#ededed]"
    >
      <header className="bg-[#fcfcfc] dark:bg-[#121212]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <img
              src="/icone.png"
              width="36"
              height="36"
              alt=""
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain"
            />
            <span className="text-sm font-semibold truncate">{copy.brand}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
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
                  className="keep-surface keep-choice min-h-10 sm:min-h-11 px-2.5 sm:px-3 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
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
              className="keep-surface min-h-10 sm:min-h-11 max-w-28 sm:max-w-32 px-2 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
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
          'mx-auto flex w-full flex-1 flex-col px-3 py-3.5 sm:px-6 sm:py-8 ' +
          (step === 4 ? 'max-w-5xl' : 'max-w-3xl')
        }
      >
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[#5f6368] dark:text-[#bdc1c6] sm:mb-5">
          <span>{copy.step(step, ONBOARDING_TOTAL_STEPS)}</span>
          <button
            type="button"
            disabled={finishing}
            onClick={onSkip}
            className="min-h-9 rounded-lg px-2 text-xs sm:min-h-11 sm:text-sm underline underline-offset-4 hover:bg-black/5 focus-visible:outline-2 dark:hover:bg-white/5"
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
          className="mb-3.5 flex gap-1.5 sm:mb-6"
        >
          {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={
                'h-1 flex-1 rounded-full transition-all duration-300 ' +
                (index < step
                  ? 'bg-[#facc15]'
                  : 'bg-neutral-200 dark:bg-[#27272a]')
              }
            />
          ))}
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mb-2.5 text-lg font-semibold leading-snug tracking-tight outline-none sm:mb-3 sm:text-3xl"
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
          className="min-w-0 w-full"
        >
          {children}
        </fieldset>
        {step !== 3 && (
          <footer className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 pb-6">
            <button
              type="button"
              disabled={step === 1 || finishing}
              onClick={onBack}
              className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-[#eaeaea] bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 focus-visible:outline-2 disabled:invisible dark:border-[#27272a] dark:bg-[#18181b] dark:text-neutral-300 dark:hover:bg-[#222]"
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
              className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#facc15] hover:bg-[#eab308] px-6 sm:px-8 py-2.5 text-sm font-bold text-neutral-950 shadow-xs hover:shadow transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#facc15] dark:text-neutral-950 dark:hover:bg-[#eab308]"
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
        )}
      </main>
    </div>
  );
}
