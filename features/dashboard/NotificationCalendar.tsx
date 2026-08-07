import React, { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import { ArrowLeft, CalendarCheck, CalendarDays, CalendarRange, Clock, GraduationCap } from '@/components/ui/icons';
import { getBundledCalendar, loadHolidayCalendar, todayInMorocco, type HolidayCalendar } from '@/utils/calendar';
import { getDaySessionBlocks } from '@/utils/timetable';
import { collectSessionDates } from '@/utils/printMeta';
import { readClassLessons } from '@/utils/notificationSignals';
import {
  getOfficialStudentEventsFile,
  getOfficialStudentEventsForClass,
  loadOfficialStudentEvents,
  type OfficialStudentEvent,
  type OfficialStudentEventsFile,
} from '@/utils/officialStudentEvents';

type CalendarEventKind = 'lesson' | 'holiday' | 'vacation' | 'official' | 'absence' | 'assessment';
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
  lesson: { dot: 'bg-primary', wash: 'bg-primary/10', text: 'text-primary' },
  holiday: { dot: 'bg-destructive', wash: 'bg-destructive/10', text: 'text-destructive-strong' },
  vacation: { dot: 'bg-success', wash: 'bg-success/10', text: 'text-success-strong' },
  official: { dot: 'bg-warning', wash: 'bg-warning/15', text: 'text-warning-strong' },
  absence: { dot: 'bg-muted-foreground', wash: 'bg-muted', text: 'text-muted-foreground' },
  assessment: { dot: 'bg-destructive', wash: 'bg-destructive/10', text: 'text-destructive-strong' },
};

const layerMatches = (event: CalendarEvent, layer: CalendarLayer): boolean => {
  if (layer === 'all') return true;
  if (layer === 'schedule') return event.kind === 'lesson' || event.kind === 'assessment';
  if (layer === 'breaks') return event.kind === 'holiday' || event.kind === 'vacation' || event.kind === 'absence';
  return event.kind === 'official';
};

const eventPriority: Record<CalendarEventKind, number> = {
  holiday: 0,
  vacation: 1,
  absence: 2,
  official: 3,
  assessment: 4,
  lesson: 5,
};

