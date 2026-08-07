import { useState, useCallback, useMemo } from 'react';
import { produce, Draft } from 'immer';

interface HistoryOptions {
  capacity: number;
}

interface HistoryEntry<T> {
  data: T;
  operationType: string;
}

type HistoryAction = 'edit' | 'reset' | 'undo' | 'redo';

export const useHistoryState = <T,>(
  initialState: T,
  options: HistoryOptions = { capacity: 50 }
) => {
  const [historyState, setHistoryState] = useState<{
    history: HistoryEntry<T>[];
    currentIndex: number;
    lastAction: HistoryAction;
  }>({
    history: [{ data: initialState, operationType: 'initial' }],
    currentIndex: 0,
    lastAction: 'reset',
  });

  const { history, currentIndex } = historyState;
  const state = useMemo(() => history[currentIndex]?.data, [history, currentIndex]);

  const setState = useCallback((updater: (draft: Draft<T>) => void | T, operationType: string) => {
    setHistoryState(currentHistoryState => {
      const currentState = currentHistoryState.history[currentHistoryState.currentIndex].data;

      const newState = produce(currentState, updater as any);

      // Immer returns the original state if no changes are made.
      // This is much more performant than a deep stringify comparison.
      if (newState === currentState) {
        return currentHistoryState;
      }

      const newHistory = currentHistoryState.history.slice(0, currentHistoryState.currentIndex + 1);
      if (newHistory.length >= options.capacity) {
        newHistory.shift();
      }
      
      const finalHistory = [...newHistory, { data: newState, operationType }];
      return {
        history: finalHistory,
        currentIndex: finalHistory.length - 1,
        lastAction: 'edit',
      };
    });
  }, [options.capacity]);

  /**
   * Remplace l'historique par un nouvel état de référence.
   * À utiliser pour les chargements/restaurations : ces opérations techniques
   * ne doivent jamais être annulables comme une édition utilisateur.
   */
  const resetState = useCallback((nextState: T, operationType = 'initial-load') => {
    setHistoryState({
      history: [{ data: nextState, operationType }],
      currentIndex: 0,
      lastAction: 'reset',
    });
  }, []);

  const undo = useCallback(() => {
    setHistoryState(prev => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - 1),
      lastAction: 'undo',
    }));
  }, []);

  const redo = useCallback(() => {
    setHistoryState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.history.length - 1, prev.currentIndex + 1),
      lastAction: 'redo',
    }));
  }, []);

  return {
    state,
    setState,
    resetState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    operationType: history[currentIndex]?.operationType,
    historyAction: historyState.lastAction,
  };
};
