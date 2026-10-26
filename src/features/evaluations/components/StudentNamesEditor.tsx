import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Check, Copy, RotateCcw } from '@/components/ui/icons';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import type { ClassRoster, HomeworkOutcome, NotebookCondition, OralOutcome } from '@/types';
import { retainNotebookConditions, notebookConditionReport } from '@/domain/evaluations/notebookConditions';
import { countHomeworkOutcomes, retainHomeworkOutcomes } from '@/domain/evaluations/homeworkSubmissions';
import { namesWithRoster, normalizeStudentNames, studentSearchKey, retainOralOutcomes, retainOralGrades } from '@/domain/evaluations/studentRoster';
import { StudentReviewList, NOTEBOOK_REVIEW_CHOICES, ORAL_REVIEW_CHOICES, HOMEWORK_REVIEW_CHOICES } from './NotebookConditionList';
import './notebookTracking.css';
import './oralTracking.css';

/** Session selections and observations use the shared roster; names are edited in class settings. */

type StudentNamesVariant = 'absent' | 'checked';

interface VariantCopy {
  countOne: string;
  countMany: string;
  copy: string;
  copied: string;
  clear: string;
  placeholder: string;
  add: string;
  remove: string;
  hint: string;
  directive: string;
}

const VARIANT_COPY: Record<StudentNamesVariant, VariantCopy> = {
  absent: {
    countOne: 'evaluations.absentOne',
    countMany: 'evaluations.absentMany',
    copy: 'evaluations.copyAbsentees',
    copied: 'evaluations.absenteesCopied',
    clear: 'evaluations.clearAllAbsentees',
    placeholder: 'evaluations.studentPlaceholder',
    add: 'evaluations.addStudentAria',
    remove: 'evaluations.removeStudentAria',
    hint: 'evaluations.pasteHint',
    directive: 'evaluations.absenceNoteDirective',
  },
  checked: {
    countOne: 'evaluations.students.checkedOne',
    countMany: 'evaluations.students.checkedMany',
    copy: 'evaluations.students.copy',
    copied: 'evaluations.students.copied',
    clear: 'evaluations.students.clear',
    placeholder: 'evaluations.students.placeholder',
    add: 'evaluations.students.add',
    remove: 'evaluations.students.remove',
    hint: 'evaluations.students.hint',
    directive: 'evaluations.students.directive',
  },
};

interface StudentNamesEditorProps {
  initialNames: string[];
  updatedAt?: string;
  onCancel: () => void;
  onSave: (names: string[], conditions?: Record<string, NotebookCondition>, oralOutcomes?: Record<string, OralOutcome>, homeworkOutcomes?: Record<string, HomeworkOutcome>, oralGrades?: Record<string, string>) => void;
  trackNotebookCondition?: boolean;
  initialNotebookConditions?: Record<string, NotebookCondition>;
  reportContext?: string;
  roster?: ClassRoster;
  onManageStudents: () => void;
  trackOral?: boolean;
  initialOralOutcomes?: Record<string, OralOutcome>;
  /** Note /20 par élève, saisie depuis la modale élèves (oral, colle). */
  initialOralGrades?: Record<string, string>;
  /** Titre du rapport copié (« Suivi de la colle », « Suivi de l'oral »…). */
  reportTitle?: string;
  /** Saisie de la note /20 sous chaque élève (suivi par niveaux). Désactivée : les notes déjà saisies sont conservées. */
  trackGrades?: boolean;
  /** Remise d'un devoir : rendu ou non rendu, un état par élève. */
  trackHomework?: boolean;
  initialHomeworkOutcomes?: Record<string, HomeworkOutcome>;
  /** Habillage : absents d'un devoir, ou élèves consignés sur une activité. */
  variant?: StudentNamesVariant;
}

