import { produce } from 'immer';
import type { LessonsData } from '../../types';
import { type LessonRow } from '../notebook/lessonRows';
import { findItem } from '../notebook/dataUtils';
import { extractDateRange } from './dateRange';
import {
  extractHomeworkAssignmentNumber,
  hasHomeworkAssignmentMention,
} from './homeworkNumbering';
import { parseRemarkEventId, rowMatchesRemarkId } from './evaluationIdentity';
import { PEDAGOGICAL_ACTIVITIES, removeActivityLines } from './pedagogicalActivities';

/**
 * Retire la ligne d'activité (contrôle des cahiers, remédiation, soutien, rattrapage)
 * de la remarque de séance sans jamais altérer les notes libres du professeur.
 */
export function removeRemarkActivityFromNotebook(
  lessons: LessonsData,
  rows: readonly LessonRow[],
  eventId: string,
  eventDate?: string,
): { lessons: LessonsData; updated: boolean } | null {
  const remarkTarget = parseRemarkEventId(eventId);
  if (!remarkTarget) return null;
  const activity = PEDAGOGICAL_ACTIVITIES.find(item => item.type === remarkTarget.type);
  if (!activity) return { lessons, updated: false };

  let matchedRows = rows.filter(
    row => rowMatchesRemarkId(row, remarkTarget.rowId) && typeof row.data.remark === 'string',
  );
  if (!matchedRows.length && eventDate) {
    matchedRows = rows.filter(
      row => extractDateRange(row.data.date).startDate === eventDate && typeof row.data.remark === 'string',
    );
  }
  if (!matchedRows.length) return { lessons, updated: false };

  let changed = false;
  const next = produce(lessons, draft => {
    for (const row of matchedRows) {
      const { item } = findItem(draft, row.indices);
      const remark = (item as { remark?: string } | undefined)?.remark;
      if (!item || typeof remark !== 'string') continue;
      const cleaned = removeActivityLines(remark, activity);
      if (cleaned !== remark) {
        changed = true;
        if (cleaned) (item as { remark?: string }).remark = cleaned;
        else delete (item as { remark?: string }).remark;
      }
    }
  });
  return { lessons: changed ? next : lessons, updated: changed };
}

/**
 * Retire la mention d'attribution d'un devoir maison écrite dans `item.remark`,
 * tout en préservant les autres notes libres du professeur.
 */
export function removeHomeworkAssignmentFromNotebook(
  lessons: LessonsData,
  rows: readonly LessonRow[],
  num?: number,
  ownerDate?: string,
): { lessons: LessonsData; updated: boolean } {
  const matchesAssignmentLine = (line: string) =>
    hasHomeworkAssignmentMention(line) && (num === undefined || extractHomeworkAssignmentNumber(line) === num);
  const dateMatches = (row: LessonRow) =>
    !ownerDate || extractDateRange(row.data.date).startDate === ownerDate;

  const remarked = rows.filter(row => {
    const remark = (row.data as { remark?: unknown }).remark;
    return dateMatches(row) && typeof remark === 'string'
      && remark.split('\n').some(matchesAssignmentLine);
  });
  if (!remarked.length) return { lessons, updated: false };

  const cleanedLessons = produce(lessons, draft => {
    for (const row of remarked) {
      const { item } = findItem(draft, row.indices);
      const remark = (item as { remark?: string } | undefined)?.remark;
      if (!item || typeof remark !== 'string') continue;
      const kept = remark.split('\n').filter(line => !matchesAssignmentLine(line)).join('\n').trim();
      if (kept) (item as { remark?: string }).remark = kept;
      else delete (item as { remark?: string }).remark;
    }
  });
  return { lessons: cleanedLessons, updated: true };
}
