import { useEffect, useId, useRef, useState } from 'react';
import type { AppLocale, ClassInfo } from '../../types';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { Textarea } from '../../components/ui/textarea';
import { useTeacherMessaging } from '../../contexts/TeacherMessagingContext';
import { SyncRequestError } from '../../infrastructure/sync/syncTransport';
import { isNetworkOnline } from '../../platform/networkStatus';
import { conversationCopy } from './conversationCopy';
import './conversation.css';

interface Props {
    open: boolean;
    onClose: () => void;
    locale: AppLocale;
    target?: Pick<ClassInfo, 'id' | 'name'>;
    context?: string;
    initialReplyTo?: string;
}

/** One private thread, using the application's existing inbox subscription. */
export function TeacherConversation({ open, onClose, locale, target, context, initialReplyTo }: Props) {
    const inbox = useTeacherMessaging();
    const copy = conversationCopy(locale);
    const id = useId();
    const [body, setBody] = useState(() => [copy.helpTemplate, context].filter(Boolean).join('\n'));
    const [replyTo, setReplyTo] = useState<string | undefined>(initialReplyTo);
    const replyMessage = replyTo ? inbox?.history.find(message => message.id === replyTo) : undefined;
    const [classId, setClassId] = useState(target?.id ?? '');
    const classes = inbox?.classes ?? [];
    const history = inbox?.history.filter(message => !message.event) ?? [];
    const selectedTarget = replyTo ? (replyMessage?.classId ? { id: replyMessage.classId, name: replyMessage.className ?? '' } : undefined) : classes.find(item => item.id === classId);
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
        if (!replyTo && classId && !selectedTarget) { setError(copy.classUnavailable); return; }
        if (!isNetworkOnline()) { setError(copy.offline); return; }
        const active = new AbortController();
        controller.current = active;
        setBusy(true); setError(''); setSentId(undefined);
        try {
            requestId.current ??= `teacher-${crypto.randomUUID()}`;
            const message = await inbox.sendRequest({ requestId: requestId.current, body: body.trim(), kind: 'help',
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
            {inbox?.enabled ? <form onSubmit={event => { event.preventDefault(); void send(); }} className="teacher-conversation__form">
                <label htmlFor={`${id}-class`} className="teacher-conversation__label">{copy.classLabel}</label>
                <select id={`${id}-class`} className="teacher-conversation__class-select"
                    value={replyTo ? selectedTarget?.id ?? '' : classId} disabled={busy || Boolean(replyTo)}
                    onChange={event => { setClassId(event.target.value); requestId.current = undefined; setSentId(undefined); setError(''); }}>
                    <option value="">{copy.general}</option>
                    {classes.map(item => <option key={item.id} value={item.id} dir="auto">{item.name}</option>)}
                    {selectedTarget && !classes.some(item => item.id === selectedTarget.id) && <option value={selectedTarget.id}>{selectedTarget.name}</option>}
                    {!replyTo && classId && !selectedTarget && <option value={classId} disabled>{copy.classUnavailable}</option>}
                </select>
                <div className="teacher-conversation__form-header">
                    <label htmlFor={id} className="teacher-conversation__label">{copy.message}</label>
                    {replyTo && (
                        <div className="teacher-conversation__replying-pill">
                            <span>{copy.answer} · {inbox.history.find(item => item.id === replyTo)?.title}</span>
                            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setReplyTo(undefined); requestId.current = undefined; }} aria-label={copy.cancelReply} className="teacher-conversation__replying-dismiss">✕</Button>
                        </div>
                    )}
                </div>
                <div className="teacher-conversation__textarea-wrap">
                    <Textarea
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
                    <span className="teacher-conversation__counter">
                        {body.length}<span className="teacher-conversation__counter-max">/1200</span>
                    </span>
                    <Button
                        type="submit"
                        disabled={busy || !body.trim()}
                        aria-busy={busy}
                        className="teacher-conversation__submit-btn"
                    >
                        {busy ? copy.sending : error ? copy.retry : copy.send}
                    </Button>
                </div>
            </form> : <p className="teacher-conversation__login">{copy.login}</p>}

            {sentId && <p role="status" className="teacher-conversation__success">{copy.sent}</p>}
            {error && <p role="alert" className="teacher-conversation__error">{error}</p>}

            {inbox?.enabled && <section aria-label={copy.history} className="teacher-conversation__history">
                <h3 className="teacher-conversation__history-title">{copy.history}</h3>
                {!isNetworkOnline() ? <p role="status" className="teacher-conversation__status-msg">{copy.offline}</p>
                    : inbox.failed ? <div role="status" className="teacher-conversation__status-msg"><p>{copy.unavailable}</p><Button type="button" variant="ghost" size="sm" onClick={() => void inbox.refresh().catch(() => {})}>{copy.retry}</Button></div>
                    : !inbox.loaded ? <p role="status" className="teacher-conversation__status-msg">{copy.loading}</p>
                    : !history.length ? (
                        <div className="teacher-conversation__empty-history">
                            <p>{copy.empty}</p>
                        </div>
                    ) : null}
                {history.map(message => <article key={message.id} data-sender={message.sender ?? 'admin'}>
                    <header><span>{message.sender === 'teacher' ? copy.you : copy.team}</span><time dateTime={message.createdAt}>{Number.isFinite(Date.parse(message.createdAt)) ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(message.createdAt)) : '—'}</time></header>
                    {message.className && <p className="teacher-conversation__hint" dir="auto">{message.className}</p>}
                    <p dir="auto">{message.body}</p>
                    {message.sender === 'teacher' ? <small>{message.answeredAt ? copy.answered : copy.pending}</small>
                        : <div className="teacher-conversation__reply-actions">
                            {!message.acknowledgedAt && <Button type="button" variant="ghost" size="sm" disabled={Boolean(acknowledging)} onClick={() => void acknowledge(message.id)}>{acknowledging === message.id ? copy.sending : copy.acknowledge}</Button>}
                            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setReplyTo(message.id); requestId.current = undefined; setSentId(undefined); field.current?.focus(); }}>{copy.answer}</Button>
                        </div>}
                </article>)}
            </section>}
        </div>
    </Modal>;
}
