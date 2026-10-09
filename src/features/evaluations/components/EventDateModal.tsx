import React, { FC, useEffect, useState } from 'react';
import { CalendarDays, Trash2, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';
import { todayInMorocco } from '@/domain/calendar/calendar';
import type { PedagogicalEvent } from '@/types';
import { cn } from '@/lib/utils';

export interface EventDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PedagogicalEvent | null;
  onSave: (event: PedagogicalEvent, date: string, endDate?: string) => void;
}

const formatDisplayDate = (iso: string | undefined): string => {
  if (!iso) return 'JJ/MM/AAAA';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export const EventDateModal: FC<EventDateModalProps> = ({
  isOpen,
  onClose,
  event,
  onSave,
}) => {
  const { locale, isRtl } = useLocale();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRange, setIsRange] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      const initialStart = event.date || todayInMorocco();
      setStartDate(initialStart);
      const hasRange = Boolean(event.endDate && event.endDate !== event.date);
      setIsRange(hasRange);
      setEndDate(hasRange ? (event.endDate || '') : '');
    }
  }, [isOpen, event]);

  if (!event) return null;

  const handleApply = () => {
    if (!startDate) return;
    const finalEnd = isRange && endDate && endDate >= startDate ? endDate : undefined;
    onSave(event, startDate, finalEnd);
    onClose();
  };

  const handleClearDate = () => {
    onSave(event, '', undefined);
    onClose();
  };

  const copy = {
    title: locale === 'ar' ? 'تاريخ النشاط التربوي' : 'Date de l’activité',
    startDate: isRange
      ? (locale === 'ar' ? 'تاريخ البداية' : 'Date de début')
      : (locale === 'ar' ? 'تاريخ الإجراء' : 'Date d’exécution'),
    endDate: locale === 'ar' ? 'تاريخ النهاية' : 'Date de fin',
    singleDateMode: locale === 'ar' ? 'تاريخ محدد' : 'Séance unique',
    rangeMode: locale === 'ar' ? 'فترة ممتدة' : 'Période (plage)',
    clearDate: locale === 'ar' ? 'إزالة التاريخ' : 'Retirer la date',
    cancel: locale === 'ar' ? 'إلغاء' : 'Annuler',
    apply: locale === 'ar' ? 'تأكيد' : 'Appliquer',
    hintRange: locale === 'ar'
      ? 'حدد تاريخ بداية النشاط ونهايته في التقويم.'
      : 'Définissez la plage de dates pour cette activité.',
    hintSingle: locale === 'ar'
      ? 'حدد تاريخ إجراء هذا النشاط التربوي.'
      : 'Attribuez la date d’exécution de cette activité.',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      className="evaluation-modal sm:rounded-2xl"
      headerClassName="border-b border-border/60 bg-background/95 px-5 py-4"
      bodyClassName="px-5 py-4 space-y-4"
      title={
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground leading-snug">{copy.title}</h3>
            <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5" dir="auto">{event.title}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-sans">
        {/* Choix du mode : Date unique vs Période */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60 gap-1 w-full">
            <button
              type="button"
              onClick={() => setIsRange(false)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none text-center",
                !isRange
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {copy.singleDateMode}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRange(true);
                if (!endDate) setEndDate(startDate || todayInMorocco());
              }}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none text-center",
                isRange
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {copy.rangeMode}
            </button>
          </div>
        </div>

        {/* Champs de date */}
        <div className={cn("grid gap-3", isRange ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          {/* Date de début */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground text-start">
              {copy.startDate}
            </label>
            <div className="relative flex items-center justify-between w-full h-11 px-3.5 rounded-xl border border-border/80 bg-background shadow-xs hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-primary/20">
              <span className="text-sm font-bold tracking-wide text-foreground tabular-nums" dir="ltr">
                {formatDisplayDate(startDate)}
              </span>
              <CalendarDays className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                onClick={(e) => {
                  try {
                    if (typeof e.currentTarget.showPicker === 'function') {
                      e.currentTarget.showPicker();
                    }
                  } catch {}
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label={copy.startDate}
              />
            </div>
          </div>

          {/* Date de fin si mode période */}
          {isRange && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <label className="block text-xs font-bold text-foreground text-start">
                {copy.endDate}
              </label>
              <div className="relative flex items-center justify-between w-full h-11 px-3.5 rounded-xl border border-border/80 bg-background shadow-xs hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                <span className="text-sm font-bold tracking-wide text-foreground tabular-nums" dir="ltr">
                  {formatDisplayDate(endDate)}
                </span>
                <CalendarDays className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        e.currentTarget.showPicker();
                      }
                    } catch {}
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label={copy.endDate}
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-start">
          {isRange ? copy.hintRange : copy.hintSingle}
        </p>

        {/* Pied de modal avec actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
          {event.date ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearDate}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold px-2.5 h-9"
            >
              <Trash2 className="h-3.5 w-3.5 me-1.5" />
              {copy.clearDate}
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-medium h-9 px-3"
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="text-xs font-bold h-9 px-4 bg-primary text-primary-foreground hover:brightness-110"
            >
              <Check className="h-3.5 w-3.5 me-1.5" />
              {copy.apply}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
