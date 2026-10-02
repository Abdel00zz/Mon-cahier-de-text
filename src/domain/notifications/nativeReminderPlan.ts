import type { AppConfig, ClassInfo } from '../../types';
import { getBundledCalendar, todayInMorocco } from '../calendar/calendar';
import { getDaySessionBlocks } from '../calendar/timetable';
import { detectSessionAlerts } from './sessionAlertEngine';
import { translateLocaleMessage } from '../../i18n/messages';
import { formatLocalizedClassDisplayName } from '../../constants/class-levels';
import { dateTimeFormat } from '../../lib/formatters';
import { conciseNotificationText } from './notificationPresentation';

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
  const rawLead = config.notificationSettings?.sessionReminderMinutes;
  const lead = Number.isFinite(rawLead) ? Math.min(10, Math.max(1, Math.round(rawLead!))) : 1;
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
        const names = event.classIds.slice(0, 2).map(id => conciseNotificationText(
          formatLocalizedClassDisplayName(classes.find(item => item.id === id)?.name ?? '', locale), 38,
        )).join(locale === 'ar' ? '، ' : ', ') + (event.classIds.length > 2 ? ` (+${event.classIds.length - 2})` : '');
        planned.push({
          key: event.id, at,
          title: translateLocaleMessage(locale, 'sessionAlert.endSoonTitle'),
          body: translateLocaleMessage(locale, 'sessionAlert.endSoonBody', { classes: names, minutes: lead }),
          url: event.classIds.length === 1 ? `/#/classe/${encodeURIComponent(event.classIds[0])}` : '/#/notifications',
        });
      }
    }
  }
  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 64);
}
