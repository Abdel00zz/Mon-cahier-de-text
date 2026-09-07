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
}

/** Étape unique avant toute écriture d'une date qui mérite une vérification. */
export const DateReviewModal: React.FC<DateReviewModalProps> = ({ isOpen, date, warnings, onModify, onConfirm }) => {
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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning-strong shadow-xs">
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
      maxWidth="sm"
      className="sm:max-w-md sm:rounded-xl"
      headerClassName="border-b-0 bg-background px-5 py-4 sm:px-6"
      bodyClassName="px-5 py-4 sm:px-6 sm:py-5"
      footerClassName="border-t-0 bg-background px-5 py-3 sm:px-6"
      footer={
        <div className="flex w-full items-center justify-between gap-2.5">
          <Button type="button" variant="outline" onClick={onConfirm} className="order-1 min-h-10 rounded-xl px-4 text-xs font-semibold shadow-sm sm:text-sm" aria-label={t('dateReview.confirmAria')}>
            {t('common.confirm')}
          </Button>
          <Button type="button" onClick={onModify} autoFocus className="order-2 min-h-10 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 sm:text-sm">
            {t('dateReview.modify')}
          </Button>
        </div>
      }
    >
      <div className="rounded-lg bg-warning/[0.07] p-4 shadow-sm sm:p-5" role="status" aria-live="polite">
        <p className="text-sm font-semibold leading-6 text-warning-strong sm:text-[15px]">{t('dateReview.check')}</p>
        <ul className="mt-3 space-y-3">
          {distinctWarnings.map((warning, index) => (
            <li key={index} className="text-sm font-medium leading-6 text-foreground">
              {warning.message}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};
