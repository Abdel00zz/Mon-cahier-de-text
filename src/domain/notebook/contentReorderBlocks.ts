import type { Indices, LessonsData } from '../../types';
import { findItem } from './dataUtils';

export const getIndexField = (indices: Indices): keyof Indices => {
  const fields = ['itemIndex', 'subsubsectionIndex', 'subsectionIndex', 'sectionIndex', 'chapterIndex'] as const;
  return fields.find(field => indices[field] !== undefined)!;
};

/**
 * Valide et extrait un bloc contigu d'éléments situés strictement dans la même liste parente.
 */
export function getContiguousSiblingBlock(data: LessonsData, indices: readonly Indices[]) {
  if (indices.length === 0) return null;

  // Localiser tous les éléments pointés par la sélection
  const located = indices.map(index => ({ index, ...findItem(data, index) }));
  
  // Vérifier qu'ils existent tous
  if (located.some(row => !row.item || typeof row.targetIndex !== 'number')) return null;

  const firstParent = located[0].parent;
  if (!Array.isArray(firstParent)) return null;

  // Règle d'or : On ne déplace pas simultanément des éléments issus de parents/branches différents.
  if (located.some(row => row.parent !== firstParent)) return null;

  // Trier par ordre d'apparition dans le parent
  const sorted = located.sort((a, b) => Number(a.targetIndex) - Number(b.targetIndex));
  const start = Number(sorted[0].targetIndex);
  const count = sorted.length;

  // Vérifier qu'il n'y a aucun trou dans la sélection (contiguïté stricte)
  const hasGaps = sorted.some((row, offset) => row.targetIndex !== start + offset);
  if (hasGaps) return null;

  return { 
    parent: firstParent, 
    start, 
    count, 
    anchor: sorted[0].index 
  };
}

export const withoutDeepestIndex = (indices: Indices): Indices => {
  const copy: Indices = { ...indices };
  delete copy[getIndexField(indices)];
  return copy;
};
