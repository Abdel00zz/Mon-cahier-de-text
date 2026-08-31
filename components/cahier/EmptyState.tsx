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
        'flex flex-col items-center justify-center rounded-[16px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white p-8 sm:p-12 text-center shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] max-w-md mx-auto my-6',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4] dark:bg-[#3c4043] border border-[#e0e0e0] dark:border-[#5f6368] text-[#202124] dark:text-[#e8eaed] shadow-2xs">
          {icon}
        </div>
      )}

      <h3 className="font-sans font-medium text-2xl sm:text-3xl font-bold text-[#202124] dark:text-[#e8eaed] mb-2">
        {title}
      </h3>

      <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] font-sans max-w-xs mb-6 leading-relaxed">
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
