import { memo, useCallback, useDeferredValue, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { CircleAlert, CircleCheck, CircleHelp, CircleMinus, CircleX } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { NOTEBOOK_CONDITIONS } from '@/domain/evaluations/notebookConditions';
import { HOMEWORK_OUTCOMES } from '@/domain/evaluations/homeworkSubmissions';
import { studentSearchKey } from '@/domain/evaluations/studentRoster';
import type { HomeworkOutcome, OralOutcome } from '@/types';
import { StudentSearchBar } from './StudentSearchBar';
import { ChoiceSelect, type ChoiceOption } from './ChoiceSelect';

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

interface StudentRowProps<T extends string> {
    name: string;
    value: T | null;
    options: ChoiceOption<T>[];
    pendingLabel: string;
    hintId: string;
    removeLabel: string;
    onPick: (name: string, next: T | null) => void;
    onRemove: (name: string) => void;
    /** Note /20 (oral, colle) : absente quand le mode n'en demande pas. */
    grade?: string;
    onGrade?: (name: string, grade: string) => void;
    gradeLabel?: string;
    gradePlaceholder?: string;
}

/* Une fiche d'élève. Mémoïsée : choisir un retour pour un élève ne refait que SA fiche, pas toute la liste. */
function StudentRowView<T extends string>({ name, value, options, pendingLabel, hintId, removeLabel, onPick, onRemove, grade, onGrade, gradeLabel, gradePlaceholder }: StudentRowProps<T>) {
    return <fieldset className="notebook-student student-card" aria-describedby={hintId}>
        <legend className="sr-only">{name}</legend>
        <div className="card-main-line">
            <div className="notebook-student__identity student-text-group">
                <span dir={textDirectionAttribute(name)} className="notebook-student__name student-name">{name}</span>
            </div>
            <div className="notebook-choice">
                <ChoiceSelect<T>
                    value={value}
                    options={options}
                    placeholder={pendingLabel}
                    clearLabel={pendingLabel}
                    ariaLabel={name}
                    onChange={next => onPick(name, next)}
                />
            </div>
            <button type="button" onClick={() => onRemove(name)} aria-label={removeLabel} className="notebook-student__remove btn-delete-row">
                <X className="h-4 w-4" aria-hidden="true"/>
            </button>
        </div>
        {onGrade && (
            <div className="card-sub-line notebook-student__sub-line">
                <label className="grade-chip notebook-grade">
                    <span className="sr-only">{gradeLabel}</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={grade ?? ''}
                        onChange={event => onGrade(name, event.target.value)}
                        placeholder={gradePlaceholder}
                        aria-label={gradeLabel}
                        className="grade-chip__input notebook-grade__input"
                        maxLength={5}
                    />
                </label>
            </div>
        )}
    </fieldset>;
}
const StudentRow = memo(StudentRowView) as typeof StudentRowView;
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
    // Les choix de retour (acquis, remis, état du cahier…), prêts pour la liste déroulante de chaque élève.
    const pendingLabel = t(`${copy}.pending`);
    const options = useMemo<ChoiceOption<T>[]>(
        () => choices.map(choice => ({ value: choice.value, label: t(choice.labelKey), icon: CHOICE_ICONS[choice.value], tone: choice.value })),
        [choices, t]);
    const filterOptions = useMemo<ChoiceOption<T | 'pending'>[]>(
        () => [{ value: 'pending', label: t(`${copy}.pending`), icon: CircleHelp, tone: 'none' }, ...options],
        [options, t, copy]);

    // Gestionnaires STABLES : les fiches mémoïsées ne se refont que si leur propre état change.
    const latest = useRef({ conditions, choices, onChange, onRemove, grades, onGradesChange });
    latest.current = { conditions, choices, onChange, onRemove, grades, onGradesChange };
    const pick = useCallback((name: string, next: T | null) => {
        const { conditions: current, onChange: change } = latest.current;
        if (next !== null) { change({ ...current, [name]: next }); return; }
        const { [name]: _removed, ...rest } = current;
        change(rest as Record<string, T>);
    }, []);
    const remove = useCallback((name: string) => latest.current.onRemove(name), []);
    const grade = useCallback((name: string, value: string) => latest.current.onGradesChange?.({ ...(latest.current.grades ?? {}), [name]: value }), []);
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
                                <ChoiceSelect<T | 'pending'>
                                    variant="filter"
                                    value={filter}
                                    options={filterOptions}
                                    onChange={setFilter}
                                    placeholder={t('evaluations.notebook.showAll')}
                                    clearLabel={t('evaluations.notebook.showAll')}
                                    ariaLabel={t(`${copy}.filterLabel`)}
                                />
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
                {shownStudents.map(({ name }) => <StudentRow<T>
                    key={name}
                    name={name}
                    value={Object.hasOwn(conditions, name) && choices.some(choice => choice.value === conditions[name]) ? conditions[name] : null}
                    options={options}
                    pendingLabel={pendingLabel}
                    hintId={`${id}-hint`}
                    removeLabel={t('evaluations.students.remove', { name })}
                    onPick={pick}
                    onRemove={remove}
                    grade={mode === 'oral' && onGradesChange ? grades?.[name] : undefined}
                    onGrade={mode === 'oral' && onGradesChange ? grade : undefined}
                    gradeLabel={mode === 'oral' && onGradesChange ? t('evaluations.oral.gradeLabel', { name }) : undefined}
                    gradePlaceholder={mode === 'oral' && onGradesChange ? t('evaluations.oral.gradePlaceholder') : undefined}
                />)}
            </div>
        </div>
        {footer && <div className="notebook-tracker__footer">{footer}</div>}
    </div>;
}
