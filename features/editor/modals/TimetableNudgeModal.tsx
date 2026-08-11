import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { CalendarRange } from '@/components/ui/icons';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';

interface TimetableNudgeModalProps {
  isOpen: boolean;
  /** « Passer pour l'instant », mémorisé pour la session, jamais bloquant */
  onSkip: () => void;
  /** ouvre Paramètres ▸ Emploi du temps */
  onFill: () => void;
  /** Nom canonique stocké : l'affichage suit toujours la langue de l'application. */
  className: string;
}

type NudgeLocale = 'fr' | 'ar';

/** Textes concis, cohérents avec la langue principale de l'application. */
const TEXTS: Record<NudgeLocale, {
  title: string;
  message: (classLabel: string) => string;
  fill: string;
  skip: string;
}> = {
  fr: {
    title: "Ajouter à l'emploi du temps",
    message: classLabel => `Ajoutez les créneaux de « ${classLabel} » à votre emploi du temps pour activer le suivi.`,
    fill: "Ajouter à l'emploi du temps",
    skip: 'Plus tard',
  },
  ar: {
    title: 'إضافة الحصص إلى استعمال الزمن',
    message: classLabel => `أضف حصص « ${classLabel} » إلى استعمال الزمن لتفعيل المتابعة.`,
    fill: 'إضافة إلى استعمال الزمن',
    skip: 'لاحقًا',
  },
};

/**
 * Invitation FLUIDE à renseigner l'emploi du temps, jamais bloquante :
 * affichée une fois par session et par classe, avec un « passer » discret.
 * Elle suit la langue de l'application pour ne pas dissocier le nom de classe
 * de son interface (ex. « قسم الأولى إعدادي 5 » en arabe).
 */
export const TimetableNudgeModal: React.FC<TimetableNudgeModalProps> = ({
  isOpen,
  onSkip,
  onFill,
  className,
}) => {
  const { locale } = useLocale();
  const lang: NudgeLocale = locale === 'ar' ? 'ar' : 'fr';
  const t = TEXTS[lang];
  const isAr = lang === 'ar';
  const classLabel = formatLocalizedClassDisplayName(className, locale);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      maxWidth="sm"
      hideClose
      blockDismiss
      swipeToDismiss={false}
      className="border-border/70 bg-card shadow-[0_18px_48px_rgba(15,23,42,0.16)] sm:max-w-[25rem] sm:rounded-[24px] [&_[data-swipe-dismiss-handle]]:hidden"
      headerClassName={`border-0 bg-transparent px-5 pb-0 pt-5 pe-5 sm:px-7 sm:pt-6 sm:pe-7 ${isAr ? 'font-ar text-right' : 'text-left'}`}
      bodyClassName="min-h-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:px-7 sm:pb-7"
      title={
        <span dir={isAr ? 'rtl' : 'ltr'} className={`flex items-center gap-3 text-[17px] font-extrabold leading-tight sm:text-lg ${isAr ? 'font-ar' : ''}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.08] text-primary shadow-xs">
            <CalendarRange className="h-[18px] w-[18px]" />
          </span>
          {t.title}
        </span>
      }
    >
      <div dir={isAr ? 'rtl' : 'ltr'} className={isAr ? 'font-ar text-right' : 'text-left'}>
        <p className="break-words text-[14px] font-medium leading-7 text-muted-foreground sm:text-[15px] sm:leading-7">
          {t.message(classLabel)}
        </p>

        <div className="mt-5 grid gap-1.5">
          <Button
            type="button"
            onClick={onFill}
            className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-primary/90 hover:shadow-md active:translate-y-0"
          >
            {t.fill}
          </Button>

          <button
            type="button"
            onClick={onSkip}
            className="min-h-10 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            {t.skip}
          </button>
        </div>
      </div>
    </Modal>
  );
};
