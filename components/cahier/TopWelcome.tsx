import React from 'react';
import { cn } from '@/lib/utils';
import { isArabicText } from '@/utils/textFormat';

export interface TopWelcomeProps {
  teacherName: string;
  greetingPrefix?: string;
  isArabic?: boolean;
  className?: string;
  statusBadge?: React.ReactNode;
}

export const TopWelcome: React.FC<TopWelcomeProps> = ({
  teacherName,
  greetingPrefix,
  isArabic = false,
  className,
  statusBadge,
}) => {
  const isAr = isArabic || isArabicText(teacherName);
  const prefix = greetingPrefix || (isAr ? 'مرحباً :' : 'Bienvenue :');

  return (
    <div
      className={cn(
        'w-full bg-white dark:bg-[#202124] border-b border-[#e0e0e0] dark:border-[#5f6368] py-3.5 px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3">
          <span
            className={cn(
              'text-[#5f6368] dark:text-[#9aa0a6] font-sans font-medium text-[15px]',
              isAr ? 'font-sans text-xl' : ''
            )}
          >
            {prefix}
          </span>

          <span
            className={cn(
              'text-[#202124] dark:text-[#e8eaed]',
              isAr
                ? 'font-sans text-2xl sm:text-3xl font-bold leading-none'
                : 'font-sans font-medium text-[32px] font-bold'
            )}
          >
            {teacherName}
          </span>
        </div>

        {statusBadge && (
          <div className="flex items-center gap-2">
            {statusBadge}
          </div>
        )}
      </div>
    </div>
  );
};
