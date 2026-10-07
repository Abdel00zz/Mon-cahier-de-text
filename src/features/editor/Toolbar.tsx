import React from 'react';
import { useTableSearch } from './hooks/useTableSearch';
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
  Undo2, Redo2, Search, X, ChevronUp, MoreVertical,
  CalendarCheck, Database, ListChecks, PieChart, Printer, CircleHelp,
} from '@/components/ui/icons';
import { EditorSaveControl } from './EditorSaveControl';
import { useLocale } from '@/i18n/LocaleProvider';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  onUndo, onRedo, canUndo, canRedo, saveStatus,
  onOpenDataTransfer, onOpenManageLessons, onOpenGuide, onOpenAnalyse, onOpenEvaluations,
  onPrint,
  searchQuery, setSearchQuery,
}) => {
  const { t, isRtl } = useLocale();
  const { isSearchVisible, setIsSearchVisible, localSearch, setLocalSearch, setIsComposing,
    searchContainerRef, mobilePanelRef, mobileInputRef, desktopInputRef, clearSearch, closeSearch,
  } = useTableSearch(searchQuery, setSearchQuery);

  return (
    <div data-editor-toolbar role="toolbar" aria-label={t('toolbar.actions')} className="editor-toolbar rtl-flow rtl-toolbar print:hidden">
      <div className="editor-toolbar__status">
        <EditorSaveControl status={saveStatus} />
      </div>

      <div className="editor-toolbar__history" role="group" aria-label={t('toolbar.undo') + ' / ' + t('toolbar.redo')}>
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-tippy-content={t('toolbar.undoShortcut')} aria-label={t('toolbar.undoAria')} className="editor-toolbar__action">
          <Undo2 aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-tippy-content={t('toolbar.redoShortcut')} aria-label={t('toolbar.redoAria')} className="editor-toolbar__action">
          <Redo2 aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} className="h-5 w-5" />
        </Button>
      </div>

      <div className="editor-toolbar__tools">
        <div ref={searchContainerRef} className="relative flex items-center" role="search">
          <Button
            variant="ghost" size="icon"
            onClick={() => setIsSearchVisible(v => !v)}
            data-tippy-content={t('toolbar.searchShortcut')}
            aria-label={t('toolbar.search')}
            aria-expanded={isSearchVisible}
            aria-controls="toolbar-search-panel toolbar-search-panel-mobile"
            className={`editor-toolbar__action relative ${searchQuery || isSearchVisible ? 'bg-muted/70 text-foreground' : ''}`}
          >
            <Search className="h-5 w-5" />
            {searchQuery && <span aria-hidden className="toolbar-search-indicator absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-foreground" />}
          </Button>
          {/* Desktop popover */}
          <div
            id="toolbar-search-panel"
            className={`rtl-search-popover absolute hidden sm:block transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 w-44 ${isRtl ? 'left-[calc(100%+0.5rem)] origin-left' : 'right-[calc(100%+0.5rem)] origin-right'} ${isSearchVisible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
          >
            <div className="relative w-full">
              <Input
                ref={desktopInputRef}
                type="search"
                placeholder={t('toolbar.searchPlaceholder')}
                aria-label={t('toolbar.searchPlaceholder')}
                tabIndex={isSearchVisible ? 0 : -1}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
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
              className="editor-toolbar__action"
              aria-label={t('toolbar.actionsMenu')}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-editor-actions align="end" side="bottom" sideOffset={6} collisionPadding={8} className="z-[70] w-64">
            <DropdownMenuLabel>
              {t('toolbar.actions')}
            </DropdownMenuLabel>

            {/* Les notifications vivent UNIQUEMENT dans le centre global de
                l'accueil (cloche), aucune entrée ici, à la demande du prof. */}

            <DropdownMenuItem onClick={onOpenEvaluations}>
              <CalendarCheck className="h-5 w-5" />
              <span>{t('toolbar.evaluations')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onOpenDataTransfer}>
              <Database className="h-5 w-5" />
              <span>{t('toolbar.data')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenManageLessons}>
              <ListChecks className="h-5 w-5" />
              <span>{t('toolbar.contents')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAnalyse}>
              <PieChart className="h-5 w-5" />
              <span>{t('toolbar.progress')}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {t('toolbar.document')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="h-5 w-5" />
              <span>{t('toolbar.print')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGuide}>
              <CircleHelp className="h-5 w-5" />
              <span>{t('toolbar.help')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Mobile search stays in the same flowing surface, above the table. */}
      {isSearchVisible && (
        <div ref={mobilePanelRef} className="editor-toolbar__mobile-search sm:hidden" id="toolbar-search-panel-mobile" data-native-back-dismiss="open">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              ref={mobileInputRef}
              type="search"
              placeholder={t('toolbar.searchPlaceholder')}
              aria-label={t('toolbar.searchPlaceholder')}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              className="min-w-0 flex-1 h-11 text-base rounded-lg border-border/70 bg-background focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:outline-none"
            />
            {localSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="editor-toolbar__action"
                aria-label={t('toolbar.clearSearch')}
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={closeSearch}
              className="editor-toolbar__action"
              aria-label={t('toolbar.closeSearch')}
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
