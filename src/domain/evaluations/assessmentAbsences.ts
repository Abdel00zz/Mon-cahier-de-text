import type { AppConfig, LessonsData } from '@/types';
import { findNotebookAssessments } from './assessmentSync';
import { sessionDateKeys } from './homeworkPlacement';

/** Absences belong to an assessment identity, never to a digit found in a title. */
export function assessmentAbsencesByDate(config: Pick<AppConfig,
  'assessmentAbsences' | 'assessmentDates' | 'manualAssessments' | 'removedAssessments'>,
  classId: string, lessons: LessonsData): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const records = config.assessmentAbsences?.[classId] ?? {};
  const dates = config.assessmentDates?.[classId] ?? {};
  const manual = config.manualAssessments?.[classId] ?? [];
  const entries = findNotebookAssessments(lessons);
  const removed = new Set(config.removedAssessments?.[classId] ?? []);
  const ids = new Set([...Object.keys(records), ...Object.keys(dates), ...manual.map(item => item.id),
    ...entries.flatMap(entry => entry.assessmentId ? [entry.assessmentId] : [])]);
  const canonical = (id: string) => {
    if (id.includes(':')) return id;
    const matches = [...ids].filter(candidate => candidate.endsWith(`:${id}`));
    return matches.length === 1 ? matches[0] : id;
  };
  for (const [recordId, record] of Object.entries(records)) {
    const id = canonical(recordId);
    // A canonical record, even empty, takes precedence over its historical alias.
    if (recordId !== id && records[id] !== undefined) continue;
    const legacyId = id.split(':').at(-1)!;
    if (removed.has(id) || removed.has(legacyId)) continue;
    const matchesId = (candidate: string) => canonical(candidate) === id;
    const entry = entries.filter(item => item.assessmentId && matchesId(item.assessmentId));
    const owner = manual.find(item => matchesId(item.id));
    const assigned = dates[id] ?? (canonical(legacyId) === id ? dates[legacyId] : undefined);
    const date = assigned ?? (entry.length === 1 ? entry[0].date : undefined) ?? owner?.dateISO;
    for (const day of sessionDateKeys(date)) {
      const names = result.get(day) ?? [];
      for (const name of record.names ?? []) {
        const clean = name.trim();
        if (clean && !names.includes(clean)) names.push(clean);
      }
      if (names.length) result.set(day, names);
    }
  }
  return result;
}
