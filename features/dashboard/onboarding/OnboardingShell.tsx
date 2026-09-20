import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from '@/components/ui/icons';
import type { ThemeMode } from '@/types';
import type { ModalLang, OnboardingCopy, OnboardingStep } from './types';
import { ONBOARDING_TOTAL_STEPS } from './types';
import '../../auth/authMotion.css';

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
      className="onboarding-keep onboarding-artisan-shell flex min-h-dvh flex-col bg-background text-foreground"
    >
      <header className="onboarding-artisan-header sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <img
              src="/icone.png"
              width="36"
              height="36"
              alt=""
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain shadow-2xs"
            />
            <span className="text-sm font-bold tracking-tight truncate">{copy.brand}</span>
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
className={`keep-surface keep-choice min-h-10 sm:min-h-11 px-3 sm:px-3.5 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  value === lang ? 'border-primary/40 text-primary font-bold' : ''
                }`}
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
              className="keep-surface min-h-9 sm:min-h-10 max-w-28 sm:max-w-32 px-2 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
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
        <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted-foreground sm:mb-6">
          <span className="font-medium">{copy.step(step, ONBOARDING_TOTAL_STEPS)}</span>
          <button
            type="button"
            disabled={finishing}
            onClick={onSkip}
            className="min-h-9 rounded-lg px-2 text-xs sm:min-h-11 sm:text-sm underline underline-offset-4 hover:bg-black/5 focus-visible:outline-2 dark:hover:bg-white/5 cursor-pointer"
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
          className="onboarding-artisan-progress mb-5 flex gap-2 sm:mb-8"
        >
          {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={
                'h-1.5 flex-1 rounded-full transition-all duration-300 ' +
                (index < step
                  ? 'bg-[#7033e3] shadow-xs shadow-[#7033e3]/40'
                  : 'bg-neutral-200 dark:bg-[#27272a]')
              }
            />
          ))}
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mb-2.5 font-serif text-2xl font-bold leading-tight tracking-tight text-foreground outline-none sm:mb-3 sm:text-3xl lg:text-4xl"
        >
          {title}
        </h1>
        {step === 4 && (
          <p className="mb-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]">
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
              className="inline-flex min-h-12 sm:min-h-13 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-card px-5 py-3 text-sm font-semibold text-foreground/80 shadow-sm hover:bg-muted hover:text-foreground focus-visible:outline-2 disabled:invisible cursor-pointer"
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
              className="artistic-cta-button inline-flex min-h-12 sm:min-h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-bold active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none cursor-pointer"
            >
              {finishing && (
                <Loader2
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              <span>{finishing ? copy.finishing : primaryLabel}</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 rtl:rotate-180 stroke-[2.5]"
                aria-hidden="true"
              />
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}
