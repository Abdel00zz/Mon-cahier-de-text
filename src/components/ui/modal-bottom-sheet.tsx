import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Sheet } from 'react-modal-sheet';
import { useReducedMotion } from 'framer-motion';
import { X } from './icons';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import { acquireModalLayer } from '@/platform/modalStack';
import { useModalHaptics } from '@/hooks/useModalHaptics';

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
  closeDisabled?: boolean;
  swipeToDismiss?: boolean;
  swipeFromBody?: boolean;
  blockDismiss?: boolean;
  dir?: 'ltr' | 'rtl';
  /** Content-sized below this fraction of the visible viewport. No hidden footer at a lower snap. */
  mobileMaxHeight?: number;
  mobilePresentation?: 'sheet' | 'dialog';
  elevation?: 'low' | 'mid' | 'high';
  glow?: 'primary' | 'success' | 'warning' | 'danger';
}

const widthClasses: Record<string, string> = {
  xs: 'sm:max-w-sm', sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl', '2xl': 'sm:max-w-4xl', '3xl': 'sm:max-w-5xl',
  '4xl': 'sm:max-w-6xl', '5xl': 'sm:max-w-7xl', full: 'sm:max-w-[96vw]',
};
const compactQuery = '(max-width: 1023px), ((pointer: coarse) and (max-width: 1180px))';

/** Keep the presentation stable while editing: rotating a tablet must not remount a form. */
function useCompactPresentation(open: boolean) {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(compactQuery).matches);
  useLayoutEffect(() => {
    if (open) return;
    const media = window.matchMedia(compactQuery);
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [open]);
  return compact;
}

/** Radix handles focus, nested dialogs and scroll lock. React Modal Sheet owns
 * gestures, velocity, drag cancellation and transforms; our viewport service
 * supplies the visible area above the Android/iOS keyboard. */
