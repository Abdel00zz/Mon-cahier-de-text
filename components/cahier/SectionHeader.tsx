import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  subtitle?: string;
  className?: string;
  isArabic?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  actions,
  subtitle,
  className,
  isArabic = false,
}) => {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 mb-3', className)}>
      <div className="flex items-center gap-2.5">
        <h2
          className={cn(
            'text-foreground tracking-wide leading-none',
            isArabic ? 'font-sans text-xl sm:text-2xl font-bold' : 'font-sans text-xl sm:text-2xl font-bold'
          )}
        >
          {title}
        </h2>

        {typeof count === 'number' && (
          <span
            className="inline-flex h-6 min-w-[24px] px-1.5 items-center justify-center rounded-full bg-muted border border-border text-xs font-bold text-foreground font-sans"
            aria-label={`${count} éléments`}
          >
            {count}
          </span>
        )}

        {subtitle && (
          <span className="text-xs text-muted-foreground font-sans">
            {subtitle}
          </span>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 ms-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
