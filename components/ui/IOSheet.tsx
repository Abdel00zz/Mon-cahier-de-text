import React, { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';

interface IOSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  showGrabber?: boolean;
}

export const IOSheet: React.FC<IOSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className,
  maxHeight = 'max-h-[calc(var(--app-viewport-height,100dvh)-max(0.5rem,env(safe-area-inset-top)))]',
  showGrabber = true,
}) => {
  const { impact } = useHapticFeedback();
  const { isRtl, t } = useLocale();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const swipe = useSwipeToDismiss({ onDismiss: onClose, enabled: isOpen });

  useEffect(() => {
    if (!isOpen) return;
    impact('light');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    window.setTimeout(() => closeButtonRef.current?.focus({ preventScroll: true }), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, impact, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      <div
        className="fixed inset-0 bg-slate-950/32 backdrop-blur-[8px] transition-opacity duration-300 animate-fade-in"
        onClick={() => {
          impact('soft');
          onClose();
        }}
        aria-hidden="true"
      />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className={cn(
          'rtl-flow relative z-10 flex w-full flex-col overflow-hidden rounded-t-[34px] border border-white/65 bg-white/[0.72] text-slate-900 shadow-[0_-24px_72px_rgba(15,23,42,0.26)] backdrop-blur-[32px] backdrop-saturate-[1.7] transition-[transform,opacity] duration-300 dark:border-white/10 dark:bg-slate-950/[0.72] dark:text-slate-100 sm:mx-auto sm:max-w-2xl sm:rounded-[30px]',
          swipe.isDragging && 'select-none',
          maxHeight,
          className
        )}
        style={swipe.dragStyle}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
      >
        {showGrabber && (
          <div className="flex justify-center pb-1 pt-3 shrink-0">
            <div data-swipe-dismiss-handle className="h-1.5 w-10 rounded-full bg-slate-400/35 dark:bg-white/25" />
          </div>
        )}

        {(title || subtitle) && (
          <div className="relative flex items-center justify-between border-b border-white/55 bg-white/[0.28] px-5 pb-3 pt-2 shrink-0 text-start backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/[0.22] sm:px-6">
            <div className="min-w-0 flex-1 pe-10">
              {title && (
                <h2 id={titleId} className="truncate text-[17px] font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100 sm:text-lg">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                impact('light');
                onClose();
              }}
              className={cn(
                'absolute top-1.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/45 text-slate-600 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 hover:text-slate-900 active:scale-95 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100',
                isRtl ? 'left-5' : 'right-5',
              )}
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 custom-scrollbar overflow-y-auto overscroll-contain bg-white/[0.14] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:bg-slate-950/[0.16] sm:px-6 sm:py-4 sm:pb-5">
          {children}
        </div>
      </div>
    </div>
  );
};
