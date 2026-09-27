import type { Draft } from 'immer';
import type { Indices, LessonsData } from '../types';
import { findItem } from './dataUtils';
import { indicesKey } from './lessonRows';

export interface SessionPatch {
  /** Omitted fields keep every original value, including mixed dates/remarks. */
  date?: string;
  remark?: string;
}

export function readSessionSelection(lessons: LessonsData, targets: readonly Indices[]) {
  const unique = [...new Map(targets.map(indices => [indicesKey(indices), indices])).values()];
  const items = unique.map(indices => findItem(lessons, indices).item);
  if (!items.length || items.some(item => !item)) return null;
  const dates = new Set(items.map(item => item?.date ?? ''));
  const remarks = new Set(items.map(item => item?.remark ?? ''));
  return {
    targets: unique,
    date: dates.size === 1 ? [...dates][0] : '',
    remark: remarks.size === 1 ? [...remarks][0] : '',
    mixedDates: dates.size > 1,
    mixedRemarks: remarks.size > 1,
  };
}

/** Validate the complete target set before a single, undoable mutation. */
export function applySessionEdit(draft: Draft<LessonsData>, targets: readonly Indices[], patch: SessionPatch): boolean {
  const items = targets.map(indices => findItem(draft, indices).item);
  if (!items.length || items.some(item => !item)) return false;
  for (const item of items) {
    if (patch.date !== undefined) item!.date = patch.date;
    if (patch.remark !== undefined) {
      if (patch.remark.trim()) item!.remark = patch.remark;
      else delete item!.remark;
    }
  }
  return true;
}
