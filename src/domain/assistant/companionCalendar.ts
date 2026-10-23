import type { AppConfig, ClassInfo } from '../../types';
import { getEffectiveSchoolYear, isHoliday, isVacation, isWeeklyRestDay, type HolidayCalendar } from '../calendar/calendar';
import { validChapterDate } from '../curriculum/chapterLifecycle';
import { effectiveSchedules } from '../calendar/timetable';
import { getClassTeachingEnd } from '../evaluations/officialStudentEvents';

export interface CompanionCalendarNotice {
  kind: 'vacation' | 'holiday' | 'upcoming' | 'return';
  name: string;
  start: string;
  end: string;
  approximate: boolean;
  resumeDate?: string;
}
type CalendarConfig = Pick<AppConfig, 'timetable' | 'schedules' | 'absences' | 'schoolYearStart'>;
const shift = (day: string, count: number) => new Date(Date.parse(`${day}T12:00:00Z`) + count * 86_400_000).toISOString().slice(0, 10);

/** Facts come exclusively from the shared configured calendar, never from generated dates. */
export function companionCalendarNotice(calendar: HolidayCalendar, today: string, config: CalendarConfig,
  classInfo?: Pick<ClassInfo, 'id' | 'name' | 'subject' | 'cycle'>): CompanionCalendarNotice | undefined {
  if (!validChapterDate(today)) return;
  const year = getEffectiveSchoolYear(calendar, config.schoolYearStart, today);
  if (today < year.debut || today > year.fin) return;
  const periods = [
    ...calendar.vacances.map(item => ({ start: item.debut, end: item.fin, name: item.nom,
      kind: 'vacation' as const, approximate: /estim|تقدير/iu.test(item.nom) })),
    ...calendar.joursFeries.map(item => ({ start: item.date, end: item.date, name: item.nom,
      kind: 'holiday' as const, approximate: item.approximatif === true })),
  ].filter(item => validChapterDate(item.start) && validChapterDate(item.end) && item.start <= item.end)
    .sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
  const weekdays = new Set(effectiveSchedules({ timetable: config.timetable, schedules: config.timetable === undefined ? config.schedules : [] })
    .filter(item => item.classId === classInfo?.id).flatMap(item => item.slots.map(slot => slot.weekday)));
  const teachingEnd = classInfo ? getClassTeachingEnd(classInfo, year) : null;
  const resumeAfter = (end: string): string | undefined => {
    if (!weekdays.size) return;
    for (let offset = 1; offset <= 62; offset++) {
      const day = shift(end, offset);
      if (day > year.fin || (teachingEnd && day > teachingEnd)) return;
      if (isWeeklyRestDay(day) || isHoliday(day, calendar) || isVacation(day, calendar)) continue;
      if ((config.absences ?? []).some(period => day >= period.debut && day <= period.fin)) continue;
      if (weekdays.has(new Date(`${day}T12:00:00Z`).getUTCDay())) return day;
    }
  };
  const current = periods.filter(item => item.start <= today && item.end >= today);
  if (current.length) {
    // Overlapping vacations are common around religious holidays: merge the full closed period.
    let end = current.reduce((latest, item) => item.end > latest ? item.end : latest, today);
    let approximate = current.some(item => item.approximate);
    for (const item of periods) {
      if (item.start <= shift(end, 1) && item.end >= today) {
        if (item.end > end) end = item.end;
        approximate ||= item.approximate;
      }
    }
    const first = current.find(item => item.kind === 'vacation') ?? current[0];
    const combined = current.length > 1 || first.end !== end;
    return { ...first, name: combined ? '' : first.name, end, approximate, resumeDate: resumeAfter(end) };
  }
  const returnPeriod = [...periods].reverse().find(item => item.end < today && item.end >= shift(today, -14) && resumeAfter(item.end) === today);
  if (returnPeriod && !isWeeklyRestDay(today)) return {
    kind: 'return', name: returnPeriod.name, start: today, end: today, approximate: returnPeriod.approximate, resumeDate: today,
  };
  const upcoming = periods.find(item => item.start > today && item.start <= shift(today, 3));
  return upcoming ? { ...upcoming, kind: 'upcoming' } : undefined;
}
