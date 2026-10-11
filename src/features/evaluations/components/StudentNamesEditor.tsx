import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Info, RotateCcw, Trash2, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import type { ClassRoster, HomeworkOutcome, NotebookCondition, OralOutcome } from '@/types';
import { retainNotebookConditions, notebookConditionReport } from '@/domain/evaluations/notebookConditions';
import { countHomeworkOutcomes, retainHomeworkOutcomes } from '@/domain/evaluations/homeworkSubmissions';
import { namesWithRoster, normalizeStudentNames, parseStudentNames, retainOralOutcomes, retainOralGrades } from '@/domain/evaluations/studentRoster';
import { StudentReviewList, NOTEBOOK_REVIEW_CHOICES, ORAL_REVIEW_CHOICES, HOMEWORK_REVIEW_CHOICES } from './NotebookConditionList';
import './notebookTracking.css';

/*
 * Une seule liste d'élèves pour deux usages : les ABSENTS d'un devoir surveillé
 * et les ÉLÈVES CONTRÔLÉS d'une activité (contrôle des cahiers). Le mécanisme est
 * identique — on colle une liste, on ajoute un nom, on retire une puce — seul
 * l'habillage change, donc les deux écrans ne peuvent pas diverger.
 */

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
  trackOral?: boolean;
  initialOralOutcomes?: Record<string, OralOutcome>;
  /** Note /20 par élève, saisie depuis la modale élèves (oral, colle). */
  initialOralGrades?: Record<string, string>;
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
  initialOralGrades,
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
  const [names, setNames] = useState<string[]>(() => trackReview ? namesWithRoster(initialNames, roster) : [...new Set(initialNames)]);
  const [draft, setDraft] = useState('');
  const [conditions, setConditions] = useState<Record<string, ReviewCondition>>(() => trackOral
    ? retainOralOutcomes(initialNames, initialOralOutcomes)
    : trackHomework ? retainHomeworkOutcomes(initialNames, initialHomeworkOutcomes)
    : retainNotebookConditions(initialNames, initialNotebookConditions));
  const [grades, setGrades] = useState<Record<string, string>>(() => trackOral
    ? retainOralGrades(initialNames, initialOralGrades) : {});
  const [removed, setRemoved] = useState<{ names: string[]; conditions: Record<string, ReviewCondition> } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const toggleAdd = () => {
    setIsAddOpen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => addInputRef.current?.focus(), 60);
      }
      return next;
    });
  };

  const commitDraft = (raw: string) => {
    let next: string[];
    try { next = normalizeStudentNames([...names, ...parseStudentNames(raw)]); }
    catch {
      toast.error(t('evaluations.students.limit'));
      return null;
    }
    setNames(next);
    setDraft('');
    if (next.length > names.length) setRemoved(null);
    return next;
  };

  const removeName = (name: string) => {
    if (trackReview) setRemoved({ names, conditions });
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
        ? [t(`${reviewPrefix}.title`), reportContext, ...names.map(name => `- ${name} : ${t(`${reviewPrefix}.${Object.hasOwn(conditions, name) ? conditions[name] : 'pending'}`)}`)].filter(Boolean).join('\n')
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
    setNames(removed.names);
    setConditions({ ...conditions, ...restoredConditions });
    setRemoved(null);
  };

  if (trackReview) {
    const reviewed = Object.keys(retainConditions(names, conditions)).length;
    const homeworkSummary = countHomeworkOutcomes(names, retainHomeworkOutcomes(names, conditions as Record<string, HomeworkOutcome>));
    return <StudentReviewList<ReviewCondition> names={names} conditions={conditions} onChange={setConditions} onRemove={removeName}
      mode={trackOral ? 'oral' : trackHomework ? 'homework' : 'notebook'}
      choices={trackOral ? ORAL_REVIEW_CHOICES : trackHomework ? HOMEWORK_REVIEW_CHOICES : NOTEBOOK_REVIEW_CHOICES}
      grades={trackOral ? grades : undefined}
      onGradesChange={trackOral ? setGrades : undefined}
      isAddOpen={isAddOpen}
      toolbarAction={
        <button
          type="button"
          onClick={toggleAdd}
          className="btn-toolbar-add btn-quick-add"
          aria-label={t(copy.add)}
          title={t(copy.add)}
          aria-expanded={isAddOpen}
        >
          <span className="btn-add-glyph" aria-hidden="true">+</span>
          <span className="sr-only">{t(copy.add)}</span>
        </button>
      }
      inlineAddZone={
        <div className="student-search-bar__add-inline">
          <input
            ref={addInputRef}
            type="text"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (['Enter', ',', '،'].includes(event.key) && !event.nativeEvent.isComposing) {
                event.preventDefault();
                commitDraft(draft);
              } else if (event.key === 'Escape') {
                event.stopPropagation();
                if (draft) setDraft('');
                else setIsAddOpen(false);
              }
            }}
            onPaste={event => {
              const text = event.clipboardData.getData('text');
              if (/[،؛,;\n]/.test(text)) {
                event.preventDefault();
                commitDraft(text);
              }
            }}
            placeholder={t('evaluations.notebook.addPlaceholder')}
            aria-label={t(copy.placeholder)}
            autoFocus
          />
          <button
            type="button"
            onClick={() => commitDraft(draft)}
            aria-label={t(copy.add)}
            disabled={!draft.trim()}
            className="btn-add-inline btn-add"
            title={t(copy.add)}
          >
            <span className="btn-add-glyph" aria-hidden="true">+</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(false)}
            className="btn-close-inline"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X className="h-4 w-4" aria-hidden="true"/>
          </button>
        </div>
      }
      entry={<>
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
        {names.length === 0 && (
          <div className="input-row notebook-entry">
            <input
              ref={addInputRef}
              type="text"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (['Enter', ',', '،'].includes(event.key) && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  commitDraft(draft);
                } else if (event.key === 'Escape' && draft) {
                  event.stopPropagation();
                  setDraft('');
                }
              }}
              onPaste={event => {
                const text = event.clipboardData.getData('text');
                if (/[،؛,;\n]/.test(text)) {
                  event.preventDefault();
                  commitDraft(text);
                }
              }}
              placeholder={t('evaluations.notebook.addPlaceholder')}
              aria-label={t(copy.placeholder)}
              autoFocus
            />
            <button
              type="button"
              onClick={() => commitDraft(draft)}
              aria-label={t(copy.add)}
              disabled={!draft.trim()}
              className="notebook-primary notebook-entry__add btn-add"
              title={t(copy.add)}
            >
              <span className="btn-add-glyph" aria-hidden="true">+</span>
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
          <div className="notebook-footer__tools footer-actions-left">
            <button type="button" onClick={() => { setRemoved({ names, conditions }); setNames([]); setConditions({}); }} disabled={!names.length} aria-label={t(copy.clear)} title={t(copy.clear)} className="action-link danger notebook-text-action notebook-text-action--danger">
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span>{t(copy.clear)}</span>
            </button>
            <button type="button" onClick={handleCopy} disabled={!names.length} aria-label={t('evaluations.notebook.copyReport')} title={t('evaluations.notebook.copyReport')} className="action-link neutral notebook-text-action">
              {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true"/> : <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/>}
              <span>{copied ? t(copy.copied) : t('evaluations.notebook.copyReport')}</span>
            </button>
            <button type="button" onClick={() => setConditions({})} disabled={!reviewed} className="btn-icon-only notebook-text-action" aria-label={t('evaluations.notebook.reset')} title={t('evaluations.notebook.reset')}>
              <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
            </button>
          </div>
          <div className="notebook-footer__commit footer-actions-right">
            <button type="button" className="btn-cancel notebook-text-action notebook-footer__cancel" onClick={onCancel}>{t('common.cancel')}</button>
            <button type="button" className="btn-save notebook-primary" onClick={() => { const next = commitDraft(draft); if (next) onSave(next,
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
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? t(copy.copied) : t(copy.copy)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setNames([]); setConditions({}); }}
                  className="action-link danger"
                  title={t(copy.clear)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t(copy.clear)}</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] max-h-36 overflow-y-auto">
              {names.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-dark)] shadow-2xs"
                >
                  {name}
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

        <div className="input-row notebook-entry">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
                e.preventDefault();
                commitDraft(draft);
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (/[،؛,;\n]/.test(text)) {
                e.preventDefault();
                commitDraft(text);
              }
            }}
            onBlur={() => commitDraft(draft)}
            placeholder={t(copy.placeholder)}
            aria-label={t(copy.placeholder)}
          />
          <button
            type="button"
            onClick={() => commitDraft(draft)}
            className="btn-add notebook-primary notebook-entry__add"
            aria-label={t(copy.add)}
            disabled={!draft.trim()}
            title={t(copy.add)}
          >
            <span className="btn-add-glyph" aria-hidden="true">+</span>
          </button>
        </div>

        <details className="text-xs leading-relaxed text-[var(--text-muted)]">
          <summary className="min-h-11 cursor-pointer rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
            {t(copy.hint)}
          </summary>
          <p className="flex items-start gap-2 pb-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t(copy.directive)}</span>
          </p>
        </details>

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
              const next = commitDraft(draft);
              if (next) onSave(next);
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
