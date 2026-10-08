import React, { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Info, Plus, Trash2, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import type { NotebookCondition } from '@/types';
import { retainNotebookConditions } from '@/domain/evaluations/notebookConditions';
import { NotebookConditionList } from './NotebookConditionList';

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
  onSave: (names: string[], conditions?: Record<string, NotebookCondition>) => void;
  trackNotebookCondition?: boolean;
  initialNotebookConditions?: Record<string, NotebookCondition>;
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
}) => {
  const { t, locale } = useLocale();
  const copy = VARIANT_COPY[variant];
  const [names, setNames] = useState<string[]>(() => [...new Set(initialNames)]);
  const [draft, setDraft] = useState('');
  const [conditions, setConditions] = useState(() => retainNotebookConditions(initialNames, initialNotebookConditions));

  const commitDraft = (raw: string) => {
    const parts = raw
      .split(/[،؛,;\n]+/)
      .map((p) => p.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (parts.length === 0) return names;
    const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
    const seen = new Set(names.map((n) => n.toLocaleLowerCase(localeCode)));
    const additions = parts.filter((p) => {
      const key = p.toLocaleLowerCase(localeCode);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (additions.some(name => name.length > 120) || names.length + additions.length > 200) {
      toast.error(t('evaluations.students.limit'));
      return null;
    }
    const next = [...names, ...additions];
    setNames(next);
    setDraft('');
    return next;
  };

  const removeName = (name: string) => {
    const next = names.filter(value => value !== name);
    setNames(next);
    setConditions(previous => retainNotebookConditions(next, previous));
  };

  const handleCopy = async () => {
    if (names.length === 0) return;
    try {
      await navigator.clipboard.writeText(names.join('\n'));
      toast.success(t(copy.copied));
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3.5">
        {names.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                {t(trackNotebookCondition ? 'evaluations.notebook.rosterCount' : names.length === 1 ? copy.countOne : copy.countMany, {
                  count: numberFormat(locale).format(names.length),
                })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  title={t(copy.copy)}
                >
                  <Copy className="h-3 w-3" />
                  <span>{t(copy.copy)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setNames([]); setConditions({}); }}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                  title={t(copy.clear)}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{t(copy.clear)}</span>
                </button>
              </div>
            </div>
            {trackNotebookCondition ? <NotebookConditionList names={names} conditions={conditions} onChange={setConditions} onRemove={removeName}/> : <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-muted/40 border border-border/70 max-h-36 overflow-y-auto">
              {names.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-background border border-border/80 px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeName(name)}
                    className="rounded-full text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    aria-label={t(copy.remove, { name })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>}
          </div>
        )}

        {trackNotebookCondition && names.length === 0 && <p className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">{t('evaluations.notebook.empty')}</p>}
        <div className="flex gap-2">
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
            className="h-11 min-w-0 flex-1 rounded-xl border border-border/80 bg-background px-3.5 text-xs text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => commitDraft(draft)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all cursor-pointer shadow-xs"
            aria-label={t(copy.add)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <details className="text-xs leading-relaxed text-muted-foreground">
          <summary className="min-h-11 cursor-pointer rounded-lg py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
            {t(copy.hint)}
          </summary>
          <p className="flex items-start gap-2 pb-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t(copy.directive)}</span>
          </p>
        </details>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-4 rounded-xl bg-muted text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = commitDraft(draft);
              if (next) onSave(next, trackNotebookCondition ? retainNotebookConditions(next, conditions) : undefined);
            }}
            className="h-11 px-5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:brightness-110 transition-all shadow-xs cursor-pointer"
          >
            {t('common.save')} {names.length > 0 ? `(${numberFormat(locale).format(names.length)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
