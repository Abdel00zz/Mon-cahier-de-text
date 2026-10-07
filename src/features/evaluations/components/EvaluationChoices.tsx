import React, { useId } from 'react';
import { CircleCheck } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface Choice<T extends string> {
  value: T;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
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
        {options.map(({ value: option, label: title, Icon }) => (
          <label key={option} className="relative min-w-0 cursor-pointer">
            <input className="peer sr-only" type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
            <span className={cn(
              'evaluation-choice h-full gap-2 rounded-xl border border-border bg-background p-3 text-muted-foreground peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
              compact ? 'flex min-h-14 items-center' : 'grid min-h-24 grid-cols-[1fr_auto] content-start',
            )}>
              <Icon className="size-6 shrink-0" />
              <span className={cn('min-w-0 flex-1 break-words text-sm font-medium leading-snug', !compact && 'col-span-2 row-start-2')}>{title}</span>
              <CircleCheck className={cn('size-4 shrink-0 text-primary', !compact && 'col-start-2 row-start-1 self-center', value !== option && 'invisible')} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
