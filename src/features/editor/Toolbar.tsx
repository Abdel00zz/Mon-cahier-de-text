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
  CalendarCheck, Database, ListChecks, PieChart, Printer, CircleHelp, ArrowLeft,
} from '@/components/ui/icons';
import { EditorSaveControl } from './EditorSaveControl';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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
  /** Retour aux classes, rejoué dans le bandeau pour éviter de remonter la page. */
  onBack?: () => void;
  /** vrai une fois la page défilée : l'en-tête a alors disparu en haut. */
  showBack?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  onUndo, onRedo, canUndo, canRedo, onSave, saveStatus,
  onOpenDataTransfer, onOpenManageLessons, onOpenGuide, onOpenAnalyse, onOpenEvaluations,
  onPrint,
  searchQuery, setSearchQuery,
  onBack,
  showBack = false,
}) => {
  const { t, locale, isRtl } = useLocale();
  const { impact } = useHapticFeedback();
  const { isSearchVisible, setIsSearchVisible, localSearch, setLocalSearch, setIsComposing,
    searchContainerRef, mobileInputRef, desktopInputRef, clearSearch, closeSearch,
  } = useTableSearch(searchQuery, setSearchQuery);

  /*
   * Retour rapide. L'en-tête porte déjà son bouton en haut de page : celui-ci
   * n'apparaît qu'APRÈS un défilement, à côté du groupe annuler/refaire —
   * jamais fusionné avec lui, un filet les sépare — et il voyage avec le
   * bandeau collant. Sur téléphone, le groupe annuler/refaire vit dans le menu :
   * le bouton prend alors la première place de la grappe d'actions. */
  const backLabel = locale === 'ar'
    ? 'الرجوع إلى الأقسام'
    : locale === 'en'
      ? 'Back to classes'
      : 'Retour aux classes';

  const backButton = (extraClassName = '') => (onBack && showBack ? (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => { impact('light'); onBack(); }}
      data-tippy-content={backLabel}
      aria-label={backLabel}
      className={`h-11 w-11 rounded-lg border-none text-muted-foreground transition-all duration-150 hover:bg-muted/60 hover:text-foreground active:scale-95 ${extraClassName}`}
    >
      <ArrowLeft aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} className="h-5 w-5" />
    </Button>
  ) : null);

  return (
    <div data-editor-toolbar className="rtl-flow rtl-toolbar sticky top-0 z-[50] mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-2 py-1.5 shadow-sm print:hidden sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-3 sm:py-1.5">
      <div className="flex min-w-0 items-center justify-start gap-1.5">
        <EditorSaveControl status={saveStatus} onSave={onSave} />
      </div>

      <div className="hidden items-center justify-center gap-1.5 sm:flex">
        {backButton()}
        {onBack && showBack && <span aria-hidden className="h-6 w-px shrink-0 bg-border/70" />}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/40 bg-muted/20 p-0.5 shadow-inner">
          <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-tippy-content={t('toolbar.undoShortcut')} aria-label={t('toolbar.undoAria')} className="h-11 w-11 rounded-md border border-transparent text-muted-foreground transition-all hover:border-border/50 hover:bg-background/80 hover:text-foreground hover:shadow-sm active:scale-[0.96] disabled:opacity-30">
            <Undo2 aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-tippy-content={t('toolbar.redoShortcut')} aria-label={t('toolbar.redoAria')} className="h-11 w-11 rounded-md border border-transparent text-muted-foreground transition-all hover:border-border/50 hover:bg-background/80 hover:text-foreground hover:shadow-sm active:scale-[0.96] disabled:opacity-30">
            <Redo2 aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        {backButton('sm:hidden')}
        <div ref={searchContainerRef} className="relative flex items-center" role="search">
          <Button
            variant="ghost" size="icon"
            onClick={() => setIsSearchVisible(v => !v)}
            data-tippy-content={t('toolbar.searchShortcut')}
            aria-label={t('toolbar.search')}
            aria-expanded={isSearchVisible}
            aria-controls="toolbar-search-panel toolbar-search-panel-mobile"
            className={`relative h-11 w-11 rounded-lg border-none transition-all duration-150 active:scale-95 ${searchQuery ? 'bg-muted/60 text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
          >
            <Search className="h-5 w-5" />
            {searchQuery && <span aria-hidden className="toolbar-search-indicator absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-foreground" />}
          </Button>
          {/* Mobile overlay bar */}
          {isSearchVisible && (
            <div className="sm:hidden fixed top-0 inset-x-0 z-[60] px-3 pt-[max(0.625rem,env(safe-area-inset-top,0px))] pb-2 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-md animate-in slide-in-from-top-4 fade-in duration-200" id="toolbar-search-panel-mobile">
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
                  className="min-w-0 flex-1 h-11 text-base rounded-xl border-border/60 bg-muted/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:outline-none"
                />
                {localSearch && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="touch-target w-9 h-9 flex shrink-0 items-center justify-center rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation"
                    aria-label={t('toolbar.clearSearch')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeSearch}
                  className="touch-target w-9 h-9 flex shrink-0 items-center justify-center rounded-xl bg-muted/70 hover:bg-muted text-foreground transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation"
                  aria-label={t('toolbar.closeSearch')}
                >
                  <ChevronUp className="h-5 w-5" />
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
              className="relative h-11 w-11 cursor-pointer rounded-lg text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground active:scale-95"
              aria-label={t('toolbar.actionsMenu')}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-editor-actions align="end" side="bottom" sideOffset={6} collisionPadding={8} className="z-[70] w-56">
            <DropdownMenuLabel>
              {t('toolbar.actions')}
            </DropdownMenuLabel>

            {/* Les notifications vivent UNIQUEMENT dans le centre global de
                l'accueil (cloche), aucune entrée ici, à la demande du prof. */}

            {/* Save remains directly accessible; history actions live in the mobile menu. */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>
                <Undo2 aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} className="h-5 w-5" />
                <span>{t('toolbar.undo')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRedo} disabled={!canRedo}>
                <Redo2 aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} className="h-5 w-5" />
                <span>{t('toolbar.redo')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>

            <DropdownMenuItem onClick={onOpenEvaluations} className="bg-primary/10 text-primary font-bold hover:bg-primary/15 focus:bg-primary/15">
              <CalendarCheck className="h-5 w-5 text-primary" />
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
    </div>
  );
});
