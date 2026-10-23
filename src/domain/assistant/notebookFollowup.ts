import type { AppConfig, ClassInfo, LessonsData, ScheduleSlot } from '../../types';
import { getEffectiveSchoolYear, isHoliday, isVacation, isWeeklyRestDay, listExpectedSessionDates, todayInMorocco, type HolidayCalendar } from '../calendar/calendar';
import { DEFAULT_INACTIVITY_DAYS } from '../calendar/lateness';
import { getClassTeachingEnd } from '../evaluations/officialStudentEvents';
import { validChapterDate } from '../curriculum/chapterLifecycle';
import { walkNotebook } from '../notebook/notebookTraversal';
import { sessionDateKeys } from '../evaluations/homeworkPlacement';

export type FollowupClass = Pick<ClassInfo, 'id' | 'name'> & Partial<Pick<ClassInfo, 'createdAt' | 'subject' | 'cycle'>>;
export type FollowupConfig = Pick<AppConfig, 'absences' | 'schoolYearStart' | 'notificationSettings'>;
export interface NotebookFollowup {
  reason: 'first-session' | 'long-pause';
  /** Elapsed days on which this class actually had lessons, not calendar days or missing contents. */
  elapsedDays: number;
  lastSessionDate?: string;
}

const dateCache = new WeakMap<LessonsData, readonly string[]>();
function recordedSessionDates(lessons: LessonsData): readonly string[] {
  const cached = dateCache.get(lessons);
  if (cached) return cached;
  const rawDates = new Set<string>();
  walkNotebook(lessons, {
    onNode: ({ node, structural }) => {
      // Homework distribution/deadlines and automatic absence notes are not classroom work.
      if (node.type === 'free' || node.type === 'devoir_maison' || node.type === 'maison') return false;
      // A chapter title date is a starting point, not proof of work covered.
      if (!structural && typeof node.date === 'string') rawDates.add(node.date);
    },
    onBudgetExceeded: () => { throw new Error('Notebook exceeds analysis limits'); },
  });
  // A whole class often shares one date: parse each distinct raw value only once.
  const result = [...new Set([...rawDates].flatMap(raw => sessionDateKeys(raw)))].sort();
  dateCache.set(lessons, result);
  return result;
}

/** Light follow-up uses the same calendar and inactivity preference as notifications.
 * It never counts undated planned content as late, or infers edits from lastOpenedAt.
 * Today is left to live-session reminders; only whole past school days are considered. */
export function detectNotebookFollowup(classInfo: FollowupClass, lessons: LessonsData, slots: ScheduleSlot[],
  config: FollowupConfig, calendar: HolidayCalendar, today: string): NotebookFollowup | undefined {
  if (!validChapterDate(today) || !slots.length || isWeeklyRestDay(today)) return;
  const year = getEffectiveSchoolYear(calendar, config.schoolYearStart, today);
  if (today < year.debut || today > year.fin) return;
  if ((config.notificationSettings?.quietDuringVacations ?? true) && (isVacation(today, calendar) || isHoliday(today, calendar))) return;
  const absences = (config.absences ?? []).filter(a => validChapterDate(a.debut) && validChapterDate(a.fin) && a.debut <= a.fin);
  if (absences.some(a => today >= a.debut && today <= a.fin)) return;
  const teachingEnd = getClassTeachingEnd({ ...classInfo, subject: classInfo.subject ?? '' }, year);
  if (teachingEnd && today > teachingEnd) return;
  const created = classInfo.createdAt && Number.isFinite(Date.parse(classInfo.createdAt))
    ? todayInMorocco(new Date(classInfo.createdAt), calendar) : undefined;
  if (created && created > today) return;
  const start = created && created > year.debut ? created : year.debut;
  const dates = recordedSessionDates(lessons);
  let lastSessionDate: string | undefined;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] >= start && dates[i] <= today) { lastSessionDate = dates[i]; break; }
  }
  // An old notebook with no reliable creation date must not inherit a fictitious year's backlog.
  if (!created && !lastSessionDate) return;
  const anchor = lastSessionDate ?? start;
  const effectiveCalendar = { ...calendar, vacances: [...calendar.vacances,
    ...absences.map(a => ({ nom: a.motif ?? 'Absence', debut: a.debut, fin: a.fin }))] };
  const elapsed = listExpectedSessionDates(anchor, today, slots, effectiveCalendar)
    .filter(date => date > anchor && date < today);
  const configured = config.notificationSettings?.inactivityThresholdDays;
  const threshold = Number.isFinite(configured) && configured! > 0 ? Math.ceil(configured!) : DEFAULT_INACTIVITY_DAYS;
  if (elapsed.length < threshold) return;
  return { reason: lastSessionDate ? 'long-pause' : 'first-session', elapsedDays: elapsed.length,
    ...(lastSessionDate ? { lastSessionDate } : {}) };
}
