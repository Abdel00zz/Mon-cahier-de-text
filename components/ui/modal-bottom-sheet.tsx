import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from './icons';
import { cn } from '@/lib/utils';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { useLocale } from '@/i18n/LocaleProvider';

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
  /** Paliers de hauteur autorisés sur téléphone portrait, entre 0 et 1. */
  mobileDetents?: number[];
  /** Palier affiché à l'ouverture. Par défaut, le plus petit. */
  initialMobileDetent?: number;
}

const DEFAULT_MOBILE_DETENTS = [0.55, 0.9];

const normalizeDetents = (values: number[]): number[] => {
  const normalized = values
    .filter(Number.isFinite)
    .map(value => Math.min(0.96, Math.max(0.32, value)))
    .sort((a, b) => a - b);
  return Array.from(new Set(normalized.length ? normalized : DEFAULT_MOBILE_DETENTS));
};

const maxWidthClassMap: Record<string, string> = {
  xs: 'sm:max-w-sm',
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
  '2xl': 'sm:max-w-4xl',
  '3xl': 'sm:max-w-5xl',
  '4xl': 'sm:max-w-6xl',
  '5xl': 'sm:max-w-7xl',
  full: 'sm:max-w-[94vw]',
};

/**
 * Material 3 ModalBottomSheet Component.
 * Implements M3 bottom sheet surface, drag handle, elevation, gestures, and responsive adaptation.
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
  mobileDetents = DEFAULT_MOBILE_DETENTS,
  initialMobileDetent,
}: ModalBottomSheetProps) {
  const { isRtl, t } = useLocale();
  const dismissCallback = useCallback(() => {
    if (onDismissRequest) {
      onDismissRequest();
    } else if (onClose) {
      onClose();
    }
  }, [onDismissRequest, onClose]);

  const effectiveOpen = Boolean(isOpen);
  const detentSignature = mobileDetents.join(',');
  const detents = useMemo(() => normalizeDetents(mobileDetents), [detentSignature]);
  const [activeDetentIndex, setActiveDetentIndex] = useState(0);
  const [isCompactSheet, setIsCompactSheet] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px) and (orientation: portrait)');
    const sync = () => setIsCompactSheet(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

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
    enabled: Boolean(swipeToDismiss && !blockDismiss),
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
        {/* Material 3 Scrim Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[100] bg-slate-950/42 backdrop-blur-[1px]',
            'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out motion-reduce:animate-none'
          )}
        />

        {/* Material 3 ModalBottomSheet Container */}
        <DialogPrimitive.Content
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            'rtl-flow fixed inset-x-0 bottom-0 top-auto z-[110] grid h-fit min-h-0 max-h-[min(94dvh,calc(var(--app-viewport-height,100dvh)-0.75rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden overscroll-contain rounded-t-3xl rounded-b-none border border-border/80 bg-card text-card-foreground shadow-[0_24px_70px_rgb(15_23_42/0.22)] outline-none',
            'will-change-transform transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
            'data-[state=open]:animate-sheet-in-bottom sm:data-[state=open]:animate-pop-in',
            'data-[state=closed]:translate-y-full data-[state=closed]:opacity-0 sm:data-[state=closed]:translate-y-0 sm:data-[state=closed]:scale-[0.97]',
            'motion-reduce:animate-none motion-reduce:transition-none motion-reduce:data-[state=closed]:translate-y-0 motion-reduce:data-[state=closed]:scale-100 motion-reduce:data-[state=closed]:opacity-100',
            'sm:inset-0 sm:m-auto sm:max-h-[min(90dvh,calc(100dvh-2.5rem))] sm:w-[calc(100vw-2.5rem)] sm:rounded-2xl sm:border sm:border-border/80',
            'landscape:max-h-[min(96dvh,calc(100dvh-1rem))] landscape:inset-0 landscape:m-auto landscape:rounded-2xl',
            'pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-0 landscape:pb-0',
            'pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]',
            swipe.isDragging && 'select-none',
            mwClass,
            className,
            isCompactSheet && '!h-[var(--sheet-detent-height)] transition-[height,transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            // La position appartient au socle modal. Une classe décorative
            // passée par un écran ne doit jamais pouvoir la remplacer.
            '!fixed'
          )}
          style={{
            ...(isCompactSheet
              ? ({ '--sheet-detent-height': `${activeDetent * 100}dvh` } as React.CSSProperties)
              : {}),
            ...swipe.dragStyle,
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
          onClick={(e) => e.stopPropagation()}
        >
          {/* Material 3 Drag Handle */}
          {dragHandle && (
            <button
              type="button"
              data-swipe-dismiss-handle
              aria-label={resizeLabel}
              onClick={() => {
                if (swipe.isDragging) return;
                if (canExpand) expandSheet();
                else if (canCollapse) collapseSheet();
              }}
              className="absolute left-1/2 top-2.5 z-20 flex h-4 w-16 -translate-x-1/2 items-center justify-center cursor-grab active:cursor-grabbing sm:hidden landscape:hidden"
            >
              {typeof dragHandle === 'boolean'
                ? <span className="h-1 w-8 rounded-full bg-muted-foreground/35 transition-[width,background-color] duration-200 hover:w-10 hover:bg-muted-foreground/55" />
                : dragHandle}
            </button>
          )}

          {/* Header */}
          {(title || description) && (
            <div
              className={cn(
                'modal-header relative z-10 shrink-0 border-b border-border/55 bg-card px-5 py-4 sm:px-7 sm:py-5 landscape:py-3 landscape:px-6 text-card-foreground flex flex-col justify-center space-y-1 pe-14 text-start',
                headerClassName
              )}
            >
              {title && (
                <DialogPrimitive.Title data-ui-title className="text-lg sm:text-xl font-bold leading-snug tracking-tight text-foreground">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="text-xs sm:text-sm leading-relaxed text-muted-foreground mt-0.5 max-w-2xl">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}

          {/* Close button */}
          {!hideClose && (
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className={cn(
                'dialog-close absolute top-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:top-4.5 sm:h-9 sm:w-9 landscape:top-2.5 landscape:h-8 landscape:w-8 cursor-pointer',
                isRtl ? 'left-4 sm:left-6' : 'right-4 sm:right-6'
              )}
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
              <span className="sr-only">{closeLabel}</span>
            </DialogPrimitive.Close>
          )}

          {/* Scrollable Body */}
          <div
            data-swipe-scroll-region
            className={cn(
              'modal-body modern-scrollbar min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5 landscape:py-3 landscape:px-6 [overflow-anchor:none] [scroll-behavior:smooth] [-webkit-overflow-scrolling:touch]',
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
                'modal-footer relative z-10 flex shrink-0 flex-col-reverse gap-2 border-t border-border/55 bg-card px-5 py-3.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-7 sm:py-4 landscape:py-2.5 landscape:px-6 text-card-foreground',
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
