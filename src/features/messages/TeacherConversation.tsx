import { useEffect, useId, useRef, useState } from 'react';
import type { AppLocale, ClassInfo, TeacherRequestDraft } from '../../types';
import { Modal } from '../../components/ui/modal';
import { useTeacherMessaging } from '../../contexts/TeacherMessagingContext';
import { buildSupportWhatsAppUrl, hasSupportWhatsApp } from '../../constants/support';
import { WhatsAppIcon } from '../../components/support/SupportWhatsAppBlock';
import { SyncRequestError } from '../../infrastructure/sync/syncTransport';
import { isNetworkOnline } from '../../platform/networkStatus';
import { conversationCopy } from './conversationCopy';
import './conversation.css';

interface Props {
    open: boolean;
    onClose: () => void;
    locale: AppLocale;
    target?: Pick<ClassInfo, 'id' | 'name'>;
    kind: TeacherRequestDraft['kind'];
    context?: string;
    initialReplyTo?: string;
}

/** One private thread, using the application's existing inbox subscription. */
export function TeacherConversation({ open, onClose, locale, target, kind, context, initialReplyTo }: Props) {
    const inbox = useTeacherMessaging();
    const copy = conversationCopy(locale);
    const id = useId();
    const [body, setBody] = useState(() => [kind === 'custom-content' ? copy.template : copy.helpTemplate, context].filter(Boolean).join('\n'));
    const [replyTo, setReplyTo] = useState<string | undefined>(initialReplyTo);
    const replyMessage = replyTo ? inbox?.history.find(message => message.id === replyTo) : undefined;
    const selectedTarget = replyTo ? (replyMessage?.classId ? { id: replyMessage.classId, name: replyMessage.className ?? '' } : undefined) : target;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sentId, setSentId] = useState<string>();
    const requestId = useRef<string | undefined>(undefined);
    const controller = useRef<AbortController | null>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    const [acknowledging, setAcknowledging] = useState<string>();
    useEffect(() => () => { controller.current?.abort(); }, []);
    const close = () => { controller.current?.abort(); controller.current = null; setBusy(false); onClose(); };
    const send = async () => {
        if (controller.current || !body.trim() || !inbox?.enabled) return;
        if (!isNetworkOnline()) { setError(copy.offline); return; }
        const active = new AbortController();
        controller.current = active;
        setBusy(true); setError(''); setSentId(undefined);
        try {
            requestId.current ??= `teacher-${crypto.randomUUID()}`;
            const message = await inbox.sendRequest({ requestId: requestId.current, body: body.trim(), kind,
                ...(selectedTarget ? { classId: selectedTarget.id } : {}), ...(replyTo ? { replyTo } : {}) }, active.signal);
            if (controller.current !== active) return;
            setSentId(message.id); setBody(''); setReplyTo(undefined); requestId.current = undefined;
        } catch (failure) {
            if (controller.current !== active) return;
            setError(!isNetworkOnline() ? copy.offline : failure instanceof SyncRequestError && failure.code === 'CLASS_NOT_SYNCED' ? copy.sync
                : failure instanceof SyncRequestError && failure.status === 429 ? copy.limit : copy.error);
        } finally {
            if (controller.current === active) { controller.current = null; setBusy(false); }
        }
    };
    const acknowledge = async (messageId: string) => {
        if (acknowledging || !inbox) return;
        setAcknowledging(messageId); setError('');
        try { await inbox.acknowledge(messageId); }
        catch { setError(copy.unavailable); }
        finally { setAcknowledging(undefined); }
    };
    return <Modal isOpen={open} onClose={close} title={copy.title} maxWidth="lg">
        <div className="teacher-conversation" dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
            {selectedTarget && (
                <div className="teacher-conversation__target-badge">
                    <span className="teacher-conversation__target-dot" aria-hidden="true" />
                    <span className="teacher-conversation__target-name" dir="auto">{selectedTarget.name}</span>
                </div>
            )}
            {inbox?.enabled ? <form onSubmit={event => { event.preventDefault(); void send(); }} className="teacher-conversation__form">
                <div className="teacher-conversation__form-header">
                    <label htmlFor={id} className="teacher-conversation__label">{copy.message}</label>
                    {replyTo && (
                        <div className="teacher-conversation__replying-pill">
                            <span>{copy.answer} · {inbox.history.find(item => item.id === replyTo)?.title}</span>
                            <button type="button" onClick={() => setReplyTo(undefined)} aria-label="Annuler" className="teacher-conversation__replying-dismiss">✕</button>
                        </div>
                    )}
                </div>
                <div className="teacher-conversation__textarea-wrap">
                    <textarea
                        id={id}
                        ref={field}
                        value={body}
                        dir="auto"
                        maxLength={1200}
                        rows={4}
                        placeholder={copy.placeholder}
                        disabled={busy}
                        onChange={event => { setBody(event.target.value); requestId.current = undefined; setSentId(undefined); }}
                    />
                </div>
                <div className="teacher-conversation__compose-actions">
                    <span className="teacher-conversation__counter" aria-live="polite">
                        {body.length}<span className="teacher-conversation__counter-max">/1200</span>
                    </span>
                    <button
                        type="submit"
                        disabled={busy || !body.trim()}
                        aria-busy={busy}
                        className="teacher-conversation__submit-btn"
                    >
                        {busy ? copy.sending : error ? copy.retry : copy.send}
                    </button>
                </div>
            </form> : <p className="teacher-conversation__login">{copy.login}</p>}

            {sentId && <p role="status" className="teacher-conversation__success">{copy.sent}</p>}
            {error && <p role="alert" className="teacher-conversation__error">{error}</p>}

            {hasSupportWhatsApp() && (
                <div className="teacher-conversation__whatsapp-section">
                    <div className="teacher-conversation__divider">
                        <span>{copy.alternate}</span>
                    </div>
                    <a
                        className="teacher-conversation__whatsapp"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={buildSupportWhatsAppUrl(locale, { teacherName: inbox?.teacherName, className: selectedTarget?.name, requestId: sentId })}
                    >
                        <WhatsAppIcon className="teacher-conversation__whatsapp-icon" />
                        <span>{copy.whatsapp}</span>
                    </a>
                </div>
            )}

            {inbox?.enabled && <section aria-label={copy.history} className="teacher-conversation__history">
                <h3 className="teacher-conversation__history-title">{copy.history}</h3>
                {!isNetworkOnline() ? <p role="status" className="teacher-conversation__status-msg">{copy.offline}</p>
                    : inbox.failed ? <div role="status" className="teacher-conversation__status-msg"><p>{copy.unavailable}</p><button type="button" onClick={() => void inbox.refresh().catch(() => {})}>{copy.retry}</button></div>
                    : !inbox.loaded ? <p role="status" className="teacher-conversation__status-msg">{copy.loading}</p>
                    : !inbox.history.length ? (
                        <div className="teacher-conversation__empty-history">
                            <p>{copy.empty}</p>
                        </div>
                    ) : null}
                {inbox.history.map(message => <article key={message.id} data-sender={message.sender ?? 'admin'}>
                    <header><span>{message.sender === 'teacher' ? copy.you : copy.team}</span><time dateTime={message.createdAt}>{Number.isFinite(Date.parse(message.createdAt)) ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(message.createdAt)) : '—'}</time></header>
                    {message.className && <p className="teacher-conversation__hint" dir="auto">{message.className}</p>}
                    <p dir="auto">{message.body}</p>
                    {message.sender === 'teacher' ? <small>{message.answeredAt ? copy.answered : copy.pending}</small>
                        : <div className="teacher-conversation__reply-actions">
                            {!message.acknowledgedAt && <button type="button" disabled={Boolean(acknowledging)} onClick={() => void acknowledge(message.id)}>{acknowledging === message.id ? copy.sending : copy.acknowledge}</button>}
                            <button type="button" disabled={busy} onClick={() => { setReplyTo(message.id); requestId.current = undefined; setSentId(undefined); field.current?.focus(); }}>{copy.answer}</button>
                        </div>}
                </article>)}
            </section>}
        </div>
    </Modal>;
}
