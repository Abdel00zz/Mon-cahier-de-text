import { lazy, Suspense, useState } from 'react';
import type { AppLocale, ClassInfo } from '../../types';
import { useTeacherMessaging } from '../../contexts/TeacherMessagingContext';
import { isClassMatureForContentOffer } from '../../domain/assistant/contentSuggestion';
import { WhatsAppContact } from './WhatsAppContact';
import { conversationCopy } from './conversationCopy';
import { contentSuggestionMessage } from '../assistant/contentSuggestionCopy';
import { useMoroccoToday } from '../../hooks/useMoroccoToday';
const TeacherConversation = lazy(() => import('./TeacherConversation').then(module => ({ default: module.TeacherConversation })));

export function NotebookSupport({ locale, target, hint, label }: {
    locale: AppLocale;
    target?: Pick<ClassInfo, 'id' | 'name'> & Partial<Pick<ClassInfo, 'createdAt' | 'subject'>>;
    hint: string;
    label: string;
}) {
    const messaging = useTeacherMessaging();
    const copy = conversationCopy(locale);
    const today = useMoroccoToday();
    const mature = isClassMatureForContentOffer(target, Date.now());
    if (!mature) return null;
    const contentHint = target ? contentSuggestionMessage({ target, origin: 'unknown', evidence: { empty: true, contentCount: 0, assignedCount: 0 } }, locale, today).detail : hint;
    const [started, setStarted] = useState(false);
    const [open, setOpen] = useState(false);
    return <div>
        <WhatsAppContact locale={locale} hint={contentHint} label={label} target={target} intent="create" />
        {messaging?.enabled && <button type="button" className="mx-auto mb-4 flex min-h-11 items-center rounded-xl border border-border px-4 text-sm text-foreground hover:bg-secondary" onClick={() => { setStarted(true); setOpen(true); }}>{copy.contact}</button>}
        {started && <Suspense fallback={<p role="status">{copy.loading}</p>}><TeacherConversation key={`${messaging?.owner}:${target?.id ?? ''}`} open={open} onClose={() => setOpen(false)} locale={locale} target={target} context={contentHint} /></Suspense>}
    </div>;
}
