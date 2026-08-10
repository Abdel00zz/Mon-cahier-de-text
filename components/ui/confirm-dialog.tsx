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
            <DialogContent className="gap-4 border-slate-200/80 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] dark:bg-[#1e1f20] sm:max-w-[440px]">
                <DialogHeader className="gap-2">
                    <DialogTitle className="text-lg font-bold font-display leading-tight text-slate-900 dark:text-slate-100">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-normal leading-relaxed text-slate-500 dark:text-slate-400">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {requiresTypedConfirmation && (
                    <label className="space-y-1.5 pt-1">
                        <span className="block text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                            {confirmationHint}
                        </span>
                        <input
                            type="text"
                            value={confirmationValue}
                            onChange={(event) => setConfirmationValue(event.target.value)}
                            placeholder={confirmationPhrase}
                            autoComplete="off"
                            autoFocus
                            className="flex h-11 w-full rounded-2xl border border-slate-200 bg-[#f0f4f9] px-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus-visible:bg-white focus-visible:border-[#0b57d0] focus-visible:ring-4 focus-visible:ring-[#0b57d0]/15 dark:border-slate-700 dark:bg-[#282a2c] dark:text-slate-100"
                            aria-label={confirmationHint}
                        />
                    </label>
                )}
                <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        className="w-full rounded-full h-10 px-5 font-medium transition-all sm:w-auto"
                    >
                        {cancelLabel ?? t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={!confirmationIsValid}
                        className="w-full rounded-full h-10 px-6 font-medium transition-all sm:w-auto"
                    >
                        {confirmLabel ?? t('common.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
