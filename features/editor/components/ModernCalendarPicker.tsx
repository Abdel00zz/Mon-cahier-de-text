import { FC, useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  CalendarCheck,
  TriangleAlert,
  Clock,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';
import { todayInMorocco } from '@/utils/calendar';

export interface ModernCalendarPickerProps {
  value: string;
  onChange: (dateISO: string) => void;
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

const toISO = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

const parseISO = (iso: string): { year: number; month: number; day: number } | null => {
  if (!iso || typeof iso !== 'string') return null;
  const parts = iso.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
};

const addDaysToISO = (iso: string, offset: number): string => {
  const parsed = parseISO(iso);
  if (!parsed) return iso;
  const date = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
  date.setUTCDate(date.getUTCDate() + offset);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const WEEKDAYS_MAP: Record<AppLocale, string[]> = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  ar: ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const MONTH_NAMES_MAP: Record<AppLocale, string[]> = {
  fr: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ],
  ar: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
    'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

const SHORT_MONTHS_MAP: Record<AppLocale, string[]> = {
  fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const ModernCalendarPicker: FC<ModernCalendarPickerProps> = ({
  value,
  onChange,
  getDateWarnings,
  className = '',
}) => {
  const { locale, t } = useLocale();
  const todayISO = useMemo(() => todayInMorocco(), []);
  const todayParsed = useMemo(() => parseISO(todayISO) || { year: new Date().getFullYear(), month: new Date().getMonth(), day: new Date().getDate() }, [todayISO]);

  const initialParsed = useMemo(() => parseISO(value) || todayParsed, [value, todayParsed]);

  // View state (which month/year is currently being browsed)
  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonth, setViewMonth] = useState(initialParsed.month);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Sync view when incoming value changes substantially
  const handleDateSelect = useCallback((dateISO: string) => {
    onChange(dateISO);
    const parsed = parseISO(dateISO);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    // Haptic feedback for touch devices
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    } catch {
      // Safe ignore
    }
  }, [onChange]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(todayParsed.year);
    setViewMonth(todayParsed.month);
    handleDateSelect(todayISO);
  };

  // Month grid calculation (Monday first)
  const calendarDays = useMemo(() => {
    // First day of current view month
    const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1));
    // Day of week: 0 is Sun, 1 is Mon, ..., 6 is Sat.
    // In our European / Moroccan week (Mon=0, Sun=6):
    const firstDayOfWeek = (firstDay.getUTCDay() + 6) % 7;

    // Number of days in view month
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

    // Days in previous month
    const prevMonthDays = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

    const days: Array<{
      iso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isWeekend: boolean;
      hasWarning: boolean;
    }> = [];

    // Preceding month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = toISO(prevY, prevM, d);
      const isWeekend = ((days.length % 7) === 5 || (days.length % 7) === 6);
      days.push({
        iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSelected: iso === value,
        isWeekend,
        hasWarning: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toISO(viewYear, viewMonth, d);
      const dayIndex = days.length % 7;
      const isWeekend = (dayIndex === 5 || dayIndex === 6);
      const warnings = (getDateWarnings ? getDateWarnings(iso) : []);
      days.push({
        iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        isSelected: iso === value,
        isWeekend,
        hasWarning: warnings.length > 0,
      });
    }

    // Trailing month padding (fill up to 35 or 42 slots)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = toISO(nextY, nextM, d);
      const dayIndex = days.length % 7;
      const isWeekend = (dayIndex === 5 || dayIndex === 6);
      days.push({
        iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSelected: iso === value,
        isWeekend,
        hasWarning: false,
      });
    }

    return days;
  }, [viewYear, viewMonth, todayISO, value, getDateWarnings]);

  const weekdays = WEEKDAYS_MAP[locale] || WEEKDAYS_MAP.fr;
  const monthNames = MONTH_NAMES_MAP[locale] || MONTH_NAMES_MAP.fr;
  const shortMonths = SHORT_MONTHS_MAP[locale] || SHORT_MONTHS_MAP.fr;

  // Selected date full readout
  const formattedFullDate = useMemo(() => {
    if (!value) return null;
    try {
      const parts = value.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
        return d.toLocaleDateString(localeCode, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch {
      return value;
    }
    return value;
  }, [value, locale]);

  // Current selected date warnings
  const selectedDateWarnings = useMemo(() => {
    return value && getDateWarnings ? getDateWarnings(value) : [];
  }, [value, getDateWarnings]);

  return (
    <div className={`flex flex-col select-none ${className}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* 1. Quick Presets Bar (Designed for thumb reach on mobile) */}
      <div className="mb-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => handleDateSelect(addDaysToISO(todayISO, -1))}
          className={`touch-target touch-manipulation cursor-pointer flex h-9 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-bold transition-all active:scale-95 ${
            value === addDaysToISO(todayISO, -1)
              ? 'border-primary bg-primary text-primary-foreground shadow-xs'
              : 'border-border/70 bg-card hover:bg-muted/70 text-foreground'
          }`}
        >
          {t('assignDate.yesterday')}
        </button>
        <button
          type="button"
          onClick={() => handleDateSelect(todayISO)}
          className={`touch-target touch-manipulation cursor-pointer flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all active:scale-95 ${
            value === todayISO
              ? 'border-primary bg-primary text-primary-foreground shadow-xs'
              : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
          }`}
        >
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
          <span>{t('assignDate.today')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleDateSelect(addDaysToISO(todayISO, 1))}
          className={`touch-target touch-manipulation cursor-pointer flex h-9 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-bold transition-all active:scale-95 ${
            value === addDaysToISO(todayISO, 1)
              ? 'border-primary bg-primary text-primary-foreground shadow-xs'
              : 'border-border/70 bg-card hover:bg-muted/70 text-foreground'
          }`}
        >
          {t('assignDate.tomorrow')}
        </button>
        <button
          type="button"
          onClick={() => handleDateSelect(addDaysToISO(todayISO, 7))}
          className={`touch-target touch-manipulation cursor-pointer flex h-9 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-bold transition-all active:scale-95 ${
            value === addDaysToISO(todayISO, 7)
              ? 'border-primary bg-primary text-primary-foreground shadow-xs'
              : 'border-border/70 bg-card hover:bg-muted/70 text-foreground'
          }`}
        >
          +7 {locale === 'ar' ? 'أيام' : locale === 'en' ? 'days' : 'jours'}
        </button>
      </div>

      {/* 2. Calendar Header (Month / Year Navigation & Quick Selector) */}
      <div className="rounded-2xl border border-border/80 bg-card/90 p-3 shadow-xs sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen(open => !open)}
              className="touch-target flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-bold text-foreground hover:bg-muted/70 active:scale-95 transition-transform"
              aria-label="Sélectionner le mois et l'année"
            >
              <span>{monthNames[viewMonth]} {viewYear}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleJumpToToday}
              title={t('assignDate.today')}
              aria-label={t('assignDate.today')}
              className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 active:scale-90"
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              aria-label="Mois précédent"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-90"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              aria-label="Mois suivant"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-90"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 3. Quick Month Selector Grid (when month header clicked) */}
        {isMonthPickerOpen ? (
          <div className="animate-fade-in py-2">
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Année scolaire</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewYear(y => y - 1)}
                  className="h-7 w-7 rounded-lg"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-sm font-bold text-foreground tabular-nums">{viewYear}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewYear(y => y + 1)}
                  className="h-7 w-7 rounded-lg"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {shortMonths.map((mName, mIdx) => {
                const isCurrentMonth = mIdx === viewMonth;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setViewMonth(mIdx);
                      setIsMonthPickerOpen(false);
                    }}
                    className={`touch-target flex h-11 items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      isCurrentMonth
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                    }`}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* 4. Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {weekdays.map((day, idx) => {
                const isWeekend = idx === 5 || idx === 6;
                return (
                  <div
                    key={day}
                    className={`py-1 text-[11px] font-bold uppercase tracking-wider ${
                      isWeekend ? 'text-muted-foreground/60' : 'text-muted-foreground'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* 5. Days Grid (44px touch targets conforming to Fitts' law) */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell) => {
                const {
                  iso,
                  dayNumber,
                  isCurrentMonth,
                  isToday,
                  isSelected,
                  isWeekend,
                  hasWarning,
                } = cell;

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => handleDateSelect(iso)}
                    className={`group relative flex min-h-[44px] min-w-[40px] flex-col items-center justify-center rounded-xl transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm scale-100'
                        : isToday
                        ? 'bg-primary/10 text-primary font-bold ring-1.5 ring-primary/40'
                        : isCurrentMonth
                        ? isWeekend
                          ? 'text-muted-foreground/75 hover:bg-muted/50'
                          : 'text-foreground hover:bg-muted/80'
                        : 'text-muted-foreground/35 hover:bg-muted/40'
                    }`}
                    aria-label={iso}
                  >
                    <span className="text-xs sm:text-sm tabular-nums leading-none">
                      {dayNumber}
                    </span>

                    {/* Warning dot indicator */}
                    {hasWarning && !isSelected && (
                      <span
                        className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shadow-2xs"
                        title="Avertissement pour cette date"
                      />
                    )}
                    {isToday && !isSelected && !hasWarning && (
                      <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 6. Formatted Date Readout Banner */}
      {formattedFullDate && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.06] px-3.5 py-2.5 text-start">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Date sélectionnée
              </span>
              <span className="block text-xs sm:text-sm font-bold capitalize text-foreground truncate">
                {formattedFullDate}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-primary tabular-nums" dir="ltr">
            {value.split('-').reverse().join('/')}
          </span>
        </div>
      )}

      {/* 7. Warnings Notification Banner */}
      {selectedDateWarnings.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 text-start animate-fade-in" role="status">
          {selectedDateWarnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] font-medium leading-snug text-amber-900 dark:text-amber-200">
              <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{warning.message}</span>
            </div>
          ))}
          <p className="ps-5 text-[11px] text-amber-700/80 dark:text-amber-400 font-medium">
            {t('assignDate.warningOverride')}
          </p>
        </div>
      )}
    </div>
  );
};
