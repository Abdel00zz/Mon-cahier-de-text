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
import { useLocale } from '@/i18n/LocaleProvider';

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
  /** ouvre la modale d'impression intelligente, l'impression directe est
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
  const { t, isRtl } = useLocale();
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
    <div
      data-editor-toolbar
      className="rtl-flow rtl-toolbar sticky top-1 sm:top-2 z-[50] mb-3.5 mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-[#e8e2d8] dark:border-stone-800/90 bg-[#fbf9f4]/90 dark:bg-[#1c1917]/90 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 shadow-[0_2px_12px_-3px_rgba(40,30,20,0.06)] dark:shadow-[0_2px_12px_-3px_rgba(0,0,0,0.4)] print:hidden sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] transition-all duration-200"
    >
      <div className="flex min-w-0 items-center justify-start gap-1.5">
        <SyncStatusBadge />
      </div>
      
      <div className="hidden items-center justify-center gap-1 sm:flex bg-[#f2ede4]/60 dark:bg-stone-800/40 p-0.5 rounded-xl border border-[#eae3d7]/60 dark:border-stone-800/60">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-tippy-content={t('toolbar.undoShortcut')} aria-label={t('toolbar.undoAria')} className="h-7.5 w-7.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-[#eae3d5] dark:hover:bg-stone-700/80 hover:text-stone-900 dark:hover:text-stone-100 active:scale-95 disabled:opacity-30">
          <Undo2 className="h-3.5 w-3.5 stroke-[2.2]" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-tippy-content={t('toolbar.redoShortcut')} aria-label={t('toolbar.redoAria')} className="h-7.5 w-7.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-[#eae3d5] dark:hover:bg-stone-700/80 hover:text-stone-900 dark:hover:text-stone-100 active:scale-95 disabled:opacity-30">
          <Redo2 className="h-3.5 w-3.5 stroke-[2.2]" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} disabled={saveStatus === 'saving'} data-tippy-content={t('toolbar.manualSave')} aria-label={t('toolbar.saveNow')} className="h-7.5 w-7.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-[#eae3d5] dark:hover:bg-stone-700/80 hover:text-stone-900 dark:hover:text-stone-100 active:scale-95 disabled:opacity-30">
          <Save className="h-3.5 w-3.5 stroke-[2.2]" />
        </Button>
      </div>

      <div className="flex items-center justify-end gap-1">
        <div ref={searchContainerRef} className="relative flex items-center" role="search">
          <Button
            variant="ghost" size="icon"
            onClick={() => setIsSearchVisible(v => !v)}
            data-tippy-content={t('toolbar.searchShortcut')}
            aria-label={t('toolbar.search')}
            aria-expanded={isSearchVisible}
            aria-controls="toolbar-search-panel toolbar-search-panel-mobile"
            className={`relative h-7.5 w-7.5 rounded-lg border-none transition-all duration-150 active:scale-95 ${searchQuery ? 'bg-[#ede6d8] dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-300 hover:bg-[#eae3d5] dark:hover:bg-stone-800/80 hover:text-stone-900 dark:hover:text-stone-100'}`}
          >
            <Search className="h-3.5 w-3.5 stroke-[2.2]" />
            {searchQuery && <span aria-hidden className="toolbar-search-indicator absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />}
          </Button>
          {/* Mobile overlay bar */}
          {isSearchVisible && (
            <div className="sm:hidden fixed top-2 inset-x-3 z-30 px-3.5 py-2 bg-[#fbf9f4]/95 dark:bg-[#1c1917]/95 backdrop-blur-md border border-[#e8e2d8] dark:border-stone-800 rounded-2xl shadow-xl animate-in slide-in-from-top-3 fade-in duration-200" id="toolbar-search-panel-mobile">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 stroke-[2.2] text-stone-500 dark:text-stone-400" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder={t('toolbar.searchPlaceholder')}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="flex-1 h-8 text-xs rounded-xl border-[#e2dcd0] dark:border-stone-800 bg-background/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                {localSearch && (
                  <button 
                    type="button" 
                    onClick={() => { setLocalSearch(''); setSearchQuery(''); }} 
                    className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-[#eae3d5] dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-all duration-150 active:scale-95 cursor-pointer"
                    aria-label={t('toolbar.clearSearch')}
                  >
                    <X className="h-3.5 w-3.5 stroke-[2.2]" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchVisible(false)}
                  className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-[#eae3d5] dark:bg-stone-800 text-stone-700 dark:text-stone-200 transition-all duration-150 active:scale-95 cursor-pointer"
                  aria-label={t('toolbar.closeSearch')}
                >
                  <ChevronUp className="h-3.5 w-3.5 stroke-[2.2]" />
                </button>
              </div>
            </div>
          )}
          {/* Desktop popover */}
          <div
            id="toolbar-search-panel"
            className={`rtl-search-popover absolute hidden sm:block transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 w-48 ${isRtl ? 'left-[calc(100%+0.5rem)] origin-left' : 'right-[calc(100%+0.5rem)] origin-right'} ${isSearchVisible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
          >
            <div className="relative w-full">
              <Input
                ref={searchInputRef}
                type="search"
                placeholder={t('toolbar.searchPlaceholder')}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="rounded-xl h-8 text-xs px-3 border-[#e2dcd0] dark:border-stone-800 bg-[#fbf9f4]/95 dark:bg-[#1c1917]/95 backdrop-blur-sm shadow-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-7.5 w-7.5 cursor-pointer rounded-lg text-stone-600 dark:text-stone-300 transition-all hover:bg-[#eae3d5] dark:hover:bg-stone-800/80 hover:text-stone-900 dark:hover:text-stone-100 active:scale-95"
              aria-label={t('toolbar.actionsMenu')}
            >
              <MoreVertical className="h-3.5 w-3.5 stroke-[2.2]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-editor-actions align="end" side="bottom" sideOffset={6} collisionPadding={8} className="z-[70] w-56 rounded-2xl border border-[#e8e2d8] dark:border-stone-800 bg-[#fbf9f4]/98 dark:bg-[#1c1917]/98 backdrop-blur-md p-1.5 shadow-xl">
            <DropdownMenuLabel className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('toolbar.actions')}
            </DropdownMenuLabel>

            {/* Les notifications vivent UNIQUEMENT dans le centre global de
                l'accueil (cloche), aucune entrée ici, à la demande du prof. */}

            {/* On mobile screens, show undo/redo/save inside the menu */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onUndo} disabled={!canUndo} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
                <Undo2 className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
                <span className="font-semibold">{t('toolbar.undo')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRedo} disabled={!canRedo} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
                <Redo2 className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
                <span className="font-semibold">{t('toolbar.redo')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={saveStatus === 'saving'} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
                <Save className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
                <span className="font-semibold">{t('toolbar.save')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-t border-border/40" />
            </div>

            <DropdownMenuItem onClick={onOpenEvaluations} className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs text-primary font-bold transition-colors duration-150 hover:bg-primary/10 focus:bg-primary/10">
              <CalendarCheck className="h-4 w-4 stroke-[2.2] text-primary shrink-0" />
              <span>{t('toolbar.evaluations')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 border-t border-border/40" />
            
            <DropdownMenuItem onClick={onOpenDataTransfer} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
              <Database className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.data')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenManageLessons} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
              <ListChecks className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.contents')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAnalyse} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
              <PieChart className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.progress')}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 border-t border-border/40" />
            <DropdownMenuLabel className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('toolbar.document')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onPrint} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
              <Printer className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.print')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGuide} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60">
              <CircleHelp className="h-3.5 w-3.5 stroke-[2.2] text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.help')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
