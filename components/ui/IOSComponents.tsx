import React from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronRight } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

/* ==========================================================================
   IOSSegmentedControl
   ========================================================================== */
interface IOSSegmentedControlProps<T extends string | number> {
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function IOSSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: IOSSegmentedControlProps<T>) {
  const { impact } = useHapticFeedback();

  return (
    <div
      className={cn(
        'flex w-full items-center rounded-xl bg-zinc-200/80 p-1 dark:bg-zinc-800/80',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => {
              if (!isActive) {
                impact('light');
                onChange(opt.value);
              }
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
              isActive
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            )}
          >
            {opt.icon && <span className="h-3.5 w-3.5 shrink-0">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   IOSSearchBar
   ========================================================================== */
interface IOSSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const IOSSearchBar: React.FC<IOSSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className,
}) => {
  return (
    <div className={cn('relative w-full', className)}>
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl bg-zinc-100 pl-10 pr-9 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-300 text-xs text-zinc-600 transition-colors hover:bg-zinc-400 active:scale-95 dark:bg-zinc-700 dark:text-zinc-300"
          aria-label="Effacer la recherche"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/* ==========================================================================
   IOSListRow
   ========================================================================== */
interface IOSListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  className?: string;
}

export const IOSListRow: React.FC<IOSListRowProps> = ({
  icon,
  iconBg = 'bg-[#007AFF]',
  title,
  subtitle,
  trailing,
  onClick,
  showChevron = true,
  className,
}) => {
  const { impact } = useHapticFeedback();

  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) {
          impact('light');
          onClick();
        }
      }}
      className={cn(
        'flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition-colors active:bg-zinc-100 dark:bg-zinc-900 dark:active:bg-zinc-800',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
            iconBg
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">{title}</h4>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
      {trailing && <div className="shrink-0 text-xs text-zinc-500">{trailing}</div>}
      {showChevron && <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />}
    </button>
  );
};

/* ==========================================================================
   IOSBadge
   ========================================================================== */
interface IOSBadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray';
  className?: string;
}

export const IOSBadge: React.FC<IOSBadgeProps> = ({
  children,
  variant = 'blue',
  className,
}) => {
  const variantStyles = {
    blue: 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20',
    green: 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20',
    orange: 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20',
    purple: 'bg-[#AF52DE]/10 text-[#AF52DE] border-[#AF52DE]/20',
    red: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20',
    gray: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
