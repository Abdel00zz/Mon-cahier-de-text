import type { ClassInfo, PedagogicalEvent } from '../../types';
import type { UpcomingAssessment } from './assessments';
import type { OfficialStudentEvent } from './officialStudentEvents';
import type { homeworkDeadlines } from './studentFollowUp';

type Homework = ReturnType<typeof homeworkDeadlines>[number];
interface Activity { classId: string; event: PedagogicalEvent; }
interface Official { classIds: string[]; event: OfficialStudentEvent; }
type Source = { kind: 'homework'; value: Homework } | { kind: 'assessment'; value: UpcomingAssessment }
  | { kind: 'activity'; value: Activity } | { kind: 'official'; value: Official };
export type FollowUpDeadline = Source & { id: string; date: string; endDate?: string; classIds: string[] };

/** One chronological projection of the saved/resolved sources. A class name
 * is never an identity; deleted/unavailable classes cannot leak into the feed. */
export function buildFollowUpDeadlines(classes: readonly ClassInfo[], sources: {
  homework: readonly Homework[]; assessments: readonly UpcomingAssessment[];
  activities: readonly Activity[]; official: readonly Official[];
}): FollowUpDeadline[] {
  const validDate = (date: string | undefined): date is string => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  const available = new Set(classes.map(item => item.id));
  const rows = new Map<string, FollowUpDeadline>();
  const add = (source: Source, id: string, date: string, owners: string[], end?: string) => {
    const classIds = [...new Set(owners.filter(id => available.has(id)))];
    if (!classIds.length || !validDate(date)) return;
    const endDate = validDate(end) && end >= date ? end : undefined;
    const key = `${source.kind}:${id}`;
    rows.set(key, { ...source, id: key, date, ...(endDate ? { endDate } : {}), classIds });
  };
  sources.homework.forEach(value => add({ kind: 'homework', value }, `${value.classInfo.id}:${value.assessmentId}`, value.dueDate, [value.classInfo.id]));
  sources.assessments.forEach(value => add({ kind: 'assessment', value }, `${value.classId}:${value.id}`, value.dateISO, [value.classId]));
  sources.activities.forEach(value => add({ kind: 'activity', value }, `${value.classId}:${value.event.id}`, value.event.date, [value.classId], value.event.endDate));
  sources.official.forEach(value => add({ kind: 'official', value }, value.event.id, value.event.start, value.classIds, value.event.end));
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}


type DeadlineState = 'complete' | 'ongoing' | 'past' | 'today' | 'upcoming';
export type DeadlineScope = 'pending' | 'complete' | 'all';

/** Completion comes from the saved record, never from the passage of time. */
export function deadlineState(item: FollowUpDeadline, today: string): DeadlineState {
  if ((item.kind === 'homework' && item.value.total > 0 && item.value.given === item.value.total)
    || (item.kind === 'activity' && item.value.event.status === 'done')) return 'complete';
  if (item.endDate && item.date < today && item.endDate >= today) return 'ongoing';
  return item.date < today ? 'past' : item.date === today ? 'today' : 'upcoming';
}

export function selectFollowUpDeadlines(items: readonly FollowUpDeadline[], today: string, classId: string, scope: DeadlineScope) {
  return items.filter(item => (!classId || item.classIds.includes(classId))
    && (scope === 'all' || (deadlineState(item, today) === 'complete') === (scope === 'complete')));
}
