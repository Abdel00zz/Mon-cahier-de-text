import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

const PHONE_PORTRAIT_QUERY = '(max-width: 767px) and (orientation: portrait) and (pointer: coarse)';
const OPEN_DELAY_MS = 900;
const REMINDER_COOLDOWN_MS = 15 * 60 * 1000;
const REMINDER_STORAGE_KEY = 'editor-orientation-nudge-until-v2';

interface OrientationNudgeProps {
  /** Le rappel ne concurrence jamais une action ou une surface prioritaire. */
  suppressed?: boolean;
}

const readReminderDelay = (): number => {
  try {
    const storedUntil = Number.parseInt(window.sessionStorage.getItem(REMINDER_STORAGE_KEY) || '', 10);
    return Number.isFinite(storedUntil) ? Math.max(0, storedUntil - Date.now()) : 0;
  } catch {
    return 0;
  }
};

const rememberDismissal = () => {
  try {
    window.sessionStorage.setItem(REMINDER_STORAGE_KEY, String(Date.now() + REMINDER_COOLDOWN_MS));
  } catch {
    // Le rappel reste fermable même si le stockage privé est indisponible.
  }
};

const OrientationFigure: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => (
  <div
    aria-hidden="true"
    className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10"
  >
    <motion.svg
      viewBox="0 0 64 64"
      className="absolute inset-0 h-full w-full opacity-45"
      fill="none"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 0.45 }}
      transition={{ delay: 0.2, duration: reducedMotion ? 0 : 0.65, ease: 'easeOut' }}
    >
      <motion.path
        d="M47 16c6 4 9 11 8 19"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.25, duration: reducedMotion ? 0 : 0.55, ease: 'easeOut' }}
      />
      <motion.path
        d="m51 31 4 4 4-4"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reducedMotion ? 0 : 0.65, duration: reducedMotion ? 0 : 0.18 }}
      />
    </motion.svg>

    <motion.div
      className="relative h-10 w-7 origin-center"
      initial={{ rotate: 0 }}
      animate={{ rotate: reducedMotion ? 90 : [0, 0, 90, 90, 0, 0, 90] }}
      transition={reducedMotion ? { duration: 0 } : {
        duration: 4.2,
        times: [0, 0.08, 0.24, 0.4, 0.52, 0.68, 1],
        ease: 'easeInOut',
      }}
    >
      <svg viewBox="0 0 28 40" className="h-full w-full" fill="none">
        <rect x="1" y="1" width="26" height="38" rx="5" fill="hsl(var(--card))" stroke="currentColor" strokeWidth="2" />
        <rect x="4.5" y="7" width="19" height="25" rx="1.5" fill="currentColor" opacity="0.12" />
        <path d="M10.8 7v25M17.2 7v25M4.5 14h19M4.5 21h19" stroke="currentColor" strokeWidth="1.15" opacity="0.72" />
        <path d="M11 35h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.65" />
      </svg>
    </motion.div>
  </div>
);

/**
 * Coach d’orientation réservé aux téléphones en portrait. Il explique le
 * bénéfice sans bloquer le tableau et disparaît naturellement en paysage.
 */
export const OrientationNudge: React.FC<OrientationNudgeProps> = ({ suppressed = false }) => {
  const { t } = useLocale();
  const reducedMotion = Boolean(useReducedMotion());
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const wasPortraitPhone = useRef(false);

  useEffect(() => {
    const portraitQuery = window.matchMedia(PHONE_PORTRAIT_QUERY);
    const syncOrientation = () => {
      const matches = portraitQuery.matches;
      if (wasPortraitPhone.current && !matches) rememberDismissal();
      wasPortraitPhone.current = matches;
      setIsPortraitPhone(matches);
      if (!matches) setIsVisible(false);
    };

    syncOrientation();
    portraitQuery.addEventListener('change', syncOrientation);
    return () => portraitQuery.removeEventListener('change', syncOrientation);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncKeyboard = () => setIsKeyboardOpen(root.dataset.keyboard === 'open');
    const observer = new MutationObserver(syncKeyboard);

    syncKeyboard();
    observer.observe(root, { attributes: true, attributeFilter: ['data-keyboard'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPortraitPhone || isKeyboardOpen || suppressed) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(
      () => setIsVisible(true),
      Math.max(OPEN_DELAY_MS, readReminderDelay()),
    );
    return () => window.clearTimeout(timer);
  }, [isKeyboardOpen, isPortraitPhone, scheduleVersion, suppressed]);

  const dismiss = () => {
    rememberDismissal();
    setIsVisible(false);
    setScheduleVersion(version => version + 1);
  };

  return (
    <AnimatePresence>
      {isVisible && !isKeyboardOpen && !suppressed ? (
        <motion.aside
          data-orientation-nudge
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-[65] mx-auto max-w-md print:hidden"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: reducedMotion ? 0.12 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-card/95 p-3 pe-2 shadow-[0_18px_48px_rgba(15,23,42,0.2)] backdrop-blur-xl">
            <OrientationFigure reducedMotion={reducedMotion} />
            <div className="min-w-0 flex-1 text-start" role="status" aria-live="polite" aria-atomic="true">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                {t('editor.orientation.label')}
              </p>
              <p className="mt-0.5 text-sm font-extrabold leading-tight text-foreground">
                {t('editor.orientation.title')}
              </p>
              <p className="mt-1 text-[11px] font-medium leading-[1.45] text-muted-foreground">
                {t('editor.orientation.description')}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="-me-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t('editor.orientation.close')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
};
