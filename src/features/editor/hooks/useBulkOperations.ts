import { useCallback, useMemo } from 'react';
import type { Draft } from 'immer';
import type { AppLocale, Indices, LessonsData, TopLevelItem } from '@/types';
import { deleteStructuralNodePromotingChildren, findItem } from '@/domain/notebook/dataUtils';
import { orderDeletionsDeepestFirst } from '@/domain/notebook/contentEditing';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { createSelectionState, type SelectionState, type SelectionEditorState } from './useSelectionEngine';
import type { HistoryEffects } from './useHistoryState';

export function useBulkOperations({
  lessonsData,
  locale,
  confirmBulkDelete,
  selectedIndices,
  setState,
  setEditorState,
  setSelectionState,
  setConfirmBulkDelete,
  onDeleteEffects,
}: {
  lessonsData: LessonsData;
  locale: AppLocale;
  confirmBulkDelete: boolean;
  selectedIndices: Indices[];
  setState: (recipe: (draft: Draft<LessonsData>) => void, action: string, effects?: HistoryEffects) => void;
  setEditorState: (recipe: (draft: SelectionEditorState) => void) => void;
  setSelectionState: (state: SelectionState) => void;
  setConfirmBulkDelete: (val: boolean) => void;
  onDeleteEffects?: (targets: readonly Indices[]) => HistoryEffects | undefined;
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
    const effects = onDeleteEffects?.(selectedIndices);

    setState(draft => {
      sorted.forEach(idx => {
        deleteStructuralNodePromotingChildren(draft, idx);
      });
    }, 'delete', effects);

    setSelectionState(createSelectionState());
    setConfirmBulkDelete(false);
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [selectedIndices, setState, setSelectionState, setConfirmBulkDelete, setEditorState, onDeleteEffects]);

  const bulkDeleteWarning = useMemo(() => {
    if (!confirmBulkDelete || selectedIndices.length === 0) return undefined;
    const datedEvaluations = selectedIndices
      .map(indices => findItem(lessonsData, indices).item)
      .filter((item): item is TopLevelItem =>
        Boolean(item && 'type' in item && item.type !== 'chapter' && TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.type) && item.date?.trim()),
      );
    if (!datedEvaluations.length) return undefined;
    if (locale === 'ar') {
      return datedEvaluations.length === 1
        ? `تنبيه: يتضمن هذا الحذف تقويماً مؤرخاً (« ${datedEvaluations[0].title} ») وسيتم تحديث ورقة المراقبة المستمرة.`
        : `تنبيه: يتضمن هذا الحذف ${datedEvaluations.length} تقويمات مؤرخة وسيتم تحديث ورقة المراقبة المستمرة.`;
    }
    if (locale === 'en') {
      return datedEvaluations.length === 1
        ? `Notice: this deletes a dated assessment (“${datedEvaluations[0].title}”) and updates the continuous assessment sheet.`
        : `Notice: this deletes ${datedEvaluations.length} dated assessments and updates the continuous assessment sheet.`;
    }
    return datedEvaluations.length === 1
      ? `Attention : cette suppression inclut une épreuve déjà datée (« ${datedEvaluations[0].title} ») qui sera retirée de la feuille d’évaluations.`
      : `Attention : cette suppression inclut ${datedEvaluations.length} épreuves déjà datées qui seront retirées de la feuille d’évaluations.`;
  }, [confirmBulkDelete, selectedIndices, lessonsData, locale]);

  return {
    handleBulkDelete,
    executeBulkDelete,
    bulkDeleteWarning,
  };
}
