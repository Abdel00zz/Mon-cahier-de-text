import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-8 sm:p-12 text-center shadow-sm max-w-md mx-auto my-6 text-card-foreground',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 border border-border/70 text-muted-foreground shadow-2xs">
          {icon}
        </div>
      )}

      <h3 className="font-sans text-xl sm:text-2xl font-bold text-foreground mb-2">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground font-sans max-w-xs mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
