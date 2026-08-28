import * as React from 'react';
import { ModalBottomSheet } from './modal-bottom-sheet';
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
        <ModalBottomSheet
            isOpen={open}
            onClose={() => onOpenChange(false)}
            maxWidth="sm"
            blockDismiss={requiresTypedConfirmation}
            className="gap-4"
            title={
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
                    <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                        {title}
                    </span>
                </div>
            }
            description={description}
            footer={
                <div className="flex flex-row items-center justify-end gap-2.5 w-full">
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
                </div>
            }
        >
            {requiresTypedConfirmation && (
                <label className="space-y-2 pt-1 block">
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
        </ModalBottomSheet>
    );
}
