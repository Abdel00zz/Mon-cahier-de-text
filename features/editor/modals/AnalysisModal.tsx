import React, { useMemo } from 'react';
import { LessonsData } from '@/types';
import { computeProgressionStats } from '@/utils/progression';
import { Modal } from '@/components/ui/modal';
import { MathText } from '@/components/ui/math-text';
import { Button } from '@/components/ui/button';
import { PieChart } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonsData: LessonsData;
  getDateWarnings?: (date: string) => { type: string; message: string }[];
}

const getWarningItems = (lessons: LessonsData, getWarnings: (date: string) => any[], fallbackTitle: string) => {
  const warningsList: Array<{ title: string; date: string; messages: string[] }> = [];
  
  const process = (item: any) => {
    if (!item) return;
    if (item.date && typeof item.date === 'string' && item.date.trim()) {
      const msgs = getWarnings(item.date).map(w => w.message);
      if (msgs.length > 0) {
        warningsList.push({
          title: item.title || item.name || fallbackTitle,
          date: item.date,
          messages: msgs
        });
      }
    }
    if (item.sections) item.sections.forEach(process);
    if (item.subsections) item.subsections.forEach(process);
    if (item.subsubsections) item.subsubsections.forEach(process);
    if (item.items) item.items.forEach(process);
  };
  
  lessons.forEach(process);
  return warningsList;
};

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, lessonsData, getDateWarnings }) => {
  const { t, locale } = useLocale();
  const stats = useMemo(() => computeProgressionStats(lessonsData), [lessonsData]);
  const number = useMemo(() => new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA'), [locale]);

  const warningItems = useMemo(() => {
    if (!getDateWarnings) return [];
    return getWarningItems(lessonsData, getDateWarnings, t('analysis.item'));
  }, [lessonsData, getDateWarnings, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <PieChart className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-base sm:text-lg font-bold text-foreground">
            {t('analysis.title')}
          </span>
        </div>
      }
      description={t('analysis.description')}
      maxWidth="3xl"
      className="sm:max-w-4xl sm:rounded-[32px]"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      hideClose={false}
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button
            type="button"
            className="rounded-xl h-10 px-6 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs sm:text-sm"
            onClick={onClose}
          >
            {t('analysis.close')}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('analysis.overview')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{t('analysis.completion')}</div>
              <div className="text-3xl font-black tracking-tight text-foreground">{number.format(stats.completionRate)}%</div>
              <div className="text-xs text-muted-foreground font-medium mt-1.5">{t('analysis.plannedOfTotal', { planned: number.format(stats.plannedCount), total: number.format(stats.totalItems) })}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{t('analysis.sessions')}</div>
              <div className="text-3xl font-black tracking-tight text-foreground">{number.format(stats.sessionsCount)}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1.5">{t('analysis.distinctDays')}</div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">{t('analysis.toPlan')}</div>
              <div className="text-3xl font-black tracking-tight text-primary">{number.format(stats.unplannedItems.length)}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1.5">{t('analysis.withoutDate')}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('analysis.byChapter')}</h3>
          <div className="max-h-[min(35dvh,18rem)] space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 pe-2.5 shadow-xs overscroll-contain">
            {stats.perChapter.map((chapter, i) => {
              if (chapter.total === 0) return null;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center gap-3">
                    <div className="truncate text-xs font-bold text-foreground">
                      <MathText source={chapter.title} cacheKey={`analysis-${chapter.title}`} inline>
                        {chapter.title}
                      </MathText>
                    </div>
                    <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">{number.format(chapter.rate)}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${chapter.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {warningItems.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              {t('analysis.calendarWarnings', { count: number.format(warningItems.length) })}
            </h3>
            <div className="max-h-[min(30dvh,14rem)] space-y-2.5 overflow-y-auto pe-1.5 overscroll-contain">
              {warningItems.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5 text-xs">
                  <div className="flex justify-between items-center gap-2 font-bold text-foreground">
                    <span className="truncate">
                      <MathText source={item.title} cacheKey={`warn-${item.title}`} inline>{item.title}</MathText>
                    </span>
                    <span className="font-mono text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md shrink-0">
                      {item.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {item.messages.map((m, i) => (
                      <p key={i} className="border-s-2 border-amber-400 ps-2.5 text-[11px] font-medium text-muted-foreground">
                        ⚠ {m}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
