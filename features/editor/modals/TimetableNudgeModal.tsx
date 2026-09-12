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
      className="sm:max-w-md sm:rounded-2xl [&_[data-swipe-dismiss-handle]]:hidden"
      headerClassName={`border-b-0 bg-background text-start ${isAr ? 'font-ar' : ''}`}
      bodyClassName="min-h-0 px-5 py-5 sm:px-7 sm:py-6"
      title={
        <span dir={isAr ? 'rtl' : 'ltr'} className={`flex items-center gap-3 text-lg sm:text-xl font-bold tracking-tight leading-tight ${isAr ? 'font-ar' : ''}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            <CalendarRange className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-foreground font-bold">{t.title}</span>
        </span>
      }
    >
      <div dir={isAr ? 'rtl' : 'ltr'} className={`text-start ${isAr ? 'font-ar' : ''}`}>
        {/* 1 · Mission principale : renseigner l'emploi du temps. */}
        <p className="break-words text-sm sm:text-[15px] font-medium leading-relaxed text-muted-foreground">
          {t.message(classLabel)}
        </p>

        <Button
          type="button"
          onClick={onFill}
          className="mt-6 h-11 w-full rounded-xl px-5 text-sm font-bold"
        >
          {t.fill}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onSkip}
          className="mt-2 h-10 w-full rounded-xl text-xs font-semibold sm:text-sm"
        >
          {t.understood}
        </Button>
      </div>
    </Modal>
  );
};
