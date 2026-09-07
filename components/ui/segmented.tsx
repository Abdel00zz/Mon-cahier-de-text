import React from 'react';
import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: string; label: React.ReactNode; disabled?: boolean }>;
  className?: string;
  ariaLabel?: string;
}

/**
 * Contrôle segmenté générique (onglets / sélecteurs compacts), remplace les
 * implémentations dupliquées des modales (impression, transfert, dates…).
 * Le contrat typé est porté par `value`/`onChange` ; `options` restent des
 * libellés (évite l'élargissement de l'inférence générique sur les littéraux).
 */
export function Segmented<T extends string>({ value, onChange, options, className, ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('inline-flex items-center rounded-xl border border-border/70 bg-muted/60 p-1', className)}>
      {options.map(option => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value as T)}
            className={cn(
              'flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all duration-150 active:scale-[0.98]',
              active
                ? 'border border-border/80 bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              option.disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
