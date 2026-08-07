import React from 'react';
import { IOSheet } from './IOSheet';
import { ConfirmDialog } from './confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { cn } from '@/lib/utils';

export type OverlayVariant = 'sheet' | 'dialog' | 'confirm' | 'full';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  variant?: OverlayVariant;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  // Options spécifiques confirm
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm?: () => void | Promise<void>;
  className?: string;
}

export const Overlay: React.FC<OverlayProps> = ({
  open,
  onClose,
  variant = 'dialog',
  title,
  subtitle,
  children,
  actions,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmVariant = 'default',
  onConfirm,
  className,
}) => {
  if (!open) return null;

  // 1. Variante Sheet (Mobile iOS style)
  if (variant === 'sheet') {
    return (
      <IOSheet
        isOpen={open}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        className={className}
      >
        {children}
        {actions && <div className="mt-4 flex justify-end gap-2 pt-3">{actions}</div>}
      </IOSheet>
    );
  }

  // 2. Variante Confirm (Dialogue de confirmation rapide)
  if (variant === 'confirm') {
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
        title={typeof title === 'string' ? title : 'Confirmation'}
        description={typeof subtitle === 'string' ? subtitle : typeof children === 'string' ? children : undefined}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant={confirmVariant}
        onConfirm={onConfirm || (() => {})}
      />
    );
  }

  // 3. Variante Full / Centrée (Radix Dialog)
  const isFull = variant === 'full';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={cn(
          isFull
            ? 'max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-card text-card-foreground'
            : 'max-w-lg rounded-[24px] bg-card text-card-foreground',
          className
        )}
      >
        {(title || subtitle) && (
          <DialogHeader className={isFull ? 'px-6 pt-5 pb-2' : ''}>
            {title && <DialogTitle className="text-lg font-bold">{title}</DialogTitle>}
            {subtitle && <DialogDescription className="text-xs text-muted-foreground">{subtitle}</DialogDescription>}
          </DialogHeader>
        )}

        <div className={cn('flex-1 overflow-y-auto custom-scrollbar', isFull ? 'p-6' : 'py-2')}>
          {children}
        </div>

        {actions && (
          <div className={cn('flex items-center justify-end gap-2 pt-3', isFull ? 'px-6 py-4 bg-muted/30' : '')}>
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
