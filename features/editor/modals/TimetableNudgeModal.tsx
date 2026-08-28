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

type NudgeLocale = 'fr' | 'ar' | 'en';

/** Textes concis, cohérents avec la langue principale de l'application. */
const TEXTS: Record<NudgeLocale, {
  title: string;
  message: (classLabel: string) => string;
  fill: string;
  understood: string;
}> = {
  fr: {
    title: "Ajouter à l'emploi du temps",
    message: classLabel => `Ajoutez les créneaux de « ${classLabel} » à votre emploi du temps pour activer le suivi.`,
    fill: "Ajouter à l'emploi du temps",
    understood: 'J’ai compris',
  },
  ar: {
    title: 'إضافة الحصص إلى استعمال الزمن',
    message: classLabel => `أضف حصص « ${classLabel} » إلى استعمال الزمن لتفعيل المتابعة.`,
    fill: 'إضافة إلى استعمال الزمن',
    understood: 'فهمت',
  },
  en: {
    title: 'Add to timetable',
    message: classLabel => `Add the lessons for “${classLabel}” to your timetable to enable tracking.`,
    fill: 'Add to timetable',
    understood: 'I understand',
  },
};

/**
 * Invitation FLUIDE à renseigner l'emploi du temps, jamais bloquante :
 * affichée une fois par session et par classe, avec un acquittement discret.
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
  const lang: NudgeLocale = locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr';
  const t = TEXTS[lang];
  const isAr = lang === 'ar';
  const classLabel = formatLocalizedClassDisplayName(className, locale);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      maxWidth="md"
      hideClose
      blockDismiss
      swipeToDismiss={false}
      className="border-border/70 bg-white/95 shadow-xl backdrop-blur-2xl dark:bg-[#0c142b]/95 sm:max-w-md sm:rounded-[32px] [&_[data-swipe-dismiss-handle]]:hidden"
      headerClassName={`px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60 ${isAr ? 'font-ar text-right' : 'text-left'}`}
      bodyClassName="min-h-0 px-5 py-5 sm:px-7 sm:py-6"
      title={
        <span dir={isAr ? 'rtl' : 'ltr'} className={`flex items-center gap-3 text-lg sm:text-xl font-bold tracking-tight leading-tight ${isAr ? 'font-ar' : ''}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <CalendarRange className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-foreground font-bold">{t.title}</span>
        </span>
      }
    >
      <div dir={isAr ? 'rtl' : 'ltr'} className={isAr ? 'font-ar text-right' : 'text-left'}>
        <p className="break-words text-sm sm:text-[15px] font-medium leading-relaxed text-muted-foreground">
          {t.message(classLabel)}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            type="button"
            onClick={onFill}
            className="h-11 w-full rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90"
          >
            {t.fill}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            className="h-10 w-full rounded-xl border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 shadow-none hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 sm:text-sm dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
          >
            {t.understood}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
