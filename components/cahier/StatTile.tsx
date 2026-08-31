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
  accentColor = '#3D6FB4',
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between rounded-[16px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white dark:bg-[#202124] p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] transition-all hover:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium font-sans text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-slate-100 dark:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed]">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#202124] dark:text-[#e8eaed]"
          
        >
          {value}
        </span>
        {subtext && (
          <span className="text-xs font-sans text-[#5f6368] dark:text-[#9aa0a6]">
            {subtext}
          </span>
        )}
      </div>

      {/* Trait de repère feutré */}
      <div
        className="mt-3 h-1 w-full rounded-full"
        style={{ backgroundColor: `${accentColor}33` }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: '40%', backgroundColor: accentColor }}
        />
      </div>
    </div>
  );
};
