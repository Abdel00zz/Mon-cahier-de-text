import * as React from 'react';

export type StatusType = 'online' | 'active' | 'warning' | 'error' | 'neutral';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusType;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

const STATUS_CONFIGS: Record<
  StatusType,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    dotPing: string;
    defaultLabel: string;
  }
> = {
  online: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/25 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    dotPing: 'bg-emerald-400',
    defaultLabel: 'En ligne',
  },
  active: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-500/25 dark:border-indigo-500/30',
    dot: 'bg-indigo-500',
    dotPing: 'bg-indigo-400',
    defaultLabel: 'Actif',
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/25 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    dotPing: 'bg-amber-400',
    defaultLabel: 'Attention',
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-500/25 dark:border-red-500/30',
    dot: 'bg-red-500',
    dotPing: 'bg-red-400',
    defaultLabel: 'Erreur',
  },
  neutral: {
    bg: 'bg-slate-500/10 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
    dotPing: 'bg-slate-400',
    defaultLabel: 'Inactif',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'online',
  label,
  pulse = true,
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.neutral;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border transition-colors ${
        isSm ? 'px-2 py-0.5 text-[11px] rounded-md' : 'px-2.5 py-1 text-xs rounded-full'
      } ${config.bg} ${config.text} ${config.border} ${className}`}
      {...props}
    >
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.dotPing}`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${config.dot}`} />
      </span>
      <span>{children || label || config.defaultLabel}</span>
    </span>
  );
};
