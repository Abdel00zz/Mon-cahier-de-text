import * as React from 'react';
import { ModalBottomSheet } from './modal-bottom-sheet';
import { Button } from './button';
import { useLocale } from '@/i18n/LocaleProvider';
import { TriangleAlert, CircleHelp } from '@/components/ui/icons';
import { Input } from './input';
import { StatusNotice } from './status-notice';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
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
    const [pending, setPending] = React.useState(false);
    const [failure, setFailure] = React.useState(false);
    const pendingRef = React.useRef(false);
    const requiresTypedConfirmation = Boolean(confirmationPhrase);
    const confirmationIsValid = !requiresTypedConfirmation || confirmationValue === confirmationPhrase;

    React.useEffect(() => {
        if (!open) { setConfirmationValue(''); setFailure(false); }
    }, [open]);

    const handleConfirm = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirmationIsValid || pendingRef.current) return;
        pendingRef.current = true;
        setPending(true);
        setFailure(false);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch {
            setFailure(true);
        } finally {
            pendingRef.current = false;
            setPending(false);
        }
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!pendingRef.current) onOpenChange(false);
    };

    return (
        <ModalBottomSheet
            isOpen={open}
            onClose={() => { if (!pendingRef.current) onOpenChange(false); }}
            maxWidth="sm"
            mobilePresentation="dialog"
            dragHandle={false}
            swipeToDismiss={false}
            blockDismiss={requiresTypedConfirmation || pending}
            closeDisabled={pending}
            description={description}
            title={
                <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                        variant === 'destructive' 
                            ? 'text-destructive'
                            : 'text-primary'
                    }`}>
                        {variant === 'destructive' ? (
                            <TriangleAlert className="h-5 w-5 stroke-[2.2]" />
                        ) : (
                            <CircleHelp className="h-5 w-5 stroke-[2.2]" />
                        )}
                    </span>
                    <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                        {title}
                    </span>
                </div>
            }
            bodyClassName={requiresTypedConfirmation || failure ? 'px-5 py-3 sm:px-6 sm:py-4' : 'hidden'}
            footerClassName="px-5 py-3.5 sm:px-6 sm:py-4"
            footer={
                <div className="flex w-full flex-col-reverse items-stretch gap-2.5 sm:grid sm:grid-cols-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={pending}
                        className="min-h-11 h-auto rounded-xl px-4 py-2 whitespace-normal text-sm font-semibold"
                    >
                        {cancelLabel ?? t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={!confirmationIsValid || pending}
                        aria-busy={pending}
                        className="min-h-11 h-auto rounded-xl px-5 py-2 whitespace-normal text-sm font-semibold shadow-sm"
                    >
                        {pending ? t('common.loading') : confirmLabel ?? t('common.confirm')}
                    </Button>
                </div>
            }
        >
            {failure && <StatusNotice tone="error" title={t('confirm.retryError')} announce className="mb-3" />}
            {requiresTypedConfirmation && (
                <label className="space-y-2 pt-2 block">
                    <span className="block text-xs font-semibold leading-relaxed text-foreground">
                        {confirmationHint}
                    </span>
                    <Input
                        type="text"
                        value={confirmationValue}
                        onChange={(event) => setConfirmationValue(event.target.value)}
                        placeholder={confirmationPhrase}
                        autoComplete="off"
                        disabled={pending}
                        className="flex h-11 w-full rounded-xl border border-border/80 bg-muted/40 px-4 text-xs sm:text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus-visible:bg-card focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                        aria-label={confirmationHint}
                    />
                </label>
            )}
        </ModalBottomSheet>
    );
}
