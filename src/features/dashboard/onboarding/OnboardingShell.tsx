import { useEffect, useRef, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Sun, Moon, Laptop } from '@/components/ui/icons';
import type { ThemeMode } from '@/types';
import type { ModalLang, OnboardingCopy, OnboardingStep } from './types';
import { ONBOARDING_TOTAL_STEPS } from './types';
import { ClassroomWelcomeIllustration, SubjectsLibraryIllustration, TeachingCyclesIllustration, SchedulePlanningIllustration } from '@/components/ui/DynamicIllustration';
import '../../auth/authMotion.css';

const STEP_ILLUSTRATIONS = [TeachingCyclesIllustration, SubjectsLibraryIllustration, ClassroomWelcomeIllustration, SchedulePlanningIllustration];

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
  const StepIllustration = STEP_ILLUSTRATIONS[step - 1];
  const stepLabels = rtl
    ? ['السلك', 'المواد', 'الأقسام', 'الحصص']
    : ['Cycles', 'Matières', 'Classes', 'Horaires'];
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'nearest' });
  }, [step]);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      lang={lang}
      className="onboarding-keep onboarding-artisan-shell onboarding-studio flex min-h-dvh flex-col bg-background text-foreground"
    >
      <header className="onboarding-artisan-header sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <img
              src="/icons/icon-192.png"
              width="36"
              height="36"
              alt=""
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain shadow-2xs"
            />
            <span className="text-sm font-bold tracking-tight truncate">{copy.brand}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
                  className={`keep-surface keep-choice min-h-11 px-3 sm:px-3.5 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  value === lang ? 'border-primary/40 text-primary font-bold' : ''
                }`}
                >
                  {value === 'fr' ? 'FR' : 'العربية'}
                </button>
              ))}
            </div>
            <div className="onboarding-theme-control">
            <label className="sr-only" htmlFor="onboarding-theme">
              {rtl ? 'المظهر' : 'Thème'}
            </label>
            <select
              id="onboarding-theme"
              value={theme}
              disabled={finishing}
              onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
              className="onboarding-theme-select"
            >
              <option value="light">{rtl ? 'فاتح' : 'Clair'}</option>
              <option value="dark">{rtl ? 'داكن' : 'Sombre'}</option>
              <option value="system">{rtl ? 'النظام' : 'Système'}</option>
            </select>
            {theme === 'dark' ? <Moon size={20} /> : theme === 'light' ? <Sun size={20} /> : <Laptop size={20} />}
            </div>
          </div>
        </div>
      </header>
      <main
        className={
          'mx-auto flex w-full flex-1 flex-col px-3 py-3.5 sm:px-6 sm:py-8 ' +
          (step === 4 ? 'max-w-5xl' : 'max-w-3xl')
        }
      >
        <div className="onboarding-progress-caption flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="font-medium">{copy.step(step, ONBOARDING_TOTAL_STEPS)}</span>
          <button
            type="button"
            disabled={finishing}
            onClick={onSkip}
            className="min-h-11 rounded-lg px-2 text-xs sm:text-sm underline underline-offset-4 hover:bg-black/5 focus-visible:outline-2 dark:hover:bg-white/5 cursor-pointer"
          >
            {rtl ? 'الإعداد لاحقاً' : 'Configurer plus tard'}
          </button>
        </div>
        <ol
          aria-label={copy.step(step, ONBOARDING_TOTAL_STEPS)}
          className="onboarding-stepper grid grid-cols-4 gap-2"
        >
          {stepLabels.map((label, index) => (
            <li
              key={index}
              aria-current={index + 1 === step ? 'step' : undefined}
              data-complete={index + 1 < step || undefined}
              className="onboarding-step"
            >
              <span className="onboarding-step-mark" aria-hidden="true">
                {index + 1 < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span>{label}</span>
              {index + 1 < step && <span className="sr-only">{rtl ? 'مكتمل' : 'Terminé'}</span>}
            </li>
          ))}
        </ol>
        <div className="onboarding-heading flex items-center justify-between gap-3">
        <div className="min-w-0">
        <p className="onboarding-eyebrow">{rtl ? 'مساحتك التعليمية' : 'Votre espace pédagogique'}</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="min-w-0 font-serif text-2xl font-bold leading-tight tracking-tight text-foreground outline-none sm:text-3xl lg:text-4xl"
        >
          {title}
        </h1>
        </div>
        <StepIllustration key={step} size={144} className="onboarding-heading-illustration" />
        </div>
        {step === 4 && (
          <p className="mb-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]">
            {copy.scheduleOptional}
          </p>
        )}
        <fieldset
          disabled={finishing}
          aria-busy={finishing}
          className="onboarding-step-content min-w-0 w-full"
        >
          {children}
        </fieldset>
        {step !== 3 && (
          <footer className="onboarding-navigation" data-first-step={step === 1 || undefined}>
            <button
              type="button"
              disabled={step === 1 || finishing}
              onClick={onBack}
              aria-label={copy.back}
              className="inline-flex min-h-12 sm:min-h-13 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-card px-5 py-3 text-sm font-semibold text-foreground/80 shadow-sm hover:bg-muted hover:text-foreground focus-visible:outline-2 disabled:invisible cursor-pointer"
            >
              <ChevronLeft
                className="h-4 w-4 rtl:rotate-180"
                aria-hidden="true"
              />
              <span className="onboarding-back-label">{copy.back}</span>
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
