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
  const detents = useMemo(() => normalizeSheetDetents(mobileDetents), [detentSignature]);
  const [activeDetentIndex, setActiveDetentIndex] = useState(0);
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  const isCompactSheet = isCompact && mobilePresentation === 'sheet';
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!effectiveOpen) return;
    const media = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [effectiveOpen]);

  useEffect(() => {
    if (!effectiveOpen) return;
    const requested = initialMobileDetent ?? detents[0];
    const closestIndex = detents.reduce((best, value, index) => (
      Math.abs(value - requested) < Math.abs(detents[best] - requested) ? index : best
    ), 0);
    setActiveDetentIndex(closestIndex);
  }, [detentSignature, effectiveOpen, initialMobileDetent]);

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

        {/* Modal Window Container (Sketch.com inspired) */}
        <DialogPrimitive.Content
          ref={contentRef}
          dir={effectiveDir}
          {...(!description ? { 'aria-describedby': undefined } : {})}
          className={cn(
            effectiveIsRtl ? 'rtl-flow' : 'ltr-flow',
            'modal-pro-surface modal-motion-surface fixed inset-x-0 bottom-0 top-auto z-[110] flex h-fit min-h-0 flex-col gap-0 overflow-hidden overscroll-contain border border-border bg-card text-foreground outline-none',
            'sm:inset-0 sm:m-auto sm:max-h-[min(90dvh,calc(100dvh-2.5rem))] sm:w-[calc(100vw-2.5rem)] sm:rounded-[22px] sm:border sm:border-border sm:shadow-2xl',
            'landscape:max-h-[min(94dvh,calc(var(--app-viewport-height,100dvh)-1rem))] landscape:inset-0 landscape:m-auto landscape:w-[min(92vw,44rem)] sm:landscape:w-[calc(100vw-2.5rem)] landscape:rounded-[22px]',
            !footer && 'pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-0 landscape:pb-0',
            'pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]',
            mwClass,
            mobilePresentation === 'dialog' && 'inset-0 m-auto w-[calc(100vw-1.5rem)] rounded-[22px] pb-0',
            className,
            // La position appartient au socle modal. Une classe décorative
            // passée par un écran ne doit jamais pouvoir la remplacer.
            '!fixed'
          )}
          style={{
            '--sheet-detent': activeDetent,
          } as React.CSSProperties}
          data-mobile-presentation={mobilePresentation}
          data-has-handle={Boolean(dragHandle && mobilePresentation === 'sheet')}
          data-swipe-enabled={isCompactSheet && swipeToDismiss && !blockDismiss ? 'true' : undefined}
          onOpenAutoFocus={(event) => {
            const previous = document.activeElement;
            if (previous instanceof HTMLElement && !contentRef.current?.contains(previous)) returnFocusRef.current = previous;
            // Do not summon the keyboard just by opening a phone form.
            if (isCompact) { event.preventDefault(); contentRef.current?.focus({ preventScroll: true }); }
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
          {/* Sketch Drag Handle */}
          {dragHandle && mobilePresentation === 'sheet' && (
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
              className="modal-drag-handle absolute left-1/2 top-0 z-20 flex h-11 w-24 -translate-x-1/2 items-center justify-center cursor-grab active:cursor-grabbing sm:hidden"
            >
              {typeof dragHandle === 'boolean'
                ? <span className="modal-drag-indicator" />
                : dragHandle}
            </button>
          )}

          {/* Header */}
          {(title || description) && (
            <div
              className={cn(
                'modal-header modal-pro-header relative z-10 shrink-0 min-h-13 sm:min-h-14 bg-transparent px-5 sm:px-7 py-3.5 sm:py-4.5 landscape:py-3 landscape:px-6 text-foreground flex flex-col justify-center text-start',
                !hideClose ? 'pe-14 sm:pe-14 ps-5 sm:ps-7' : 'px-5 sm:px-7',
                headerClassName
              )}
            >
              {title && (
                <DialogPrimitive.Title data-ui-title className="text-[16px] sm:text-[18px] font-semibold leading-snug tracking-[-0.015em] text-foreground">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description data-description className="mt-1 text-xs sm:text-[13px] leading-relaxed text-muted-foreground tracking-normal">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}

          {/* Close button (Sketch.com circular pill) */}
          {!hideClose && (
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className={cn(
                'dialog-close absolute z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer end-3 sm:end-4',
                (title || description) ? 'top-3 sm:top-3.5' : 'top-3 sm:top-3.5'
              )}
            >
              <X className="h-4 w-4 stroke-[2]" />
              <span className="sr-only">{closeLabel}</span>
            </DialogPrimitive.Close>
          )}

          {/* Scrollable Body */}
          <div
            data-swipe-scroll-region
            className={cn(
              'modal-body modern-scrollbar min-h-0 min-w-0 flex-auto overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5.5 landscape:py-3 landscape:px-6 [overflow-anchor:none] [-webkit-overflow-scrolling:touch]',
              !(title || description) && 'pt-8 sm:pt-6 landscape:pt-4',
              !footer && 'pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]',
              bodyClassName
            )}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className={cn(
                'modal-footer modal-pro-footer relative z-10 flex shrink-0 flex-col-reverse gap-2 bg-muted/20 dark:bg-muted/10 px-5 py-3.5 pb-[calc(0.95rem+env(safe-area-inset-bottom,0px))] sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-7 sm:py-4 landscape:py-3 landscape:px-6 text-foreground',
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
