import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { printDocument } from '../utils/printUtils';
import {
  Undo2, Redo2, Save, Search, X, ChevronUp, MoreVertical,
  FileInput, FileOutput, ListChecks, PieChart, Printer, CircleHelp, History,
} from './ui/icons';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onOpenImport: () => void;
  onOpenManageLessons: () => void;
  onOpenGuide: () => void;
  onOpenAnalyse: () => void;
  onExportData: () => void;
  onPrint?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** journal : dernière opération, format compact « op · il y a X » */
  lastModifiedLabel?: string | null;
  onOpenHistory?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  onUndo, onRedo, canUndo, canRedo, onSave, saveStatus,
  onOpenImport, onOpenManageLessons, onOpenGuide, onOpenAnalyse, onExportData,
  onPrint,
  searchQuery, setSearchQuery,
  lastModifiedLabel, onOpenHistory,
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
    <div className="sticky top-0 z-[50] mb-0 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 bg-white/95 px-4 py-2 shadow-none backdrop-blur print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        {/* Journal compact : dernière opération, clic → historique détaillé */}
        {lastModifiedLabel && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex min-w-0 max-w-[38vw] items-center gap-1.5 rounded bg-slate-50 border border-slate-200/60 px-2 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:max-w-56"
            data-tippy-content="Voir l'historique des actions"
            aria-label="Historique des modifications"
          >
            <History className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{lastModifiedLabel}</span>
          </button>
        )}
      </div>
      
      <div className="flex-1 flex justify-center items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-tippy-content="Annuler (Ctrl+Z)" aria-label="Annuler la dernière modification" className="rounded-md h-8 w-8 text-slate-600">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-tippy-content="Rétablir (Ctrl+Y)" aria-label="Rétablir la modification" className="rounded-md h-8 w-8 text-slate-600">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} disabled={saveStatus === 'saving'} data-tippy-content="Sauvegarde manuelle" aria-label="Sauvegarder maintenant" className="rounded-md h-8 w-8 text-slate-600">
          <Save className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <div ref={searchContainerRef} className="relative flex items-center" role="search">
          <Button
            variant="ghost" size="icon"
            onClick={() => setIsSearchVisible(v => !v)}
            data-tippy-content="Rechercher (/ ou Ctrl+K)"
            aria-label="Rechercher"
            aria-expanded={isSearchVisible}
            aria-controls="toolbar-search-panel"
            className={`relative rounded-md h-8 w-8 ${searchQuery ? 'bg-primary/10 text-primary' : 'text-slate-600'}`}
          >
            <Search className="h-4 w-4" />
            {searchQuery && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />}
          </Button>
          {/* Mobile overlay bar */}
          {isSearchVisible && (
            <div className="sm:hidden fixed top-0 left-0 right-0 z-30 px-3 pt-2.5 pb-2 bg-white/95 backdrop-blur border-b border-slate-200 shadow-md animate-slide-in-down" id="toolbar-search-panel">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Rechercher..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="flex-1 h-8 text-xs rounded-md"
                />
                {localSearch && (
                  <button 
                    type="button" 
                    onClick={() => { setLocalSearch(''); setSearchQuery(''); }} 
                    className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all duration-200"
                    aria-label="Effacer la recherche"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchVisible(false)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200"
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
                className="rounded-md h-8 text-xs px-2.5"
              />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              aria-label="Menu d'actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-[70] rounded-md border border-slate-200 shadow-lg">
            <DropdownMenuLabel className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Actions rapides
            </DropdownMenuLabel>
            
            {/* On mobile screens, show undo/redo/save inside the menu */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onUndo} disabled={!canUndo} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
                <Undo2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Annuler</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRedo} disabled={!canRedo} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
                <Redo2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Rétablir</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={saveStatus === 'saving'} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
                <Save className="h-3.5 w-3.5 text-slate-400" />
                <span>Sauvegarder</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>

            <DropdownMenuItem onClick={onOpenImport} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
              <FileInput className="h-3.5 w-3.5 text-slate-400" />
              <span>Importer JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportData} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
              <FileOutput className="h-3.5 w-3.5 text-slate-400" />
              <span>Exporter JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenManageLessons} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
              <ListChecks className="h-3.5 w-3.5 text-slate-400" />
              <span>Gérer les chapitres & devoirs</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAnalyse} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
              <PieChart className="h-3.5 w-3.5 text-slate-400" />
              <span>Analyse & progression</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Sortie
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => (onPrint ? onPrint() : printDocument('cahier-de-textes'))} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
              <Printer className="h-3.5 w-3.5 text-slate-400" />
              <span>Imprimer</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGuide} className="flex items-center gap-2.5 py-2 cursor-pointer text-xs">
              <CircleHelp className="h-3.5 w-3.5 text-slate-400" />
              <span>Aide</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
