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
import { TriangleAlert, CircleHelp } from '@/components/ui/icons';

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
                className="gap-5 border-border/70 bg-card p-5 sm:p-7 shadow-2xl sm:max-w-lg sm:rounded-[28px]"
                blockDismiss={requiresTypedConfirmation}
            >
                <DialogHeader className="gap-3 text-left rtl:text-right">
                    <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            variant === 'destructive' 
                                ? 'bg-destructive/10 text-destructive' 
                                : 'bg-primary/10 text-primary'
                        } shadow-xs`}>
                            {variant === 'destructive' ? (
                                <TriangleAlert className="h-5 w-5 stroke-[2.2]" />
                            ) : (
                                <CircleHelp className="h-5 w-5 stroke-[2.2]" />
                            )}
                        </span>
                        <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                            {title}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs sm:text-sm font-medium leading-relaxed text-muted-foreground pt-1">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {requiresTypedConfirmation && (
                    <label className="space-y-2 pt-1">
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
                            className="flex h-11 w-full rounded-2xl border border-border/80 bg-muted/40 px-4 text-xs sm:text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus-visible:bg-card focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                            aria-label={confirmationHint}
                        />
                    </label>
                )}
                <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                        className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm"
                    >
                        {cancelLabel ?? t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={!confirmationIsValid}
                        className="rounded-xl h-10 px-5 text-xs font-bold sm:text-sm shadow-sm"
                    >
                        {confirmLabel ?? t('common.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

