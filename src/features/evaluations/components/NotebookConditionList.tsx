import { useDeferredValue, useId, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { CircleAlert, CircleCheck, CircleMinus, CircleX } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { NOTEBOOK_CONDITIONS } from '@/domain/evaluations/notebookConditions';
import { HOMEWORK_OUTCOMES } from '@/domain/evaluations/homeworkSubmissions';
import { studentSearchKey } from '@/domain/evaluations/studentRoster';
import type { HomeworkOutcome, OralOutcome } from '@/types';
import { StudentSearchBar } from './StudentSearchBar';

/** Un retour par élève : un mot, un petit pictogramme neutre et une teinte à la sélection. */
interface ReviewChoice<T extends string> { value: T; labelKey: string }
const CHOICE_ICONS: Record<string, typeof CircleCheck> = {
    good: CircleCheck, mastered: CircleCheck, given: CircleCheck,
    average: CircleMinus, developing: CircleMinus,
    needs_work: CircleAlert, needs_support: CircleAlert,
    missing: CircleX,
};
export const NOTEBOOK_REVIEW_CHOICES = NOTEBOOK_CONDITIONS.map(value => ({ value, labelKey: `evaluations.notebook.${value}` }));
export const ORAL_REVIEW_CHOICES: ReviewChoice<OralOutcome>[] = [
    { value: 'mastered', labelKey: 'evaluations.oral.mastered' },
    { value: 'developing', labelKey: 'evaluations.oral.developing' },
    { value: 'needs_support', labelKey: 'evaluations.oral.needs_support' },
];
/** Deux états seulement : ce que l'enseignant constate. L'absence se consigne à part. */
export const HOMEWORK_REVIEW_CHOICES: ReviewChoice<HomeworkOutcome>[] =
    HOMEWORK_OUTCOMES.map(value => ({ value, labelKey: `evaluations.homework.${value}` }));

export function StudentReviewList<T extends string>({ names, conditions, onChange, onRemove, entry, footer, choices, mode = 'notebook', grades, onGradesChange, toolbarAction, inlineAddZone, isAddOpen }: {
    names: string[];
    conditions: Record<string, T>;
    onChange: (conditions: Record<string, T>) => void;
    onRemove: (name: string) => void;
    entry?: ReactNode;
    footer?: ReactNode;
    choices: readonly ReviewChoice<T>[];
    mode?: 'notebook' | 'oral' | 'homework';
    /** Note /20 par élève (oral, colle) : saisie libre, jamais bloquante. */
    grades?: Record<string, string>;
    onGradesChange?: (grades: Record<string, string>) => void;
    toolbarAction?: ReactNode;
    inlineAddZone?: ReactNode;
    isAddOpen?: boolean;
}) {
    const { t, locale } = useLocale();
    const id = useId();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<T | 'pending' | null>(null);
    const number = numberFormat(locale);
    const copy = `evaluations.${mode}`;
    const reviewed = names.filter(name => Object.hasOwn(conditions, name) && choices.some(choice => choice.value === conditions[name])).length;
    const searchIndex = useMemo(() => names.map((name, index) => ({ name, index, key: studentSearchKey(name) })), [names]);
    const search = useDeferredValue(studentSearchKey(query));
    const tokens = useMemo(() => search.split(' ').filter(Boolean), [search]);
    const shownStudents = useMemo(() => searchIndex.filter(({ name, key }) => tokens.every(token => key.includes(token))
        && (!filter || (Object.hasOwn(conditions, name) ? conditions[name] : 'pending') === filter)), [searchIndex, tokens, filter, conditions]);
    const shownNames = shownStudents.map(student => student.name);

    return <div className="notebook-tracker" data-review-mode={mode} data-notebook-check-list={mode === 'notebook' ? '' : undefined}>
        <div className="notebook-tracker__scroll modern-scrollbar" data-swipe-scroll-region>
            <p className="sr-only" id={`${id}-hint`}>{t(`${copy}.hint`)}</p>

            {names.length === 0 ? (
                <>
                    {entry}
                    <p className="notebook-empty empty-state-text">{t(`${copy}.empty`)}</p>
                </>
            ) : (
                <>
                    <StudentSearchBar query={query} onQueryChange={setQuery} count={shownNames.length} isCompact={isAddOpen}>
                        {isAddOpen ? inlineAddZone : (
                            <div className="student-toolbar-actions">
                                <div className="filter-dropdown">
                                    <span id="selected-filter">
                                        {filter ? (filter === 'pending' ? t(`${copy}.pending`) : choices.find(c => c.value === filter) ? t(choices.find(c => c.value === filter)!.labelKey) : t('evaluations.notebook.showAll')) : t('evaluations.notebook.showAll')}
                                    </span>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                    <select value={filter ?? ''} onChange={event => setFilter(event.target.value ? event.target.value as T | 'pending' : null)} aria-label={t(`${copy}.filterLabel`)}>
                                        <option value="">{t('evaluations.notebook.showAll')}</option>
                                        <option value="pending">{t(`${copy}.pending`)}</option>
                                        {choices.map(choice => <option key={choice.value} value={choice.value}>{t(choice.labelKey)}</option>)}
                                    </select>
                                </div>
                                {toolbarAction}
                            </div>
                        )}
                    </StudentSearchBar>
                    {entry}
                    {(filter || query) && <div className="notebook-filter-info">
                        <span>{filter ? t(`${copy}.${filter}`) : t('evaluations.notebook.search')} · {number.format(shownNames.length)}</span>
                        <button type="button" onClick={() => { setFilter(null); setQuery(''); }}>{t('evaluations.notebook.showAll')}</button>
                    </div>}
                    {shownNames.length === 0 && <p className="notebook-empty empty-state-text">{t(query ? 'evaluations.notebook.noResult' : filter === 'pending' && reviewed === names.length ? `${copy}.allReviewed` : 'evaluations.notebook.emptyFilter')}</p>}
                </>
            )}
            <div className="notebook-students students-list">
                {shownStudents.map(({ name, index }) => <fieldset key={name} className="notebook-student student-card" aria-describedby={`${id}-hint`}>
                    <legend className="sr-only">{name}</legend>
                    <div className="card-main-line">
                        <div className="notebook-student__identity student-text-group">
                            <span dir={textDirectionAttribute(name)} className="notebook-student__name student-name">{name}</span>
                            <span className="notebook-student__status student-status">
                                {Object.hasOwn(conditions, name) && choices.some(c => c.value === conditions[name]) ? (
                                    t(choices.find(c => c.value === conditions[name])!.labelKey)
                                ) : (
                                    <span className="notebook-student__pending">{t(`${copy}.pending`)}</span>
                                )}
                            </span>
                        </div>
                        <div className="notebook-segments eval-pill-group">
                            {choices.map(({ value: condition, labelKey }) => {
                                const selected = Object.hasOwn(conditions, name) && conditions[name] === condition;
                                const Icon = CHOICE_ICONS[condition];
                                return <label key={condition} className={`notebook-segment eval-pill ${selected ? `is-selected selected-${condition}` : ''}`} data-condition={condition} data-selected={selected ? 'true' : undefined}>
                                    <input type="radio" name={`${id}-${index}`} value={condition} checked={selected}
                                        onChange={() => onChange({ ...conditions, [name]: condition })} className="sr-only"/>
                                    <span>{Icon && <Icon size={16} aria-hidden="true" />}{t(labelKey)}</span>
                                </label>;
                            })}
                        </div>
                        <button type="button" onClick={() => onRemove(name)} aria-label={t('evaluations.students.remove', { name })} className="notebook-student__remove btn-delete-row">
                            <X className="h-4 w-4" aria-hidden="true"/>
                        </button>
                    </div>
                    {mode === 'oral' && onGradesChange && (
                        <div className="card-sub-line notebook-student__sub-line">
                            <label className="grade-chip notebook-grade">
                                <span className="sr-only">{t('evaluations.oral.gradeLabel', { name })}</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    dir="ltr"
                                    value={grades?.[name] ?? ''}
                                    onChange={event => onGradesChange({ ...(grades ?? {}), [name]: event.target.value })}
                                    placeholder={t('evaluations.oral.gradePlaceholder')}
                                    aria-label={t('evaluations.oral.gradeLabel', { name })}
                                    className="grade-chip__input notebook-grade__input"
                                    maxLength={5}
                                />
                            </label>
                        </div>
                    )}
                </fieldset>)}
            </div>
        </div>
        {footer && <div className="notebook-tracker__footer">{footer}</div>}
    </div>;
}
