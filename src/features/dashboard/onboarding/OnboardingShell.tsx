import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Sun, Moon, Laptop } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
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
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* 1. Language Smart Selection Pill */}
            <div
              className="onboarding-pill-rail flex items-center p-0.5 rounded-full border border-border/70 bg-muted/50 dark:bg-zinc-900/60 shadow-2xs"
              role="radiogroup"
              aria-label={copy.sectionLanguage}
            >
              {(['fr', 'ar'] as const).map((value) => {
                const active = value === lang;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    lang={value}
                    disabled={finishing}
                    onClick={() => onLanguageChange(value)}
                    className={cn(
                      'relative z-10 min-h-8 sm:min-h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2',
                      active
                        ? 'text-foreground font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="onboarding-lang-active-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-background border border-border/70 shadow-xs"
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    {value === 'fr' ? 'FR' : 'العربية'}
                  </button>
                );
              })}
            </div>

            {/* 2. Theme Smart Selection Pill */}
            <div
              className="onboarding-pill-rail flex items-center p-0.5 rounded-full border border-border/70 bg-muted/50 dark:bg-zinc-900/60 shadow-2xs"
              role="radiogroup"
              aria-label={rtl ? 'المظهر' : 'Thème'}
            >
              {(['light', 'dark', 'system'] as const).map((mode) => {
                const active = theme === mode;
                const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Laptop;
                const label = mode === 'light' ? (rtl ? 'فاتح' : 'Clair') : mode === 'dark' ? (rtl ? 'داكن' : 'Sombre') : (rtl ? 'النظام' : 'Système');
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={finishing}
                    onClick={() => onThemeChange(mode)}
                    title={label}
                    aria-label={label}
                    className={cn(
                      'relative z-10 flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2',
                      active
                        ? 'text-foreground font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="onboarding-theme-active-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-background border border-border/70 shadow-xs"
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <Icon size={15} />
                    <span className="hidden md:inline">{label}</span>
                  </button>
                );
              })}
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
                {index + 1 < step ? <Check className="h-4 w-4" /> : (
                  <>
                    <svg className="onboarding-progress-ring" viewBox="0 0 24 24" fill="none">
                      <circle className="onboarding-progress-ring-track" cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="10" pathLength="1" strokeDasharray="1 1"
                        strokeDashoffset={index + 1 === step ? 1 - step / ONBOARDING_TOTAL_STEPS : 1}
                        transform="rotate(-90 12 12)" />
                    </svg>
                    <span className="onboarding-step-number">{index + 1}</span>
                  </>
                )}
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
            <motion.button
              type="button"
              disabled={step === 1 || finishing}
              onClick={onBack}
              whileTap={{ scale: (step === 1 || finishing) ? 1 : 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              aria-label={copy.back}
              className="inline-flex min-h-12 sm:min-h-13 w-full sm:w-auto items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card px-6 py-3 text-sm font-semibold text-foreground/80 shadow-sm hover:bg-muted hover:text-foreground focus-visible:outline-2 disabled:invisible cursor-pointer transition-colors duration-200"
            >
              <span className="onboarding-back-label">{copy.back}</span>
            </motion.button>
            <motion.button
              type="button"
              disabled={!canContinue || finishing}
              onClick={onNext}
              whileTap={{ scale: (!canContinue || finishing) ? 1 : 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="artistic-cta-button inline-flex min-h-12 sm:min-h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-8 py-3 text-[15px] font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none cursor-pointer transition-all duration-200"
            >
              {finishing && (
                <Loader2
                  className="h-4.5 w-4.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              <span>{finishing ? copy.finishing : primaryLabel}</span>
            </motion.button>
          </footer>
        )}
      </main>
    </div>
  );
}
