import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Undo2, Redo2, Save, Search, X, ChevronUp, MoreVertical,
  CalendarCheck, Database, ListChecks, PieChart, Printer, CircleHelp,
} from '@/components/ui/icons';
import { SyncStatusBadge } from '@/components/ui/SyncStatusBadge';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onOpenDataTransfer: () => void;
  onOpenManageLessons: () => void;
  onOpenGuide: () => void;
  onOpenAnalyse: () => void;
  onOpenEvaluations: () => void;
  /** ouvre la modale d'impression intelligente — l'impression directe est
      proscrite : le PrintView n'est monté que pendant le circuit du parent */
  onPrint: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  onUndo, onRedo, canUndo, canRedo, onSave, saveStatus,
  onOpenDataTransfer, onOpenManageLessons, onOpenGuide, onOpenAnalyse, onOpenEvaluations,
  onPrint,
  searchQuery, setSearchQuery,
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Focus quand ouverture
  useEffect(() => {
    if (isSearchVisible) {
      // petit timeout pour laisser le panneau s'animer
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isSearchVisible]);

  // Debounce propagation vers parent
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchQuery(localSearch);
    }, 150);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [localSearch, setSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        if (!searchQuery) {
          setIsSearchVisible(false);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // Raccourcis ouverture
      if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && !isSearchVisible) {
        e.preventDefault();
        setIsSearchVisible(true);
        return;
      }
      if (e.key === 'Escape') {
        setIsSearchVisible(false);
        setLocalSearch('');
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        // Empêcher conflit avec recherche navigateur sur mobile web-app
        e.preventDefault();
        setIsSearchVisible(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchQuery, setSearchQuery, isSearchVisible]);

  // Synchronise aussi les recherches ouvertes depuis « Mes classes ».
  useEffect(() => {
    setLocalSearch(current => current === searchQuery ? current : searchQuery);
  }, [searchQuery]);
  
  return (
    <div className="rtl-flow sticky top-2 z-[50] mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/95 px-2 py-1.5 shadow-[0_1px_3px_rgba(24,24,27,0.06)] backdrop-blur-md print:hidden sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-2.5">
      <div className="flex min-w-0 items-center justify-start gap-2">
        <SyncStatusBadge />
      </div>
      
      <div className="hidden items-center justify-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 sm:flex">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-tippy-content="Annuler (Ctrl+Z)" aria-label="Annuler la dernière modification" className="h-7 w-7 rounded-md text-zinc-500 hover:bg-white hover:text-zinc-800 disabled:opacity-30">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-tippy-content="Rétablir (Ctrl+Y)" aria-label="Rétablir la modification" className="h-7 w-7 rounded-md text-zinc-500 hover:bg-white hover:text-zinc-800 disabled:opacity-30">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} disabled={saveStatus === 'saving'} data-tippy-content="Sauvegarde manuelle" aria-label="Sauvegarder maintenant" className="h-7 w-7 rounded-md text-zinc-500 hover:bg-white hover:text-zinc-800 disabled:opacity-30">
          <Save className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <div ref={searchContainerRef} className="relative flex items-center" role="search">
          <Button
            variant="ghost" size="icon"
            onClick={() => setIsSearchVisible(v => !v)}
            data-tippy-content="Rechercher (/ ou Ctrl+K)"
            aria-label="Rechercher"
            aria-expanded={isSearchVisible}
            aria-controls="toolbar-search-panel toolbar-search-panel-mobile"
            className={`relative h-8 w-8 rounded-md border transition-all duration-150 ${searchQuery ? 'border-zinc-300 bg-zinc-100 text-zinc-800 font-bold' : 'border-transparent text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800'}`}
          >
            <Search className="h-4 w-4" />
            {searchQuery && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-zinc-800" />}
          </Button>
          {/* Mobile overlay bar */}
          {isSearchVisible && (
            <div className="sm:hidden fixed top-0 left-0 right-0 z-30 px-3 pt-2.5 pb-2 bg-white/98 backdrop-blur border-b border-zinc-200 shadow-md animate-slide-in-down" id="toolbar-search-panel-mobile">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-zinc-400" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Rechercher..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="flex-1 h-8 text-xs rounded-md border-zinc-200 focus:border-zinc-300 focus:ring-0 focus:outline-none"
                />
                {localSearch && (
                  <button 
                    type="button" 
                    onClick={() => { setLocalSearch(''); setSearchQuery(''); }} 
                    className="w-8 h-8 flex items-center justify-center rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-all duration-150"
                    aria-label="Effacer la recherche"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchVisible(false)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all duration-150"
                  aria-label="Fermer la recherche"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {/* Desktop popover */}
          <div
            id="toolbar-search-panel"
            className={`absolute hidden sm:block transition-all duration-300 ease-in-out origin-right top-1/2 right-[calc(100%+0.5rem)] -translate-y-1/2 w-48 ${isSearchVisible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
          >
            <div className="relative w-full">
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Rechercher..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="rounded-md h-8 text-xs px-2.5 border-zinc-200 focus:border-zinc-300 focus:ring-0"
              />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 cursor-pointer rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-none transition-all hover:bg-zinc-50 hover:text-zinc-800"
              aria-label="Menu d'actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[70] w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-100/50">
            <DropdownMenuLabel className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-zinc-400">
              Actions rapides
            </DropdownMenuLabel>

            {/* Les notifications vivent UNIQUEMENT dans le centre global de
                l'accueil (cloche) — aucune entrée ici, à la demande du prof. */}

            {/* On mobile screens, show undo/redo/save inside the menu */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onUndo} disabled={!canUndo} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
                <Undo2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="font-semibold">Annuler</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRedo} disabled={!canRedo} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
                <Redo2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="font-semibold">Rétablir</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={saveStatus === 'saving'} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
                <Save className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="font-semibold">Sauvegarder</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-t border-zinc-100" />
            </div>

            <DropdownMenuItem onClick={onOpenEvaluations} className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200/50 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 transition-colors duration-150 hover:bg-zinc-100/75 focus:bg-zinc-100/75">
              <CalendarCheck className="h-4 w-4 text-zinc-600 shrink-0" />
              <span className="font-bold">Évaluations de cette classe</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 border-t border-zinc-100" />
            
            <DropdownMenuItem onClick={onOpenDataTransfer} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
              <Database className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="font-semibold">Importer / exporter</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenManageLessons} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
              <ListChecks className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="font-semibold">Gérer les chapitres & devoirs</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAnalyse} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
              <PieChart className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="font-semibold">Analyse & progression</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 border-t border-zinc-100" />
            <DropdownMenuLabel className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-zinc-400">
              Sortie
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onPrint} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
              <Printer className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="font-semibold">Imprimer</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGuide} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
              <CircleHelp className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="font-semibold">Aide</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