export const NotificationCalendar: React.FC<NotificationCalendarProps> = ({ classes, config, selectedClassId }) => {
  const { locale, isRtl, t } = useLocale();
  const [calendar, setCalendar] = useState<HolidayCalendar>(() => getBundledCalendar());
  const [officialFile, setOfficialFile] = useState<OfficialStudentEventsFile>(() => getOfficialStudentEventsFile());
  const today = todayInMorocco(new Date(), calendar);
  const [month, setMonth] = useState(() => {
    const value = fromISO(today);
    return new Date(value.getFullYear(), value.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [layer, setLayer] = useState<CalendarLayer>('all');

  useEffect(() => {
    let active = true;
    Promise.all([loadHolidayCalendar(), loadOfficialStudentEvents()]).then(([nextCalendar, nextOfficialFile]) => {
      if (!active) return;
      setCalendar(nextCalendar);
      setOfficialFile(nextOfficialFile);
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
        title: holiday.nom,
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
        title: vacation.nom,
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
          current.classNames.add(formatClassDisplayName(classInfo.name));
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
      for (const [assessmentId, date] of Object.entries(config.assessmentDates?.[classInfo.id] ?? {})) {
        if (!date) continue;
        result.push({
          id: `assessment:${classInfo.id}:${assessmentId}:${date}`,
          kind: 'assessment',
          title: t('calendar.plannedAssessment'),
          start: date,
          end: date,
          detail: formatClassDisplayName(classInfo.name),
          classId: classInfo.id,
          className: formatClassDisplayName(classInfo.name),
        });
      }
    }

    return result;
  }, [calendar, config.absences, config.assessmentDates, officialFile, relevantClasses, t]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const hasFullTimetable = (config.timetable?.length ?? 0) > 0;

    for (const date of monthCells) {
      const iso = toISO(date);
      const dayEvents = staticEvents.filter(event => iso >= event.start && iso <= event.end);
      const closed = dayEvents.some(event => event.kind === 'holiday' || event.kind === 'vacation' || event.kind === 'absence');

      if (!closed) {
        if (hasFullTimetable) {
          const blocks = getDaySessionBlocks(config.timetable, date.getDay())
            .filter(block => !selectedClass || block.classId === selectedClass.id);
          for (const block of blocks) {
            const classInfo = classById.get(block.classId);
            if (!classInfo) continue;
            dayEvents.push({
              id: `lesson:${iso}:${block.classId}:${block.startMin}`,
              kind: 'lesson',
              title: formatClassDisplayName(classInfo.name),
              start: iso,
              end: iso,
              detail: `${minuteLabel(block.startMin)}–${minuteLabel(block.endMin)}${block.hours > 1 ? ` · ${block.hours} h` : ''}`,
              classId: block.classId,
              className: formatClassDisplayName(classInfo.name),
            });
          }
        } else {
          for (const schedule of config.schedules ?? []) {
            if (selectedClass && schedule.classId !== selectedClass.id) continue;
            const slot = schedule.slots.find(item => item.weekday === date.getDay());
            const classInfo = classById.get(schedule.classId);
            if (!slot || !classInfo) continue;
            dayEvents.push({
              id: `lesson:${iso}:${schedule.classId}`,
              kind: 'lesson',
              title: formatClassDisplayName(classInfo.name),
              start: iso,
              end: iso,
              detail: t('calendar.sessionCount', { count: slot.sessions ?? 1 }),
              classId: schedule.classId,
              className: formatClassDisplayName(classInfo.name),
            });
          }
        }
      }

      map.set(iso, dayEvents.sort((a, b) => eventPriority[a.kind] - eventPriority[b.kind] || a.title.localeCompare(b.title)));
    }
    return map;
  }, [classById, config.schedules, config.timetable, monthCells, selectedClass, staticEvents, t]);

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
   *  · `gap`     — séance passée SANS contenu consigné (le trou à combler) ;
   *  · `done`    — toutes les séances du jour sont consignées ;
   *  · `planned` — séance à venir ;
   *  · `none`    — aucun cours ce jour-là.
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
    return t(`calendar.category.${event.category ?? 'school'}`);
  };

  const iconFor = (event: CalendarEvent) => {
    if (event.kind === 'lesson') return GraduationCap;
    if (event.kind === 'assessment') return CalendarCheck;
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
    <div className="py-3" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => moveMonth(-1)} aria-label={t('calendar.previousMonth')} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900">
            <ArrowLeft className={cn('h-3.5 w-3.5', isRtl && 'rotate-180')} />
          </button>
          <button type="button" onClick={() => moveMonth(1)} aria-label={t('calendar.nextMonth')} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900">
            <ArrowLeft className={cn('h-3.5 w-3.5', !isRtl && 'rotate-180')} />
          </button>
          <button type="button" onClick={goToday} className="h-8 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 text-[11px] font-semibold text-primary transition hover:bg-primary/[0.1]">
            {t('calendar.today')}
          </button>
        </div>
        <div className="min-w-0 text-start sm:text-end">
          <h3 className="truncate font-display text-base font-extrabold capitalize tracking-tight text-zinc-950">{monthLabel}</h3>
          <p className="mt-0.5 text-[10px] font-medium text-zinc-400">
            {t('calendar.monthSummary', { sessions: monthLessonCount, events: monthMilestoneCount })}
          </p>
        </div>
      </div>

      <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label={t('calendar.layers')}>
        {layers.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={layer === item.id}
            onClick={() => setLayer(item.id)}
            className={cn(
              'h-7 shrink-0 rounded-full border px-3 text-[10px] font-semibold transition-all',
              layer === item.id
                ? 'border-primary/25 bg-primary text-white shadow-sm'
                : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/80">
          {weekdayLabels.map((label, index) => (
            <div key={`${label}-${index}`} className="px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-400 sm:text-[10px]">
              <span className="sm:hidden">{label.slice(0, 1)}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
        <div
          className="grid grid-cols-7 gap-px bg-zinc-200/80"
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
            // Les noms de classes ne sont JAMAIS écrits dans la case : on ne
            // montre que des pastilles. Le détail s'ouvre au clic sur le jour.
            const dotEvents = visibleEvents.filter(event => event.kind !== 'holiday' && event.kind !== 'vacation');

            /*
             * FONDS PORTEURS DE SENS — hiérarchie de lecture :
             *  1. contexte de fermeture (férié / vacances / absence) ;
             *  2. semaine de devoir (rouge doux, demandé) ;
             *  3. état du cahier : trou à combler > jour consigné > à venir.
             * La densité (nb de séances) renforce légèrement la teinte des
             * jours à venir : le mois se lit comme une carte de charge.
             */
            const { status, planned } = dayStatus(iso, allDayEvents);
            const dense = planned >= 2;

            const dayWash = holiday
              ? 'bg-destructive/[0.08]'
              : vacation
                ? 'bg-success/[0.09]'
                : allDayEvents.some(event => event.kind === 'absence')
                  ? 'bg-muted'
                  : status === 'gap'
                    ? 'bg-warning/[0.14]'
                    : isAssessmentWeek
                      ? 'bg-destructive/[0.05]'
                      : status === 'done'
                        ? 'bg-success/[0.055]'
                        : status === 'planned'
                          ? (dense ? 'bg-primary/[0.07]' : 'bg-primary/[0.035]')
                          : 'bg-white';

            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                aria-selected={selected}
                onClick={() => setSelectedDate(iso)}
                aria-label={`${date.getDate()} ${monthLabel}${holiday ? `, ${holiday.title}` : ''}${vacation ? `, ${vacation.title}` : ''}, ${visibleEvents.length} ${t('calendar.events')}`}
                className={cn(
                  'group relative flex min-h-[62px] min-w-0 flex-col gap-1 p-1.5 text-start transition-colors hover:z-10 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-[82px] sm:p-2',
                  dayWash,
                  !current && 'opacity-45',
                  isToday && !selected && 'ring-1 ring-inset ring-primary/45',
                  selected && 'z-10 ring-2 ring-inset ring-primary/60',
                )}
              >
                {/* Trou à combler : liseré latéral, visible quel que soit le fond. */}
                {status === 'gap' && current && (
                  <span className="absolute inset-y-0 start-0 w-[3px] bg-warning" aria-hidden />
                )}

                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums sm:text-[11px]',
                  isToday ? 'bg-primary text-primary-foreground' : current ? 'text-zinc-700' : 'text-zinc-400',
                )}>
                  {date.getDate()}
                </span>

                {/* Férié : son NOM est affiché (exception à la règle « pas de texte »). */}
                {holiday ? (
                  <span className="flex flex-1 items-center justify-center px-0.5 text-center">
                    <span className="line-clamp-2 text-[8px] font-bold leading-tight text-destructive-strong sm:text-[9px]">
                      {holiday.title}
                    </span>
                  </span>
                ) : showVacationLabel ? (
                  /* Vacances : un seul libellé par semaine, bien centré. */
                  <span className="flex flex-1 items-center justify-center px-0.5 text-center">
                    <span className="line-clamp-2 text-[8px] font-bold leading-tight text-success-strong sm:text-[9px]">
                      {vacation?.title}
                    </span>
                  </span>
                ) : vacation ? (
                  <span className="flex-1" aria-hidden />
                ) : (
                  /* Jours ordinaires : pastilles uniquement, aucun nom de classe. */
                  <span className="mt-auto flex flex-wrap items-center gap-0.5" aria-hidden>
                    {dotEvents.slice(0, 4).map(event => (
                      <span key={event.id} className={cn('h-1.5 w-1.5 rounded-full sm:h-[7px] sm:w-[7px]', EVENT_TONE[event.kind].dot)} />
                    ))}
                    {dotEvents.length > 4 && (
                      <span className="text-[7px] font-bold text-zinc-400">+{dotEvents.length - 4}</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende — les cases ne portent plus de texte : elle rend les pastilles
          et les aplats lisibles d'un coup d'œil. */}
      <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5" aria-label={t('calendar.layers')}>
        {/* États du cahier (fonds) — l'information la plus actionnable d'abord */}
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-s-[3px] border-warning bg-warning/[0.14]" aria-hidden />
          <span className="text-[9px] font-semibold text-zinc-500">{t('calendar.legend.gap')}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success/[0.35]" aria-hidden />
          <span className="text-[9px] font-semibold text-zinc-500">{t('calendar.legend.done')}</span>
        </li>
        {/* Types d'événements (pastilles) */}
        {([
          { kind: 'lesson' as const, label: t('calendar.lesson') },
          { kind: 'assessment' as const, label: t('calendar.assessment') },
          { kind: 'official' as const, label: t('calendar.category.school') },
          { kind: 'holiday' as const, label: t('calendar.holiday') },
          { kind: 'vacation' as const, label: t('calendar.vacation') },
        ]).map(item => (
          <li key={item.kind} className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', EVENT_TONE[item.kind].dot)} aria-hidden />
            <span className="text-[9px] font-semibold text-zinc-500">{item.label}</span>
          </li>
        ))}
      </ul>

      <section className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5 sm:p-3" aria-label={selectedDateLabel}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="truncate text-[12px] font-bold capitalize text-zinc-900">{selectedDateLabel}</h4>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-zinc-400 ring-1 ring-inset ring-zinc-200">
            {selectedEvents.length} {t('calendar.events')}
          </span>
        </div>
        {selectedEvents.length === 0 ? (
          <div className="flex min-h-14 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white px-3 text-center text-[11px] text-zinc-400">
            {t('calendar.noEvents')}
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {selectedEvents.map(event => {
              const Icon = iconFor(event);
              const tone = EVENT_TONE[event.kind];
              return (
                <article key={event.id} className="flex min-w-0 items-start gap-2 rounded-lg border border-zinc-200/80 bg-white p-2.5 shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', tone.wash, tone.text)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={cn('text-[9px] font-bold uppercase tracking-wide', tone.text)}>{categoryLabel(event)}</span>
                      {event.tentative && <span className="rounded bg-amber-50 px-1 text-[8px] font-semibold text-amber-700">{t('calendar.toConfirm')}</span>}
                    </div>
                    <h5 className="mt-0.5 text-[11px] font-semibold leading-snug text-zinc-900">{event.title}</h5>
                    {event.detail && <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">{event.detail}</p>}
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
