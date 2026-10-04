import { useState, useRef, useCallback } from 'react';
import { logger } from '../lib/logger';
import { useDebouncedCallback } from './useDebouncedCallback';
import { captureWorkspaceLease } from '../infrastructure/storage/accountWorkspace';

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
  // Un changement de compte invalide cette instance : on ne lit rien (la
  // valeur appartiendrait au compte précédent) et on n'écrit rien.
  const [initial] = useState(() => workspaceIsActive()
    ? readStoredValue(key, defaultValue)
    : { value: defaultValue, error: null });
  const [value, setValue] = useState<T>(initial.value);
  const [error, setError] = useState<string | null>(initial.error);
  const initializedRef = useRef(true);
  // Aucune attente : la valeur est déjà connue au premier rendu. Le drapeau
  // reste exposé pour les écrans qui gardent un squelette en filet de sécurité.
  const isLoading = false;

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
