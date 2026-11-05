import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from './button';
import { AnimatedTrashButton } from './AnimatedTrashButton';
import { useLocale } from '@/i18n/LocaleProvider';
import { TriangleAlert, CircleHelp } from '@/components/ui/icons';
import { Input } from './input';
import { StatusNotice } from './status-notice';
import { useModalHaptics } from '@/hooks/useModalHaptics';
import { acquireModalLayer } from '@/platform/modalStack';
import { cn } from '@/lib/utils';

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
    const { t, isRtl, locale } = useLocale();
    const haptics = useModalHaptics();
    const [confirmationValue, setConfirmationValue] = React.useState('');
    const [pending, setPending] = React.useState(false);
    const [failure, setFailure] = React.useState(false);
    const [layer, setLayer] = React.useState(0);
    const pendingRef = React.useRef(false);
    const cancelBtnRef = React.useRef<HTMLButtonElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const returnFocusRef = React.useRef<HTMLElement | null>(null);
    const requiresTypedConfirmation = Boolean(confirmationPhrase);
    const typedConfirmationLabel = confirmationHint ?? t('confirm.typePhrase', { phrase: confirmationPhrase ?? '' });
    const confirmationIsValid = !requiresTypedConfirmation || confirmationValue === confirmationPhrase;
    const blockDismiss = requiresTypedConfirmation || pending;

    React.useLayoutEffect(() => {
        if (!open) return;
        const lease = acquireModalLayer();
        setLayer(lease.layer);
        return lease.release;
    }, [open]);

    React.useEffect(() => {
        if (open) {
            haptics.onOpen();
        } else {
            setConfirmationValue('');
            setFailure(false);
        }
    }, [open, haptics]);

    const handleConfirm = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        if (!confirmationIsValid || pendingRef.current) return;
        pendingRef.current = true;
        setPending(true);
        setFailure(false);
        try {
            if (variant === 'destructive') {
                haptics.onDelete();
            } else {
                haptics.onConfirm();
            }
            await onConfirm();
            onOpenChange(false);
        } catch {
            haptics.onError();
            setFailure(true);
        } finally {
            pendingRef.current = false;
            setPending(false);
        }
    };

    const handleCancel = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (pendingRef.current) return;
        haptics.onCancel();
        onOpenChange(false);
    };

    return (
        <AlertDialogPrimitive.Root
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && !pendingRef.current) {
                    haptics.onClose();
                    onOpenChange(false);
                }
            }}
        >
            <AlertDialogPrimitive.Portal>
                <AlertDialogPrimitive.Overlay
                    style={{ zIndex: 100 + layer * 20 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!blockDismiss) handleCancel();
                    }}
                    className="modal-motion-overlay fixed inset-0 z-[100]"
                />
                <AlertDialogPrimitive.Content
                    data-codex-surface="sheet"
                    dir={isRtl ? 'rtl' : 'ltr'}
                    lang={locale}
                    style={{ zIndex: 110 + layer * 20 }}
                    data-elevation="high"
                    data-glow={variant === 'destructive' ? 'danger' : 'primary'}
                    data-ambient="true"
                    data-mobile-presentation="dialog"
                    data-modal-alert="true"
                    onOpenAutoFocus={(event) => {
                        const previous = document.activeElement;
                        if (previous instanceof HTMLElement) returnFocusRef.current = previous;
                        event.preventDefault();
                        if (requiresTypedConfirmation && !window.matchMedia('(max-width: 639px)').matches) {
                            inputRef.current?.focus({ preventScroll: true });
                        } else {
                            cancelBtnRef.current?.focus({ preventScroll: true });
                        }
                    }}
                    onCloseAutoFocus={(event) => {
                        if (returnFocusRef.current?.isConnected) {
                            event.preventDefault();
                            returnFocusRef.current.focus({ preventScroll: true });
                        }
                    }}
                    onEscapeKeyDown={(event) => {
                        if (blockDismiss) event.preventDefault();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        isRtl ? 'rtl-flow' : 'ltr-flow',
                        'modal-pro-surface modal-motion-surface fixed inset-0 z-[110] m-auto flex h-fit min-h-0 w-[calc(100vw-2rem)] max-w-md flex-col gap-0 overflow-hidden overscroll-contain rounded-[24px] border border-border bg-card text-foreground shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
                    )}
                >
                    <div className="modal-header modal-pro-header relative z-10 flex shrink-0 flex-col justify-center bg-transparent px-5 py-3.5 text-start text-foreground sm:px-7 sm:py-4.5">
                        <AlertDialogPrimitive.Title data-ui-title className="text-[17px] font-bold leading-[1.35] tracking-[-0.02em] text-foreground sm:text-[19px]">
                            <div className="flex items-center gap-3">
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'flex h-8 w-8 shrink-0 items-center justify-center',
                                        variant === 'destructive' ? 'text-destructive' : 'text-primary'
                                    )}
                                >
                                    {variant === 'destructive' ? (
                                        <TriangleAlert className="h-5 w-5 stroke-[2.2]" />
                                    ) : (
                                        <CircleHelp className="h-5 w-5 stroke-[2.2]" />
                                    )}
                                </span>
                                <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                                    {title}
                                </span>
                            </div>
                        </AlertDialogPrimitive.Title>
                        <AlertDialogPrimitive.Description data-description className="mt-1 text-[13px] leading-[1.45] tracking-[-0.005em] text-muted-foreground sm:text-[13.5px]">
                            {description}
                        </AlertDialogPrimitive.Description>
                    </div>

                    {(requiresTypedConfirmation || failure) && (
                        <div className="modal-body modern-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 sm:px-6 sm:py-4">
                            {failure && <StatusNotice tone="error" title={t('confirm.retryError')} announce className="mb-3" />}
                            {requiresTypedConfirmation && (
                                <label className="block space-y-2 pt-2">
                                    <span className="block text-xs font-semibold leading-relaxed text-foreground">
                                        {typedConfirmationLabel}
                                    </span>
                                    <Input
                                        ref={inputRef}
                                        type="text"
                                        value={confirmationValue}
                                        onChange={(event) => setConfirmationValue(event.target.value)}
                                        placeholder={confirmationPhrase}
                                        autoComplete="off"
                                        disabled={pending}
                                        className="flex h-11 w-full rounded-xl border border-border/80 bg-muted/40 px-4 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15 sm:text-sm"
                                        aria-label={typedConfirmationLabel}
                                    />
                                </label>
                            )}
                        </div>
                    )}

                    <div className="modal-footer modal-pro-footer relative z-10 flex shrink-0 flex-col-reverse gap-2.5 bg-muted/20 px-5 py-3.5 dark:bg-muted/10 sm:px-6 sm:py-4">
                        <div className="flex w-full flex-col-reverse items-stretch gap-2.5 sm:grid sm:grid-cols-2">
                            <AlertDialogPrimitive.Cancel asChild>
                                <Button
                                    ref={cancelBtnRef}
                                    type="button"
                                    variant="secondary"
                                    onClick={handleCancel}
                                    disabled={pending}
                                    className="h-auto min-h-11 whitespace-normal rounded-xl px-4 py-2 text-sm font-semibold"
                                >
                                    {cancelLabel ?? t('common.cancel')}
                                </Button>
                            </AlertDialogPrimitive.Cancel>
                            {variant === 'destructive' ? (
                                <AnimatedTrashButton
                                    label={pending ? t('common.loading') : confirmLabel ?? t('common.delete')}
                                    variant="destructive"
                                    size="md"
                                    onAction={() => void handleConfirm()}
                                    disabled={!confirmationIsValid || pending}
                                    aria-busy={pending}
                                    className="glow-pulse-danger h-auto min-h-11 w-full whitespace-normal rounded-xl px-5 py-2 text-sm font-semibold shadow-sm"
                                />
                            ) : (
                                <AlertDialogPrimitive.Action asChild>
                                    <Button
                                        type="button"
                                        variant="default"
                                        onClick={handleConfirm}
                                        disabled={!confirmationIsValid || pending}
                                        aria-busy={pending}
                                        className="glow-pulse-primary h-auto min-h-11 whitespace-normal rounded-xl px-5 py-2 text-sm font-semibold shadow-sm"
                                    >
                                        {pending ? t('common.loading') : confirmLabel ?? t('common.confirm')}
                                    </Button>
                                </AlertDialogPrimitive.Action>
                            )}
                        </div>
                    </div>
                </AlertDialogPrimitive.Content>
            </AlertDialogPrimitive.Portal>
        </AlertDialogPrimitive.Root>
    );
}
