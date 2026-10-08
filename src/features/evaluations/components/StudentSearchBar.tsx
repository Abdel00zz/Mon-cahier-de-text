import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';

export function StudentSearchBar({ query, onQueryChange, count, children }: {
    query: string; onQueryChange: (query: string) => void; count: number; children?: ReactNode;
}) {
    const { t, locale } = useLocale();
    const number = numberFormat(locale);
    return <div className="student-search-bar">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true"/>
        <input type="search" value={query} onChange={event => onQueryChange(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onQueryChange(''); } }}
            placeholder={t('evaluations.notebook.search')} aria-label={t('evaluations.notebook.search')} autoComplete="off"/>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{number.format(count)}</span>
        {children}
        {query && <button type="button" onClick={() => onQueryChange('')} aria-label={t('evaluations.students.clearSearch')}><X className="h-4 w-4" aria-hidden="true"/></button>}
    </div>;
}
