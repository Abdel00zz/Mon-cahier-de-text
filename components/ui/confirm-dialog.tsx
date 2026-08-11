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
import { useLocale } from '@/i18n/LocaleProvider';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
    /** When provided, the user must type this exact text before confirming. */
    confirmationPhrase?: string;
    confirmationHint?: string;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    variant = 'destructive',
    confirmationPhrase,
    confirmationHint,
}: ConfirmDialogProps) {
    const { t } = useLocale();
    const [confirmationValue, setConfirmationValue] = React.useState('');
    const requiresTypedConfirmation = Boolean(confirmationPhrase);
    const confirmationIsValid = !requiresTypedConfirmation || confirmationValue === confirmationPhrase;

    React.useEffect(() => {
        if (!open) setConfirmationValue('');
    }, [open]);

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirmationIsValid) return;
        onConfirm();
        onOpenChange(false);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="gap-4 border-border bg-card p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:max-w-[440px]"
                blockDismiss={requiresTypedConfirmation}
            >
                <DialogHeader className="gap-2">
                    <DialogTitle className="text-lg font-bold leading-tight text-foreground">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-normal leading-relaxed text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {requiresTypedConfirmation && (
                    <label className="space-y-1.5 pt-1">
                        <span className="block text-xs font-medium leading-relaxed text-foreground">
                            {confirmationHint}
                        </span>
                        <input
                            type="text"
                            value={confirmationValue}
                            onChange={(event) => setConfirmationValue(event.target.value)}
                            placeholder={confirmationPhrase}
                            autoComplete="off"
                            autoFocus
                            className="flex h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus-visible:bg-card focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                            aria-label={confirmationHint}
                        />
                    </label>
                )}
                <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        className="w-full rounded-full h-11 px-5 font-medium transition-all sm:w-auto"
                    >
                        {cancelLabel ?? t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={!confirmationIsValid}
                        className="w-full rounded-full h-11 px-6 font-medium transition-all sm:w-auto"
                    >
                        {confirmLabel ?? t('common.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
