import { isDraft, original, type Draft } from 'immer';
import type { Indices, LessonsData } from '../types';
import { findItem } from './dataUtils';
import { indicesKey } from './lessonRows';
import type { ContentEditTargets } from './contentEditing';

export interface ContentMovePlan {
  anchor: Indices;
  parent: readonly unknown[];
  start: number;
  count: number;
  destination: number;
  selection: Indices[];
}

const indexField = (indices: Indices): keyof Indices =>
  (['itemIndex', 'subsubsectionIndex', 'subsectionIndex', 'sectionIndex', 'chapterIndex'] as const)
    .find(field => indices[field] !== undefined)!;

/** Résout un bloc contigu dans une seule liste, dans l'ordre source. */
function siblingBlock(data: LessonsData, indices: readonly Indices[]) {
  if (!indices.length) return null;
  const located = indices.map(index => ({ index, ...findItem(data, index) }));
  const parent = located[0].parent;
  if (!Array.isArray(parent) || located.some(row => !row.item || row.parent !== parent || typeof row.targetIndex !== 'number')) return null;
  const sorted = located.sort((a, b) => Number(a.targetIndex) - Number(b.targetIndex));
  const start = Number(sorted[0].targetIndex);
  if (sorted.some((row, offset) => row.targetIndex !== start + offset)) return null;
  return { parent, start, count: sorted.length, anchor: sorted[0].index };
}

/** Échange des blocs complets : ni le groupe sélectionné ni son voisin
 * fusionné ne sont coupés. Le filtre et l'ordre des clics n'interviennent pas. */
export function planContentMove(data: LessonsData, groups: ContentEditTargets, selected: ReadonlySet<string>, direction: 'up' | 'down'): ContentMovePlan | null {
  const selectedGroups = new Set<readonly Indices[]>();
  for (const key of selected) {
    const group = groups.get(key);
    if (!group) return null;
    selectedGroups.add(group);
  }
  const block = siblingBlock(data, [...selectedGroups].flat());
  if (!block) return null;
  const field = indexField(block.anchor);
  const neighbourIndex = direction === 'up' ? block.start - 1 : block.start + block.count;
  if (neighbourIndex < 0 || neighbourIndex >= block.parent.length) return null;
  const neighbourIndices = { ...block.anchor, [field]: neighbourIndex };
  const neighbourGroup = groups.get(indicesKey(neighbourIndices));
  if (!neighbourGroup) return null;
  const neighbour = siblingBlock(data, neighbourGroup);
  if (!neighbour || neighbour.parent !== block.parent) return null;
  if (direction === 'up' ? neighbour.start + neighbour.count !== block.start : neighbour.start !== block.start + block.count) return null;
  const destination = direction === 'up' ? neighbour.start : block.start + neighbour.count;
  return {
    ...block,
    destination,
    selection: Array.from({ length: block.count }, (_, offset) => ({ ...block.anchor, [field]: destination + offset })),
  };
}

/** Une mutation / une entrée d'historique. Un plan calculé avant une autre
 * modification de cette liste est ignoré pour ne pas déplacer un autre contenu. */
export function applyContentMove(draft: Draft<LessonsData>, plan: ContentMovePlan): boolean {
  const { parent } = findItem(draft, plan.anchor);
  if (!Array.isArray(parent) || (isDraft(parent) ? original(parent) : parent) !== plan.parent) return false;
  const moved = parent.splice(plan.start, plan.count);
  parent.splice(plan.destination, 0, ...moved);
  return true;
}
