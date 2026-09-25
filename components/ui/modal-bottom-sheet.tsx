import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from './icons';
import { cn } from '@/lib/utils';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { useLocale } from '@/i18n/LocaleProvider';
import { normalizeSheetDetents } from '@/utils/sheetGesture';

export interface ModalBottomSheetProps {
  isOpen?: boolean;
  onDismissRequest?: () => void;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  dragHandle?: boolean | React.ReactNode;
  hideClose?: boolean;
  swipeToDismiss?: boolean;
  swipeFromBody?: boolean;
  blockDismiss?: boolean;
  dir?: 'ltr' | 'rtl';
  /** Paliers de hauteur autorisés sur téléphone portrait, entre 0 et 1. */
  mobileDetents?: number[];
  /** Palier affiché à l'ouverture. Par défaut, le plus petit. */
  initialMobileDetent?: number;
  /** Short confirmations stay content-sized and centered, including on phones. */
  mobilePresentation?: 'sheet' | 'dialog';
}

const DEFAULT_MOBILE_DETENTS = [0.9, 0.96];

const maxWidthClassMap: Record<string, string> = {
  xs: 'sm:max-w-sm',
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg md:max-w-xl',
  lg: 'sm:max-w-xl md:max-w-2xl',
  xl: 'sm:max-w-2xl md:max-w-3xl',
  '2xl': 'sm:max-w-3xl md:max-w-4xl',
  '3xl': 'sm:max-w-4xl md:max-w-5xl',
  '4xl': 'sm:max-w-5xl md:max-w-6xl',
  '5xl': 'sm:max-w-6xl md:max-w-7xl lg:max-w-7xl xl:max-w-7xl',
  full: 'sm:max-w-[94vw] lg:max-w-[96vw]',
};

/**
 * Shared responsive surface. Radix owns focus, nesting and scroll locking;
 * CSS owns entry/exit, and pointer movement never re-renders the form.
 */
