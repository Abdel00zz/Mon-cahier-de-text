import { type FC, useEffect, useMemo, useState } from 'react';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
import { dateTimeFormat } from '@/lib/formatters';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { addDaysIso } from '@/domain/notebook/dataUtils';
import type { PedagogicalEvent } from '@/types';
import { cn } from '@/lib/utils';
import './dateCalendar.css';

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

/** Mois de l'année scolaire, dans l'ordre de l'année (septembre → juillet). */
const MONTHS_LIST: { m: number; fr: string; ar: string; en: string }[] = [
  { m: 9, fr: 'Sept', ar: 'شتنبر', en: 'Sep' },
  { m: 10, fr: 'Oct', ar: 'أكتوبر', en: 'Oct' },
  { m: 11, fr: 'Nov', ar: 'نونبر', en: 'Nov' },
  { m: 12, fr: 'Déc', ar: 'دجنبر', en: 'Dec' },
  { m: 1, fr: 'Janv', ar: 'يناير', en: 'Jan' },
  { m: 2, fr: 'Févr', ar: 'فبراير', en: 'Feb' },
  { m: 3, fr: 'Mars', ar: 'مارس', en: 'Mar' },
  { m: 4, fr: 'Avr', ar: 'أبريل', en: 'Apr' },
  { m: 5, fr: 'Mai', ar: 'ماي', en: 'May' },
  { m: 6, fr: 'Juin', ar: 'يونيو', en: 'Jun' },
  { m: 7, fr: 'Juil', ar: 'يوليوز', en: 'Jul' },
];

/** Semaine du lundi au dimanche ; en arabe, la grille se lit de droite à gauche. */
const WEEKDAYS = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  ar: ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
  const { locale, t } = useLocale();
  const effectiveTitle = propTitle || event?.title || t('dateModal.fallbackTitle');
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
    if (!startDate) return t('dateModal.none');
    try {
      const format = dateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      const asDate = (iso: string) => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d);
      };
      const formattedStart = format.format(asDate(startDate));
      if (isRange && endDate && endDate !== startDate) {
        return t('evaluations.dateRange', { start: formattedStart, end: format.format(asDate(endDate)) });
      }
      return formattedStart;
    } catch {
      return startDate;
    }
  }, [startDate, endDate, isRange, locale, t]);

  const copy = {
    title: t('dateModal.title'),
    singleDateMode: t('dateModal.single'),
    rangeMode: t('dateModal.range'),
    clearDate: t('dateModal.clear'),
    cancel: t('common.cancel'),
    apply: t('dateModal.apply'),
    todayBtn: t('dateModal.today'),
    tomorrowBtn: t('dateModal.tomorrow'),
    plusWeekBtn: t('dateModal.plusWeek'),
    plusTwoWeeksBtn: t('dateModal.plusTwoWeeks'),
    endMonthBtn: t('dateModal.endMonth'),
    month: t('dateModal.month'),
  };

  const weekdaysHeader = WEEKDAYS[locale] ?? WEEKDAYS.fr;

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
        <div className="min-w-0">
          <span className="block text-[15px] font-extrabold leading-tight tracking-[-0.015em] text-foreground rtl:tracking-normal sm:text-base">{copy.title}</span>
          <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5" dir="auto">{effectiveTitle}</p>
        </div>
      }
    >
      <div className="date-cal-theme space-y-3.5 font-sans">
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

        {/* Raccourcis : ils suivent le sens de lecture de la langue */}
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => applyPreset(0)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border/50 hover:border-primary/40 cursor-pointer transition-all active:scale-95"
          >
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
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider rtl:tracking-normal">
              {copy.month}
            </span>
            <div className="flex items-center gap-1">
              {[2025, 2026, 2027].map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setViewYear(year)}
                  aria-pressed={viewYear === year}
                  data-active={viewYear === year ? '' : undefined}
                  className={cn(
                    "date-cal-chip px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer",
                    viewYear === year
                      ? "shadow-xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {MONTHS_LIST.map((month) => {
              const { m } = month;
              const label = month[locale] ?? month.fr;
              const isActive = viewMonth === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMonth(m)}
                  aria-pressed={isActive}
                  data-active={isActive ? '' : undefined}
                  className={cn(
                    "date-cal-chip px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                    isActive
                      ? "shadow-xs"
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
        <div className="date-cal">
          {/* En-tête des jours de la semaine */}
          <div className="grid grid-cols-7 text-center" aria-hidden="true">
            {weekdaysHeader.map((d, idx) => (
              <span key={idx} className="date-cal__weekday">
                {d}
              </span>
            ))}
          </div>

          {/* Grille des jours du mois : lundi en tête de ligne, à droite en arabe ;
              bande continue pour une période */}
          <div className="date-cal__grid grid grid-cols-7 gap-y-1">
            {/* Cases vides pour le décalage */}
            {Array.from({ length: emptyPrefixCount }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-11 w-full" aria-hidden="true" />
            ))}

            {/* Jours du mois */}
            {Array.from({ length: daysCount }).map((_, idx) => {
              const day = idx + 1;
              const iso = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
              const isSelectedStart = iso === startDate;
              const isSelectedEnd = isRange && iso === endDate;
              const isInRange = isRange && startDate && endDate && iso > startDate && iso < endDate;
              const hasSpan = isRange && Boolean(startDate) && Boolean(endDate) && endDate > startDate;
              const range = !hasSpan ? undefined
                : isSelectedStart ? 'start'
                : isSelectedEnd ? 'end'
                : isInRange ? 'middle'
                : undefined;
              const isToday = iso === today;
              const isSunday = (emptyPrefixCount + idx) % 7 === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  aria-pressed={isSelectedStart || isSelectedEnd}
                  aria-current={isToday ? 'date' : undefined}
                  data-selected={isSelectedStart || isSelectedEnd ? '' : undefined}
                  data-range={range}
                  data-today={isToday ? '' : undefined}
                  data-inactive={isSunday ? '' : undefined}
                  className="date-cal__day"
                >
                  <span className="date-cal__num">{day}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pied de modal avec actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
          {(startDate || event?.date) ? (
            <AnimatedTrashButton
              label={copy.clearDate}
              variant="ghost"
              size="sm"
              onClick={handleClearDate}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold px-2.5 h-9"
            />
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
              {copy.apply}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
