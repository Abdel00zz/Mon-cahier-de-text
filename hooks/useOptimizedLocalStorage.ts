import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

export function useOptimizedLocalStorage<T>(
  key: string,
  defaultValue: T,
  debounceMs: number = 1500
) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        const parsed = JSON.parse(storedValue);
        setValue(parsed);
      }
      setError(null);
    } catch (err) {
      logger.error(`Failed to load ${key} from localStorage`, err);
      setError(`Erreur de chargement: ${key}`);
    } finally {
      setIsLoading(false);
      initializedRef.current = true;
    }
  }, [key]);

  // Debounced save to localStorage
  const debouncedSave = useDebouncedCallback((valueToSave: T) => {
    if (!initializedRef.current) return;
    
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
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError(null);
    } catch (err) {
      logger.error(`Failed to immediately save ${key} to localStorage`, err);
      setError(`Erreur de sauvegarde immédiate: ${key}`);
    }
  }, [key, value]);

  // Clear storage
  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setValue(defaultValue);
      setError(null);
    } catch (err) {
      logger.error(`Failed to clear ${key} from localStorage`, err);
      setError(`Erreur de suppression: ${key}`);
    }
  }, [key, defaultValue]);

  return {
    value,
    setValue: updateValue,
    isLoading,
    error,
    saveImmediately,
    clearValue
  };
}
