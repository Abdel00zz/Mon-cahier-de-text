import React, { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import { CalendarCheck, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, GraduationCap } from '@/components/ui/icons';
import { getBundledCalendar, loadHolidayCalendar, localizeCalendarName, todayInMorocco, type HolidayCalendar } from '@/utils/calendar';
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

/* Palette en tokens du design system (rouge = destructive, vert = success,
   ambre = warning) : une seule identité, contrastes de texte accessibles. */
const EVENT_TONE: Record<CalendarEventKind, { dot: string; wash: string; text: string }> = {
  lesson: { dot: 'bg-[#423ed8]', wash: 'bg-[#eeaaff]/50', text: 'text-[#423ed8]' },
  holiday: { dot: 'bg-destructive', wash: 'bg-destructive/10', text: 'text-destructive-strong' },
  vacation: { dot: 'bg-success', wash: 'bg-success/10', text: 'text-success-strong' },
  official: { dot: 'bg-warning', wash: 'bg-warning/15', text: 'text-warning-strong' },
  absence: { dot: 'bg-muted-foreground', wash: 'bg-muted', text: 'text-muted-foreground' },
  assessment: { dot: 'bg-destructive', wash: 'bg-destructive/10', text: 'text-destructive-strong' },
  pedagogical: { dot: 'bg-violet-500', wash: 'bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300' },
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
        // Chaque classe suit sa propre branche : la grille détaillée a
        // priorité pour cette classe seulement. Les anciens horaires des
        // autres classes continuent donc d'apparaître dans le calendrier.
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

  /*
   * Dates réellement CONSIGNÉES dans chaque cahier : c'est ce qui transforme
   * le calendrier en carte de complétude (où le cahier a des trous), au lieu
   * d'un simple planning.
   */
  const recordedByClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const classInfo of relevantClasses) {
      map.set(classInfo.id, new Set(collectSessionDates(readClassLessons(classInfo.id))));
    }
    return map;
  }, [relevantClasses]);

  /**
   * État pédagogique d'un jour :
   *  · `gap` : séance passée sans contenu consigné (le trou à combler) ;
   *  · `done` : toutes les séances du jour sont consignées ;
   *  · `planned` : séance à venir ;
   *  · `none` : aucun cours ce jour-là.
   */
  const dayStatus = (iso: string, events: CalendarEvent[]): { status: 'gap' | 'done' | 'planned' | 'none'; planned: number; recorded: number } => {
    const lessons = events.filter(event => event.kind === 'lesson');
    if (lessons.length === 0) return { status: 'none', planned: 0, recorded: 0 };
    const recorded = lessons.filter(lesson => lesson.classId && recordedByClass.get(lesson.classId)?.has(iso)).length;
    if (iso > today) return { status: 'planned', planned: lessons.length, recorded };
    if (recorded >= lessons.length) return { status: 'done', planned: lessons.length, recorded };
    return { status: 'gap', planned: lessons.length, recorded };
  };

  /*
   * Lecture par SEMAINE (ligne de la grille) :
   *  · une semaine contenant un devoir est teintée en rouge doux ;
   *  · une semaine de vacances est verte, avec le nom affiché UNE SEULE fois
   *    (premier jour de la semaine concernée) pour éviter la répétition.
   */
  const { assessmentWeeks, vacationLabelCells } = useMemo(() => {
    const weeks = new Set<number>();
    const labelCells = new Set<string>();
    const weekAlreadyLabelled = new Set<number>();
    monthCells.forEach((date, index) => {
      const iso = toISO(date);
      const events = eventsByDate.get(iso) ?? [];
      const weekIndex = Math.floor(index / 7);
      if (events.some(event => event.kind === 'assessment')) weeks.add(weekIndex);
      if (events.some(event => event.kind === 'vacation') && !weekAlreadyLabelled.has(weekIndex)) {
        weekAlreadyLabelled.add(weekIndex);
        labelCells.add(iso);
      }
    });
    return { assessmentWeeks: weeks, vacationLabelCells: labelCells };
  }, [eventsByDate, monthCells]);

  /** Navigation clavier dans la grille (flèches), sens inversé en RTL. */
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
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(localeCode, { weekday: 'short' }).format(new Date(2026, 7, 3 + index)).replace('.', ''),
  );

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
    <div className="py-2" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="mb-3 rounded-2xl border border-border/70 bg-card/80 p-2.5 shadow-2xs backdrop-blur-sm sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex shrink-0 items-center rounded-xl border border-border/80 bg-background/70 p-0.5 shadow-2xs" role="group" aria-label={t('calendar.layers')}>
              <button type="button" onClick={() => moveMonth(-1)} aria-label={t('calendar.previousMonth')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#423ed8]/25">
                <ChevronLeft className={cn('h-3.5 w-3.5', isRtl && 'rotate-180')} />
              </button>
              <button type="button" onClick={() => moveMonth(1)} aria-label={t('calendar.nextMonth')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#423ed8]/25">
                <ChevronRight className={cn('h-3.5 w-3.5', isRtl && 'rotate-180')} />
              </button>
            </div>
            <button type="button" onClick={goToday} className="h-9 shrink-0 rounded-xl border border-[#423ed8]/20 bg-[#eeaaff]/50 px-3 text-[11px] font-bold text-[#423ed8] transition-colors hover:bg-[#eeaaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#423ed8]/30">
              {t('calendar.today')}
            </button>
            <div className="min-w-0 ps-1">
              <h3 className="truncate text-base font-extrabold capitalize tracking-tight text-foreground sm:text-lg">{monthLabel}</h3>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
                {monthSummaryLabel(monthLessonCount, monthMilestoneCount)}
              </p>
            </div>
          </div>

          <div className="[@scrollbar-width:none] -mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-0.5" role="tablist" aria-label={t('calendar.layers')}>
            {layers.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={layer === item.id}
                onClick={() => setLayer(item.id)}
                className={cn(
                  'h-8 shrink-0 rounded-lg border px-3 text-[10px] font-bold transition-all',
                  layer === item.id
                    ? 'border-[#423ed8] bg-[#423ed8] text-[#423ed8]-foreground shadow-sm'
                    : 'border-transparent bg-muted/65 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border/75 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="grid grid-cols-7 border-b border-border/70 bg-muted/45">
          {weekdayLabels.map((label, index) => (
            <div key={`${label}-${index}`} className="px-1 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[10px]">
              <span className="sm:hidden">{label.slice(0, 1)}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
        <div
          className="grid grid-cols-7 gap-px bg-border/65"
          role="grid"
          tabIndex={0}
          onKeyDown={handleGridKeyDown}
          aria-label={monthLabel}
        >
          {monthCells.map((date, index) => {
            const iso = toISO(date);
            const allDayEvents = eventsByDate.get(iso) ?? [];
            const visibleEvents = allDayEvents.filter(event => layerMatches(event, layer));
            const current = inCurrentMonth(date);
            const selected = iso === selectedDate;
            const isToday = iso === today;
            const weekIndex = Math.floor(index / 7);

            const holiday = allDayEvents.find(event => event.kind === 'holiday');
            const vacation = allDayEvents.find(event => event.kind === 'vacation');
            const isAssessmentWeek = assessmentWeeks.has(weekIndex);
            const showVacationLabel = Boolean(vacation) && vacationLabelCells.has(iso);
            // Les cellules reprennent la logique Google Calendar : quelques
            // créneaux lisibles sur grand écran, puis des pastilles compactes
            // sur mobile. Le panneau latéral garde le détail complet.
            const chipEvents = visibleEvents.filter(event => event.kind !== 'holiday' && event.kind !== 'vacation');
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            /*
             * FONDS PORTEURS DE SENS, hiérarchie de lecture :
             *  1. contexte de fermeture (férié / vacances / absence) ;
             *  2. semaine de devoir (rouge doux, demandé) ;
             *  3. état du cahier : trou à combler > jour consigné > à venir.
             * La densité (nb de séances) renforce légèrement la teinte des
             * jours à venir : le mois se lit comme une carte de charge.
             */
            const { status, planned } = dayStatus(iso, allDayEvents);
            const dense = planned >= 2;

            const dayWash = holiday
              ? 'bg-destructive/[0.055]'
              : vacation
                ? 'bg-success/[0.045]'
                : allDayEvents.some(event => event.kind === 'absence')
                  ? 'bg-muted/75'
                  : status === 'gap'
                    ? 'bg-warning/[0.14]'
                    : isAssessmentWeek
                      ? 'bg-destructive/[0.05]'
                      : status === 'done'
                        ? 'bg-success/[0.055]'
                        : status === 'planned'
                          ? (dense ? 'bg-[#eeaaff]/80' : 'bg-[#eeaaff]/30')
                          : isWeekend ? 'bg-muted/[0.28]' : 'bg-card';

            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                aria-selected={selected}
                onClick={() => setSelectedDate(iso)}
                aria-label={`${date.getDate()} ${monthLabel}${holiday ? `, ${holiday.title}` : ''}${vacation ? `, ${vacation.title}` : ''}, ${eventCountLabel(visibleEvents.length)}`}
                className={cn(
                  'group relative flex min-h-[66px] min-w-0 flex-col gap-1 p-1.5 text-start transition-colors hover:z-10 hover:brightness-[0.985] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#423ed8] sm:min-h-[96px] sm:p-2',
                  dayWash,
                  !current && 'bg-muted/55 opacity-55',
                  isToday && !selected && 'ring-1 ring-inset ring-[#423ed8]/55',
                  selected && 'z-10 ring-2 ring-inset ring-[#423ed8]',
                )}
              >
                {/* Trou à combler : liseré latéral, visible quel que soit le fond. */}
                {status === 'gap' && current && (
                  <span className="absolute inset-y-0 start-0 w-[3px] bg-warning" aria-hidden />
                )}

                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums sm:text-[11px]',
                  isToday ? 'bg-[#423ed8] text-[#423ed8]-foreground shadow-sm' : current ? 'text-foreground' : 'text-muted-foreground',
                )}>
                  {date.getDate()}
                </span>

                {/* Fermetures : une bande discrète, sans teinter lourdement tout le mois. */}
                {holiday ? (
                  <span className="mt-0.5 min-w-0 rounded-md bg-destructive/10 px-1 py-0.5 text-start">
                    <span className="block truncate text-[8px] font-bold leading-tight text-destructive-strong sm:text-[9px]">
                      {holiday.title}
                    </span>
                  </span>
                ) : showVacationLabel ? (
                  <span className="mt-0.5 min-w-0 rounded-md bg-success/10 px-1 py-0.5 text-start">
                    <span className="block truncate text-[8px] font-bold leading-tight text-success-strong sm:text-[9px]">
                      {vacation?.title}
                    </span>
                  </span>
                ) : vacation ? (
                  <span className="mt-auto h-1 w-full rounded-full bg-success/35" aria-hidden />
                ) : (
                  <>
                    <span className="hidden min-w-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex" aria-hidden>
                      {chipEvents.slice(0, 2).map(event => (
                        <span key={event.id} className={cn('flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[8px] font-bold leading-tight', EVENT_TONE[event.kind].wash, EVENT_TONE[event.kind].text)}>
                          <span className={cn('h-1 w-1 shrink-0 rounded-full', EVENT_TONE[event.kind].dot)} />
                          <span className="truncate">{event.kind === 'lesson' && event.detail ? `${event.detail} · ${event.title}` : event.title}</span>
                        </span>
                      ))}
                      {chipEvents.length > 2 && <span className="px-1 text-[8px] font-bold text-muted-foreground">+{chipEvents.length - 2}</span>}
                    </span>
                    <span className="mt-auto flex flex-wrap items-center gap-0.5 sm:hidden" aria-hidden>
                      {chipEvents.slice(0, 4).map(event => (
                        <span key={event.id} className={cn('h-1.5 w-1.5 rounded-full', EVENT_TONE[event.kind].dot)} />
                      ))}
                      {chipEvents.length > 4 && <span className="text-[7px] font-bold text-muted-foreground">+{chipEvents.length - 4}</span>}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-border/65 bg-muted/30 px-3 py-2" aria-label={t('calendar.layers')}>
        {/* États du cahier, avant les couleurs purement calendaires. */}
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-s-[3px] border-warning bg-warning/[0.14]" aria-hidden />
          <span className="text-[9px] font-semibold text-muted-foreground">{t('calendar.legend.gap')}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success/[0.35]" aria-hidden />
          <span className="text-[9px] font-semibold text-muted-foreground">{t('calendar.legend.done')}</span>
        </li>
        {/* Types d'événements (pastilles) */}
        {([
          { kind: 'lesson' as const, label: t('calendar.lesson') },
          { kind: 'assessment' as const, label: t('calendar.assessment') },
          { kind: 'pedagogical' as const, label: t('calendar.pedagogical') },
          { kind: 'official' as const, label: t('calendar.category.school') },
          { kind: 'holiday' as const, label: t('calendar.holiday') },
          { kind: 'vacation' as const, label: t('calendar.vacation') },
        ]).map(item => (
          <li key={item.kind} className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', EVENT_TONE[item.kind].dot)} aria-hidden />
            <span className="text-[9px] font-semibold text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>

      <section className="mt-3 rounded-2xl border border-border/75 bg-card p-3 shadow-2xs sm:p-3.5" aria-label={selectedDateLabel}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('calendar.layers')}</p>
            <h4 className="mt-0.5 truncate text-[12px] font-extrabold capitalize text-foreground">{selectedDateLabel}</h4>
          </div>
          <span className="shrink-0 rounded-full bg-[#eeaaff]/60 px-2 py-1 text-[9px] font-bold text-[#423ed8] ring-1 ring-inset ring-[#423ed8]/15">
            {eventCountLabel(selectedEvents.length)}
          </span>
        </div>
        {selectedEvents.length === 0 ? (
          <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-3 text-center text-[11px] text-muted-foreground">
            {t('calendar.noEvents')}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedEvents.map(event => {
              const Icon = iconFor(event);
              const tone = EVENT_TONE[event.kind];
              return (
                <article key={event.id} className="flex min-w-0 items-start gap-2 rounded-xl border border-border/70 bg-background/55 p-2.5 transition-colors hover:bg-muted/40">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tone.wash, tone.text)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={cn('text-[9px] font-bold uppercase tracking-wide', tone.text)}>{categoryLabel(event)}</span>
                      {event.tentative && <span className="rounded bg-amber-50 px-1 text-[8px] font-semibold text-amber-700">{t('calendar.toConfirm')}</span>}
                    </div>
                    <h5 className="mt-0.5 text-[11px] font-bold leading-snug text-foreground">{event.title}</h5>
                    {event.detail && <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{event.detail}</p>}
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