export function ModalBottomSheet({
  isOpen,
  onDismissRequest,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  dragHandle = true,
  hideClose = false,
  swipeToDismiss = true,
  swipeFromBody = false,
  blockDismiss = false,
  dir,
  mobileDetents = DEFAULT_MOBILE_DETENTS,
  initialMobileDetent,
  mobilePresentation = 'sheet',
}: ModalBottomSheetProps) {
  const { isRtl, t } = useLocale();
  const effectiveDir = dir ?? (isRtl ? 'rtl' : 'ltr');
  const effectiveIsRtl = effectiveDir === 'rtl';
  const dismissCallback = useCallback(() => {
    if (onDismissRequest) {
      onDismissRequest();
    } else if (onClose) {
      onClose();
    }
  }, [onDismissRequest, onClose]);

  const effectiveOpen = Boolean(isOpen);
  const detentSignature = mobileDetents.join(',');
  // Depend on values rather than a fresh array supplied by the parent on each render.
  const detents = useMemo(() => normalizeSheetDetents(detentSignature ? detentSignature.split(',').map(Number) : []), [detentSignature]);
  const [activeDetentIndex, setActiveDetentIndex] = useState(0);
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  const [isPortrait, setIsPortrait] = useState(() => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);
  const isCompactSheet = isCompact && isPortrait && mobilePresentation === 'sheet';
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!effectiveOpen) return;
    const media = window.matchMedia('(max-width: 639px)');
    const orientation = window.matchMedia('(orientation: portrait)');
    const sync = () => { setIsCompact(media.matches); setIsPortrait(orientation.matches); };
    sync();
    media.addEventListener('change', sync);
    orientation.addEventListener('change', sync);
    return () => { media.removeEventListener('change', sync); orientation.removeEventListener('change', sync); };
  }, [effectiveOpen]);

  useEffect(() => {
    if (!effectiveOpen) return;
    const requested = initialMobileDetent ?? detents[0];
    const closestIndex = detents.reduce((best, value, index) => (
      Math.abs(value - requested) < Math.abs(detents[best] - requested) ? index : best
    ), 0);
    setActiveDetentIndex(closestIndex);
  }, [detents, effectiveOpen, initialMobileDetent]);

  const activeDetent = detents[Math.min(activeDetentIndex, detents.length - 1)] ?? detents[0];
  const canExpand = isCompactSheet && activeDetentIndex < detents.length - 1;
  const canCollapse = isCompactSheet && activeDetentIndex > 0;
  const expandSheet = useCallback(() => {
    setActiveDetentIndex(index => Math.min(index + 1, detents.length - 1));
  }, [detents.length]);
  const collapseSheet = useCallback(() => {
    setActiveDetentIndex(index => Math.max(index - 1, 0));
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dismissCallback();
    }
  };

  const closeLabel = t('common.close');
  const resizeLabel = canExpand
    ? t('modal.expand')
    : t('modal.collapse');

  const swipe = useSwipeToDismiss({
    onDismiss: dismissCallback,
    enabled: Boolean(isCompactSheet && swipeToDismiss && !blockDismiss),
    allowFromBody: swipeFromBody,
    canExpand,
    canCollapse,
    onExpand: expandSheet,
    onCollapse: collapseSheet,
  });

  const mwClass = maxWidthClassMap[maxWidth] || maxWidthClassMap.md;

  return (
    <DialogPrimitive.Root open={effectiveOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop Scrim Overlay with Glass Blur */}
        <DialogPrimitive.Overlay
          className={cn(
            'modal-motion-overlay fixed inset-0 z-[100]'
          )}
        />

        {/* Modal Window Container - Optimisé arrondis et animations mobile/tablette */}
        <DialogPrimitive.Content
          ref={contentRef}
          dir={effectiveDir}
          {...(!description ? { 'aria-describedby': undefined } : {})}
          className={cn(
            effectiveIsRtl ? 'rtl-flow' : 'ltr-flow',
            'modal-pro-surface modal-motion-surface fixed z-[110] flex h-fit min-h-0 flex-col gap-0 overflow-hidden overscroll-contain',
            // Mobile portrait : bottom sheet avec arrondis supérieurs prononcés
            'inset-x-0 bottom-0 top-auto rounded-t-[28px] border-t border-x border-border bg-card text-foreground shadow-2xl',
            // Desktop : modal centrée avec arrondis complets
            'sm:inset-0 sm:m-auto sm:max-h-[min(90dvh,calc(100dvh-2.5rem))] sm:w-[calc(100vw-2.5rem)] sm:rounded-[24px] sm:border sm:border-border sm:shadow-2xl',
            // Landscape mobile : modal centrée petite
            'landscape:max-h-[min(94dvh,calc(var(--app-viewport-height,100dvh)-1rem))] landscape:inset-0 landscape:m-auto landscape:w-[min(92vw,44rem)] sm:landscape:w-[calc(100vw-2.5rem)] landscape:rounded-[24px]',
            // Safe area insets
            !footer && 'pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-0 landscape:pb-0',
            'pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]',
            // Max width
            mwClass,
            // Dialog presentation (alertes/confirmations courtes)
            mobilePresentation === 'dialog' && 'inset-0 m-auto w-[calc(100vw-2rem)] max-w-md rounded-[24px] pb-0 border',
            // Focus outline
            'outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
            className,
            // Position fixe non-remplaçable
            '!fixed'
          )}
          style={{
            '--sheet-detent': activeDetent,
          } as React.CSSProperties}
          data-mobile-presentation={mobilePresentation}
          data-has-handle={Boolean(dragHandle && isCompactSheet)}
          data-swipe-enabled={isCompactSheet && swipeToDismiss && !blockDismiss ? 'true' : undefined}
          onOpenAutoFocus={(event) => {
            const previous = document.activeElement;
            if (previous instanceof HTMLElement && !contentRef.current?.contains(previous)) returnFocusRef.current = previous;
            // Do not summon the keyboard just by opening a phone form.
            if (window.matchMedia('(max-width: 639px)').matches) { event.preventDefault(); contentRef.current?.focus({ preventScroll: true }); }
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocusRef.current?.isConnected) {
              event.preventDefault();
              returnFocusRef.current.focus({ preventScroll: true });
            }
          }}
          data-sheet-detent={isCompactSheet ? activeDetent : undefined}
          data-sheet-resizable={isCompactSheet && detents.length > 1 ? 'true' : 'false'}
          onPointerDownOutside={(e) => {
            if (blockDismiss) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (blockDismiss) e.preventDefault();
          }}
          onPointerDown={(e) => {
            if (!e.defaultPrevented && swipeToDismiss && !blockDismiss) swipe.onPointerDown(e);
          }}
          onPointerMove={(e) => {
            if (!e.defaultPrevented && swipeToDismiss && !blockDismiss) swipe.onPointerMove(e);
          }}
          onPointerUp={(e) => {
            if (!e.defaultPrevented && swipeToDismiss && !blockDismiss) swipe.onPointerUp(e);
          }}
          onPointerCancel={(e) => {
            if (!e.defaultPrevented && swipeToDismiss && !blockDismiss) swipe.onPointerCancel(e);
          }}
          onLostPointerCapture={swipe.onPointerCancel}
          onClickCapture={swipe.onClickCapture}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sketch Drag Handle - Optimisé pour le toucher */}
          {dragHandle && isCompactSheet && (
            <button
              type="button"
              data-swipe-dismiss-handle
              aria-label={resizeLabel}
              aria-expanded={canCollapse}
              disabled={!canExpand && !canCollapse}
              onClick={() => {
                if (canExpand) expandSheet();
                else if (canCollapse) collapseSheet();
              }}
              className={cn(
                'modal-drag-handle absolute left-1/2 top-0 z-20 flex items-center justify-center',
                'h-12 w-28 -translate-x-1/2',
                'cursor-grab active:cursor-grabbing touch-manipulation',
                'transition-opacity duration-200',
                'sm:hidden'
              )}
            >
              {typeof dragHandle === 'boolean'
                ? <span className="modal-drag-indicator h-1 w-12 rounded-full bg-muted-foreground/30 transition-all duration-200 active:w-14 active:bg-muted-foreground/50" />
                : dragHandle}
            </button>
          )}

          {/* Header - Optimisé hiérarchie visuelle mobile */}
          {(title || description) && (
            <div
              className={cn(
                'modal-header modal-pro-header relative z-10 shrink-0 bg-transparent text-foreground flex flex-col justify-center text-start',
                // Spacing optimisé mobile/desktop garantissant un dégagement confortable
                'min-h-[3.75rem] sm:min-h-[4.25rem]',
                'px-5 sm:px-7 py-3.5 sm:py-4.5 landscape:py-3 landscape:px-6',
                // Espacement pour le bouton X (padding-end augmenté)
                !hideClose ? 'pe-[3.75rem] sm:pe-[4.25rem] ps-5 sm:ps-7' : 'px-5 sm:px-7',
                // Spacing drag handle sur mobile
                isCompactSheet && dragHandle && 'pt-[3.25rem]',
                headerClassName
              )}
            >
              {title && (
                <DialogPrimitive.Title data-ui-title className="text-[17px] sm:text-[19px] font-bold leading-[1.35] tracking-[-0.02em] text-foreground">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description data-description className="mt-1 text-[13px] sm:text-[13.5px] leading-[1.45] text-muted-foreground tracking-[-0.005em]">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}

          {/* Close button - Positionné en haut avec dégagement garanti de la ligne séparatrice */}
          {!hideClose && (
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className={cn(
                'dialog-close absolute z-30 inline-flex items-center justify-center rounded-full',
                'bg-muted/65 hover:bg-muted/95 backdrop-blur-md',
                'text-muted-foreground hover:text-foreground',
                'border border-border/60 hover:border-border shadow-2xs hover:shadow-xs',
                'transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
                'active:scale-[0.92] hover:scale-[1.06]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'cursor-pointer touch-manipulation',
                // Dimensions équilibrées avec zone tactile étendue
                'h-9 w-9 sm:h-9 sm:w-9',
                // Positionnement respectant les arrondis et assurant un dégagement de la ligne séparatrice
                'end-[max(0.875rem,env(safe-area-inset-right))] sm:end-5',
                'top-[max(0.75rem,env(safe-area-inset-top))] sm:top-3.5'
              )}
            >
              <X className="h-4 w-4 stroke-[2.2]" />
              <span className="sr-only">{closeLabel}</span>
            </DialogPrimitive.Close>
          )}

          {/* Scrollable Body - Optimisé scroll mobile */}
          <div
            data-swipe-scroll-region
            className={cn(
              'modal-body modern-scrollbar min-h-0 min-w-0 flex-auto overflow-y-auto overscroll-contain',
              'px-5 py-4 sm:px-7 sm:py-6 landscape:py-4 landscape:px-6',
              '[overflow-anchor:none] [-webkit-overflow-scrolling:touch]',
              // Padding-top si pas de header
              !(title || description) && 'pt-[3.5rem] sm:pt-7 landscape:pt-5',
              // Padding-bottom si pas de footer (respect du safe area)
              !footer && 'pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6',
              bodyClassName
            )}
          >
            {children}
          </div>

          {/* Footer - Optimisé zone d'action mobile */}
          {footer && (
            <div
              className={cn(
                'modal-footer modal-pro-footer relative z-10 flex shrink-0 flex-col-reverse gap-2.5 bg-muted/20 dark:bg-muted/10',
                'px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]',
                'sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-7 sm:py-4.5',
                'landscape:py-3.5 landscape:px-6',
                'text-foreground',
                footerClassName
              )}
            >
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
