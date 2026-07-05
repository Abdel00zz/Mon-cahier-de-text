import { useState, useCallback, useMemo } from 'react';
import { produce, Draft } from 'immer';

interface HistoryOptions {
  capacity: number;
}

interface HistoryEntry<T> {
  data: T;
  operationType: string;
}

export const useHistoryState = <T,>(
  initialState: T,
  options: HistoryOptions = { capacity: 50 }
) => {
  const [historyState, setHistoryState] = useState<{
    history: HistoryEntry<T>[];
    currentIndex: number;
  }>({
    history: [{ data: initialState, operationType: 'initial' }],
    currentIndex: 0,
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
      };
    });
  }, [options.capacity]);

  const undo = useCallback(() => {
    setHistoryState(prev => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - 1)
    }));
  }, []);

  const redo = useCallback(() => {
    setHistoryState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.history.length - 1, prev.currentIndex + 1)
    }));
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    operationType: history[currentIndex]?.operationType,
  };
};