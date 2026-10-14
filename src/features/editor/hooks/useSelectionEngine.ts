import { useState, useMemo, useCallback, useTransition } from 'react';
import type { Draft } from 'immer';
import type { Indices, LessonsData } from '@/types';
import { indicesKey } from '@/domain/notebook/lessonRows';
import { applyContentDrop, planContentDrop } from '@/domain/notebook/contentReorder';
import type { ContentEditTargets } from '@/domain/notebook/contentEditing';

export interface SelectionState {
  keys: Set<string>;
  items: Map<string, Indices>;
}

export interface SelectionEditorState {
  saveStatus: 'saved' | 'saving' | 'unsaved';
}

export const createSelectionState = (indices?: Indices | Indices[]): SelectionState => {
  const keys = new Set<string>();
  const items = new Map<string, Indices>();
  for (const index of (indices ? (Array.isArray(indices) ? indices : [indices]) : [])) {
    const key = indicesKey(index);
    keys.add(key);
    items.set(key, index);
  }
  return { keys, items };
};

export function useSelectionEngine({
  lessonsData,
  moveTargets,
  setState,
  setEditorState,
}: {
  lessonsData: LessonsData;
  /** cibles du déplacement : la séance fusionnée bouge d'un seul lot */
  moveTargets: ContentEditTargets;
  setState: (recipe: (draft: Draft<LessonsData>) => void, action: string) => void;
  setEditorState: (recipe: (draft: SelectionEditorState) => void) => void;
}) {
  const [selectionState, setSelectionState] = useState<SelectionState>(() => createSelectionState());
  const [isSelectionPending, startSelectionTransition] = useTransition();

  const selectedIndices = useMemo(() => Array.from(selectionState.items.values()), [selectionState]);
  const selectedCount = selectionState.keys.size;

  const handleDropRow = useCallback((sourceKey: string, targetKey: string, side: 'before' | 'after') => {
    const plan = planContentDrop(lessonsData, moveTargets, sourceKey, targetKey, side);
    if (!plan) return false;
    setState(draft => { applyContentDrop(draft, plan); }, 'reorder');
    setSelectionState(createSelectionState(plan.selection));
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
    return true;
  }, [lessonsData, moveTargets, setState, setEditorState]);

  const canDropRow = useCallback((sourceKey: string, targetKey: string, side: 'before' | 'after') =>
    planContentDrop(lessonsData, moveTargets, sourceKey, targetKey, side) !== null,
  [lessonsData, moveTargets]);

  const handleToggleSelectRow = useCallback((indices: Indices) => {
    startSelectionTransition(() => {
      setSelectionState(current => {
        const key = indicesKey(indices);
        const keys = new Set(current.keys);
        const items = new Map(current.items);
        if (keys.has(key)) {
          keys.delete(key);
          items.delete(key);
        } else {
          keys.add(key);
          items.set(key, indices);
        }
        return { keys, items };
      });
    });
  }, []);

  const handleToggleSelectGroup = useCallback((groupIndices: Indices[]) => {
    if (groupIndices.length === 0) return;
    startSelectionTransition(() => {
      setSelectionState(current => {
        const keys = new Set(current.keys);
        const items = new Map(current.items);
        const allSelected = groupIndices.every(idx => keys.has(indicesKey(idx)));
        if (allSelected) {
          groupIndices.forEach(idx => {
            const key = indicesKey(idx);
            keys.delete(key);
            items.delete(key);
          });
        } else {
          groupIndices.forEach(idx => {
            const key = indicesKey(idx);
            keys.add(key);
            items.set(key, idx);
          });
        }
        return { keys, items };
      });
    });
  }, []);

  const handleDeselectAll = useCallback(() => {
    startSelectionTransition(() => {
      setSelectionState(createSelectionState());
    });
  }, []);

  return {
    selectionState,
    selectedIndices,
    selectedCount,
    setSelectionState,
    isSelectionPending,
    handleDropRow,
    canDropRow,
    handleToggleSelectRow,
    handleToggleSelectGroup,
    handleDeselectAll,
  };
}
