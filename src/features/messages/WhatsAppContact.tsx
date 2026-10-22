import { useEffect, useRef, useState } from 'react';
import type { AppLocale, ClassInfo } from '../../types';
import { useTeacherMessaging } from '../../contexts/TeacherMessagingContext';
import { SupportWhatsAppBlock, SupportWhatsAppButton } from '../../components/support/SupportWhatsAppBlock';
import { conversationCopy } from './conversationCopy';

/** Opening WhatsApp stays synchronous; recording the click never blocks the external app. */
export function WhatsAppContact({ locale, target, hint, label }: {
    locale: AppLocale; target?: Pick<ClassInfo, 'id' | 'name'>; hint?: string; label?: string;
}) {
    const inbox = useTeacherMessaging();
    const copy = conversationCopy(locale);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const pending = useRef(false);
    const requestId = useRef<string | undefined>(undefined);
    const scope = useRef<object>({});
    useEffect(() => {
        scope.current = {}; requestId.current = undefined; pending.current = false;
        setFailed(false); setBusy(false);
        return () => { scope.current = {}; };
    }, [inbox?.owner, target?.id]);
    const record = async () => {
        if (!inbox?.enabled || pending.current) return;
        const active = scope.current;
        pending.current = true; setBusy(true); setFailed(false);
        try {
            requestId.current ??= `teacher-${crypto.randomUUID()}`;
            await inbox.recordWhatsAppContact(requestId.current, target?.id);
        } catch {
            if (scope.current === active) setFailed(true);
        } finally {
            if (scope.current === active) { pending.current = false; setBusy(false); }
        }
    };
    const props = { locale, label: label ?? copy.whatsapp, context: { teacherName: inbox?.teacherName, className: target?.name }, onContact: () => { void record(); } };
    return <div>
        {hint ? <SupportWhatsAppBlock {...props} hint={hint} /> : <SupportWhatsAppButton {...props} className="w-full" />}
        {(failed || busy) && <div role="status" className="mt-2 text-xs text-muted-foreground">
            {busy ? copy.recording : <>{copy.contactUnrecorded} <button type="button" className="min-h-11 px-2 underline" onClick={() => void record()}>{copy.retry}</button></>}
        </div>}
    </div>;
}
