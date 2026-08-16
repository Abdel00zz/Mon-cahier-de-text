import React, { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Check,
} from '@/components/ui/icons';
import {
  getBundledCalendar,
  loadHolidayCalendar,
  localizeCalendarName,
  todayInMorocco,
  type HolidayCalendar,
} from '@/utils/calendar';
import { getDaySessionBlocks } from '@/utils/timetable';
import { collectSessionDates } from '@/utils/printMeta';
import { readClassLessons } from '@/utils/notificationSignals';
import { loadPlanning, resolveClassAssessments, type PlanningFile } from '@/utils/assessments';
import {
  getOfficialStudentEventsFile,
  getOfficialStudentEventsForClass,
  loadOfficialStudentEvents,
  type OfficialStudentEvent,
  type OfficialStudentEventsFile,
} from '@/utils/officialStudentEvents';

type CalendarEventKind = 'lesson' | 'holiday' | 'vacation' | 'official' | 'absence' | 'assessment' | 'pedagogical';
type CalendarLayer = 'all' | 'schedule' | 'breaks' | 'official';

interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  start: string;
  end: string;
  detail?: string;
  classId?: string;
  className?: string;
  category?: OfficialStudentEvent['category'];
  tentative?: boolean;
}

interface NotificationCalendarProps {
  classes: ClassInfo[];
  config: AppConfig;
  selectedClassId: string;
}