export const StudentNamesEditor: React.FC<StudentNamesEditorProps> = ({
  initialNames,
  onCancel,
  onSave,
  variant = 'absent',
  trackNotebookCondition = false,
  initialNotebookConditions,
  reportContext,
  roster,
  onManageStudents,
  initialOralGrades,
  reportTitle,
  trackGrades = true,
  trackOral = false,
  initialOralOutcomes,
  trackHomework = false,
  initialHomeworkOutcomes,
}) => {
  const { t, locale } = useLocale();
  const copy = VARIANT_COPY[variant];
  const trackReview = trackNotebookCondition || trackOral || trackHomework;
  type ReviewCondition = NotebookCondition | OralOutcome | HomeworkOutcome;
  const retainConditions = (next: string[], values: Record<string, ReviewCondition>) => trackOral
    ? retainOralOutcomes(next, values as Record<string, OralOutcome>)
    : trackHomework
      ? retainHomeworkOutcomes(next, values as Record<string, HomeworkOutcome>)
      : retainNotebookConditions(next, values as Record<string, NotebookCondition>);
  const [names, setNames] = useState<string[]>(() => variant === 'checked' ? namesWithRoster(initialNames, roster) : normalizeStudentNames(initialNames));
  const receivedRoster = useRef(new Set(roster?.names.map(name => name.toLowerCase()) ?? []));
  useEffect(() => {
    const added = roster?.names.filter(name => !receivedRoster.current.has(name.toLowerCase())) ?? [];
    receivedRoster.current = new Set(roster?.names.map(name => name.toLowerCase()) ?? []);
    // A publication received while editing adds newcomers without replacing the draft or its observations.
    if (variant === 'checked' && roster && added.length) {
      setNames(current => namesWithRoster(current, { ...roster, names: added }));
    }
  }, [roster, variant]);
  const [query, setQuery] = useState('');
  const [conditions, setConditions] = useState<Record<string, ReviewCondition>>(() => trackOral
    ? retainOralOutcomes(initialNames, initialOralOutcomes)
    : trackHomework ? retainHomeworkOutcomes(initialNames, initialHomeworkOutcomes)
    : retainNotebookConditions(initialNames, initialNotebookConditions));
  const [grades, setGrades] = useState<Record<string, string>>(() => trackOral
    ? retainOralGrades(initialNames, initialOralGrades) : {});
  const [removed, setRemoved] = useState<{ names: string[]; conditions: Record<string, ReviewCondition>; grades: Record<string, string> } | null>(null);
  const [copied, setCopied] = useState(false);

  const manageStudents = <button type="button" onClick={onManageStudents}
    className="min-h-11 rounded-lg px-3 text-start text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
    {t('classRoster.manage')}
  </button>;

  const removeName = (name: string) => {
    if (trackReview) setRemoved({ names, conditions, grades });
    const next = names.filter(value => value !== name);
    setNames(next);
    setConditions(previous => retainConditions(next, previous));
    setGrades(previous => retainOralGrades(next, previous));
  };

  const handleCopy = async () => {
    if (names.length === 0) return;
    try {
      const reviewPrefix = trackOral ? 'evaluations.oral' : 'evaluations.homework';
      const report = trackOral || trackHomework
        ? [reportTitle ?? t(`${reviewPrefix}.title`), reportContext, ...names.map(name => {
            const outcome = t(`${reviewPrefix}.${Object.hasOwn(conditions, name) ? conditions[name] : 'pending'}`);
            // La note /20 (oral, colle) fait partie du constat : elle part avec le rapport.
            const grade = trackOral && trackGrades ? grades[name]?.trim() : '';
            return `- ${name}${t('evaluations.reportSeparator')}${outcome}${grade ? ` · ${grade}/20` : ''}`;
          })].filter(Boolean).join('\n')
        : trackNotebookCondition ? notebookConditionReport(names, retainNotebookConditions(names, conditions as Record<string, NotebookCondition>),
        condition => t(`evaluations.notebook.${condition}`), t('evaluations.notebook.title'), reportContext) : names.join('\n');
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t(trackReview ? 'evaluations.notebook.reportCopied' : copy.copied));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const restoreRemoved = () => {
    if (!removed) return;
    const restoredConditions = retainConditions(removed.names.filter(name => !names.includes(name)), removed.conditions);
    const restoredNames = normalizeStudentNames([...names, ...removed.names]);
    setNames(restoredNames);
    setConditions({ ...conditions, ...restoredConditions });
    setGrades({ ...retainOralGrades(removed.names.filter(name => !names.includes(name)), removed.grades), ...grades });
    setRemoved(null);
  };

  if (trackReview) {
    const reviewed = Object.keys(retainConditions(names, conditions)).length;
    const homeworkSummary = countHomeworkOutcomes(names, retainHomeworkOutcomes(names, conditions as Record<string, HomeworkOutcome>));
    return <StudentReviewList<ReviewCondition> names={names} conditions={conditions} onChange={setConditions} onRemove={removeName}
      mode={trackOral ? 'oral' : trackHomework ? 'homework' : 'notebook'}
      choices={trackOral ? ORAL_REVIEW_CHOICES : trackHomework ? HOMEWORK_REVIEW_CHOICES : NOTEBOOK_REVIEW_CHOICES}
      grades={trackOral && trackGrades ? grades : undefined}
      onGradesChange={trackOral && trackGrades ? setGrades : undefined}
      addField={manageStudents}
      entry={<>
        {roster && <p className="student-roster-source">{t('evaluations.students.rosterSource', { count: numberFormat(locale).format(roster.names.length) })}</p>}
        {roster?.names.some(name => !names.includes(name)) && <div className="notebook-filter-info"><button type="button" onClick={() => { setNames(namesWithRoster(names, roster)); setRemoved(null); }}>{t('evaluations.students.restoreRoster')}</button></div>}
        {/* Le professeur constate les exceptions : « tout rendu » en un geste, puis on décoche. */}
        {trackHomework && names.length > 0 && (
          <div className="status-summary-bar notebook-filter-info">
            <div className="stats-progress-group">
              <span className="stats-count">
                {t('evaluations.homework.summary', {
                  given: numberFormat(locale).format(homeworkSummary.given),
                  total: numberFormat(locale).format(names.length),
                })}
              </span>
              <div className="mini-progress-track" role="progressbar" aria-valuenow={homeworkSummary.given} aria-valuemin={0} aria-valuemax={names.length}>
                <div
                  className="mini-progress-fill"
                  style={{ width: `${names.length > 0 ? (homeworkSummary.given / names.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-mark-all"
              onClick={() => setConditions(current => ({ ...current, ...Object.fromEntries(names.map(name => [name, 'given' as HomeworkOutcome])) }))}
            >
              {t('evaluations.homework.allGiven')}
            </button>
          </div>
        )}
      </>}
      footer={<>
        {removed && <div className="notebook-undo" role="status">
          <span>{t('evaluations.notebook.removed')}</span>
          <button type="button" onClick={restoreRemoved}>{t('toolbar.undo')}</button>
        </div>}
        <div className="notebook-footer modal-footer">
          <details className="notebook-footer__auxiliary">
          <summary>{t('selection.moreActions')}</summary>
          <div className="notebook-footer__tools footer-actions-left">
            <AnimatedTrashButton
              label={t(copy.clear)}
              variant="ghost"
              size="sm"
              onClick={() => { setRemoved({ names, conditions, grades }); setNames([]); setConditions({}); setGrades({}); }}
              disabled={!names.length}
              aria-label={t(copy.clear)}
              title={t(copy.clear)}
              className="action-link danger notebook-text-action notebook-text-action--danger"
            />
            <button type="button" onClick={handleCopy} disabled={!names.length} title={t('evaluations.notebook.copyReport')} className="action-link neutral notebook-text-action" data-copied={copied ? 'true' : undefined}>
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              <span>{copied ? t(copy.copied) : t('evaluations.notebook.copyReport')}</span>
            </button>
            <button type="button" onClick={() => setConditions({})} disabled={!reviewed} className="action-link neutral notebook-text-action">
              <RotateCcw size={14} aria-hidden="true" />
              <span>{t('evaluations.notebook.reset')}</span>
            </button>
          </div>
          </details>
          <div className="notebook-footer__commit footer-actions-right">
            <button type="button" className="btn-cancel notebook-text-action notebook-footer__cancel" onClick={onCancel}>{t('common.cancel')}</button>
            <button type="button" className="btn-save notebook-primary" onClick={() => { const next = names; onSave(next,
              trackOral || trackHomework ? undefined : retainNotebookConditions(next, conditions as Record<string, NotebookCondition>),
              trackOral ? retainOralOutcomes(next, conditions as Record<string, OralOutcome>) : undefined,
              trackHomework ? retainHomeworkOutcomes(next, conditions as Record<string, HomeworkOutcome>) : undefined,
              trackOral ? retainOralGrades(next, grades) : undefined);
            }}>{t('common.save')}</button>
          </div>
        </div>
      </>}/>;
  }

  return (
    <div className="notebook-tracker-standalone space-y-4">
      <div className="space-y-3.5">
        {names.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {t(names.length === 1 ? copy.countOne : copy.countMany, {
                  count: numberFormat(locale).format(names.length),
                })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="action-link neutral"
                  title={t(copy.copy)}
                  data-copied={copied ? 'true' : undefined}
                >
                  {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  <span>{copied ? t(copy.copied) : t(copy.copy)}</span>
                </button>
                <AnimatedTrashButton
                  label={t(copy.clear)}
                  variant="ghost"
                  size="sm"
                  onClick={() => { setNames([]); setConditions({}); }}
                  className="action-link danger"
                  title={t(copy.clear)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] max-h-36 overflow-y-auto">
              {names.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-dark)] shadow-2xs"
                >
                  <bdi>{name}</bdi>
                  <button
                    type="button"
                    onClick={() => removeName(name)}
                    className="rounded-full text-[var(--text-muted)] hover:text-[var(--danger-soft)] transition-colors cursor-pointer"
                    aria-label={t(copy.remove, { name })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t('classRoster.selection')}</p>
          {manageStudents}
        </div>
        {!!roster?.names.length ? <div className="space-y-2">
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={t('evaluations.notebook.search')}
            placeholder={t('evaluations.notebook.search')} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base" />
          <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
            {roster.names.filter(name => studentSearchKey(name).includes(studentSearchKey(query))).map(name => <label key={name}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted">
              <input type="checkbox" checked={names.includes(name)} onChange={event => {
                if (event.target.checked) setNames(current => namesWithRoster(current, { ...roster, names: [name] }));
                else removeName(name);
              }} className="h-4 w-4 accent-primary" />
              <bdi className="min-w-0 break-words">{name}</bdi>
            </label>)}
          </div>
        </div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t('classRoster.empty')}</p>}

        <div className="modal-footer pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(names);
            }}
            className="btn-save truncate"
          >
            {names.length === 0
              ? t('common.save')
              : locale === 'ar'
                ? (names.length === 1 ? 'حفظ اسم واحد' : names.length === 2 ? 'حفظ اسمين' : names.length <= 10 ? `حفظ ${numberFormat(locale).format(names.length)} أسماء` : `حفظ ${numberFormat(locale).format(names.length)} اسماً`)
                : locale === 'fr'
                  ? (names.length === 1 ? 'Enregistrer 1 nom' : `Enregistrer ${names.length} noms`)
                  : (names.length === 1 ? 'Save 1 name' : `Save ${names.length} names`)}
          </button>
        </div>
      </div>
    </div>
  );
};
