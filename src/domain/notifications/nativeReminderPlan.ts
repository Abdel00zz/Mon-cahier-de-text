import type { AppConfig, ClassInfo } from '../../types';
import { getBundledCalendar, todayInMorocco } from '../calendar/calendar';
import { getDaySessionBlocks } from '../calendar/timetable';
import { detectSessionAlerts } from './sessionAlertEngine';
import { dateTimeFormat } from '../../lib/formatters';
import { sessionNotificationCopy } from './sessionNotificationCopy';
import { sessionReminderMinutes } from './sessionReminderTiming';

/** Convert school wall time through Casablanca's DST changes, independently of the phone zone. */
export function schoolMinuteInstant(day: string, minute: number, zone = 'Africa/Casablanca'): Date | null {
  const wallTime = Date.parse(`${day}T00:00:00Z`) + minute * 60_000;
  const format = dateTimeFormat('en', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  let candidate = wallTime;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = format.formatToParts(candidate);
    const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
    const actual = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'));
    const difference = wallTime - actual;
    if (!difference) return new Date(candidate);
    candidate += difference;
  }
  return null;
}

export interface NativeReminder {
  key: string;
  at: Date;
  title: string;
  body: string;
  url: string;
}

/** Bounded OS schedule; uses the same holiday, absence and school-year rules as the dashboard. */
export function buildNativeReminderPlan(config: AppConfig, classes: ClassInfo[], now = new Date()): NativeReminder[] {
  if (config.notificationSettings?.enabled === false || config.notificationSettings?.sessionEndReminderEnabled === false) return [];
  const calendar = getBundledCalendar();
  const today = todayInMorocco(now, calendar);
  const locale = config.applicationLocale ?? 'ar';
  const lead = sessionReminderMinutes(config.notificationSettings);
  const planned: NativeReminder[] = [];
  for (let offset = 0; offset < 14; offset++) {
    const day = new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const ends = new Set(getDaySessionBlocks(config.timetable ?? [], weekday, config.timetableClock).map(block => block.endMin));
    for (const end of ends) {
      const at = schoolMinuteInstant(day, end - lead, calendar.fuseau);
      if (!at || at.getTime() <= now.getTime()) continue;
      const { events } = detectSessionAlerts(config, classes, calendar, at, () => true);
      for (const event of events.filter(event => event.kind === 'end')) {
        const copy = sessionNotificationCopy('end', event.classIds, classes, locale, lead);
        planned.push({
          key: event.id, at,
          ...copy,
          url: event.classIds.length === 1 ? `/#/classe/${encodeURIComponent(event.classIds[0])}` : '/#/',
        });
      }
    }
  }
  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 64);
}
