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
    <div data-editor-toolbar className="rtl-flow rtl-toolbar sticky top-0 z-[50] mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-2xl border-2 border-border/70 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-sm print:hidden sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-4 sm:py-2.5">
      <div className="flex min-w-0 items-center justify-start gap-1.5">
        <SyncStatusBadge />
      </div>
      
      <div className="hidden items-center justify-center gap-1 rounded-xl border border-border/50 bg-muted/30 p-1 shadow-inner sm:flex">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-tippy-content={t('toolbar.undoShortcut')} aria-label={t('toolbar.undoAria')} className="h-8 w-8 rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border/60 hover:bg-background hover:text-foreground hover:shadow-sm active:scale-95 disabled:opacity-30">
          <Undo2 className="h-4 w-4 stroke-[2.4]" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-tippy-content={t('toolbar.redoShortcut')} aria-label={t('toolbar.redoAria')} className="h-8 w-8 rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border/60 hover:bg-background hover:text-foreground hover:shadow-sm active:scale-95 disabled:opacity-30">
          <Redo2 className="h-4 w-4 stroke-[2.4]" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} disabled={saveStatus === 'saving'} data-tippy-content={t('toolbar.manualSave')} aria-label={t('toolbar.saveNow')} className="h-8 w-8 rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border/60 hover:bg-background hover:text-foreground hover:shadow-sm active:scale-95 disabled:opacity-30">
          <Save className="h-4 w-4 stroke-[2.4]" />
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
            className={`relative h-7 w-7 rounded-lg border-none transition-all duration-150 active:scale-95 ${searchQuery ? 'bg-muted/60 text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
          >
            <Search className="h-3.5 w-3.5 stroke-[2.2]" />
            {searchQuery && <span aria-hidden className="toolbar-search-indicator absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-foreground" />}
          </Button>
          {/* Mobile overlay bar */}
          {isSearchVisible && (
            <div className="sm:hidden fixed top-0 inset-x-0 z-[60] px-3 pt-[max(0.625rem,env(safe-area-inset-top,0px))] pb-2 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-md animate-in slide-in-from-top-4 fade-in duration-200" id="toolbar-search-panel-mobile">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 stroke-[2.2] text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder={t('toolbar.searchPlaceholder')}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="flex-1 h-9 text-xs sm:text-sm rounded-xl border-border/60 bg-muted/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:outline-none"
                />
                {localSearch && (
                  <button 
                    type="button" 
                    onClick={() => { setLocalSearch(''); setSearchQuery(''); }} 
                    className="touch-target w-9 h-9 flex shrink-0 items-center justify-center rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation"
                    aria-label={t('toolbar.clearSearch')}
                  >
                    <X className="h-4 w-4 stroke-[2.2]" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchVisible(false)}
                  className="touch-target w-9 h-9 flex shrink-0 items-center justify-center rounded-xl bg-muted/70 hover:bg-muted text-foreground transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation"
                  aria-label={t('toolbar.closeSearch')}
                >
                  <ChevronUp className="h-4 w-4 stroke-[2.2]" />
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
                className="rounded-lg h-7.5 text-xs px-2.5 border-border/60 bg-background/80 backdrop-blur-sm focus:border-border/80 focus:ring-0"
              />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-7 w-7 cursor-pointer rounded-lg text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground active:scale-95"
              aria-label={t('toolbar.actionsMenu')}
            >
              <MoreVertical className="h-3.5 w-3.5 stroke-[2.2]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-editor-actions align="end" side="bottom" sideOffset={6} collisionPadding={8} className="z-[70] w-56">
            <DropdownMenuLabel>
              {t('toolbar.actions')}
            </DropdownMenuLabel>

            {/* Les notifications vivent UNIQUEMENT dans le centre global de
                l'accueil (cloche), aucune entrée ici, à la demande du prof. */}

            {/* On mobile screens, show undo/redo/save inside the menu */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>
                <Undo2 className="h-3.5 w-3.5 stroke-[2.2]" />
                <span>{t('toolbar.undo')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRedo} disabled={!canRedo}>
                <Redo2 className="h-3.5 w-3.5 stroke-[2.2]" />
                <span>{t('toolbar.redo')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={saveStatus === 'saving'}>
                <Save className="h-3.5 w-3.5 stroke-[2.2]" />
                <span>{t('toolbar.save')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>

            <DropdownMenuItem onClick={onOpenEvaluations} className="bg-primary/10 text-primary font-bold hover:bg-primary/15 focus:bg-primary/15">
              <CalendarCheck className="h-4 w-4 stroke-[2.2] text-primary" />
              <span>{t('toolbar.evaluations')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onOpenDataTransfer}>
              <Database className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>{t('toolbar.data')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenManageLessons}>
              <ListChecks className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>{t('toolbar.contents')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAnalyse}>
              <PieChart className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>{t('toolbar.progress')}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {t('toolbar.document')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>{t('toolbar.print')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGuide}>
              <CircleHelp className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>{t('toolbar.help')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
