import React from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { BookOpen, GraduationCap, ListChecks, PieChart } from '@/components/ui/icons';

export interface DashboardMetrics {
  progression: number;
  sessions: number;
  classes: number;
}

interface DashboardMetricsBarProps {
  metrics: DashboardMetrics;
}

export const DashboardMetricsBar: React.FC<DashboardMetricsBarProps> = ({ metrics }) => {
  const { t } = useLocale();

  return (
    <section
      className="grid w-full grid-cols-1 sm:grid-cols-3 gap-3"
      aria-label={t('dashboard.progression')}
    >
      {/* Metric 1: Classes */}
      <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#007AFF] dark:bg-blue-950/50 dark:text-blue-400">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
            {metrics.classes}
          </span>
          <span className="block truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t('dashboard.classesMetric')}
          </span>
        </div>
      </div>

      {/* Metric 2: Sessions */}
      <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
            {metrics.sessions}
          </span>
          <span className="block truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t('dashboard.sessions')}
          </span>
        </div>
      </div>

      {/* Metric 3: Progression */}
      <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <PieChart className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <span className="block text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
              {metrics.progression}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics.progression))}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {t('dashboard.progression')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

