import { useCallback } from 'react';
import type { Draft } from 'immer';
import type { Indices, LessonsData } from '@/types';
import { deleteStructuralNodePromotingChildren } from '@/domain/notebook/dataUtils';
import { orderDeletionsDeepestFirst } from '@/domain/notebook/contentEditing';
import { createSelectionState, type SelectionState, type SelectionEditorState } from './useSelectionEngine';

export function useBulkOperations({
  selectedIndices,
  setState,
  setEditorState,
  setSelectionState,
  setConfirmBulkDelete,
}: {
  selectedIndices: Indices[];
  setState: (recipe: (draft: Draft<LessonsData>) => void, action: string) => void;
  setEditorState: (recipe: (draft: SelectionEditorState) => void) => void;
  setSelectionState: (state: SelectionState) => void;
  setConfirmBulkDelete: (val: boolean) => void;
}) {

  const handleBulkDelete = useCallback(() => {
    if (selectedIndices.length === 0) return;
    setConfirmBulkDelete(true);
  }, [selectedIndices, setConfirmBulkDelete]);

  const executeBulkDelete = useCallback(() => {
    if (selectedIndices.length === 0) return;
    
    // Profondeur d'abord : un parent supprimé décale les coordonnées de ses
    // descendants, on retire donc toujours le plus profond avant son ancêtre.
    const sorted = orderDeletionsDeepestFirst(selectedIndices);

    setState(draft => {
      sorted.forEach(idx => {
        deleteStructuralNodePromotingChildren(draft, idx);
      });
    }, 'delete');

    setSelectionState(createSelectionState());
    setConfirmBulkDelete(false);
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [selectedIndices, setState, setSelectionState, createSelectionState, setConfirmBulkDelete, setEditorState]);

  return {
    handleBulkDelete,
    executeBulkDelete
  };
}
