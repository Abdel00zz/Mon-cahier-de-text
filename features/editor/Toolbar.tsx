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
    <div data-editor-toolbar className="rtl-flow rtl-toolbar sticky top-2 z-[50] mb-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-xl border border-border/80 bg-card/95 px-2.5 py-1.5 shadow-xs backdrop-blur-md print:hidden sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-3">
      <div className="flex min-w-0 items-center justify-start gap-1.5">
        <SyncStatusBadge />
      </div>
      
      <div className="hidden items-center justify-center gap-0.5 rounded-full border border-border/60 bg-muted/60 p-0.5 sm:flex">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-tippy-content={t('toolbar.undoShortcut')} aria-label={t('toolbar.undoAria')} className="h-6.5 w-6.5 rounded-full text-muted-foreground hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-30">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-tippy-content={t('toolbar.redoShortcut')} aria-label={t('toolbar.redoAria')} className="h-6.5 w-6.5 rounded-full text-muted-foreground hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-30">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} disabled={saveStatus === 'saving'} data-tippy-content={t('toolbar.manualSave')} aria-label={t('toolbar.saveNow')} className="h-6.5 w-6.5 rounded-full text-muted-foreground hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-30">
          <Save className="h-3.5 w-3.5" />
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
            className={`relative h-7 w-7 rounded-full border transition-all duration-150 active:scale-95 ${searchQuery ? 'border-border bg-muted text-foreground font-bold' : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'}`}
          >
            <Search className="h-3.5 w-3.5" />
            {searchQuery && <span aria-hidden className="toolbar-search-indicator absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-foreground" />}
          </Button>
          {/* Mobile overlay bar */}
          {isSearchVisible && (
            <div className="sm:hidden fixed top-0 left-0 right-0 z-30 px-3 pt-2 pb-1.5 bg-card/98 backdrop-blur border-b border-border shadow-md animate-in slide-in-from-top-4 fade-in duration-200" id="toolbar-search-panel-mobile">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder={t('toolbar.searchPlaceholder')}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="flex-1 h-7.5 text-xs rounded-full border-border focus:border-border focus:ring-0 focus:outline-none"
                />
                {localSearch && (
                  <button 
                    type="button" 
                    onClick={() => { setLocalSearch(''); setSearchQuery(''); }} 
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95"
                    aria-label={t('toolbar.clearSearch')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchVisible(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted text-foreground transition-all duration-150 active:scale-95"
                  aria-label={t('toolbar.closeSearch')}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          {/* Desktop popover */}
          <div
            id="toolbar-search-panel"
            className={`rtl-search-popover absolute hidden sm:block transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 w-44 ${isRtl ? 'left-[calc(100%+0.5rem)] origin-left' : 'right-[calc(100%+0.5rem)] origin-right'} ${isSearchVisible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
          >
            <div className="relative w-full">
              <Input
                ref={searchInputRef}
                type="search"
                placeholder={t('toolbar.searchPlaceholder')}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="rounded-full h-7.5 text-xs px-2.5 border-border focus:border-border focus:ring-0"
              />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-7 w-7 cursor-pointer rounded-full border border-border/80 bg-card text-muted-foreground shadow-none transition-all hover:bg-muted hover:text-foreground active:scale-95"
              aria-label={t('toolbar.actionsMenu')}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-editor-actions align={isRtl ? 'start' : 'end'} className="z-[70] w-56 rounded-2xl border border-border/80 bg-card/98 p-1.5 shadow-xl backdrop-blur-md">
            <DropdownMenuLabel className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {t('toolbar.actions')}
            </DropdownMenuLabel>

            {/* Les notifications vivent UNIQUEMENT dans le centre global de
                l'accueil (cloche), aucune entrée ici, à la demande du prof. */}

            {/* On mobile screens, show undo/redo/save inside the menu */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onUndo} disabled={!canUndo} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
                <Undo2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold">{t('toolbar.undo')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRedo} disabled={!canRedo} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
                <Redo2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold">{t('toolbar.redo')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={saveStatus === 'saving'} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
                <Save className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold">{t('toolbar.save')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-t border-border/70" />
            </div>

            <DropdownMenuItem onClick={onOpenEvaluations} className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs text-primary font-bold transition-colors duration-150 hover:bg-primary/15 focus:bg-primary/15">
              <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
              <span>{t('toolbar.evaluations')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 border-t border-border/70" />
            
            <DropdownMenuItem onClick={onOpenDataTransfer} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
              <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.data')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenManageLessons} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
              <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.contents')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAnalyse} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
              <PieChart className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.progress')}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 border-t border-border/70" />
            <DropdownMenuLabel className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {t('toolbar.document')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onPrint} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
              <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.print')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGuide} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground">
              <CircleHelp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold">{t('toolbar.help')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
