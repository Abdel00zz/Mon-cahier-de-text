import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import { dateTimeFormat } from '@/lib/formatters';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/i18n/LocaleProvider';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { addDaysIso } from '@/domain/notebook/dataUtils';
import { localizedActivityTitle } from '@/domain/evaluations/activityTitle';
import { endOfMonthIso, isoToLocalDate, localDateToIso, MONTHS_LIST, WEEKDAYS } from './eventDateCalendar';
import { eventDateCopy, type EventDateModalProps } from './eventDateModel';
import './dateCalendar.css';


/** Mois de l'année scolaire, dans l'ordre de l'année (septembre → juillet). */
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
  const effectiveEventTitle = useMemo(() => {
    if (propTitle) return propTitle;
    if (event?.title) return localizedActivityTitle(event.title, event.type, locale);
    return null;
  }, [propTitle, event, locale]);
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

  // Sélection d'un jour dans le calendrier interactif (sans décalage de fuseau horaire)
  const selectIsoDate = (iso: string) => {
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
    const iso = endOfMonthIso(startDate || today);
    setStartDate(iso);
    jumpToDate(iso);
  };

  const displayedMonth = useMemo(
    () => new Date(viewYear, viewMonth - 1, 1, 12, 0, 0, 0),
    [viewYear, viewMonth],
  );

  // Libellé en clair de la date choisie
  const formattedSelectedDate = useMemo(() => {
    if (!startDate) return t('dateModal.none');
    try {
      const format = dateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      const formattedStart = format.format(isoToLocalDate(startDate));
      if (isRange && endDate && endDate !== startDate) {
        return t('evaluations.dateRange', { start: formattedStart, end: format.format(isoToLocalDate(endDate)) });
      }
      return formattedStart;
    } catch {
      return startDate;
    }
  }, [startDate, endDate, isRange, locale, t]);

  const copy = eventDateCopy(t);

  const weekdaysHeader = WEEKDAYS[locale] ?? WEEKDAYS.fr;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      mobilePresentation="sheet"
      className="claude-sheet-dialog"
      headerClassName="border-b-0 px-5 pt-3 pb-1 bg-transparent"
      bodyClassName="px-5 py-2 space-y-2.5 font-sans"
      footerClassName="border-t-0 px-5 py-3 bg-transparent"
      title={
        <div className="claude-sheet-header p-0">
          <div className="flex-1 min-w-0">
            <h2 className="claude-sheet-title">
              {copy.title}
            </h2>
            {effectiveEventTitle && effectiveEventTitle !== copy.title && (
              <p className="claude-sheet-subtitle truncate font-medium">
                {effectiveEventTitle}
              </p>
            )}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {(startDate || event?.date) ? (
            <button
              type="button"
              onClick={handleClearDate}
              className="claude-btn-danger h-11 px-3 text-xs"
            >
              <span>{copy.clearDate}</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2 ms-auto">
            <button
              type="button"
              onClick={handleApply}
              disabled={!startDate}
              className="claude-btn-primary h-11 px-5 text-xs font-semibold w-auto"
            >
              {copy.apply}
            </button>
          </div>
        </div>
      }
    >
      <div className="date-cal-theme space-y-2.5 font-sans">
        {/* Aperçu dynamique de la date sélectionnée */}
        <div className="date-cal-preview flex items-center justify-between gap-2 rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="date-cal-preview__dot h-2 w-2 rounded-full shrink-0" />
            <span className="text-xs sm:text-[13px] font-semibold text-foreground capitalize truncate">
              {formattedSelectedDate}
            </span>
          </div>
          {startDate && (
            <span className="date-cal-preview__iso text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0" dir="ltr">
              {startDate.split('-').reverse().join('/')}
            </span>
          )}
        </div>

        {/* Mode Date unique vs Période (si activé) */}
        {allowRange && (
          <Tabs
            value={isRange ? 'range' : 'single'}
            onValueChange={(val) => {
              if (val === 'single') {
                setIsRange(false);
                setActiveTarget('start');
              } else {
                setIsRange(true);
                if (!endDate) setEndDate(startDate || today);
              }
            }}
          >
            <TabsList className="date-cal-tabs flex w-full items-center justify-between gap-1 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="single"
                className="date-cal-tab flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none text-center"
              >
                {copy.singleDateMode}
              </TabsTrigger>
              <TabsTrigger
                value="range"
                className="date-cal-tab flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none text-center"
              >
                {copy.rangeMode}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Raccourcis rapides : compacts et fluides */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => applyPreset(0)}
            className="date-cal-preset"
          >
            {copy.todayBtn}
          </button>
          <button
            type="button"
            onClick={() => applyPreset(1)}
            className="date-cal-preset"
          >
            {copy.tomorrowBtn}
          </button>
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className="date-cal-preset"
          >
            {copy.plusWeekBtn}
          </button>
          <button
            type="button"
            onClick={() => applyPreset(14)}
            className="date-cal-preset"
          >
            {copy.plusTwoWeeksBtn}
          </button>
          <button
            type="button"
            onClick={applyEndOfMonth}
            className="date-cal-preset"
          >
            {copy.endMonthBtn}
          </button>
        </div>

        {/* Sélecteur de mois & année direct (SANS FLÈCHE) */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {copy.month}
            </span>
            <div className="date-cal-years flex items-center gap-1 rounded-lg p-0.5">
              {[2025, 2026, 2027].map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setViewYear(year)}
                  aria-pressed={viewYear === year}
                  data-active={viewYear === year ? '' : undefined}
                  className="date-cal-chip date-cal-chip--year px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer tabular-nums"
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
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
                  className="date-cal-chip px-2.5 py-1 rounded-lg text-[11.5px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille calendrier interactive via react-day-picker (navigation clavier, RTL et plages continues) */}
        <DayPicker
          month={displayedMonth}
          onMonthChange={(nextMonth) => {
            setViewYear(nextMonth.getFullYear());
            setViewMonth(nextMonth.getMonth() + 1);
          }}
          weekStartsOn={1}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          hideNavigation
          showOutsideDays={false}
          onDayClick={(date) => selectIsoDate(localDateToIso(date))}
          formatters={{
            formatWeekdayName: (date) => weekdaysHeader[(date.getDay() + 6) % 7] ?? '',
          }}
          classNames={{
            root: 'date-cal',
            months: 'block',
            month: 'block',
            month_caption: 'sr-only',
            month_grid: 'w-full border-collapse table-fixed',
            weekdays: 'grid grid-cols-7 text-center',
            weekday: 'date-cal__weekday',
            weeks: 'block',
            week: 'date-cal__grid grid grid-cols-7 gap-y-0.5',
            day: 'p-0 h-[38px] w-full',
            day_button: 'date-cal__day',
          }}
          components={{
            DayButton: ({ day, modifiers, ...buttonProps }: DayButtonProps) => {
              const btnRef = useRef<HTMLButtonElement>(null);
              useEffect(() => {
                if (modifiers.focused) btnRef.current?.focus();
              }, [modifiers.focused]);
              const iso = localDateToIso(day.date);
              const isSelectedStart = iso === startDate;
              const isSelectedEnd = isRange && iso === endDate;
              const isInRange = isRange && Boolean(startDate) && Boolean(endDate) && iso > startDate && iso < endDate;
              const hasSpan = isRange && Boolean(startDate) && Boolean(endDate) && endDate > startDate;
              const rangeState = !hasSpan ? undefined
                : isSelectedStart ? 'start'
                : isSelectedEnd ? 'end'
                : isInRange ? 'middle'
                : undefined;
              const isToday = iso === today;
              const isSunday = day.date.getDay() === 0;

              return (
                <button
                  {...buttonProps}
                  ref={btnRef}
                  type="button"
                  aria-pressed={isSelectedStart || isSelectedEnd}
                  aria-current={isToday ? 'date' : undefined}
                  data-selected={isSelectedStart || isSelectedEnd ? '' : undefined}
                  data-range={rangeState}
                  data-today={isToday ? '' : undefined}
                  data-inactive={isSunday ? '' : undefined}
                  className="date-cal__day"
                >
                  <span className="date-cal__num">{day.date.getDate()}</span>
                </button>
              );
            },
          }}
        />
      </div>
    </Modal>
  );
};
