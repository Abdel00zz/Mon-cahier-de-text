import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressRuleProps {
  value: number; // 0 à 100
  max?: number;
  label?: string;
  color?: string;
  showTicks?: boolean;
  className?: string;
}

export const ProgressRule: React.FC<ProgressRuleProps> = ({
  value,
  max = 100,
  label,
  color = '#2F7A5C', // --vert par défaut
  showTicks = true,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full font-sans', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-[#202124] dark:text-[#e8eaed]">
          <span>{label}</span>
          <span className="font-bold text-[#5f6368] dark:text-[#9aa0a6]">{Math.round(percentage)}%</span>
        </div>
      )}

      {/* Règle graduée d'école */}
      <div className="relative h-7 w-full overflow-hidden rounded-[8px] border border-[#e0e0e0] dark:border-[#5f6368] bg-slate-100 dark:bg-[#3c4043] p-0.5 shadow-inner">
        {/* Graduations millimétriques de la règle */}
        {showTicks && (
          <div className="absolute inset-0 flex justify-between px-2 pt-0.5 opacity-60 pointer-events-none">
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-[1px] bg-slate-300 dark:bg-slate-600',
                  i % 5 === 0 ? 'h-3.5 bg-slate-400 dark:bg-slate-500' : i % 2 === 0 ? 'h-2' : 'h-1.5'
                )}
              />
            ))}
          </div>
        )}

        {/* Barre de remplissage feutre */}
        <div
          className="relative h-full rounded-[6px] transition-all duration-300 ease-out shadow-xs"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        >
          {/* Ligne de reflet */}
          <div className="absolute inset-x-0 top-0 h-1/3 bg-white dark:bg-[#202124]/25 rounded-t-[6px]" />
        </div>
      </div>
    </div>
  );
};
