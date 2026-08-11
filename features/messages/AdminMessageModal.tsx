import React, { useState } from 'react';
import type { AdminMessage } from '../../types';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';

interface AdminMessageModalProps {
    message: AdminMessage;
    onAcknowledge: (messageId: string) => Promise<void>;
}

/** Message direction obligatoire : il n'est fermé qu'après accusé explicite. */
export const AdminMessageModal: React.FC<AdminMessageModalProps> = ({ message, onAcknowledge }) => {
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const acknowledge = async () => {
        setIsSending(true);
        setError(null);
        try {
            await onAcknowledge(message.id);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Accusé de réception impossible.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal
            isOpen
            hideClose
            blockDismiss
            maxWidth="md"
            title="Direction administrative"
            description="Message réservé à votre établissement"
            footer={(
                <Button type="button" onClick={() => void acknowledge()} disabled={isSending} className="min-w-36">
                    {isSending ? 'Validation…' : "J’ai compris"}
                </Button>
            )}
        >
            <article className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h2 className="text-base font-bold text-foreground">{message.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{message.body}</p>
                </div>
                {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground">Votre confirmation sera transmise à la direction.</p>
            </article>
        </Modal>
    );
};
