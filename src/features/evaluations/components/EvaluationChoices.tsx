import React, { useId } from 'react';
import { CircleCheck } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface Choice<T extends string> {
  value: T;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone?: 'blue' | 'violet' | 'pink' | 'amber' | 'green' | 'teal' | 'rose' | 'slate';
  description?: string;
}

interface EvaluationChoicesProps<T extends string> {
  label: string;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
}

export function EvaluationChoices<T extends string>({ label, value, options, onChange, compact = false }: EvaluationChoicesProps<T>) {
  const name = useId();
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2.5 text-sm font-semibold text-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map(({ value: option, label: title, Icon, tone = 'blue', description }) => (
          <label key={option} className="evaluation-tone relative min-w-0 cursor-pointer" data-tone={tone}>
            <input className="peer sr-only" type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
            <span className={cn(
              'evaluation-choice flex h-full items-center rounded-[20px] border border-border bg-card text-foreground shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
              compact ? 'min-h-16 gap-2 px-3 py-2' : 'min-h-40 flex-col justify-center gap-2 px-3 py-4 text-center',
            )}>
              <span className={cn('evaluation-icon', compact && 'evaluation-icon--compact')}><Icon /></span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-balance">{title}</span>
              {!compact && description && <span className="text-xs leading-relaxed text-muted-foreground text-balance">{description}</span>}
              <CircleCheck className={cn('evaluation-choice__check absolute end-2.5 top-2.5 size-4', value !== option && 'invisible')} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
