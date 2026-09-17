import { FC, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarX, CalendarPlus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Indices } from '@/types';
import { todayInMorocco } from '@/utils/calendar';
import { useLocale } from '@/i18n/LocaleProvider';
import { ModernCalendarPicker } from '../components/ModernCalendarPicker';

interface SelectedItemPreview {
  indices: Indices;
  item: any;
  title: string;
  date?: string;
  description?: string;
  canDate: boolean;
}

interface AssignDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (date: string) => void;
  selectedCount: number;
  selectedItems: SelectedItemPreview[];
  /** validation intelligente : alertes live pour la date choisie (emploi du temps, fériés, vacances, absences) */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** Date conservée lors d'un retour depuis la vérification. */
  initialDate?: string;
}

const addDaysISO = (iso: string, offset: number): string => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const isoFromOffset = (offset: number) => {
  return addDaysISO(todayInMorocco(), offset);
};

export const AssignDateModal: FC<AssignDateModalProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedCount,
  getDateWarnings,
  initialDate,
}) => {
  const { t, locale } = useLocale();
  const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
  const number = useMemo(() => new Intl.NumberFormat(localeCode), [localeCode]);
  const [actionType, setActionType] = useState<'associate' | 'dissociate'>('associate');
  const [selectedDate, setSelectedDate] = useState(() => isoFromOffset(0));

  useEffect(() => {
    if (!isOpen) return;
    setActionType('associate');
    setSelectedDate(initialDate || isoFromOffset(0));
  }, [initialDate, isOpen]);

  const handleApply = () => {
    if (actionType === 'associate') {
      onApply(selectedDate);
    } else {
      onApply(''); // Empty string dissociates the date
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            <CalendarPlus className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-sans">
            {t('assignDate.title')}
          </span>
        </div>
      }
      description={t(selectedCount === 1 ? 'assignDate.selectedOne' : 'assignDate.selectedMany', { count: number.format(selectedCount) })}
      maxWidth="lg"
      className="sm:max-w-xl sm:rounded-2xl"
      headerClassName="border-b-0 bg-background pb-2"
      bodyClassName="px-4 py-3 sm:px-6 sm:py-4"
      footerClassName="border-t border-border/60 bg-background pt-3"
      footer={
        <div className="flex items-center w-full gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl h-11 w-1/3 text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className={`rounded-xl h-11 flex-1 text-sm font-bold shadow-sm transition-all duration-150 active:scale-98 ${
              actionType === 'associate'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
            }`}
          >
            {actionType === 'associate' ? (
              <span>{t('assignDate.applyDate')}</span>
            ) : (
              <span>{t('assignDate.removeDates')}</span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Sleek toggle selector */}
        <Segmented<'associate' | 'dissociate'>
          value={actionType}
          onChange={setActionType}
          className="grid w-full grid-cols-2"
          options={[
            {
              value: 'associate',
              label: (
                <span className="flex items-center gap-1.5 font-sans font-bold">
                   {t('assignDate.assign')}
                </span>
              ),
            },
            {
              value: 'dissociate',
              label: (
                <span className="flex items-center gap-1.5 font-sans font-bold">
                  {t('assignDate.unassign')}
                </span>
              ),
            },
          ]}
        />

        {/* Dynamic Section */}
        {actionType === 'associate' ? (
          <div className="animate-fade-in duration-200">
            <ModernCalendarPicker
              value={selectedDate}
              onChange={setSelectedDate}
              getDateWarnings={getDateWarnings}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-sm animate-fade-in duration-200 space-y-2 rounded-xl border border-destructive/20 bg-destructive/10 p-5 text-center my-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/15 text-destructive mb-1">
              <CalendarX className="h-5 w-5 stroke-[2.2]" />
            </div>
            <h4 className="text-sm font-bold text-destructive uppercase tracking-wider font-sans">{t('assignDate.removeTitle')}</h4>
            <p className="text-sm text-destructive/80 font-medium leading-relaxed max-w-xs mx-auto font-sans">
              {t('assignDate.removeHint')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
