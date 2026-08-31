import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export interface AlertBannerProps {
  title: React.ReactNode;
  detail?: React.ReactNode;
  type?: 'attention' | 'critique' | 'valide' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  isRtl?: boolean;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  title,
  detail,
  type = 'attention',
  action,
  isRtl = false,
  className,
}) => {
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const styleConfig = {
    // Attention : --ambre (#C1791F)
    attention: {
      bg: 'bg-[#F7EBDA]',
      border: 'border-[#C1791F]/40',
      text: 'text-[#C1791F]',
      badgeBg: 'bg-[#C1791F]',
    },
    // Critique : --cerise (#B23A50)
    critique: {
      bg: 'bg-[#F7E7EA]',
      border: 'border-[#B23A50]/40',
      text: 'text-[#B23A50]',
      badgeBg: 'bg-[#B23A50]',
    },
    // Validé : --vert (#2F7A5C)
    valide: {
      bg: 'bg-[#E5F1EA]',
      border: 'border-[#2F7A5C]/40',
      text: 'text-[#2F7A5C]',
      badgeBg: 'bg-[#2F7A5C]',
    },
    // Info : --bleu (#3D6FB4)
    info: {
      bg: 'bg-[#E7EEF8]',
      border: 'border-[#3D6FB4]/40',
      text: 'text-[#3D6FB4]',
      badgeBg: 'bg-[#3D6FB4]',
    },
  }[type];

  return (
    <div
      role="alert"
      className={cn(
        'w-full flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[13px] leading-tight font-sans shadow-2xs transition-colors',
        styleConfig.bg,
        styleConfig.border,
        type === 'critique' ? 'animate-advanced-alert' : '',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <AlertCircle className={cn('h-4 w-4 shrink-0', styleConfig.text, 'animate-pulse')} strokeWidth={2.2} />
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-bold text-[#202124] dark:text-[#e8eaed]">{title}</span>
          {detail && <span className="text-[#5f6368] dark:text-[#9aa0a6] text-xs">{detail}</span>}
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 font-bold cursor-pointer rounded-[8px] px-2.5 py-1 text-xs transition-opacity hover:opacity-80 active:scale-95',
            styleConfig.text
          )}
        >
          <span>{action.label}</span>
          <ArrowIcon className="h-4 w-4 text-red-600 animate-pulse" />
        </button>
      )}
    </div>
  );
};
