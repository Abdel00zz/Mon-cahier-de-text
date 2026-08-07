import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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

  useEffect(() => {
    if (isOpen) {
      impact('light');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, impact]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop avec blur iOS */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={() => {
          impact('soft');
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Sheet iOS avec Grabber */}
      <div
        className={cn(
          'relative z-10 w-full flex flex-col overflow-hidden rounded-t-[28px] bg-card text-card-foreground shadow-2xl animate-spring-slide-up border-t border-border sm:mx-auto sm:max-w-2xl',
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
          <div className="relative flex items-center justify-between px-6 pt-2 pb-2 shrink-0">
            <div className="min-w-0 flex-1 pr-10">
              {title && (
                <h2 className="truncate text-lg font-bold tracking-tight text-foreground">
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
              onClick={() => {
                impact('light');
                onClose();
              }}
              className="absolute right-5 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground active:scale-95"
              aria-label="Fermer"
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
