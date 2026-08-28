import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';
import { TriangleAlert } from '@/components/ui/icons';

interface DateReviewModalProps {
  isOpen: boolean;
  date: string;
  warnings: { message: string }[];
  /** Revient exactement au formulaire qui a proposé la date, sans perdre la saisie. */
  onModify: () => void;
  onConfirm: () => void;
  /** Enregistre l'exception et retire uniquement ce contrôle du centre d'actions. */
  onIgnore?: () => void;
}

/** Étape unique avant toute écriture d'une date qui mérite une vérification. */
export const DateReviewModal: React.FC<DateReviewModalProps> = ({ isOpen, date, warnings, onModify, onConfirm, onIgnore }) => {
  const { t, locale } = useLocale();
  const distinctWarnings = warnings.filter(
    (warning, index, all) => all.findIndex(item => item.message === warning.message) === index,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onModify}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs">
            <TriangleAlert className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t('dateReview.title')}
          </span>
        </div>
      }
      description={date ? t('dateReview.selectedDate', {
        date: new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA').format(new Date(`${date}T12:00:00Z`)),
      }) : undefined}
      maxWidth="md"
      className="sm:max-w-lg sm:rounded-[28px]"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/70 bg-card/85 backdrop-blur-md"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-border/70 bg-card/85 backdrop-blur-md"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onModify} className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
            {t('dateReview.modify')}
          </Button>
          <Button type="button" onClick={onConfirm} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-5 h-10 text-xs sm:text-sm shadow-sm" aria-label={t('dateReview.confirmAria')}>
            {t('common.confirm')}
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4" role="status" aria-live="polite">
        <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">{t('dateReview.check')}</p>
        <ul className="mt-2.5 divide-y divide-amber-500/15">
          {distinctWarnings.map((warning, index) => (
            <li key={index} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <span className="text-xs font-semibold leading-relaxed text-foreground">{warning.message}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] font-medium leading-relaxed text-muted-foreground">
          {t('dateReview.hint')}
        </p>
        {onIgnore && (
          <button
            type="button"
            onClick={onIgnore}
            className="mt-3.5 h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-2xs"
          >
            {t('dateReview.ignore')}
          </button>
        )}
      </div>
    </Modal>
  );
};

