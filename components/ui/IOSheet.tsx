import React, { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';

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
  maxHeight = 'max-h-[92dvh]',
  showGrabber = true,
}) => {
  const { impact } = useHapticFeedback();
  const { isRtl, t } = useLocale();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
      {/* Backdrop avec blur iOS */}
      <div
        className="fixed inset-0 bg-black/32 backdrop-blur-[6px] transition-opacity duration-300 animate-fade-in"
        onClick={() => {
          impact('soft');
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Sheet iOS avec Grabber */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className={cn(
          'rtl-flow relative z-10 flex w-full flex-col overflow-hidden rounded-t-[28px] border-t border-white/65 bg-card/94 text-card-foreground shadow-[0_-20px_60px_rgba(15,23,42,0.2)] backdrop-blur-[30px] backdrop-saturate-[1.8] animate-spring-slide-up dark:border-white/10 sm:mx-auto sm:max-w-2xl',
          maxHeight,
          className
        )}
      >
        {/* Grabber iOS */}
        {showGrabber && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-[5px] w-[36px] rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Header sans ligne décorative horizontale */}
        {(title || subtitle) && (
          <div className="relative flex items-center justify-between px-6 pt-2 pb-2 shrink-0 text-start">
            <div className="min-w-0 flex-1 pe-10">
              {title && (
                <h2 id={titleId} className="truncate text-lg font-bold tracking-tight text-foreground">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
                'absolute top-2 flex h-11 w-11 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-[background-color,color,transform] hover:bg-muted hover:text-foreground active:scale-95 sm:h-8 sm:w-8',
                isRtl ? 'left-5' : 'right-5',
              )}
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content scrollable */}
        <div className="flex-1 min-h-0 custom-scrollbar overflow-y-auto px-5 py-4 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
};
