import React from 'react';
import { useLocale } from '@/i18n/LocaleProvider';

export interface DashboardMetrics {
  progression: number;
  sessions: number;
  classes: number;
}

interface DashboardMetricsBarProps {
  metrics: DashboardMetrics;
}

/** Bloc purement présentatif : les calculs restent dans le tableau de bord. */
export const DashboardMetricsBar: React.FC<DashboardMetricsBarProps> = ({ metrics }) => {
  const { t } = useLocale();

  return (
    <section
      className="grid w-full grid-cols-3 divide-x divide-[#f2d28a] overflow-hidden rounded-xl border border-[#f3d58f] bg-[#fff8df] shadow-[0_1px_2px_rgba(113,74,0,0.05)] md:w-[40%] md:min-w-[300px]"
      aria-label={t('dashboard.progression')}
    >
      <Metric value={`${metrics.progression}%`} label={t('dashboard.progression')} />
      <Metric value={metrics.sessions} label={t('dashboard.sessions')} />
      <Metric value={metrics.classes} label={t('dashboard.classesMetric')} />
    </section>
  );
};

const Metric: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
  <span className="flex min-w-0 flex-col items-center justify-center px-2 py-2 text-center sm:py-2.5">
    <span className="block text-[17px] font-black tabular-nums leading-none tracking-[-0.02em] text-[#563c00] sm:text-lg">{value}</span>
    <span className="mt-1 block truncate text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#9a6b00]">{label}</span>
  </span>
);
