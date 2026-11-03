import type { AppLocale, ClassInfo } from '../../types';
import type { SessionScheduleStatus } from '../../domain/calendar/sessionScheduleStatus';

export interface DashboardClassGroup {
  key: string;
  label: string;
  order: number;
  showTitle: boolean;
  items: Array<{ classInfo: ClassInfo; startMin: number }>;
}

/** A class follows its next teaching slot, never a session that already ended.
 * Incoming class order breaks ties, preserving the teacher's manual ordering. */
export function groupDashboardClasses(
  classes: readonly ClassInfo[], schedules: ReadonlyMap<string, SessionScheduleStatus>, locale: AppLocale,
): DashboardClassGroup[] {
  const groups = new Map<string, DashboardClassGroup>();
  const labels = locale === 'ar' ? ['اليوم', 'غداً', 'أقسام أخرى', 'حصص قادمة']
    : locale === 'en' ? ['Today', 'Tomorrow', 'Other classes', 'Upcoming sessions']
      : ['Aujourd’hui', 'Demain', 'Autres classes', 'Séances à venir'];
  for (const classInfo of classes) {
    const schedule = schedules.get(classInfo.id);
    const upcoming = schedule && schedule.state !== 'none';
    const offset = upcoming ? schedule.dayOffset ?? 0 : 999;
    const key = upcoming ? `day-${offset}` : 'other';
    const label = !upcoming ? labels[2] : offset < 2 ? labels[offset]
      : offset >= 7 && schedule.date
        ? new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${schedule.date}T12:00:00Z`))
        : schedule.dayLabel || labels[3];
    let group = groups.get(key);
    if (!group) { group = { key, label, order: offset, showTitle: true, items: [] }; groups.set(key, group); }
    group.items.push({ classInfo, startMin: upcoming ? schedule.startMin ?? 9999 : 9999 });
  }
  const result = [...groups.values()].sort((a, b) => a.order - b.order);
  for (const group of result) {
    group.showTitle = !(result.length === 1 && group.key === 'other');
    group.items.sort((a, b) => Number(schedules.get(b.classInfo.id)?.state === 'in_progress')
      - Number(schedules.get(a.classInfo.id)?.state === 'in_progress') || a.startMin - b.startMin);
  }
  return result;
}
