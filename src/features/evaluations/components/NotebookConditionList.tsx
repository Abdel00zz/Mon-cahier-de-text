import { useDeferredValue, useId, useMemo, useState, type ReactNode } from 'react';
import { BookOpenCheck, BookX, CircleCheck, CircleMinus, X, type LucideIcon } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { NOTEBOOK_CONDITIONS } from '@/domain/evaluations/notebookConditions';
import { studentSearchKey } from '@/domain/evaluations/studentRoster';
import type { OralOutcome } from '@/types';
import { StudentSearchBar } from './StudentSearchBar';

const ICONS = { good: CircleCheck, average: CircleMinus, needs_work: BookOpenCheck, missing: BookX };
export const NOTEBOOK_REVIEW_CHOICES = NOTEBOOK_CONDITIONS.map(value => ({ value, labelKey: `evaluations.notebook.${value}`, Icon: ICONS[value] }));
export const ORAL_REVIEW_CHOICES: { value: OralOutcome; labelKey: string; Icon: LucideIcon }[] = [
    { value: 'mastered', labelKey: 'evaluations.oral.mastered', Icon: CircleCheck },
    { value: 'developing', labelKey: 'evaluations.oral.developing', Icon: CircleMinus },
    { value: 'needs_support', labelKey: 'evaluations.oral.needs_support', Icon: BookOpenCheck },
];

export function StudentReviewList<T extends string>({ names, conditions, onChange, onRemove, entry, footer, choices, mode = 'notebook' }: {
    names: string[];
    conditions: Record<string, T>;
    onChange: (conditions: Record<string, T>) => void;
    onRemove: (name: string) => void;
    entry?: ReactNode;
    footer?: ReactNode;
    choices: readonly { value: T; labelKey: string; Icon: LucideIcon }[];
    mode?: 'notebook' | 'oral';
}) {
    const { t, locale } = useLocale();
    const id = useId();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<T | 'pending' | null>(null);
    const number = numberFormat(locale);
    const copy = `evaluations.${mode}`;
    const reviewed = names.filter(name => Object.hasOwn(conditions, name) && choices.some(choice => choice.value === conditions[name])).length;
    const stateOf = (name: string) => Object.hasOwn(conditions, name) ? conditions[name] : 'pending';
    const searchIndex = useMemo(() => new Map(names.map(name => [name, studentSearchKey(name)])), [names]);
    const search = useDeferredValue(studentSearchKey(query));
    const shownNames = names.filter(name => searchIndex.get(name)!.includes(search)
        && (!filter || stateOf(name) === filter));

    return <div className="notebook-tracker" data-review-mode={mode} data-notebook-check-list={mode === 'notebook' ? '' : undefined}>
        <div className="notebook-tracker__scroll modern-scrollbar" data-swipe-scroll-region>
            {entry}
            <p className="sr-only" id={`${id}-hint`}>{t(`${copy}.hint`)}</p>
            <StudentSearchBar query={query} onQueryChange={setQuery} count={shownNames.length}>
                <select value={filter ?? ''} onChange={event => setFilter(event.target.value ? event.target.value as T | 'pending' : null)} aria-label={t(`${copy}.filterLabel`)}>
                    <option value="">{t('evaluations.notebook.showAll')}</option>
                    <option value="pending">{t(`${copy}.pending`)}</option>
                    {choices.map(choice => <option key={choice.value} value={choice.value}>{t(choice.labelKey)}</option>)}
                </select>
            </StudentSearchBar>
            {(filter || query) && <div className="notebook-filter-info">
                <span>{filter ? t(`${copy}.${filter}`) : t('evaluations.notebook.search')} · {number.format(shownNames.length)}</span>
                <button type="button" onClick={() => { setFilter(null); setQuery(''); }}>{t('evaluations.notebook.showAll')}</button>
            </div>}
            {names.length === 0 ? <p className="notebook-empty">{t(`${copy}.empty`)}</p>
                : shownNames.length === 0 && <p className="notebook-empty">{t(query ? 'evaluations.notebook.noResult' : filter === 'pending' && reviewed === names.length ? `${copy}.allReviewed` : 'evaluations.notebook.emptyFilter')}</p>}
            <div className="notebook-students">
                {shownNames.map(name => <fieldset key={name} className="notebook-student" aria-describedby={`${id}-hint`}>
                    <legend className="sr-only">{name}</legend>
                    <div className="notebook-student__identity">
                        <span className="notebook-avatar" aria-hidden="true">{Array.from(name)[0]}</span>
                        <div className="min-w-0">
                            <span dir={textDirectionAttribute(name)} className="notebook-student__name">{name}</span>
                            {!Object.hasOwn(conditions, name) && <span className="notebook-student__pending">{t(`${copy}.pending`)}</span>}
                        </div>
                    </div>
                    <div className="notebook-segments">
                        {choices.map(({ value: condition, labelKey, Icon }) => {
                            const selected = Object.hasOwn(conditions, name) && conditions[name] === condition;
                            return <label key={condition} className="notebook-segment" data-condition={condition} data-selected={selected ? 'true' : undefined}>
                                <input type="radio" name={`${id}-${names.indexOf(name)}`} value={condition} checked={selected}
                                    onChange={() => onChange({ ...conditions, [name]: condition })} className="sr-only"/>
                                <span><Icon className="h-4 w-4 shrink-0" aria-hidden="true"/>{t(labelKey)}</span>
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
