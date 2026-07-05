import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from './icons';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  className,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Esc key behavior
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={contentRef}
        className={cn(
          // Bottom-sheet façon iOS : la feuille ne prend que la hauteur nécessaire (max 92vh), coins arrondis, poignée.
          "bg-white rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl w-full flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-slide-in-up overflow-hidden",
          maxWidthMap[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée iOS (mobile uniquement) */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-start justify-between flex-shrink-0 bg-slate-50/50">
          <div className="space-y-0.5 pr-4">
            <h2 className="text-base font-semibold font-slab text-slate-900 leading-none">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 font-medium mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — au focus d'un champ (clavier virtuel mobile), on le garde visible */}
        <div
          className="p-4 sm:p-5 flex-grow overflow-y-auto overscroll-contain text-sm text-slate-700"
          onFocusCapture={(e) => {
            const target = e.target as HTMLElement;
            if (target.matches('input, textarea, select, [contenteditable="true"]')) {
              setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
            }
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-50 border-t border-border flex justify-end gap-2.5 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
