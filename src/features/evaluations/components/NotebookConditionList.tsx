import { useId, useState, type ReactNode } from 'react';
import { BookOpenCheck, BookX, CircleCheck, CircleMinus, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { NOTEBOOK_CONDITIONS, countNotebookConditions } from '@/domain/evaluations/notebookConditions';
import type { NotebookCondition } from '@/types';

const ICONS = { good: CircleCheck, average: CircleMinus, needs_work: BookOpenCheck, missing: BookX };

export function NotebookConditionList({ names, conditions, onChange, onRemove, entry, footer }: {
    names: string[];
    conditions: Record<string, NotebookCondition>;
    onChange: (conditions: Record<string, NotebookCondition>) => void;
    onRemove: (name: string) => void;
    entry?: ReactNode;
    footer?: ReactNode;
}) {
    const { t, locale } = useLocale();
    const id = useId();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<NotebookCondition | 'pending' | null>(null);
    const number = numberFormat(locale);
    const counts = countNotebookConditions(names, conditions);
    const reviewed = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const stateOf = (name: string) => Object.hasOwn(conditions, name) ? conditions[name] : 'pending';
    const shownNames = names.filter(name => name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale))
        && (!filter || stateOf(name) === filter));

    return <div className="notebook-tracker" data-notebook-check-list>
        <div className="notebook-summary">
            <div className="notebook-summary__statuses" role="group" aria-label={t('evaluations.notebook.filterLabel')}>
                {NOTEBOOK_CONDITIONS.map(condition => <button key={condition} type="button" data-condition={condition} aria-pressed={filter === condition}
                    onClick={() => setFilter(filter === condition ? null : condition)} className="notebook-stat">
                    <span>{t(`evaluations.notebook.${condition}`)}</span><strong>{number.format(counts[condition])}</strong>
                </button>)}
            </div>
            <button type="button" className="notebook-progress" aria-pressed={filter === 'pending'}
                title={t('evaluations.notebook.pendingFilter')} onClick={() => setFilter(filter === 'pending' ? null : 'pending')}>
                <span role="status" aria-live="polite" aria-atomic="true">{t('evaluations.notebook.progress', { reviewed: number.format(reviewed), total: number.format(names.length) })}</span>
                <span className="notebook-progress__track" aria-hidden="true"><span style={{ width: `${names.length ? reviewed / names.length * 100 : 0}%` }}/></span>
            </button>
        </div>
        <div className="notebook-tracker__scroll modern-scrollbar" data-swipe-scroll-region>
            {entry}
            <p className="sr-only" id={`${id}-hint`}>{t('evaluations.notebook.hint')}</p>
            {(names.length > 6 || query) && <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('evaluations.notebook.search')}
                aria-label={t('evaluations.notebook.search')} className="notebook-search"/>}
            {(filter || query) && <div className="notebook-filter-info">
                <span>{filter ? t(`evaluations.notebook.${filter}`) : t('evaluations.notebook.search')} · {number.format(shownNames.length)}</span>
                <button type="button" onClick={() => { setFilter(null); setQuery(''); }}>{t('evaluations.notebook.showAll')}</button>
            </div>}
            {names.length === 0 ? <p className="notebook-empty">{t('evaluations.notebook.empty')}</p>
                : shownNames.length === 0 && <p className="notebook-empty">{t(query ? 'evaluations.notebook.noResult' : filter === 'pending' && reviewed === names.length ? 'evaluations.notebook.allReviewed' : 'evaluations.notebook.emptyFilter')}</p>}
            <div className="notebook-students">
                {shownNames.map(name => <fieldset key={name} className="notebook-student" aria-describedby={`${id}-hint`}>
                    <legend className="sr-only">{name}</legend>
                    <div className="notebook-student__identity">
                        <span className="notebook-avatar" aria-hidden="true">{Array.from(name)[0]}</span>
                        <div className="min-w-0">
                            <span dir={textDirectionAttribute(name)} className="notebook-student__name">{name}</span>
                            {!Object.hasOwn(conditions, name) && <span className="notebook-student__pending">{t('evaluations.notebook.pending')}</span>}
                        </div>
                    </div>
                    <div className="notebook-segments">
                        {NOTEBOOK_CONDITIONS.map(condition => {
                            const selected = Object.hasOwn(conditions, name) && conditions[name] === condition;
                            const Icon = ICONS[condition];
                            return <label key={condition} className="notebook-segment" data-condition={condition} data-selected={selected ? 'true' : undefined}>
                                <input type="radio" name={`${id}-${names.indexOf(name)}`} value={condition} checked={selected}
                                    onChange={() => onChange({ ...conditions, [name]: condition })} className="sr-only"/>
                                <span><Icon className="h-4 w-4 shrink-0" aria-hidden="true"/>{t(`evaluations.notebook.${condition}`)}</span>
                            </label>;
                        })}
                    </div>
                    <button type="button" onClick={() => onRemove(name)} aria-label={t('evaluations.students.remove', { name })} className="notebook-student__remove">
                        <X className="h-4 w-4" aria-hidden="true"/>
                    </button>
                </fieldset>)}
            </div>
        </div>
        {footer && <div className="notebook-tracker__footer">{footer}</div>}
    </div>;
}
