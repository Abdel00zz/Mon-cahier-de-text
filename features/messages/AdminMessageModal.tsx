import React, { useState } from 'react';
import type { AdminMessage } from '../../types';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { ShieldCheck } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface AdminMessageModalProps {
    message: AdminMessage;
    onAcknowledge: (messageId: string) => Promise<void>;
}

/** Message direction obligatoire : il n'est fermé qu'après accusé explicite. */
export const AdminMessageModal: React.FC<AdminMessageModalProps> = ({ message, onAcknowledge }) => {
    const { t } = useLocale();
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const acknowledge = async () => {
        setIsSending(true);
        setError(null);
        try {
            await onAcknowledge(message.id);
        } catch {
            setError(t('adminMessage.acknowledgeError'));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal
            isOpen
            hideClose
            blockDismiss
            maxWidth="lg"
            className="sm:max-w-xl sm:rounded-[28px]"
            headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b-0 bg-card/60"
            bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
            footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t-0 bg-card/60"
            title={
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                        <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
                    </span>
                    <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                        {t('adminMessage.title')}
                    </span>
                </div>
            }
            description={t('adminMessage.description')}
            footer={(
                <div className="flex items-center justify-end w-full">
                    <Button
                        type="button"
                        onClick={() => void acknowledge()}
                        disabled={isSending}
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 h-10 text-xs sm:text-sm shadow-sm"
                    >
                        {isSending ? t('adminMessage.confirming') : t('adminMessage.acknowledge')}
                    </Button>
                </div>
            )}
        >
            <article className="space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 shadow-xs">
                    <h2 className="text-base font-bold text-foreground sm:text-lg">{message.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{message.body}</p>
                </div>
                {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs font-semibold text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground font-medium">{t('adminMessage.confirmationHint')}</p>
            </article>
        </Modal>
    );
};
