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
            <DialogContent className="gap-3 border-slate-200/80 bg-card/98 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.16)] sm:max-w-[420px] sm:gap-4 sm:p-5">
                <DialogHeader className="gap-1.5">
                    <DialogTitle className="text-lg font-extrabold font-display leading-tight tracking-normal text-foreground">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {requiresTypedConfirmation && (
                    <label className="space-y-1.5">
                        <span className="block text-xs font-semibold leading-relaxed text-foreground">
                            {confirmationHint}
                        </span>
                        <input
                            type="text"
                            value={confirmationValue}
                            onChange={(event) => setConfirmationValue(event.target.value)}
                            placeholder={confirmationPhrase}
                            autoComplete="off"
                            autoFocus
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                            aria-label={confirmationHint}
                        />
                    </label>
                )}
                <DialogFooter className="flex flex-col-reverse gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-2 sm:pb-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        className="w-full rounded-lg h-10 font-semibold transition-all duration-200 sm:w-auto sm:h-9"
                    >
                        {cancelLabel ?? t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={!confirmationIsValid}
                        className="w-full rounded-lg h-10 px-5 font-semibold transition-all duration-200 sm:w-auto sm:h-9"
                    >
                        {confirmLabel ?? t('common.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
