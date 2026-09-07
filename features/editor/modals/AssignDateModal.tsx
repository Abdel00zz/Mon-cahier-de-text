import { FC, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarX, CalendarPlus, CalendarDays, TriangleAlert } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Indices } from '@/types';
import { todayInMorocco } from '@/utils/calendar';
import { useLocale } from '@/i18n/LocaleProvider';

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

const formatFullDate = (dateStr: string | undefined, localeCode: string, emptyLabel: string) => {
  if (!dateStr) return emptyLabel;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString(localeCode, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const dObj = new Date(dateStr);
    if (isNaN(dObj.getTime())) return dateStr;
    return dObj.toLocaleDateString(localeCode, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
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

  // Alertes live : recalculées à chaque changement de date choisie.
  const dateWarnings = useMemo(
    () => (actionType === 'associate' && getDateWarnings && selectedDate ? getDateWarnings(selectedDate) : []),
    [actionType, getDateWarnings, selectedDate]
  );

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
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-tajawal">
            {t('assignDate.title')}
          </span>
        </div>
      }
      description={t(selectedCount === 1 ? 'assignDate.selectedOne' : 'assignDate.selectedMany', { count: number.format(selectedCount) })}
      maxWidth="lg"
      className="sm:max-w-xl sm:rounded-2xl"
      headerClassName="border-b border-border/60 bg-card/60 backdrop-blur-xs"
      bodyClassName="px-5 py-5 sm:px-7 sm:py-6"
      footerClassName="border-t border-border/60 bg-card/60"
      footer={
        <div className="flex items-center w-full gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl h-11 w-1/3 text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className={`rounded-xl h-11 flex-1 text-sm font-bold shadow-sm transition-all duration-150 ${
              actionType === 'associate'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
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
      <div className="space-y-6">
        {/* Sleek toggle selector */}
        <Segmented<'associate' | 'dissociate'>
          value={actionType}
          onChange={setActionType}
          className="grid w-full grid-cols-2"
          options={[
            {
              value: 'associate',
              label: (
                <span className="flex items-center gap-1.5 font-tajawal font-bold">
                   {t('assignDate.assign')}
                </span>
              ),
            },
            {
              value: 'dissociate',
              label: (
                <span className="flex items-center gap-1.5 font-tajawal font-bold">
                  {t('assignDate.unassign')}
                </span>
              ),
            },
          ]}
        />

        {/* Dynamic Section */}
        {actionType === 'associate' ? (
          <div className="space-y-6 animate-fade-in duration-200">
            {/* 1. Quick Presets */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                className={`h-11 rounded-xl border py-1 text-sm font-tajawal font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(-1)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(-1))}
              >
                {t('assignDate.yesterday')}
              </Button>
              <Button
                type="button"
                className={`h-11 rounded-xl border py-1 text-sm font-tajawal font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(0)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(0))}
              >
                {t('assignDate.today')}
              </Button>
              <Button
                type="button"
                className={`h-11 rounded-xl border py-1 text-sm font-tajawal font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(1)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(1))}
              >
                {t('assignDate.tomorrow')}
              </Button>
            </div>

            {/* 2. Date Input */}
            <div className="space-y-2.5">
              <label className="block text-sm font-medium text-foreground text-start font-tajawal">
                {t('assignDate.chooseDate')}
              </label>
              
              <div className="relative flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-between w-full h-12 px-4 rounded-xl border border-border bg-background shadow-sm hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="text-[16px] font-bold tracking-[0.02em] text-foreground" dir="ltr">
                    {selectedDate ? (() => {
                      const [y, m, d] = selectedDate.split('-');
                      return y && m && d ? `${d}/${m}/${y}` : 'JJ/MM/AAAA';
                    })() : 'JJ/MM/AAAA'}
                  </span>
                  <CalendarDays className="w-5 h-5 text-muted-foreground" />
                  <input
                    id="assign-date-input"
                    type="date"
                    value={selectedDate}
                    onChange={event => setSelectedDate(event.target.value)}
                    onClick={(e) => {
                      try {
                        if (typeof e.currentTarget.showPicker === 'function') {
                          e.currentTarget.showPicker();
                        }
                      } catch (err) {
                        // fallback if showPicker fails
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {/* Intelligent date readout */}
                <span className="text-sm font-medium text-muted-foreground capitalize font-tajawal">
                  {formatFullDate(selectedDate, localeCode, t('assignDate.noDateSelected'))}
                </span>
              </div>
            </div>

            {/* 3. Warnings */}
            {dateWarnings.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-start animate-fade-in duration-200" role="status">
                {dateWarnings.map((warning, i) => (
                  <p key={i} className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-amber-800 dark:text-amber-300 font-tajawal">
                    <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{warning.message}</span>
                  </p>
                ))}
                <p className="ps-6.5 text-[12px] text-amber-700/90 dark:text-amber-400 font-medium font-tajawal">
                  {t('assignDate.warningOverride')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-sm animate-fade-in duration-200 space-y-2 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20 p-5 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 mb-1">
              <CalendarX className="h-5 w-5 stroke-[2.2]" />
            </div>
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider font-tajawal">{t('assignDate.removeTitle')}</h4>
            <p className="text-sm text-rose-600 dark:text-rose-300 font-medium leading-relaxed max-w-xs mx-auto font-tajawal">
              {t('assignDate.removeHint')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
