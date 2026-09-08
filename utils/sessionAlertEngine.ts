import type { AppConfig, ClassInfo } from '../types.js';
import { getDaySessionBlocks, type SessionBlock } from './timetable.js';
import { getEffectiveSchoolYear, isHoliday, isVacation, todayInMorocco, type HolidayCalendar } from './calendar.js';

interface SessionAlert { id: string; kind: 'end' | 'missing'; classIds: string[]; date: string; minute: number }
const reminderMinutes = (value: number | undefined, fallback: number, max = 30): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(1, Math.round(value!))) : fallback;
export const moroccoClockMinutes = (now: Date, zone = 'Africa/Casablanca'): number => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(value => value.type === type)?.value ?? 0);
  return part('hour') * 60 + part('minute') + part('second') / 60;
};
/** Pure detector, shared by reminder dispatch and optional current-class navigation. */
export function detectSessionAlerts(config: Partial<AppConfig>, classes: ClassInfo[], calendar: HolidayCalendar, now: Date, hasDate: (id: string, date: string) => boolean) {
  const today = todayInMorocco(now, calendar);
  const minute = moroccoClockMinutes(now, calendar.fuseau);
  const year = getEffectiveSchoolYear(calendar, config.schoolYearStart, today);
  const settings = config.notificationSettings;
  const holidays = isHoliday(today, calendar) || isVacation(today, calendar);
  const absent = config.absences?.some(period => today >= period.debut && today <= period.fin);
  if (absent || today < year.debut || today > year.fin) return { current: [] as SessionBlock[], events: [] as SessionAlert[], today };
  const ids = new Set(classes.map(item => item.id));
  const blocks = getDaySessionBlocks(
    config.timetable ?? [],
    new Date(`${today}T12:00:00Z`).getUTCDay(),
    config.timetableClock,
  ).filter(block => ids.has(block.classId));
  const current = holidays ? [] : blocks.filter(block => minute >= block.startMin && minute < block.endMin);
  if (!settings?.enabled || (settings.quietDuringVacations && holidays)) return { current, events: [] as SessionAlert[], today };
  const groups = new Map<number, SessionBlock[]>();
  blocks.forEach(block => groups.set(block.endMin, [...groups.get(block.endMin) ?? [], block]));
  const events: SessionAlert[] = [];
  const lead = reminderMinutes(settings.sessionReminderMinutes, 1, 10);
  const grace = reminderMinutes(settings.missingDateReminderMinutes, 5);
  for (const [end, group] of groups) {
    // 60-second freshness window survives ordinary re-renders but never rings after a finished session.
    const due = end - lead;
    if ((settings?.sessionEndReminderEnabled ?? true) && minute >= due && minute < Math.min(due + 1, end)) {
      const active = group.filter(block => minute >= block.startMin);
      if (active.length) events.push({ id: `cdt-session-end-${today}-${end}`, kind: 'end', classIds: active.map(block => block.classId).sort(), date: today, minute: due });
    }
    if ((settings?.missingDateReminderEnabled ?? true) && minute >= end + grace && minute < end + grace + 1) {
      const missing = group.filter(block => !hasDate(block.classId, today));
      if (missing.length) events.push({ id: `cdt-session-missing-${today}-${end}`, kind: 'missing', classIds: missing.map(block => block.classId).sort(), date: today, minute: end + grace });
    }
  }
  return { current, events, today };
}
