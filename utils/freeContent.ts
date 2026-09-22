import type { Draft } from 'immer';
import type { Indices, LessonsData } from '../types';
import { addItem, addTopLevelItem, findItem } from './dataUtils';

/** A real editable row, never a separator or a placeholder stored as text. */
export function insertFreeContent(draft: Draft<LessonsData>, anchor: Indices | undefined, content: { title?: string; description?: string }, id: string) {
  const row = { type: 'free' as const, title: content.title ?? '', description: content.description ?? '', _tempId: id };
  if (anchor) {
    const { itemIndex, ...parent } = anchor;
    const { item } = findItem(draft, parent);
    if (item && ('name' in item || 'items' in item || 'sections' in item || ('type' in item && item.type === 'chapter'))) {
      addItem(draft, parent, row, itemIndex);
      return;
    }
  }
  addTopLevelItem(draft, row, anchor?.chapterIndex);
}
