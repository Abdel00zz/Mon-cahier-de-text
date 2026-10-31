import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: string; label: React.ReactNode; disabled?: boolean }>;
  className?: string;
  ariaLabel?: string;
}

/**
 * Contrôle segmenté générique (onglets / sélecteurs compacts) avec auto-centrage fluide.
 */
export function Segmented<T extends string>({ value, onChange, options, className, ariaLabel }: SegmentedProps<T>) {
  const { isRtl } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const activeEl = activeRef.current;
    if (container && activeEl) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const diff = (activeRect.left + activeRect.width / 2) - (containerRect.left + containerRect.width / 2);
      if (Math.abs(diff) > 2) {
        try {
          container.scrollBy({ left: diff, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        } catch {
          activeEl.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }
  }, [value]);

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      dir={isRtl ? 'rtl' : 'ltr'}
      onValueChange={next => { if (next) onChange(next as T); }}
      ref={containerRef}
      aria-label={ariaLabel}
      className={cn('paper-segments inline-flex max-w-full items-center overflow-x-auto no-scrollbar rounded-xl border border-border/70 bg-muted/60 p-1', className)}
    >
      {options.map(option => {
        const active = value === option.value;
        return (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            ref={active ? activeRef : null}
            type="button"
            disabled={option.disabled}
            onFocus={() => { if (!active && !option.disabled) onChange(option.value as T); }}
            className={cn(
              'flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none active:scale-[0.98] cursor-pointer',
              active
                ? 'border border-border/80 bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              option.disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {option.label}
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