const pad = (value: number): string => String(value).padStart(2, '0');
const toISO = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromISO = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (date: Date, amount: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const minuteLabel = (minutes: number): string => `${pad(Math.floor(minutes / 60))}h${minutes % 60 ? pad(minutes % 60) : ''}`;

/* Stylisation moderne et soignée des événements avec contrastes WCAG AA */
const EVENT_STYLES: Record<
  CalendarEventKind,
  {
    dot: string;
    badge: string;
    border: string;
    text: string;
    bgLight: string;
    iconColor: string;
  }
> = {
  lesson: {
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary border-primary/20',
    border: 'border-primary/30',
    text: 'text-primary',
    bgLight: 'bg-primary/[0.04]',
    iconColor: 'text-primary',
  },
  holiday: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    border: 'border-rose-500/30',
    text: 'text-rose-700 dark:text-rose-300',
    bgLight: 'bg-rose-500/[0.05]',
    iconColor: 'text-rose-500',
  },
  vacation: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    bgLight: 'bg-emerald-500/[0.04]',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  official: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    border: 'border-sky-500/30',
    text: 'text-sky-700 dark:text-sky-300',
    bgLight: 'bg-sky-500/[0.04]',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  absence: {
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border/80',
    border: 'border-border',
    text: 'text-muted-foreground',
    bgLight: 'bg-muted/40',
    iconColor: 'text-muted-foreground',
  },
  assessment: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
    border: 'border-amber-500/30',
    text: 'text-amber-800 dark:text-amber-300',
    bgLight: 'bg-amber-500/[0.05]',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  pedagogical: {
    dot: 'bg-purple-500',
    badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-700 dark:text-purple-300',
    bgLight: 'bg-purple-500/[0.04]',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
};

const layerMatches = (event: CalendarEvent, layer: CalendarLayer): boolean => {
  if (layer === 'all') return true;
  if (layer === 'schedule') return event.kind === 'lesson' || event.kind === 'assessment' || event.kind === 'pedagogical';
  if (layer === 'breaks') return event.kind === 'holiday' || event.kind === 'vacation' || event.kind === 'absence';
  return event.kind === 'official';
};

const eventPriority: Record<CalendarEventKind, number> = {
  holiday: 0,
  vacation: 1,
  absence: 2,
  official: 3,
  assessment: 4,
  pedagogical: 5,
  lesson: 6,
};

export const NotificationCalendar: React.FC<NotificationCalendarProps> = ({ classes, config, selectedClassId }) => {
  const { locale, isRtl, t } = useLocale();

  const eventCountLabel = (count: number): string => {
    if (locale !== 'ar') return `${count} ${t('calendar.events')}`;
    if (count === 1) return 'حدث واحد';
    if (count === 2) return 'حدثان';
    return `${count} أحداث`;
  };

  const monthSummaryLabel = (sessions: number, events: number): string => {
    if (locale !== 'ar') return t('calendar.monthSummary', { sessions, events });
    const sessionText = sessions === 1 ? 'حصة واحدة' : sessions === 2 ? 'حصتان' : `${sessions} حصص`;
    const eventText = events === 1 ? 'موعد واحد' : events === 2 ? 'موعدان' : `${events} مواعيد`;
    return `${sessionText} · ${eventText}`;
  };

  const [calendar, setCalendar] = useState<HolidayCalendar>(() => getBundledCalendar());
  const [officialFile, setOfficialFile] = useState<OfficialStudentEventsFile>(() => getOfficialStudentEventsFile());
  const [planning, setPlanning] = useState<PlanningFile | null>(null);
  const today = todayInMorocco(new Date(), calendar);
  const [month, setMonth] = useState(() => {
    const value = fromISO(today);
    return new Date(value.getFullYear(), value.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [layer, setLayer] = useState<CalendarLayer>('all');

  useEffect(() => {
    let active = true;
    Promise.all([loadHolidayCalendar(), loadOfficialStudentEvents(), loadPlanning()]).then(([nextCalendar, nextOfficialFile, nextPlanning]) => {
      if (!active) return;
      setCalendar(nextCalendar);
      setOfficialFile(nextOfficialFile);
      setPlanning(nextPlanning);
    });
    return () => { active = false; };
  }, []);

  const selectedClass = selectedClassId === 'all' ? null : classes.find(item => item.id === selectedClassId) ?? null;
  const relevantClasses = useMemo(() => selectedClass ? [selectedClass] : classes, [classes, selectedClass]);
  const classById = useMemo(() => new Map(classes.map(item => [item.id, item])), [classes]);

  const monthCells = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = addDays(firstDay, -mondayOffset);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [month]);

  const staticEvents = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];

    for (const holiday of calendar.joursFeries) {
      result.push({
        id: `holiday:${holiday.date}:${holiday.nom}`,
        kind: 'holiday',
        title: localizeCalendarName(holiday.nom, locale),
        start: holiday.date,
        end: holiday.date,
        detail: holiday.type === 'religieux' ? t('calendar.religiousHoliday') : t('calendar.nationalHoliday'),
        tentative: Boolean(holiday.approximatif),
      });
    }

    for (const vacation of calendar.vacances) {
      result.push({
        id: `vacation:${vacation.debut}:${vacation.nom}`,
        kind: 'vacation',
        title: localizeCalendarName(vacation.nom, locale),
        start: vacation.debut,
        end: vacation.fin,
        detail: t('calendar.schoolBreak'),
      });
    }

    for (const absence of config.absences ?? []) {
      result.push({
        id: `absence:${absence.debut}:${absence.fin}`,
        kind: 'absence',
        title: absence.motif || t('calendar.teacherAbsence'),
        start: absence.debut,
        end: absence.fin,
        detail: t('calendar.noLessonsPlanned'),
      });
    }

    const officialById = new Map<string, { event: OfficialStudentEvent; classNames: Set<string> }>();
    if (relevantClasses.length === 0) {
      for (const event of officialFile.events) officialById.set(event.id, { event, classNames: new Set() });
    } else {
      for (const classInfo of relevantClasses) {
        for (const event of getOfficialStudentEventsForClass(classInfo, undefined, officialFile)) {
          const current = officialById.get(event.id) ?? { event, classNames: new Set<string>() };
          current.classNames.add(formatLocalizedClassDisplayName(classInfo.name, locale));
          officialById.set(event.id, current);
        }
      }
    }
    for (const { event, classNames } of officialById.values()) {
      result.push({
        id: `official:${event.id}`,
        kind: 'official',
        title: event.title,
        start: event.start,
        end: event.end ?? event.start,
        detail: [...classNames].slice(0, 3).join(' · ') || event.studentAction,
        category: event.category,
        tentative: event.dateKind === 'indicative',
      });
    }

    for (const classInfo of relevantClasses) {
      const assessments = planning ? resolveClassAssessments(classInfo, planning, config, calendar, today) : [];
      for (const assessment of assessments) {
        result.push({
          id: `assessment:${classInfo.id}:${assessment.id}:${assessment.dateISO}`,
          kind: 'assessment',
          title: t('calendar.plannedAssessment'),
          start: assessment.dateISO,
          end: assessment.dateISO,
          detail: `${formatLocalizedClassDisplayName(classInfo.name, locale)} · ${assessment.label}`,
          classId: classInfo.id,
          className: formatLocalizedClassDisplayName(classInfo.name, locale),
        });
      }
      for (const event of config.pedagogicalEvents?.[classInfo.id] ?? []) {
        if (event.status !== 'planned') continue;
        result.push({
          id: `pedagogical:${classInfo.id}:${event.id}`,
          kind: 'pedagogical',
          title: event.title,
          start: event.date,
          end: event.endDate ?? event.date,
          detail: formatLocalizedClassDisplayName(classInfo.name, locale),
          classId: classInfo.id,
          className: formatLocalizedClassDisplayName(classInfo.name, locale),
        });
      }
    }

    return result;
  }, [calendar, config, locale, officialFile, planning, relevantClasses, t, today]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const timetableClassIds = new Set((config.timetable ?? []).map(entry => entry.classId));
    const relevantClassIds = new Set(relevantClasses.map(classInfo => classInfo.id));

    for (const date of monthCells) {
      const iso = toISO(date);
      const dayEvents = staticEvents.filter(event => iso >= event.start && iso <= event.end);
      const closed = dayEvents.some(event => event.kind === 'holiday' || event.kind === 'vacation' || event.kind === 'absence');

      if (!closed) {
        const blocks = getDaySessionBlocks(config.timetable, date.getDay())
          .filter(block => relevantClassIds.has(block.classId));
        for (const block of blocks) {
          const classInfo = classById.get(block.classId);
          if (!classInfo) continue;
          dayEvents.push({
            id: `lesson:${iso}:${block.classId}:${block.startMin}`,
            kind: 'lesson',
            title: formatLocalizedClassDisplayName(classInfo.name, locale),
            start: iso,
            end: iso,
            detail: `${minuteLabel(block.startMin)}–${minuteLabel(block.endMin)}${block.hours > 1 ? ` · ${block.hours} ${locale === 'ar' ? 'س' : 'h'}` : ''}`,
            classId: block.classId,
            className: formatLocalizedClassDisplayName(classInfo.name, locale),
          });
        }

        for (const schedule of config.schedules ?? []) {
          if (!relevantClassIds.has(schedule.classId) || timetableClassIds.has(schedule.classId)) continue;
          const slot = schedule.slots.find(item => item.weekday === date.getDay());
          const classInfo = classById.get(schedule.classId);
          if (!slot || !classInfo) continue;
          dayEvents.push({
            id: `lesson:${iso}:${schedule.classId}`,
            kind: 'lesson',
            title: formatLocalizedClassDisplayName(classInfo.name, locale),
            start: iso,
            end: iso,
            detail: t('calendar.sessionCount', { count: slot.sessions ?? 1 }),
            classId: schedule.classId,
            className: formatLocalizedClassDisplayName(classInfo.name, locale),
          });
        }
      }

      map.set(iso, dayEvents.sort((a, b) => eventPriority[a.kind] - eventPriority[b.kind] || a.title.localeCompare(b.title)));
    }
    return map;
  }, [classById, config.schedules, config.timetable, locale, monthCells, relevantClasses, staticEvents, t]);

  const recordedByClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const classInfo of relevantClasses) {
      map.set(classInfo.id, new Set(collectSessionDates(readClassLessons(classInfo.id))));
    }
    return map;
  }, [relevantClasses]);

  const dayStatus = (iso: string, events: CalendarEvent[]): { status: 'gap' | 'done' | 'planned' | 'none'; planned: number; recorded: number } => {
    const lessons = events.filter(event => event.kind === 'lesson');
    if (lessons.length === 0) return { status: 'none', planned: 0, recorded: 0 };
    const recorded = lessons.filter(lesson => lesson.classId && recordedByClass.get(lesson.classId)?.has(iso)).length;
    if (iso > today) return { status: 'planned', planned: lessons.length, recorded };
    if (recorded >= lessons.length) return { status: 'done', planned: lessons.length, recorded };
    return { status: 'gap', planned: lessons.length, recorded };
  };

  /** Pour les vacances, n'afficher le label que sur le premier jour de la semaine concernée */
  const vacationLabelCells = useMemo(() => {
    const labelCells = new Set<string>();
    const weekAlreadyLabelled = new Set<number>();
    monthCells.forEach((date, index) => {
      const iso = toISO(date);
      const events = eventsByDate.get(iso) ?? [];
      const weekIndex = Math.floor(index / 7);
      if (events.some(event => event.kind === 'vacation') && !weekAlreadyLabelled.has(weekIndex)) {
        weekAlreadyLabelled.add(weekIndex);
        labelCells.add(iso);
      }
    });
    return labelCells;
  }, [eventsByDate, monthCells]);

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const horizontal = isRtl ? -1 : 1;
    const delta =
      event.key === 'ArrowRight' ? horizontal :
      event.key === 'ArrowLeft' ? -horizontal :
      event.key === 'ArrowDown' ? 7 :
      event.key === 'ArrowUp' ? -7 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = addDays(fromISO(selectedDate), delta);
    setSelectedDate(toISO(next));
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  };

  const selectedEvents = (eventsByDate.get(selectedDate) ?? []).filter(event => layerMatches(event, layer));
  const inCurrentMonth = (date: Date): boolean => date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  const currentMonthDates = monthCells.filter(inCurrentMonth);
  const monthEvents = currentMonthDates.flatMap(date => eventsByDate.get(toISO(date)) ?? []);
  const monthLessonCount = monthEvents.filter(event => event.kind === 'lesson').length;
  const monthMilestoneCount = new Set(monthEvents.filter(event => event.kind !== 'lesson').map(event => event.id)).size;

  const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR';
  const monthLabel = new Intl.DateTimeFormat(localeCode, { month: 'long', year: 'numeric' }).format(month);
  const selectedDateLabel = new Intl.DateTimeFormat(localeCode, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fromISO(selectedDate));
  
  // Noms des jours de la semaine débutant par le Lundi
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(2026, 7, 3 + index); // 3 août 2026 est un Lundi
    return {
      short: new Intl.DateTimeFormat(localeCode, { weekday: 'short' }).format(d).replace('.', ''),
      full: new Intl.DateTimeFormat(localeCode, { weekday: 'long' }).format(d),
      isWeekend: index === 5 || index === 6,
    };
  });

  const moveMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelectedDate(toISO(next));
  };

  const goToday = () => {
    const current = fromISO(today);
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setSelectedDate(today);
  };

  const categoryLabel = (event: CalendarEvent): string => {
    if (event.kind === 'lesson') return t('calendar.lesson');
    if (event.kind === 'holiday') return t('calendar.holiday');
    if (event.kind === 'vacation') return t('calendar.vacation');
    if (event.kind === 'absence') return t('calendar.absence');
    if (event.kind === 'assessment') return t('calendar.assessment');
    if (event.kind === 'pedagogical') return t('calendar.pedagogical');
    return t(`calendar.category.${event.category ?? 'school'}`);
  };

  const iconFor = (event: CalendarEvent) => {
    if (event.kind === 'lesson') return GraduationCap;
    if (event.kind === 'assessment') return CalendarCheck;
    if (event.kind === 'pedagogical') return CalendarCheck;
    if (event.kind === 'official') return CalendarRange;
    if (event.kind === 'holiday' || event.kind === 'vacation') return CalendarDays;
    return Clock;
  };

  const layers: Array<{ id: CalendarLayer; label: string }> = [
    { id: 'all', label: t('calendar.layer.all') },
    { id: 'schedule', label: t('calendar.layer.schedule') },
    { id: 'breaks', label: t('calendar.layer.breaks') },
    { id: 'official', label: t('calendar.layer.official') },
  ];

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── BARRE SUPÉRIEURE : NAVIGATION & FILTRES ── */}
      <header className="flex flex-col gap-3.5 rounded-3xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        {/* Navigation Mois & Bouton Aujourd'hui */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-2xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label={t('calendar.previousMonth')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-card hover:text-foreground active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <ChevronLeft className={cn('h-4 w-4', isRtl && 'rotate-180')} />
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label={t('calendar.nextMonth')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-card hover:text-foreground active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <ChevronRight className={cn('h-4 w-4', isRtl && 'rotate-180')} />
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            className="h-10 rounded-2xl border border-primary/25 bg-primary/10 px-4 text-xs font-bold text-primary transition-all hover:bg-primary/15 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/30 shadow-2xs"
          >
            {t('calendar.today')}
          </button>

          <div className="min-w-0 ps-1">
            <h3 className="truncate text-lg sm:text-xl font-black capitalize tracking-tight text-foreground">
              {monthLabel}
            </h3>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {monthSummaryLabel(monthLessonCount, monthMilestoneCount)}
            </p>
          </div>
        </div>

        {/* Filtres de couches (Segmented Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-muted/40 p-1 shadow-2xs" role="tablist" aria-label={t('calendar.layers')}>
          {layers.map(item => {
            const active = layer === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLayer(item.id)}
                className={cn(
                  'h-9 shrink-0 rounded-xl px-3.5 text-xs font-bold transition-all duration-150',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── GRILLE DU CALENDRIER MODERNE ET AÉRÉE ── */}
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xs">
        {/* En-tête des jours de la semaine */}
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
          {weekdayLabels.map((item, index) => (
            <div
              key={`${item.short}-${index}`}
              className={cn(
                'py-3 text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider',
                item.isWeekend ? 'text-muted-foreground/70' : 'text-foreground'
              )}
            >
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.full}</span>
            </div>
          ))}
        </div>

        {/* Cellules du calendrier */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
        <div
          className="grid grid-cols-7 gap-1 sm:gap-1.5 p-1.5 sm:p-2.5 bg-muted/20"
          role="grid"
          tabIndex={0}
          onKeyDown={handleGridKeyDown}
          aria-label={monthLabel}
        >
          {monthCells.map((date) => {
            const iso = toISO(date);
            const allDayEvents = eventsByDate.get(iso) ?? [];
            const visibleEvents = allDayEvents.filter(event => layerMatches(event, layer));
            const current = inCurrentMonth(date);
            const selected = iso === selectedDate;
            const isToday = iso === today;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            const holiday = allDayEvents.find(event => event.kind === 'holiday');
            const vacation = allDayEvents.find(event => event.kind === 'vacation');
            const absence = allDayEvents.find(event => event.kind === 'absence');
            const showVacationLabel = Boolean(vacation) && vacationLabelCells.has(iso);

            const { status } = dayStatus(iso, allDayEvents);
            const nonBreakEvents = visibleEvents.filter(event => event.kind !== 'holiday' && event.kind !== 'vacation');

            // Style de fond aéré et harmonieux
            const cellBg = !current
              ? 'bg-muted/15 border-transparent opacity-40'
              : selected
                ? 'bg-primary/[0.06] border-primary ring-2 ring-primary/40 shadow-xs'
                : isToday
                  ? 'bg-primary/[0.03] border-primary/40 ring-1 ring-primary/30'
                  : holiday
                    ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.08] border-rose-500/20'
                    : vacation
                      ? 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] border-emerald-500/15'
                      : absence
                        ? 'bg-muted/40 border-border/60'
                        : isWeekend
                          ? 'bg-muted/30 border-border/40'
                          : 'bg-card border-border/60 hover:border-border hover:shadow-2xs';

            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                aria-selected={selected}
                onClick={() => setSelectedDate(iso)}
                aria-label={`${date.getDate()} ${monthLabel}${holiday ? `, ${holiday.title}` : ''}${vacation ? `, ${vacation.title}` : ''}, ${eventCountLabel(visibleEvents.length)}`}
                className={cn(
                  'group relative flex min-h-[74px] sm:min-h-[104px] flex-col justify-between rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 text-start transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  cellBg
                )}
              >
                {/* Ligne du haut : Numéro du jour & Indicateur de statut */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={cn(
                      'flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold tabular-nums transition-transform group-hover:scale-105',
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : selected
                          ? 'bg-primary/15 text-primary font-black'
                          : current
                            ? isWeekend ? 'text-muted-foreground' : 'text-foreground'
                            : 'text-muted-foreground/60',
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Badge statut pédagogique (à consigner) */}
                  {status === 'gap' && current && (
                    <span
                      title={t('calendar.legend.gap')}
                      className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500 ring-2 ring-card animate-pulse"
                      aria-hidden
                    />
                  )}
                  {status === 'done' && current && nonBreakEvents.length > 0 && (
                    <span
                      title={t('calendar.legend.done')}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold"
                      aria-hidden
                    >
                      <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>

                {/* Corps de la cellule : Badges clairs & aérés */}
                <div className="mt-1 flex flex-1 flex-col justify-end gap-1 min-w-0 w-full">
                  {/* Férié */}
                  {holiday && (
                    <div className="flex items-center gap-1 rounded-md bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-rose-700 dark:text-rose-300 truncate">
                      <span className="shrink-0">🎈</span>
                      <span className="truncate">{holiday.title}</span>
                    </div>
                  )}

                  {/* Vacances : affichage discret et élégant */}
                  {vacation && !holiday && (
                    showVacationLabel ? (
                      <div className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-300 truncate">
                        <span className="shrink-0">🌴</span>
                        <span className="truncate">{vacation.title}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-0.5">
                        <span className="h-1 w-6 rounded-full bg-emerald-500/25" aria-hidden />
                      </div>
                    )
                  )}

                  {/* Cours, examens et activités */}
                  {!holiday && !vacation && (
                    <>
                      {/* Vue desktop : badges informatifs */}
                      <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
                        {nonBreakEvents.slice(0, 2).map(event => {
                          const style = EVENT_STYLES[event.kind];
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold truncate leading-tight shadow-2xs',
                                style.badge
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
                              <span className="truncate">
                                {event.kind === 'lesson' && event.detail ? `${event.detail} · ${event.title}` : event.title}
                              </span>
                            </div>
                          );
                        })}
                        {nonBreakEvents.length > 2 && (
                          <span className="text-[9px] font-bold text-muted-foreground px-1">
                            +{nonBreakEvents.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Vue mobile : pastilles compactes */}
                      <div className="flex sm:hidden flex-wrap items-center gap-1">
                        {nonBreakEvents.slice(0, 3).map(event => (
                          <span
                            key={event.id}
                            className={cn('h-2 w-2 rounded-full', EVENT_STYLES[event.kind].dot)}
                          />
                        ))}
                        {nonBreakEvents.length > 3 && (
                          <span className="text-[8px] font-bold text-muted-foreground">
                            +{nonBreakEvents.length - 3}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── LÉGENDE RAFFINÉE & AÉRÉE ── */}
      <ul
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-2xs"
        aria-label={t('calendar.layers')}
      >
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden />
          <span className="text-xs font-semibold text-muted-foreground">{t('calendar.legend.gap')}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold" aria-hidden>
            ✓
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{t('calendar.legend.done')}</span>
        </li>
        {[
          { kind: 'lesson' as const, label: t('calendar.lesson') },
          { kind: 'assessment' as const, label: t('calendar.assessment') },
          { kind: 'pedagogical' as const, label: t('calendar.pedagogical') },
          { kind: 'official' as const, label: t('calendar.category.school') },
          { kind: 'holiday' as const, label: t('calendar.holiday') },
          { kind: 'vacation' as const, label: t('calendar.vacation') },
        ].map(item => (
          <li key={item.kind} className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', EVENT_STYLES[item.kind].dot)} aria-hidden />
            <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>

      {/* ── PANNEAU DE DÉTAIL DU JOUR SÉLECTIONNÉ ── */}
      <section
        className="rounded-3xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs"
        aria-label={selectedDateLabel}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('calendar.layers')}
            </span>
            <h4 className="mt-0.5 truncate text-base sm:text-lg font-bold capitalize text-foreground">
              {selectedDateLabel}
            </h4>
          </div>
          <span className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-2xs">
            {eventCountLabel(selectedEvents.length)}
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              {t('calendar.noEvents')}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedEvents.map(event => {
              const Icon = iconFor(event);
              const style = EVENT_STYLES[event.kind];
              return (
                <article
                  key={event.id}
                  className={cn(
                    'flex items-start gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition-all duration-150 hover:shadow-2xs',
                    style.bgLight,
                    style.border
                  )}
                >
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs border', style.badge)}>
                    <Icon className="h-5 w-5 stroke-[2.2]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider', style.text)}>
                        {categoryLabel(event)}
                      </span>
                      {event.tentative && (
                        <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                          {t('calendar.toConfirm')}
                        </span>
                      )}
                    </div>
                    <h5 className="mt-1 text-sm font-bold leading-snug text-foreground">
                      {event.title}
                    </h5>
                    {event.detail && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-medium">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
