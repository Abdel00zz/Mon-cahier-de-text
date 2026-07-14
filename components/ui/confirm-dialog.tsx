import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    onConfirm,
    variant = 'destructive',
}: ConfirmDialogProps) {
    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        onConfirm();
        onOpenChange(false);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-3 border-slate-200/80 bg-card/98 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.16)] sm:max-w-[420px] sm:gap-4 sm:p-5">
                <DialogHeader className="gap-1.5">
                    <DialogTitle className="text-lg font-extrabold font-display leading-tight tracking-normal text-foreground">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        className="w-full sm:w-auto rounded-md font-semibold transition-all duration-200"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        className="w-full sm:w-auto rounded-md px-5 font-semibold transition-all duration-200"
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
