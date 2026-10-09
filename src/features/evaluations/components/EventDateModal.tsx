import { type FC, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Trash2, Check, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { addDaysIso } from '@/domain/notebook/dataUtils';
import type { PedagogicalEvent } from '@/types';
import { cn } from '@/lib/utils';

export interface EventDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: PedagogicalEvent | null;
  title?: string;
  initialDate?: string;
  initialEndDate?: string;
  allowRange?: boolean;
  onSave?: (event: PedagogicalEvent, date: string, endDate?: string) => void;
  onApplyDate?: (date: string, endDate?: string) => void;
}

const MONTHS_LIST = [
  { m: 9, fr: 'Sept', ar: 'شتنبر' },
  { m: 10, fr: 'Oct', ar: 'أكتوبر' },
  { m: 11, fr: 'Nov', ar: 'نونبر' },
  { m: 12, fr: 'Déc', ar: 'دجنبر' },
  { m: 1, fr: 'Janv', ar: 'يناير' },
  { m: 2, fr: 'Févr', ar: 'فبراير' },
  { m: 3, fr: 'Mars', ar: 'مارس' },
  { m: 4, fr: 'Avr', ar: 'أبريل' },
  { m: 5, fr: 'Mai', ar: 'ماي' },
  { m: 6, fr: 'Juin', ar: 'يونيو' },
  { m: 7, fr: 'Juil', ar: 'يوليوز' },
];

const WEEKDAYS = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  ar: ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'],
};

const pad = (n: number) => String(n).padStart(2, '0');

