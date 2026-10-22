import { lazy, Suspense, useState } from 'react';
import type { AppLocale, ClassInfo } from '../../types';
import { useTeacherMessaging } from '../../contexts/TeacherMessagingContext';
import { WhatsAppContact } from './WhatsAppContact';
import { conversationCopy } from './conversationCopy';
const TeacherConversation = lazy(() => import('./TeacherConversation').then(module => ({ default: module.TeacherConversation })));

export function NotebookSupport({ locale, target, hint, label }: { locale: AppLocale; target?: Pick<ClassInfo, 'id' | 'name'>; hint: string; label: string }) {
    const messaging = useTeacherMessaging();
    const copy = conversationCopy(locale);
    const [started, setStarted] = useState(false);
    const [open, setOpen] = useState(false);
    return <div>
        <WhatsAppContact locale={locale} hint={hint} label={label} target={target} />
        {messaging?.enabled && <button type="button" className="mx-auto mb-4 flex min-h-11 items-center rounded-xl border border-border px-4 text-sm text-foreground hover:bg-secondary" onClick={() => { setStarted(true); setOpen(true); }}>{copy.contact}</button>}
        {started && <Suspense fallback={<p role="status">{copy.loading}</p>}><TeacherConversation key={`${messaging?.owner}:${target?.id ?? ''}`} open={open} onClose={() => setOpen(false)} locale={locale} target={target} /></Suspense>}
    </div>;
}
