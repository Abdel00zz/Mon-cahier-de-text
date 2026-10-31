import React, { useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger } from './tabs';
import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: string; label: React.ReactNode; disabled?: boolean }>;
  className?: string;
  ariaLabel?: string;
}

/**
 * Contrôle segmenté générique (onglets / sélecteurs compacts) basé sur Radix Tabs.
 */
export function Segmented<T extends string>({ value, onChange, options, className, ariaLabel }: SegmentedProps<T>) {
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
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        try {
          container.scrollBy({ left: diff, behavior });
        } catch {
          activeEl.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
        }
      }
    }
  }, [value]);

  return (
    <Tabs value={value} onValueChange={val => onChange(val as T)}>
      <TabsList
        ref={containerRef}
        aria-label={ariaLabel}
        className={cn('paper-segments inline-flex max-w-full items-center overflow-x-auto no-scrollbar rounded-xl border border-border/70 bg-muted/60 p-1', className)}
      >
        {options.map(option => {
          const active = value === option.value;
          return (
            <TabsTrigger
              key={option.value}
              ref={active ? activeRef : null}
              value={option.value}
              disabled={option.disabled}
              tabIndex={active || (!options.some(item => item.value === value && !item.disabled) && option === options.find(item => !item.disabled)) ? 0 : -1}
              className="flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium"
            >
              {option.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
