import { Search, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';

export function StudentSearchBar({ query, onQueryChange, count, children }: {
    query: string; onQueryChange: (query: string) => void; count: number; children?: ReactNode;
}) {
    const { t, locale } = useLocale();
    const number = numberFormat(locale);
    const input = useRef<HTMLInputElement>(null);
    return <div className="student-search-bar">
        <div className="student-search-bar__input">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true"/>
        <input ref={input} type="search" dir={locale === 'ar' ? 'rtl' : 'ltr'} enterKeyHint="search" spellCheck={false} autoCapitalize="none" value={query} onChange={event => onQueryChange(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onQueryChange(''); } }}
            placeholder={t('evaluations.notebook.search')} aria-label={t('evaluations.notebook.search')} autoComplete="off"/>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{number.format(count)}</span>
        <button type="button" disabled={!query} onClick={() => { onQueryChange(''); input.current?.focus(); }} aria-label={t('evaluations.students.clearSearch')}><X className="h-4 w-4" aria-hidden="true"/></button>
        </div>
        {children}
    </div>;
}
