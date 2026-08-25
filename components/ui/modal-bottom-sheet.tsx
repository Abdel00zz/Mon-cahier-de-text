import * as React from 'react';
import { useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from './icons';
import { cn } from '@/lib/utils';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';

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
}

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
}: ModalBottomSheetProps) {
  const dismissCallback = useCallback(() => {
    if (onDismissRequest) {
      onDismissRequest();
    } else if (onClose) {
      onClose();
    }
  }, [onDismissRequest, onClose]);

  const effectiveOpen = Boolean(isOpen);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dismissCallback();
    }
  };

  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const closeLabel = isRtl ? 'إغلاق' : 'Fermer';

  const swipe = useSwipeToDismiss({
    onDismiss: dismissCallback,
    enabled: Boolean(swipeToDismiss && !blockDismiss),
    allowFromBody: swipeFromBody,
  });

  const mwClass = maxWidthClassMap[maxWidth] || maxWidthClassMap.md;

  return (
    <DialogPrimitive.Root open={effectiveOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Material 3 Scrim Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-slate-950/42 backdrop-blur-[1px]',
            'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out motion-reduce:animate-none'
          )}
        />

        {/* Material 3 ModalBottomSheet Container */}
        <DialogPrimitive.Content
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            'rtl-flow fixed inset-x-0 bottom-0 top-auto z-50 grid h-fit min-h-0 max-h-[min(94dvh,calc(var(--app-viewport-height,100dvh)-0.75rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden overscroll-contain rounded-t-3xl rounded-b-none border border-border/80 bg-card text-card-foreground shadow-[0_24px_70px_rgb(15_23_42/0.22)] outline-none',
            'will-change-transform transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
            'data-[state=open]:animate-sheet-in-bottom sm:data-[state=open]:animate-pop-in',
            'data-[state=closed]:translate-y-full data-[state=closed]:opacity-0 sm:data-[state=closed]:translate-y-0 sm:data-[state=closed]:scale-[0.97]',
            'motion-reduce:animate-none motion-reduce:transition-none motion-reduce:data-[state=closed]:translate-y-0 motion-reduce:data-[state=closed]:scale-100 motion-reduce:data-[state=closed]:opacity-100',
            'sm:inset-0 sm:m-auto sm:max-h-[min(90dvh,calc(100dvh-2.5rem))] sm:w-[calc(100vw-2.5rem)] sm:rounded-[28px] sm:border sm:border-border/80',
            'landscape:max-h-[min(96dvh,calc(100dvh-1rem))] landscape:inset-0 landscape:m-auto landscape:rounded-2xl',
            'pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-0 landscape:pb-0',
            'pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]',
            swipe.isDragging && 'select-none',
            mwClass,
            className
          )}
          style={swipe.dragStyle}
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
            <div
              data-swipe-dismiss-handle
              aria-hidden
              className="absolute left-1/2 top-2.5 z-20 flex h-4 w-16 -translate-x-1/2 items-center justify-center cursor-grab active:cursor-grabbing sm:hidden landscape:hidden"
            >
              <span className="h-1 w-8 rounded-full bg-muted-foreground/35 transition-colors hover:bg-muted-foreground/60" />
            </div>
          )}

          {/* Header */}
          {(title || description) && (
            <div
              className={cn(
                'modal-header relative z-10 shrink-0 border-b border-border/55 bg-card px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 landscape:pt-3.5 landscape:pb-2.5 landscape:px-6 text-card-foreground flex flex-col space-y-1 pe-12 text-start',
                headerClassName
              )}
            >
              {title && (
                <DialogPrimitive.Title className="text-base sm:text-lg font-bold leading-snug tracking-tight text-foreground">
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
                'dialog-close absolute top-3.5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:top-4 sm:h-10 sm:w-10 landscape:top-2.5 landscape:h-8 landscape:w-8 cursor-pointer',
                isRtl ? 'left-4' : 'right-4'
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
              'modal-body min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5 landscape:py-3 landscape:px-6 [overflow-anchor:none]',
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
