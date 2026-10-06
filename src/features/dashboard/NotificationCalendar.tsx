import React, { useEffect, useMemo, useRef, useState } from 'react';
import './calendarDayCard.css';
import { AppConfig, ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  ListChecks,
} from '@/components/ui/icons';
import {
  getBundledCalendar,
  loadHolidayCalendar,
  localizeCalendarName,
  todayInMorocco,
  type HolidayCalendar,
} from '@/domain/calendar/calendar';
import { getDaySessionBlocks } from '@/domain/calendar/timetable';
import { collectSessionDates } from '@/infrastructure/printing/printMeta';
import { readClassLessons } from '@/infrastructure/notifications/notificationSignals';
import { FluidTabRail, FluidTabItem } from '@/components/ui/FluidTabRail';
import { loadPlanning, resolveClassAssessments, type PlanningFile } from '@/domain/evaluations/assessments';
import { dateTimeFormat } from '@/lib/formatters';
import {
  getOfficialStudentEventsFile,
  getOfficialStudentEventsForClass,
  loadOfficialStudentEvents,
  type OfficialStudentEvent,
  type OfficialStudentEventsFile,
} from '@/domain/evaluations/officialStudentEvents';

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
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    bgLight: 'bg-cyan-500/[0.04]',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
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
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

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
    // Seulement les semaines du mois : pas de ligne vide, la grille reste aérée.
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((mondayOffset + daysInMonth) / 7);
    return Array.from({ length: weeks * 7 }, (_, index) => addDays(gridStart, index));
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
        const blocks = getDaySessionBlocks(config.timetable, date.getDay(), config.timetableClock)
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

  const monthLabel = dateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month);
  const selectedDateLabel = dateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fromISO(selectedDate));
  
  // Noms des jours de la semaine débutant par le Lundi
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(2026, 7, 3 + index); // 3 août 2026 est un Lundi
    return {
      short: dateTimeFormat(locale, { weekday: 'short' }).format(d).replace('.', ''),
      full: dateTimeFormat(locale, { weekday: 'long' }).format(d),
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

  // Icônes alignées sur celles de la barre d'onglets et des cartes de
  // réglages : le même repère visuel circule d'un écran à l'autre.
  const iconFor = (event: CalendarEvent) => {
    if (event.kind === 'lesson') return BookOpen;
    if (event.kind === 'assessment') return CalendarCheck;
    if (event.kind === 'pedagogical') return ListChecks;
    if (event.kind === 'official') return CalendarRange;
    if (event.kind === 'holiday') return CalendarX;
    if (event.kind === 'vacation') return CalendarDays;
    return FileSignature;
  };

  const layers: FluidTabItem<CalendarLayer>[] = useMemo(() => [
    { id: 'all', label: t('calendar.layer.all') },
    { id: 'schedule', label: t('calendar.layer.schedule') },
    { id: 'breaks', label: t('calendar.layer.breaks') },
    { id: 'official', label: t('calendar.layer.official') },
  ], [t]);

  const selectedDay = fromISO(selectedDate);
  const selectedWeekday = dateTimeFormat(locale, { weekday: 'long' }).format(selectedDay);
  const selectedMonthYear = dateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedDay);

  /** Pastilles sous le numéro : la couleur du cours dit s'il reste à consigner, sans écrire dans la case. */
  const dotsFor = (events: CalendarEvent[], status: ReturnType<typeof dayStatus>['status']): string[] => {
    const kinds = new Set(events.map(event => event.kind));
    const dots: string[] = [];
    if (kinds.has('holiday')) dots.push(EVENT_STYLES.holiday.dot);
    if (kinds.has('lesson')) dots.push(status === 'gap' ? 'bg-orange-500' : status === 'done' ? 'bg-emerald-500' : EVENT_STYLES.lesson.dot);
    if (kinds.has('assessment')) dots.push(EVENT_STYLES.assessment.dot);
    if (kinds.has('pedagogical')) dots.push(EVENT_STYLES.pedagogical.dot);
    if (kinds.has('official')) dots.push(EVENT_STYLES.official.dot);
    if (kinds.has('absence')) dots.push(EVENT_STYLES.absence.dot);
    return dots.slice(0, 3);
  };

  /** Balayage horizontal : mois suivant / précédent, dans le sens de lecture de la langue. */
  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = swipeStart.current;
    const touch = event.changedTouches[0];
    swipeStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    moveMonth((dx < 0) === !isRtl ? 1 : -1);
  };

  const legendItems: { key: string; label: string; swatch: string }[] = [
    { key: 'gap', label: t('calendar.legend.gap'), swatch: 'h-2 w-2 rounded-full bg-orange-500' },
    { key: 'done', label: t('calendar.legend.done'), swatch: 'h-2 w-2 rounded-full bg-emerald-500' },
    { key: 'lesson', label: t('calendar.lesson'), swatch: cn('h-2 w-2 rounded-full', EVENT_STYLES.lesson.dot) },
    { key: 'assessment', label: t('calendar.assessment'), swatch: cn('h-2 w-2 rounded-full', EVENT_STYLES.assessment.dot) },
    { key: 'pedagogical', label: t('calendar.pedagogical'), swatch: cn('h-2 w-2 rounded-full', EVENT_STYLES.pedagogical.dot) },
    { key: 'official', label: t('calendar.category.school'), swatch: cn('h-2 w-2 rounded-full', EVENT_STYLES.official.dot) },
    { key: 'holiday', label: t('calendar.holiday'), swatch: cn('h-2 w-2 rounded-full', EVENT_STYLES.holiday.dot) },
    { key: 'vacation', label: t('calendar.vacation'), swatch: 'h-2 w-5 rounded-full bg-emerald-500/25' },
  ];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── CALENDRIER : une seule surface, aucun texte dans les cases ── */}
      <div className="overflow-hidden rounded-[28px] border border-border/60 bg-card">
        <header className="px-4 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-[1.65rem] font-bold capitalize leading-tight tracking-tight text-foreground sm:text-3xl">
              {monthLabel}
            </h3>
            <div className="-me-2 flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label={t('calendar.previousMonth')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-[transform,background-color,color] duration-200 hover:bg-muted hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              >
                <ChevronLeft className={cn('h-5 w-5', isRtl && 'rotate-180')} />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label={t('calendar.nextMonth')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-[transform,background-color,color] duration-200 hover:bg-muted hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              >
                <ChevronRight className={cn('h-5 w-5', isRtl && 'rotate-180')} />
              </button>
            </div>
          </div>

          {/* Résumé + retour à aujourd'hui (zone de hauteur fixe : aucun décalage de mise en page) */}
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
              {monthSummaryLabel(monthLessonCount, monthMilestoneCount)}
            </p>
            {(selectedDate !== today || !inCurrentMonth(fromISO(today))) && (
              <button
                type="button"
                onClick={goToday}
                className="group flex h-11 shrink-0 items-center focus-visible:outline-none"
              >
                <span className="rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-[transform,background-color] duration-200 group-hover:bg-primary/15 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-primary motion-reduce:transition-none">
                  {t('calendar.today')}
                </span>
              </button>
            )}
          </div>

          <FluidTabRail<CalendarLayer>
            items={layers}
            activeId={layer}
            onChange={setLayer}
            layoutId="calendar-layer-subpill"
            size="sm"
            ariaLabel={t('calendar.layers')}
          />
        </header>

        {/* Jours de la semaine */}
        <div className="mt-4 grid grid-cols-7 px-2 sm:px-5" aria-hidden>
          {weekdayLabels.map((item, index) => (
            <div
              key={`${item.short}-${index}`}
              className={cn(
                'py-2 text-center text-[11px] font-semibold tracking-wide sm:text-xs',
                item.isWeekend ? 'text-muted-foreground/60' : 'text-muted-foreground'
              )}
            >
              <span className="md:hidden">{item.short}</span>
              <span className="hidden md:inline">{item.full}</span>
            </div>
          ))}
        </div>

        {/* Grille : un numéro et au plus trois pastilles par jour, le détail s'ouvre au toucher */}
        <div
          key={`${month.getFullYear()}-${month.getMonth()}`}
          className="animate-fade-in touch-pan-y px-2 pb-4 motion-reduce:animate-none sm:px-5 sm:pb-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
          <div
            className="grid grid-cols-7 gap-y-1"
            role="grid"
            tabIndex={0}
            onKeyDown={handleGridKeyDown}
            aria-label={monthLabel}
          >
            {monthCells.map((date, index) => {
              if (!inCurrentMonth(date)) return <span key={toISO(date)} aria-hidden />;

              const iso = toISO(date);
              const allDayEvents = eventsByDate.get(iso) ?? [];
              const visibleEvents = allDayEvents.filter(event => layerMatches(event, layer));
              const selected = iso === selectedDate;
              const isToday = iso === today;
              const isSunday = date.getDay() === 0;
              const holiday = visibleEvents.find(event => event.kind === 'holiday');
              const isVacation = (events: CalendarEvent[]) => events.some(event => event.kind === 'vacation' && layerMatches(event, layer));
              const vacation = isVacation(allDayEvents);
              const previous = index % 7 !== 0 && inCurrentMonth(monthCells[index - 1]) && isVacation(eventsByDate.get(toISO(monthCells[index - 1])) ?? []);
              const next = index % 7 !== 6 && inCurrentMonth(monthCells[index + 1]) && isVacation(eventsByDate.get(toISO(monthCells[index + 1])) ?? []);
              const { status } = dayStatus(iso, allDayEvents);
              const dots = dotsFor(visibleEvents, status);

              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => setSelectedDate(iso)}
                  aria-label={`${date.getDate()} ${monthLabel}${holiday ? `, ${holiday.title}` : ''}${vacation ? `, ${t('calendar.vacation')}` : ''}, ${eventCountLabel(visibleEvents.length)}`}
                  className={cn(
                    'group flex h-14 w-full flex-col items-center justify-center gap-1 outline-none sm:h-16',
                    vacation && 'bg-emerald-500/[0.09] dark:bg-emerald-400/[0.11]',
                    vacation && !previous && 'rounded-s-full',
                    vacation && !next && 'rounded-e-full'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums',
                      'transition-[transform,background-color,color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
                      'group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-primary motion-reduce:transition-none',
                      selected
                        ? 'scale-105 bg-primary text-primary-foreground shadow-sm'
                        : isToday
                          ? 'font-bold text-primary ring-2 ring-primary/40 group-hover:bg-primary/10'
                          : holiday
                            ? 'text-rose-600 group-hover:bg-muted dark:text-rose-300'
                            : isSunday
                              ? 'text-muted-foreground group-hover:bg-muted'
                              : 'text-foreground group-hover:bg-muted'
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <span className="flex h-1.5 items-center gap-1" aria-hidden>
                    {dots.map((dot, dotIndex) => <span key={dotIndex} className={cn('h-1.5 w-1.5 rounded-full', dot)} />)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── LÉGENDE : une ligne discrète, défilable sur téléphone ── */}
      <ul
        className="-mx-1 flex items-center gap-x-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t('calendar.layers')}
      >
        {legendItems.map(item => (
          <li key={item.key} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <span className={item.swatch} aria-hidden />
            <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>

      {/* ── DÉTAIL DU JOUR : s'ouvre au toucher d'une case ── */}
      <section
        key={selectedDate}
        className="animate-fade-in motion-reduce:animate-none"
        aria-label={selectedDateLabel}
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="text-[2.5rem] font-bold leading-none tabular-nums text-foreground">{selectedDay.getDate()}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize text-foreground">{selectedWeekday}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{selectedMonthYear}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {eventCountLabel(selectedEvents.length)}
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-3xl bg-muted/40 px-6 py-9 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border/60">
              <CalendarDays className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">{t('calendar.noEvents')}</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {selectedEvents.map(event => {
              const Icon = iconFor(event);
              const style = EVENT_STYLES[event.kind];
              return (
                <li
                  key={event.id}
                  className="calendar-day-card flex items-start gap-3 p-3.5"
                >
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', style.badge)}>
                    <Icon className="h-[18px] w-[18px] stroke-[2]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('calendar-day-card__eyebrow', style.text)}>{categoryLabel(event)}</span>
                      {event.tentative && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          {t('calendar.toConfirm')}
                        </span>
                      )}
                    </div>
                    <h5 className="calendar-day-card__title mt-1 font-medium text-foreground">{event.title}</h5>
                    {event.detail && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{event.detail}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};