export const EventDateModal: FC<EventDateModalProps> = ({
  isOpen,
  onClose,
  event,
  title: propTitle,
  initialDate: propInitialDate,
  initialEndDate: propInitialEndDate,
  allowRange = true,
  onSave,
  onApplyDate,
}) => {
  const { locale } = useLocale();
  const effectiveTitle = propTitle || event?.title || (locale === 'ar' ? 'تاريخ التقييم' : 'Date de l’évaluation');
  const today = useMemo(() => todayInMorocco(), []);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRange, setIsRange] = useState(false);
  const [activeTarget, setActiveTarget] = useState<'start' | 'end'>('start');

  // Mois et Année affichés dans le calendrier interactif
  const [viewYear, setViewYear] = useState(() => Number(today.split('-')[0]) || 2026);
  const [viewMonth, setViewMonth] = useState(() => Number(today.split('-')[1]) || 9);

  useEffect(() => {
    if (!isOpen) return;
    const start = propInitialDate ?? (event?.date || '');
    const end = propInitialEndDate ?? (event?.endDate || '');
    setStartDate(start);
    setEndDate(end);
    const hasRange = Boolean(allowRange && end && end !== start);
    setIsRange(hasRange);
    setActiveTarget('start');

    const baseDate = start || today;
    const parts = baseDate.split('-');
    if (parts.length === 3) {
      setViewYear(Number(parts[0]) || 2026);
      setViewMonth(Number(parts[1]) || 9);
    }
  }, [isOpen, event, propInitialDate, propInitialEndDate, allowRange, today]);

  // Synchronise la vue mois/année avec une date donnée
  const jumpToDate = (iso: string) => {
    const parts = iso.split('-');
    if (parts.length === 3) {
      setViewYear(Number(parts[0]));
      setViewMonth(Number(parts[1]));
    }
  };

  const handleApply = () => {
    if (!startDate) return;
    const finalEnd = isRange && endDate && endDate >= startDate ? endDate : undefined;
    if (event && onSave) {
      onSave(event, startDate, finalEnd);
    }
    if (onApplyDate) {
      onApplyDate(startDate, finalEnd);
    }
    onClose();
  };

  const handleClearDate = () => {
    if (event && onSave) {
      onSave(event, '', undefined);
    }
    if (onApplyDate) {
      onApplyDate('', undefined);
    }
    onClose();
  };

  // Sélection d'un jour dans le calendrier interactif
  const selectDay = (day: number) => {
    const iso = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
    if (!isRange || activeTarget === 'start') {
      setStartDate(iso);
      if (isRange && endDate && iso > endDate) {
        setEndDate(iso);
      }
      if (isRange) {
        setActiveTarget('end');
      }
    } else {
      if (iso < startDate) {
        setStartDate(iso);
      } else {
        setEndDate(iso);
      }
      setActiveTarget('start');
    }
  };

  // Raccourcis rapides (Presets 1-clic)
  const applyPreset = (daysOffset: number) => {
    const iso = addDaysIso(today, daysOffset);
    setStartDate(iso);
    jumpToDate(iso);
    if (isRange) {
      setEndDate(iso);
    }
  };

  const applyEndOfMonth = () => {
    const parts = (startDate || today).split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const lastDay = new Date(y, m, 0).getDate();
    const iso = `${y}-${pad(m)}-${pad(lastDay)}`;
    setStartDate(iso);
    jumpToDate(iso);
  };

  // Calcul des cases de la grille du mois
  const { emptyPrefixCount, daysCount } = useMemo(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth, 0).getDate();
    // 0 = Lundi, 6 = Dimanche
    const firstDayIndex = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
    return {
      emptyPrefixCount: firstDayIndex,
      daysCount: daysInCurrentMonth,
    };
  }, [viewYear, viewMonth]);

  // Libellé en clair de la date choisie
  const formattedSelectedDate = useMemo(() => {
    if (!startDate) return locale === 'ar' ? 'لم يتم تحديد تاريخ' : 'Aucune date sélectionnée';
    try {
      const [y, m, d] = startDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const localeCode = locale === 'ar' ? 'ar-MA' : 'fr-FR';
      const formattedStart = new Intl.DateTimeFormat(localeCode, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(dateObj);

      if (isRange && endDate && endDate !== startDate) {
        const [ey, em, ed] = endDate.split('-').map(Number);
        const endDateObj = new Date(ey, em - 1, ed);
        const formattedEnd = new Intl.DateTimeFormat(localeCode, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(endDateObj);
        return locale === 'ar'
          ? `من ${formattedStart} إلى ${formattedEnd}`
          : `Du ${formattedStart} au ${formattedEnd}`;
      }
      return formattedStart;
    } catch {
      return startDate;
    }
  }, [startDate, endDate, isRange, locale]);

  const copy = {
    title: locale === 'ar' ? 'تحديد التاريخ' : 'Planification de la date',
    singleDateMode: locale === 'ar' ? 'جلسة محددة' : 'Date unique',
    rangeMode: locale === 'ar' ? 'فترة ممتدة' : 'Période (plage)',
    clearDate: locale === 'ar' ? 'إزالة التاريخ' : 'Retirer',
    cancel: locale === 'ar' ? 'إلغاء' : 'Annuler',
    apply: locale === 'ar' ? 'تأكيد التاريخ' : 'Valider la date',
    todayBtn: locale === 'ar' ? 'اليوم' : 'Aujourd’hui',
    tomorrowBtn: locale === 'ar' ? 'غداً' : 'Demain',
    plusWeekBtn: locale === 'ar' ? '+7 أيام' : '+7 jours',
    plusTwoWeeksBtn: locale === 'ar' ? '+14 يوماً' : '+14 jours',
    endMonthBtn: locale === 'ar' ? 'نهاية الشهر' : 'Fin du mois',
    startDateLabel: locale === 'ar' ? 'تاريخ البداية' : 'Début',
    endDateLabel: locale === 'ar' ? 'تاريخ النهاية' : 'Fin',
  };

  const weekdaysHeader = locale === 'ar' ? WEEKDAYS.ar : WEEKDAYS.fr;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      mobilePresentation="sheet"
      className="evaluation-modal sm:rounded-xl"
      headerClassName="border-b border-border/50 bg-background/95 px-4 py-3 sm:px-5 sm:py-3.5"
      bodyClassName="px-4 py-3.5 sm:px-5 sm:py-4 space-y-3.5"
      title={
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight sm:text-base">{copy.title}</h3>
            <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5" dir="auto">{effectiveTitle}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5 font-sans">
        {/* Aperçu dynamique de la date sélectionnée */}
        <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            <span className="text-xs sm:text-[13px] font-bold text-foreground capitalize truncate">
              {formattedSelectedDate}
            </span>
          </div>
          {startDate && (
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0" dir="ltr">
              {startDate.split('-').reverse().join('/')}
            </span>
          )}
        </div>

        {/* Mode Date unique vs Période (si activé) */}
        {allowRange && (
          <div className="flex items-center justify-between gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/50">
            <button
              type="button"
              onClick={() => { setIsRange(false); setActiveTarget('start'); }}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer select-none text-center",
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
                if (!endDate) setEndDate(startDate || today);
              }}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer select-none text-center",
                isRange
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {copy.rangeMode}
            </button>
          </div>
        )}

        {/* Raccourcis intelligents (Presets sans flèche) */}
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-1 scrollbar-none" dir="ltr">
          <button
            type="button"
            onClick={() => applyPreset(0)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border/50 hover:border-primary/40 cursor-pointer transition-all active:scale-95"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            {copy.todayBtn}
          </button>
          <button
            type="button"
            onClick={() => applyPreset(1)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border/50 hover:border-primary/40 cursor-pointer transition-all active:scale-95"
          >
            {copy.tomorrowBtn}
          </button>
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border/50 hover:border-primary/40 cursor-pointer transition-all active:scale-95"
          >
            {copy.plusWeekBtn}
          </button>
          <button
            type="button"
            onClick={() => applyPreset(14)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border/50 hover:border-primary/40 cursor-pointer transition-all active:scale-95"
          >
            {copy.plusTwoWeeksBtn}
          </button>
          <button
            type="button"
            onClick={applyEndOfMonth}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border/50 hover:border-primary/40 cursor-pointer transition-all active:scale-95"
          >
            {copy.endMonthBtn}
          </button>
        </div>

        {/* Sélecteur de mois & année direct (SANS FLÈCHE) */}
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {locale === 'ar' ? 'الشهر' : 'Mois'}
            </span>
            <div className="flex items-center gap-1">
              {[2025, 2026, 2027].map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setViewYear(year)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer",
                    viewYear === year
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none" dir="ltr">
            {MONTHS_LIST.map(({ m, fr, ar }) => {
              const label = locale === 'ar' ? ar : fr;
              const isActive = viewMonth === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMonth(m)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                    isActive
                      ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-700 dark:text-white font-bold shadow-xs"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille calendrier interactive */}
        <div className="rounded-lg border border-border/60 bg-card p-3 shadow-2xs">
          {/* En-tête des jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {weekdaysHeader.map((d, idx) => (
              <span
                key={idx}
                className={cn(
                  "text-[10.5px] font-bold uppercase tracking-wider py-0.5",
                  idx === 6 ? "text-destructive/70" : "text-muted-foreground"
                )}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Grille des jours du mois */}
          <div className="grid grid-cols-7 gap-1" dir="ltr">
            {/* Cases vides pour le décalage */}
            {Array.from({ length: emptyPrefixCount }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-full" />
            ))}

            {/* Jours du mois */}
            {Array.from({ length: daysCount }).map((_, idx) => {
              const day = idx + 1;
              const iso = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
              const isSelectedStart = iso === startDate;
              const isSelectedEnd = isRange && iso === endDate;
              const isInRange = isRange && startDate && endDate && iso > startDate && iso < endDate;
              const isToday = iso === today;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "h-8 w-full rounded-md text-xs font-semibold flex items-center justify-center transition-all cursor-pointer select-none",
                    isSelectedStart || isSelectedEnd
                      ? "bg-primary text-primary-foreground font-bold shadow-xs scale-102"
                      : isInRange
                      ? "bg-primary/15 text-primary font-semibold rounded-none"
                      : isToday
                      ? "ring-1.5 ring-primary/60 font-bold text-foreground bg-primary/5 hover:bg-primary/10"
                      : "text-foreground hover:bg-muted/70 active:scale-95"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pied de modal avec actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
          {(startDate || event?.date) ? (
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
              disabled={!startDate}
              className="text-xs font-bold h-9 px-4 bg-zinc-800 text-zinc-100 hover:bg-zinc-900 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
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
