import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dequal } from 'dequal';
import type { AppConfig, Cycle } from '@/types';
import { registerWorkspaceWriter } from '@/infrastructure/storage/accountWorkspace';

/** Explicit saving in the desktop dialog; automatic, flushed saving in the mobile page. */
export function useSettingsProfile(config: AppConfig, onChange: (patch: Partial<AppConfig>) => void, autoSave = false) {
  const [draft, setDraft] = useState<Partial<AppConfig>>({});
  const draftRef = useRef(draft);
  const current = useRef({ config, onChange });
  current.current = { config, onChange };
  const localConfig = useMemo(() => ({ ...config, ...draft }), [config, draft]);
  const hasChanges = Object.entries(draft).some(([key, value]) => !dequal(value, config[key as keyof AppConfig]));

  const change = useCallback((patch: Partial<AppConfig>) => {
    draftRef.current = { ...draftRef.current, ...patch };
    setDraft(draftRef.current);
  }, []);
  const reset = useCallback(() => { draftRef.current = {}; setDraft({}); }, []);
  const persist = useCallback(() => {
    const { config: saved, onChange: commit } = current.current;
    const patch = Object.fromEntries(Object.entries(draftRef.current)
      .filter(([key, value]) => !dequal(value, saved[key as keyof AppConfig]))) as Partial<AppConfig>;
    if (Object.keys(patch).length) commit(patch);
    draftRef.current = {};
  }, []);
  const save = useCallback(() => { persist(); setDraft({}); }, [persist]);

  useEffect(() => {
    if (!autoSave || !hasChanges) return;
    const timer = window.setTimeout(save, 400);
    return () => window.clearTimeout(timer);
  }, [autoSave, draft, hasChanges, save]);
  // A quick tab switch, browser back or account change must not cancel a pending edit.
  // The config owner still enforces its account lease before persisting.
  useEffect(() => {
    if (!autoSave) return;
    const flush = () => persist();
    const unregister = registerWorkspaceWriter(() => { persist(); return true; });
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      unregister();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [autoSave, persist]);

  const toggleSubject = useCallback((subject: string) => {
    const selected = draftRef.current.selectedSubjects ?? current.current.config.selectedSubjects ?? [];
    if (selected.length === 1 && selected.includes(subject)) return;
    change({ selectedSubjects: selected.includes(subject) ? selected.filter(item => item !== subject) : [...selected, subject], showAllSubjects: false });
  }, [change]);
  const toggleCycle = useCallback((cycle: Cycle) => {
    const selected = draftRef.current.selectedCycles ?? current.current.config.selectedCycles ?? [];
    if (selected.length === 1 && selected.includes(cycle)) return;
    change({ selectedCycles: selected.includes(cycle) ? selected.filter(item => item !== cycle) : [...selected, cycle], showAllCycles: false });
  }, [change]);
  return { localConfig, hasChanges, change, reset, save, toggleSubject, toggleCycle };
}
