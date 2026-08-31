import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import { useDebouncedCallback } from '../utils/performance';
import { captureWorkspaceLease } from '../utils/accountWorkspace';

export function useOptimizedLocalStorage<T>(
  key: string,
  defaultValue: T,
  debounceMs: number = 1500
) {
  const [value, setValue] = useState<T>(defaultValue);
  const [workspaceIsActive] = useState(() => captureWorkspaceLease());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!workspaceIsActive()) return;
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        try {
          const parsed = JSON.parse(storedValue);
          setValue(parsed);
        } catch (parseErr) {
          if (typeof defaultValue === 'string') {
            // Ancien format possible: valeur texte brute au lieu de JSON ("college").
            setValue(storedValue as T);
            localStorage.setItem(key, JSON.stringify(storedValue));
          } else {
            throw parseErr;
          }
        }
      }
      setError(null);
    } catch (err) {
      logger.error(`Failed to load ${key} from localStorage`, err);
      setError(`Erreur de chargement: ${key}`);
    } finally {
      setIsLoading(false);
      initializedRef.current = true;
    }
  }, [key, workspaceIsActive]);

  // Debounced save to localStorage
  const debouncedSave = useDebouncedCallback((valueToSave: T) => {
    if (!initializedRef.current || !workspaceIsActive()) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(valueToSave));
      setError(null);
    } catch (err) {
      logger.error(`Failed to save ${key} to localStorage`, err);
      setError(`Erreur de sauvegarde: ${key}`);
    }
  }, debounceMs);

  // Update value and trigger save
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prevValue => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prevValue)
        : newValue;
      
      debouncedSave(nextValue);
      return nextValue;
    });
  }, [debouncedSave]);

  // Immediate save (bypass debouncing)
  const saveImmediately = useCallback(() => {
    if (!workspaceIsActive()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError(null);
    } catch (err) {
      logger.error(`Failed to immediately save ${key} to localStorage`, err);
      setError(`Erreur de sauvegarde immédiate: ${key}`);
    }
  }, [key, value, workspaceIsActive]);

  // Clear storage
  const clearValue = useCallback(() => {
    if (!workspaceIsActive()) return;
    try {
      localStorage.removeItem(key);
      setValue(defaultValue);
      setError(null);
    } catch (err) {
      logger.error(`Failed to clear ${key} from localStorage`, err);
      setError(`Erreur de suppression: ${key}`);
    }
  }, [key, defaultValue, workspaceIsActive]);

  return {
    value,
    setValue: updateValue,
    isLoading,
    error,
    saveImmediately,
    clearValue
  };
}
