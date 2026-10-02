import type { ReactNode } from 'react';
import { Check, Info, TriangleAlert } from './icons';
import { cn } from '@/lib/utils';

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';

const toneClasses: Record<NoticeTone, string> = {
  info: 'text-muted-foreground',
  success: 'text-success-strong',
  warning: 'text-warning-strong',
  error: 'text-destructive',
};

/** A concise contextual notice with a single place for related actions. */
export function StatusNotice({ tone = 'info', title, description, children, announce = false, className }: {
  tone?: NoticeTone;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  announce?: boolean;
  className?: string;
}) {
  const Icon = tone === 'success' ? Check : tone === 'error' || tone === 'warning' ? TriangleAlert : Info;
  return <div
    className={cn('flex items-start gap-3 py-3', className)}
    role={announce ? tone === 'error' ? 'alert' : 'status' : undefined}
  >
    <Icon aria-hidden="true" className={cn('mt-0.5 h-5 w-5 shrink-0', toneClasses[tone])} />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  </div>;
}
