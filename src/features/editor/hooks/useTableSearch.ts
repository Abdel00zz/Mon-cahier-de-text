import { useCallback, useEffect, useRef, useState } from 'react';

/** Debounced filtering with separate mobile/desktop focus and IME support. */
export function useTableSearch(query: string, onChange: (query: string) => void) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [localSearch, setLocalSearch] = useState(query);
  const [isComposing, setIsComposing] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ query, onChange });
  latest.current = { query, onChange };

  useEffect(() => { setLocalSearch(query); }, [query]);
  useEffect(() => {
    if (isComposing || localSearch === query) return;
    const timer = window.setTimeout(() => latest.current.onChange(localSearch), 150);
    return () => window.clearTimeout(timer);
  }, [localSearch, query, isComposing]);

  useEffect(() => {
    if (!isSearchVisible) return;
    const desktop = window.matchMedia('(min-width: 640px)');
    let frame = 0;
    const focus = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        (desktop.matches ? desktopInputRef : mobileInputRef).current?.focus();
      });
    };
    focus();
    desktop.addEventListener('change', focus);
    return () => { window.cancelAnimationFrame(frame); desktop.removeEventListener('change', focus); };
  }, [isSearchVisible]);

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    latest.current.onChange('');
  }, []);
  const closeSearch = useCallback(() => {
    setIsSearchVisible(false);
    mobileInputRef.current?.blur();
    desktopInputRef.current?.blur();
  }, []);

  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node) && !mobilePanelRef.current?.contains(event.target as Node) && !latest.current.query) closeSearch();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || document.querySelector('[role="dialog"]')) return;
      const target = event.target instanceof Element ? event.target : null;
      const inSearch = !!target && !!(searchContainerRef.current?.contains(target) || mobilePanelRef.current?.contains(target));
      if (target?.closest('input,textarea,select,[contenteditable="true"]') && !inSearch) return;
      if (event.key === 'Escape' && isSearchVisible) {
        event.preventDefault(); clearSearch(); closeSearch(); return;
      }
      if ((event.key === '/' && !inSearch && !event.ctrlKey && !event.metaKey && !event.altKey)
          || (event.key.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey))) {
        event.preventDefault(); setIsSearchVisible(true);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isSearchVisible, clearSearch, closeSearch]);

  return { isSearchVisible, setIsSearchVisible, localSearch, setLocalSearch, setIsComposing,
    searchContainerRef, mobilePanelRef, mobileInputRef, desktopInputRef, clearSearch, closeSearch };
}
