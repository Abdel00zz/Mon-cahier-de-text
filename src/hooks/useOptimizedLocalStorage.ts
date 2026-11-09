import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '../lib/logger';
import { useDebouncedCallback } from './useDebouncedCallback';
import { captureWorkspaceLease } from '../infrastructure/storage/accountWorkspace';
import { writeDurably } from '../infrastructure/storage/safeStorage';

/*
 * Lecture SYNCHRONE : `localStorage` rend la valeur immédiatement. La lire dans
 * un effet obligeait à annoncer `isLoading: true` au premier rendu — le
 * tableau de bord peignait donc une image de squelette PLEIN ÉCRAN avant
 * d'afficher son contenu, pour une attente qui n'existait pas. La valeur est
 * maintenant prête avant le premier rendu.
 */
function readStoredValue<T>(key: string, defaultValue: T): { value: T; error: string | null } {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null || storedValue === '') return { value: defaultValue, error: null };
    try {
      return { value: JSON.parse(storedValue) as T, error: null };
    } catch (parseErr) {
      // Ancien format possible: valeur texte brute au lieu de JSON ("college").
      if (typeof defaultValue === 'string') return { value: storedValue as T, error: null };
      throw parseErr;
    }
  } catch (err) {
    logger.error(`Failed to load ${key} from localStorage`, err);
    return { value: defaultValue, error: `Erreur de chargement: ${key}` };
  }
}

export function useOptimizedLocalStorage<T>(
  key: string,
  defaultValue: T,
  debounceMs: number = 1500
) {
  const [workspaceIsActive] = useState(() => captureWorkspaceLease());
  const initial = workspaceIsActive()
    ? readStoredValue(key, defaultValue)
    : { value: defaultValue, error: null };

  const [value, setValue] = useState<T>(initial.value);
  const [error, setError] = useState<string | null>(initial.error);
  const isLoading = false;

  const currentKeyRef = useRef(key);
  const valueRef = useRef<T>(value);
  valueRef.current = value;
  const defaultValueRef = useRef<T>(defaultValue);
  defaultValueRef.current = defaultValue;
  const lastPersistedRef = useRef<T>(initial.value);

  // Debounced save to localStorage using writeDurably
  const debouncedSave = useDebouncedCallback((valueToSave: T) => {
    if (!workspaceIsActive()) return;

    try {
      writeDurably(currentKeyRef.current, JSON.stringify(valueToSave));
      setError(null);
    } catch (err) {
      logger.error(`Failed to save ${currentKeyRef.current} to localStorage`, err);
      setError(`Erreur de sauvegarde: ${currentKeyRef.current}`);
    }
  }, debounceMs);

  // Si la clé change, réinitialiser la valeur pour éviter de sauvegarder l'ancienne valeur sous la nouvelle clé
  useEffect(() => {
    if (currentKeyRef.current !== key) {
      debouncedSave.flush();
      currentKeyRef.current = key;
      const next = workspaceIsActive() ? readStoredValue(key, defaultValueRef.current) : { value: defaultValueRef.current, error: null };
      setValue(next.value);
      setError(next.error);
      lastPersistedRef.current = next.value;
    }
  }, [key, debouncedSave, workspaceIsActive]);

  // Persister après le rendu
  useEffect(() => {
    if (Object.is(value, lastPersistedRef.current)) return;
    lastPersistedRef.current = value;
    debouncedSave(value);
  }, [debouncedSave, value]);

  // Flush sur masquage ou fermeture de la page pour éviter toute perte de données
  useEffect(() => {
    const handleFlush = () => {
      if (document.visibilityState === 'hidden') {
        debouncedSave.flush();
      }
    };
    const handlePageHide = () => {
      debouncedSave.flush();
    };

    document.addEventListener('visibilitychange', handleFlush);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleFlush);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [debouncedSave]);

  // Update value and trigger save
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prevValue => typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(prevValue)
      : newValue);
  }, []);

  // Immediate save (bypass debouncing)
  const saveImmediately = useCallback(() => {
    if (!workspaceIsActive()) return;
    try {
      debouncedSave.cancel();
      writeDurably(currentKeyRef.current, JSON.stringify(valueRef.current));
      lastPersistedRef.current = valueRef.current;
      setError(null);
    } catch (err) {
      logger.error(`Failed to immediately save ${currentKeyRef.current} to localStorage`, err);
      setError(`Erreur de sauvegarde immédiate: ${currentKeyRef.current}`);
    }
  }, [workspaceIsActive, debouncedSave]);

  // Clear storage
  const clearValue = useCallback(() => {
    if (!workspaceIsActive()) return;
    try {
      debouncedSave.cancel();
      const def = defaultValueRef.current;
      lastPersistedRef.current = def;
      localStorage.removeItem(currentKeyRef.current);
      setValue(def);
      setError(null);
    } catch (err) {
      logger.error(`Failed to clear ${currentKeyRef.current} from localStorage`, err);
      setError(`Erreur de suppression: ${currentKeyRef.current}`);
    }
  }, [workspaceIsActive, debouncedSave]);

  return {
    value,
    setValue: updateValue,
    isLoading,
    error,
    saveImmediately,
    clearValue,
  };
}
