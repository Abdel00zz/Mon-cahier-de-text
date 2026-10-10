import { useState, useMemo, useCallback, useTransition } from 'react';
import type { Draft } from 'immer';
import type { Indices, LessonsData } from '@/types';
import { indicesKey } from '@/domain/notebook/lessonRows';
import {
  planContentMove, applyContentMove,
  planContentRelocation, applyContentRelocation,
  planContentTransfer, applyContentTransfer,
  isExercise,
} from '@/domain/notebook/contentReorder';
import { findItem } from '@/domain/notebook/dataUtils';
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
  contentMoveTargets,
  freeKeys,
  setState,
  setEditorState,
}: {
  lessonsData: LessonsData;
  /** cibles du déplacement : la séance fusionnée bouge d'un seul lot */
  moveTargets: ContentEditTargets;
  /** Exercises can move independently of other contents dated the same day. */
  contentMoveTargets?: ContentEditTargets;
  /** clés des lignes libres : seule une sélection qui en contient une peut
   *  prétendre à la relocalisation (sinon on évite un parcours complet). */
  freeKeys: ReadonlySet<string>;
  setState: (recipe: (draft: Draft<LessonsData>) => void, action: string) => void;
  setEditorState: (recipe: (draft: SelectionEditorState) => void) => void;
}) {
  const [selectionState, setSelectionState] = useState<SelectionState>(() => createSelectionState());
  const [isSelectionPending, startSelectionTransition] = useTransition();

  const selectedIndices = useMemo(() => Array.from(selectionState.items.values()), [selectionState]);
  const selectedCount = selectionState.keys.size;

  const moveOptions = useMemo(() => {
    const groups = contentMoveTargets && selectedIndices.length && selectedIndices.every(indices => isExercise(findItem(lessonsData, indices).item))
      ? contentMoveTargets : moveTargets;
    const build = (direction: 'up' | 'down') => {
      // 1. Ligne libre : elle glisse le long de la structure, y compris sous un
      //    titre — donc dans un autre parent — pour se poser sous un paragraphe,
      //    une proposition ou n'importe quel type de contenu.
      const mayRelocate = Array.from(selectionState.keys).some(key => freeKeys.has(key));
      const relocation = mayRelocate
        ? planContentRelocation(lessonsData, moveTargets, selectionState.keys, direction)
        : null;
      if (relocation) return { kind: 'relocation' as const, relocation };
      // 2. Contenu typé ou séance fusionnée : permutation avec le voisin de la même liste.
      const swap = planContentMove(lessonsData, groups, selectionState.keys, direction);
      if (swap) return { kind: 'swap' as const, swap };
      // 3. Au bord de la liste : le bloc passe au conteneur voisin du cahier
      //    (fin du précédent en montant, début du suivant en descendant).
      const transfer = planContentTransfer(lessonsData, groups, selectionState.keys, direction);
      return transfer ? { kind: 'transfer' as const, transfer } : null;
    };
    return { up: build('up'), down: build('down') };
  }, [lessonsData, moveTargets, contentMoveTargets, freeKeys, selectionState.keys, selectedIndices]);

  const canMoveUp = moveOptions.up !== null;
  const canMoveDown = moveOptions.down !== null;

  const handleMoveSelected = useCallback((direction: 'up' | 'down') => {
    const option = moveOptions[direction];
    if (!option) return;

    setState(draft => {
      if (option.kind === 'relocation') applyContentRelocation(draft, option.relocation);
      else if (option.kind === 'transfer') applyContentTransfer(draft, option.transfer);
      else applyContentMove(draft, option.swap);
    }, 'reorder');

    setSelectionState(createSelectionState(
      option.kind === 'relocation' ? option.relocation.selection
        : option.kind === 'transfer' ? option.transfer.selection
          : option.swap.selection
    ));
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [moveOptions, setState, setEditorState]);

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
    canMoveUp,
    canMoveDown,
    handleMoveSelected,
    handleToggleSelectRow,
    handleToggleSelectGroup,
    handleDeselectAll,
  };
}
