import React from 'react';
import { cn } from '@/lib/utils';

export interface StatTileProps {
  label: string;
  value: string | number;
  subtext?: string;
  accentColor?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  subtext,
  accentColor = 'var(--primary)',
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-xs transition-shadow text-card-foreground',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-foreground">
          {value}
        </span>
        {subtext && (
          <span className="text-xs font-sans text-muted-foreground">
            {subtext}
          </span>
        )}
      </div>

      {/* Trait de repère feutré */}
      <div
        className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: '40%', ...(accentColor ? { backgroundColor: accentColor } : {}) }}
        />
      </div>
    </div>
  );
};
