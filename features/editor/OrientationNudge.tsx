import React, { useEffect, useState } from 'react';
import { Redo2, X } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

const PHONE_PORTRAIT_QUERY = '(max-width: 767px) and (orientation: portrait) and (pointer: coarse)';
const OPEN_DELAY_MS = 900;
const REMINDER_DELAY_MS = 8 * 60 * 1000;

interface OrientationNudgeProps {
  /** Le rappel ne concurrence jamais une modale, la sélection ou l'impression. */
  suppressed?: boolean;
}

/**
 * Rappel léger, limité au téléphone en portrait. Après fermeture, il reste
 * discret huit minutes puis revient seulement si l'écran est toujours étroit
 * et vertical. Le passage en paysage remet naturellement le cycle à zéro.
 */
export const OrientationNudge: React.FC<OrientationNudgeProps> = ({ suppressed = false }) => {
  const { t } = useLocale();
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const portraitQuery = window.matchMedia(PHONE_PORTRAIT_QUERY);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePortrait = () => setIsPortraitPhone(portraitQuery.matches);
    const updateMotion = () => setReducedMotion(motionQuery.matches);

    updatePortrait();
    updateMotion();
    portraitQuery.addEventListener('change', updatePortrait);
    motionQuery.addEventListener('change', updateMotion);

    return () => {
      portraitQuery.removeEventListener('change', updatePortrait);
      motionQuery.removeEventListener('change', updateMotion);
    };
  }, []);

  useEffect(() => {
    if (!isPortraitPhone) {
      setIsVisible(false);
      setIsDismissed(false);
      return;
    }

    const delay = isDismissed ? REMINDER_DELAY_MS : OPEN_DELAY_MS;
    const timer = window.setTimeout(() => {
      if (isDismissed) {
        setIsDismissed(false);
      } else {
        setIsVisible(true);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [isDismissed, isPortraitPhone]);

  const dismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (!isVisible || suppressed) return null;

  // La langue active est utilisée ; les nouvelles installations démarrent en arabe.
  const copy = {
    label: t('editor.orientation.label'),
    title: t('editor.orientation.title'),
    description: t('editor.orientation.description'),
    close: t('editor.orientation.close'),
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-[65] mx-auto max-w-md print:hidden"
    >
      <div className={`flex items-center gap-3 rounded-2xl border border-primary/15 bg-card/95 p-3.5 shadow-[0_16px_42px_rgba(15,23,42,0.18)] backdrop-blur-xl ${reducedMotion ? '' : 'animate-in slide-in-from-bottom duration-300'}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{copy.label}</p>
          <p className="mt-0.5 text-sm font-bold text-foreground">{copy.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{copy.description}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={copy.close}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