export function ModalBottomSheet({
  isOpen, onDismissRequest, onClose, title, description, children, footer,
  maxWidth = 'md', className, headerClassName, bodyClassName, footerClassName,
  dragHandle = true, hideClose = false, closeDisabled = false,
  swipeToDismiss = true, swipeFromBody = false, blockDismiss = false, dir,
  mobileMaxHeight = .94, mobilePresentation = 'sheet', elevation = 'mid', glow,
}: ModalBottomSheetProps) {
  const { isRtl, t, locale } = useLocale();
  const { onOpen: openHaptic, onClose: closeHaptic } = useModalHaptics();
  const open = Boolean(isOpen);
  const compact = useCompactPresentation(open);
  const useSheet = compact && mobilePresentation === 'sheet';
  const reducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [layer, setLayer] = useState(0);
  const direction = dir ?? (isRtl ? 'rtl' : 'ltr');
  const closeLabel = t('common.close');
  const dismiss = useCallback(() => {
    closeHaptic();
    (onDismissRequest ?? onClose)?.();
  }, [closeHaptic, onDismissRequest, onClose]);
  useEffect(() => { if (open) openHaptic(); }, [open, openHaptic]);
  useLayoutEffect(() => {
    if (!open) return;
    const lease = acquireModalLayer();
    setLayer(lease.layer);
    return lease.release;
  }, [open]);

  const dialogProps: React.ComponentPropsWithoutRef<typeof Dialog.Content> = {
    dir: direction, lang: locale, ...(!description ? { 'aria-describedby': undefined } : {}),
    onOpenAutoFocus(event) {
      const previous = document.activeElement;
      if (previous instanceof HTMLElement && !contentRef.current?.contains(previous)) returnFocus.current = previous;
      if (compact) { event.preventDefault(); contentRef.current?.focus({ preventScroll: true }); }
    },
    onCloseAutoFocus(event) {
      const topOpen = [...document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"]')]
        .filter(node => node !== contentRef.current && !node.contains(contentRef.current)).at(-1);
      const previous = returnFocus.current;
      // A child returns to its trigger in the parent; a newer, unrelated dialog keeps focus.
      if (previous?.isConnected && (!topOpen || topOpen.contains(previous))) {
        event.preventDefault(); previous.focus({ preventScroll: true });
      } else if (topOpen) {
        event.preventDefault();
        if (!topOpen.contains(document.activeElement)) topOpen.focus({ preventScroll: true });
      }
    },
    onPointerDownOutside(event) { if (blockDismiss) event.preventDefault(); },
    onEscapeKeyDown(event) { if (blockDismiss) event.preventDefault(); },
    onClick(event) { event.stopPropagation(); },
  };
  const surfaceProps = {
    'data-codex-surface': 'sheet', 'data-elevation': elevation, 'data-glow': glow,
    'data-mobile-presentation': useSheet ? 'sheet' : 'dialog',
    'data-has-handle': Boolean(useSheet && dragHandle),
    className: cn('modal-pro-surface modal-motion-surface flex min-h-0 flex-col overflow-hidden text-foreground outline-none',
      direction === 'rtl' ? 'rtl-flow' : 'ltr-flow', widthClasses[maxWidth] ?? widthClasses.md, className),
  };
  const heading = <>
    {useSheet && dragHandle && <div className="modal-handle-region" aria-hidden="true">
      {typeof dragHandle === 'boolean' ? <Sheet.DragIndicator className="modal-drag-indicator" /> : dragHandle}
    </div>}
    {(title || description) && <div className={cn('modal-header modal-pro-header', !hideClose && 'modal-header--closable', headerClassName)}>
      <Dialog.Title data-ui-title data-codex-title={typeof title === 'string' && title ? '' : undefined} className={!title ? 'sr-only' : undefined}>{title || closeLabel}</Dialog.Title>
      {description && <Dialog.Description data-description>{description}</Dialog.Description>}
    </div>}
    {!title && !description && <Dialog.Title className="sr-only">{closeLabel}</Dialog.Title>}
  </>;
  const close = !hideClose && <Dialog.Close aria-label={closeLabel} disabled={closeDisabled}
    className="dialog-close absolute z-30 inline-flex items-center justify-center touch-manipulation">
    <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
  </Dialog.Close>;
  const bodyClass = cn('modal-body modern-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain',
    !(title || description) && 'modal-body--untitled', bodyClassName);
  const actions = footer && <div className={cn('modal-footer modal-pro-footer', footerClassName)}>{footer}</div>;

  return <Dialog.Root open={open} onOpenChange={next => { if (!next) dismiss(); }}>
    {useSheet ? <Sheet isOpen={open} onClose={() => { if (!blockDismiss) dismiss(); }}
      onOpenEnd={() => {
        if (open && !contentRef.current?.contains(document.activeElement)) contentRef.current?.focus({ preventScroll: true });
      }}
      detent="content" unstyled disableScrollLocking avoidKeyboard={false}
      disableDrag={!swipeToDismiss || blockDismiss} disableDismiss={blockDismiss}
      prefersReducedMotion={Boolean(reducedMotion)}
      tweenConfig={{ duration: .26, ease: [.22, 1, .36, 1] }}
      dragCloseThreshold={.38} dragVelocityThreshold={650}
      className="modal-sheet-viewport" style={{ zIndex: 100 + layer * 20, height: 'var(--app-viewport-height, 100dvh)', top: 'var(--app-viewport-offset-top, 0px)' }}>
      <Dialog.Overlay forceMount asChild>
        <Sheet.Backdrop className="modal-motion-overlay modal-sheet-overlay" onTap={() => { if (!blockDismiss) dismiss(); }} />
      </Dialog.Overlay>
      <Dialog.Content {...dialogProps} ref={contentRef} forceMount asChild>
        <Sheet.Container {...surfaceProps} data-sheet-library="react-modal-sheet"
          style={{ '--sheet-max-height': Number.isFinite(mobileMaxHeight) ? Math.min(.96, Math.max(.5, mobileMaxHeight)) : .94,
            left: 0, width: 'calc(100% - 2 * var(--modal-sheet-gutter))', right: 0, marginInline: 'auto',
          } as React.CSSProperties}>
          <Sheet.Header className="modal-sheet-heading">{heading}</Sheet.Header>
          {close}
          <Sheet.Content disableDrag={!swipeFromBody} scrollClassName={bodyClass}
            scrollStyle={{ height: 'auto', minHeight: 0, overflowY: undefined, overscrollBehaviorY: undefined }}>
            {children}
          </Sheet.Content>
          {actions}
        </Sheet.Container>
      </Dialog.Content>
    </Sheet> : <Dialog.Portal>
      <Dialog.Overlay className="modal-motion-overlay fixed inset-0" style={{ zIndex: 100 + layer * 20 }} />
      <Dialog.Content {...dialogProps} {...surfaceProps} ref={contentRef} style={{ zIndex: 110 + layer * 20 }}>
        {heading}{close}<div className={bodyClass}>{children}</div>{actions}
      </Dialog.Content>
    </Dialog.Portal>}
  </Dialog.Root>;
}
