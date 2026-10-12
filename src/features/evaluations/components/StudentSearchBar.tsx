import { Search, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';

export function StudentSearchBar({ query, onQueryChange, count, children, isCompact }: {
    query: string; onQueryChange: (query: string) => void; count: number; children?: ReactNode; isCompact?: boolean;
}) {
    const { t, locale } = useLocale();
    const number = numberFormat(locale);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                event.preventDefault();
                input.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return <div className="student-search-bar">
        <div className={`student-search-bar__input ${isCompact ? 'is-compact' : 'is-expanded'}`}>
            <Search className="h-4 w-4 shrink-0 student-search-bar__icon" aria-hidden="true"/>
            <input
                ref={input}
                type="search"
                dir="auto"
                enterKeyHint="search"
                spellCheck={false}
                autoCapitalize="none"
                value={query}
                onChange={event => onQueryChange(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        onQueryChange('');
                    }
                }}
                placeholder={t('evaluations.notebook.search')}
                aria-label={t('evaluations.notebook.search')}
                autoComplete="off"
            />
            {!query && (
                <kbd className="student-search-bar__shortcut" aria-hidden="true">
                    /
                </kbd>
            )}
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{number.format(count)}</span>
            <button
                type="button"
                disabled={!query}
                onClick={() => { onQueryChange(''); input.current?.focus(); }}
                aria-label={t('evaluations.students.clearSearch')}
                className="student-search-bar__clear"
            >
                <X className="h-3.5 w-3.5" aria-hidden="true"/>
            </button>
        </div>
        {children}
    </div>;
}
