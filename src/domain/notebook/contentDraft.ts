import type { LessonItem, TopLevelItem, Section, SubSection, SubSubSection } from '../../types';
import { FREE_TYPE } from './freeLineType';
import { extractDateRange } from '../evaluations/notebookSyncBridge';

export type EditableContent = LessonItem | TopLevelItem | Section | SubSection | SubSubSection;
export type ContentDraft = Partial<Pick<LessonItem, 'type' | 'number' | 'page' | 'title' | 'description' | 'date'>> & {
  name?: string;
  endDate?: string;
};
export type ContentField = 'type' | 'number' | 'page' | 'title' | 'name' | 'description' | 'date';

/** Un contrat de champs pour créer, réinitialiser et enregistrer, avec prise en charge
 * des dates (notamment les plages 'de XX à YY' pour les évaluations diagnostiques). */
export function contentFields(
  type: string,
  titleOnly = false,
  titleField: 'title' | 'name' = 'title',
  includeDate = false,
): ContentField[] {
  if (titleOnly) return includeDate ? [titleField, 'date'] : [titleField];
  const base = type === FREE_TYPE ? ['type', 'title', 'description'] : ['type', 'number', 'page', 'title', 'description'];
  return includeDate ? ([...base, 'date'] as ContentField[]) : (base as ContentField[]);
}

export function createContentDraft(item: EditableContent, titleOnly = false, titleField: 'title' | 'name' = 'title'): ContentDraft {
  const source = item as unknown as Record<string, unknown>;
  const hasDate = Boolean(source.date !== undefined || 'date' in source);
  const rawDate = typeof source.date === 'string' ? source.date : undefined;
  const { startDate, endDate } = extractDateRange(rawDate);
  const fields = contentFields(String(source.type ?? ''), titleOnly, titleField, hasDate);
  const draft = Object.fromEntries(fields.map(field => [field, source[field] ?? ''])) as ContentDraft;
  if (startDate !== undefined) draft.date = startDate;
  if (endDate !== undefined) draft.endDate = endDate;
  return draft;
}

export function contentDraftChanged(draft: ContentDraft, original: ContentDraft): boolean {
  const fields = contentFields(
    String(original.type ?? ''),
    'name' in original || !('type' in original),
    'name' in original ? 'name' : 'title',
    true,
  );
  const fieldChanged = fields.some(field => String(draft[field] ?? '') !== String(original[field] ?? ''));
  if (fieldChanged) return true;
  return String(draft.endDate ?? '') !== String(original.endDate ?? '');
}
