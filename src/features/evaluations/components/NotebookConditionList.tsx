import { useId, useState } from 'react';
import { BookOpenCheck, BookX, CircleCheck, CircleMinus, RotateCcw, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { NOTEBOOK_CONDITIONS, countNotebookConditions } from '@/domain/evaluations/notebookConditions';
import type { NotebookCondition } from '@/types';

const ICONS = { good: CircleCheck, average: CircleMinus, needs_work: BookOpenCheck, missing: BookX };
const ACTIVE = {
    good: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    average: 'border-amber-700/50 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    needs_work: 'border-destructive/50 bg-destructive/10 text-destructive',
    missing: 'border-destructive/50 bg-destructive/10 text-destructive',
};

export function NotebookConditionList({ names, conditions, onChange, onRemove }: {
    names: string[];
    conditions: Record<string, NotebookCondition>;
    onChange: (conditions: Record<string, NotebookCondition>) => void;
    onRemove: (name: string) => void;
}) {
    const { t, locale } = useLocale();
    const id = useId();
    const [query, setQuery] = useState('');
    const number = numberFormat(locale);
    const counts = countNotebookConditions(names, conditions);
    const reviewed = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const shownNames = names.filter(name => name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)));
    return <div className="space-y-3" data-notebook-check-list>
        <p className="text-xs text-muted-foreground">{t('evaluations.notebook.hint')}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="status" aria-live="polite" aria-atomic="true">
            {NOTEBOOK_CONDITIONS.map(condition => <span key={condition} className="rounded-lg border border-border bg-muted/25 px-2 py-2 text-xs text-muted-foreground">
                {t(`evaluations.notebook.${condition}`)} <strong className="text-foreground">{number.format(counts[condition])}</strong>
            </span>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t('evaluations.notebook.progress', { reviewed: number.format(reviewed), total: number.format(names.length) })}</p>
            <button type="button" onClick={() => onChange({})} disabled={!reviewed} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <RotateCcw className="h-4 w-4" aria-hidden="true"/>{t('evaluations.notebook.reset')}
            </button>
        </div>
        <div className="space-y-2">
            {(names.length > 6 || query) && <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('evaluations.notebook.search')} aria-label={t('evaluations.notebook.search')} className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/>}
            {shownNames.length === 0 && <p className="py-3 text-sm text-muted-foreground">{t('evaluations.notebook.noResult')}</p>}
            {shownNames.map(name => <fieldset key={name} className="min-w-0 rounded-xl border border-border bg-card p-2.5">
                <legend dir={textDirectionAttribute(name)} className="max-w-full break-words px-1 text-sm font-semibold text-foreground">{name}</legend>
                <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{conditions[name] && Object.hasOwn(conditions, name) ? t(`evaluations.notebook.${conditions[name]}`) : t('evaluations.notebook.pending')}</span>
                    <button type="button" onClick={() => onRemove(name)} aria-label={t('evaluations.students.remove', { name })} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" aria-hidden="true"/></button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {NOTEBOOK_CONDITIONS.map(condition => {
                        const selected = Object.hasOwn(conditions, name) && conditions[name] === condition;
                        const Icon = ICONS[condition];
                        return <label key={condition} className="relative min-w-0 cursor-pointer">
                            <input type="radio" name={`${id}-${names.indexOf(name)}`} value={condition} checked={selected} onChange={() => onChange({ ...conditions, [name]: condition })} className="peer sr-only"/>
                            <span className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-1.5 py-1 text-center text-xs font-medium transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${selected ? ACTIVE[condition] : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true"/>{t(`evaluations.notebook.${condition}`)}
                            </span>
                        </label>;
                    })}
                </div>
            </fieldset>)}
        </div>
    </div>;
}
