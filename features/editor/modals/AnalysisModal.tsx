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
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="h-6 w-6 text-[#007AFF]" />
            {t('analysis.title')}
          </span>
        </div>
      }
      maxWidth="3xl"
      hideClose={true}
      footer={
        <div className="flex w-full items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            className="px-6 font-bold bg-[#007AFF] hover:bg-[#0062D6] text-white"
            onClick={onClose}
          >
            {t('analysis.close')}
          </Button>
        </div>
      }
    >
      <div className="space-y-10 py-2">
        <p className="text-sm leading-relaxed text-slate-600 font-medium">
          {t('analysis.description')}
        </p>

        <section className="space-y-5">
            <h3 className="text-lg font-bold text-zinc-900">{t('analysis.overview')}</h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="rounded-2xl border-0 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('analysis.completion')}</div>
                <div className="text-4xl font-black text-zinc-800">{number.format(stats.completionRate)}%</div>
                <div className="text-sm text-zinc-500 font-semibold mt-2">{t('analysis.plannedOfTotal', { planned: number.format(stats.plannedCount), total: number.format(stats.totalItems) })}</div>
              </div>
              <div className="rounded-2xl border-0 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('analysis.sessions')}</div>
                <div className="text-4xl font-black text-zinc-800">{number.format(stats.sessionsCount)}</div>
                <div className="text-sm text-zinc-500 font-semibold mt-2">{t('analysis.distinctDays')}</div>
              </div>
              <div className="rounded-2xl border-0 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('analysis.toPlan')}</div>
                <div className="text-4xl font-black text-[#007AFF]">{number.format(stats.unplannedItems.length)}</div>
                <div className="text-sm text-zinc-500 font-semibold mt-2">{t('analysis.withoutDate')}</div>
              </div>
            </div>
        </section>

        <section className="space-y-5">
          <h3 className="text-lg font-bold text-zinc-900">{t('analysis.byChapter')}</h3>
          <div className="custom-scrollbar max-h-[35vh] space-y-5 overflow-y-auto rounded-2xl border-0 bg-white p-5 pe-2 shadow-sm">
            {stats.perChapter.map((chapter, i) => {
              if (chapter.total === 0) return null;
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="truncate pe-4 text-sm font-bold text-zinc-800">
                      <MathText source={chapter.title} cacheKey={`analysis-${chapter.title}`} inline>
                        {chapter.title}
                      </MathText>
                    </div>
                    <div className="text-sm font-black text-zinc-500 whitespace-nowrap">{number.format(chapter.rate)}%</div>
                  </div>
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
                      style={{ width: `${chapter.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {warningItems.length > 0 && (
          <section className="space-y-5">
            <h3 className="text-lg font-bold text-amber-600 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              {t('analysis.calendarWarnings', { count: number.format(warningItems.length) })}
            </h3>
            <div className="custom-scrollbar max-h-[30vh] space-y-3 overflow-y-auto pe-2">
              {warningItems.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-sm">
                  <div className="flex justify-between items-center font-bold text-zinc-800">
                    <span className="truncate pe-2">
                      <MathText source={item.title} cacheKey={`warn-${item.title}`} inline>{item.title}</MathText>
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-800 bg-white px-2 py-1 rounded-full border border-amber-200 shrink-0 shadow-sm">
                      {item.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {item.messages.map((m, i) => (
                      <p key={i} className="border-s-2 border-amber-300 ps-3 text-xs font-medium text-zinc-600">
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
