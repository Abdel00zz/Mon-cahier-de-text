import type { LessonItem, TopLevelItem, Section, SubSection, SubSubSection } from '../types';

export type EditableContent = LessonItem | TopLevelItem | Section | SubSection | SubSubSection;
export type ContentDraft = Partial<Pick<LessonItem, 'type' | 'number' | 'page' | 'title' | 'description'>> & { name?: string };
export type ContentField = 'type' | 'number' | 'page' | 'title' | 'name' | 'description';

/** Un même contrat de champs pour créer, réinitialiser et enregistrer. Les
 * dates, remarques et sous-arbres ne font jamais partie du patch d'édition. */
export function contentFields(type: string, titleOnly = false, titleField: 'title' | 'name' = 'title'): ContentField[] {
  if (titleOnly) return [titleField];
  return type === 'free' ? ['type', 'title', 'description'] : ['type', 'number', 'page', 'title', 'description'];
}

export function createContentDraft(item: EditableContent, titleOnly = false, titleField: 'title' | 'name' = 'title'): ContentDraft {
  const source = item as unknown as Record<string, unknown>;
  return Object.fromEntries(contentFields(String(source.type ?? ''), titleOnly, titleField)
    .map(field => [field, source[field] ?? ''])) as ContentDraft;
}

export function contentDraftChanged(draft: ContentDraft, original: ContentDraft): boolean {
  return contentFields(String(original.type ?? ''), 'name' in original || !('type' in original), 'name' in original ? 'name' : 'title')
    .some(field => String(draft[field] ?? '') !== String(original[field] ?? ''));
}
