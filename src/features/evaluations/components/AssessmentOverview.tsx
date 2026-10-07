import React, { useMemo } from 'react';
import { CalendarCheck, CircleCheck, ListChecks } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AssessmentLink } from '@/domain/evaluations/assessmentSync';
import { summarizeAssessments, type AssessmentFilter, type AssessmentFamily } from '@/domain/evaluations/assessmentBoard';

const states = [
  { id: 'attention', Icon: ListChecks, tone: 'amber' },
  { id: 'upcoming', Icon: CalendarCheck, tone: 'blue' },
  { id: 'done', Icon: CircleCheck, tone: 'green' },
] as const;

interface Props {
  links: AssessmentLink[];
  filter: AssessmentFilter;
  family: AssessmentFamily;
  onFilterChange: (value: AssessmentFilter) => void;
  onFamilyChange: (value: AssessmentFamily) => void;
}

export function AssessmentOverview({ links, filter, family, onFilterChange, onFamilyChange }: Props) {
  const { t, locale } = useLocale();
  const counts = useMemo(() => summarizeAssessments(links), [links]);
  const number = useMemo(() => numberFormat(locale), [locale]);
  return (
    <section className="flex flex-col gap-4" aria-label={t('evaluations.board.title')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{t('evaluations.board.title')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('evaluations.board.hint')}</p>
        </div>
        <button type="button" onClick={() => { onFilterChange('all'); onFamilyChange('all'); onQueryChange(''); }} className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-medium text-primary hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          {t('evaluations.board.reset')}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {states.map(({ id, Icon, tone }) => (
          <button key={id} type="button" data-tone={tone} aria-pressed={filter === id} onClick={() => onFilterChange(filter === id ? 'all' : id)} className="evaluation-tone evaluation-board-summary grid min-w-0 grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-border bg-card p-3 text-start transition-colors duration-200 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <span className="evaluation-icon evaluation-icon--compact"><Icon /></span>
            <span className="text-xl font-semibold tabular-nums text-foreground">{number.format(counts[id])}</span>
            <span className="col-span-2 text-xs font-medium leading-snug text-muted-foreground">{t(`evaluations.board.${id}`)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t('evaluations.board.recorded', { done: number.format(counts.done), total: number.format(links.length) })}</p>
      <div role="group" aria-label={t('evaluations.manualType')} className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
        {(['all', 'controls', 'homework'] as const).map(value => (
          <button key={value} type="button" aria-pressed={family === value} onClick={() => onFamilyChange(value)} className={cn('min-h-11 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', family === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t(`evaluations.board.family.${value}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
