import type { NotebookCondition, PedagogicalEvent } from '@/types';
import { REMARK_EVENT_TYPE } from './notebookCheckRemarks';

export interface NotebookControlInsight {
  previousCount: number;
  lastDate?: string;
  previous?: NotebookCondition;
  trend: 'new' | 'stable' | 'improving' | 'attention';
}

const validConditions = new Set<NotebookCondition>(['good', 'average', 'needs_work', 'missing']);

/** Keeps control history useful: same class, same school semester, newest observation wins. */
export function buildNotebookControlInsights(
  events: readonly PedagogicalEvent[] | undefined,
  currentDate: string | undefined,
  currentEventId?: string,
): Record<string, NotebookControlInsight> {
  const currentSemester = currentDate ? (Number(currentDate.slice(5, 7)) <= 1 || Number(currentDate.slice(5, 7)) >= 9 ? 's1' : 's2') : undefined;
  const previous = (events ?? [])
    .filter(event => event.type === REMARK_EVENT_TYPE && event.id !== currentEventId && event.date && (!currentDate || event.date < currentDate))
    .filter(event => {
      if (!currentSemester || !event.date) return true;
      const month = Number(event.date.slice(5, 7));
      return (month <= 1 || month >= 9 ? 's1' : 's2') === currentSemester;
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const result: Record<string, NotebookControlInsight> = {};
  for (const event of previous) {
    for (const name of event.students?.names ?? []) {
      const condition = event.students?.notebookConditions?.[name];
      if (!condition || !validConditions.has(condition)) continue;
      const existing = result[name];
      if (existing) {
        existing.previousCount += 1;
        continue;
      }
      const trend = condition === 'good' ? 'stable' : condition === 'missing' || condition === 'needs_work' ? 'attention' : 'improving';
      result[name] = { previousCount: 1, lastDate: event.date, previous: condition, trend };
    }
  }
  return result;
}
