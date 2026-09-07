import React, { useMemo, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '@/types';
import { CurriculumProgressLabel } from '@/components/CurriculumProgressLabel';
import { CurriculumChapterProgress } from '@/components/CurriculumChapterProgress';
import { DualProgressBar } from '@/components/ui/dual-progress-bar';
import { useCurriculumProgress } from '@/hooks/useCurriculumProgress';
import { computeProgressionStats } from '@/utils/progression';
import { Modal } from '@/components/ui/modal';
import { MathText } from '@/components/ui/math-text';
import { Button } from '@/components/ui/button';
import { PieChart } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

const OfficialCurriculumModal = React.lazy(() => import('@/components/OfficialCurriculumModal').then(module => ({ default: module.OfficialCurriculumModal })));

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonsData: LessonsData;
  classInfo: ClassInfo;
  config: AppConfig;
  /** @deprecated Calendar warnings are owned by Centre de pilotage. Kept for caller compatibility. */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, lessonsData, classInfo, config }) => {
  const { t, locale } = useLocale();
  const [showAssociations, setShowAssociations] = useState(false);
  React.useEffect(() => { if (!isOpen) setShowAssociations(false); }, [isOpen]);
  const stats = useMemo(() => computeProgressionStats(lessonsData), [lessonsData]);
  const curriculumProgress = useCurriculumProgress(classInfo, config, lessonsData);
  const chapterProgress = useMemo(() => new Map(curriculumProgress?.rows.flatMap(row => row.indices.map(index => [index, row] as const)) ?? []), [curriculumProgress]);
  const number = useMemo(() => new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA'), [locale]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <PieChart className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t('analysis.title')}
          </span>
        </div>
      }
      maxWidth="3xl"
      mobilePresentation="dialog"
      dragHandle={false}
      swipeToDismiss={false}
      className="sm:max-w-4xl sm:rounded-2xl"
      headerClassName="border-b border-border/60 bg-card/60 backdrop-blur-xs"
      bodyClassName="px-5 py-5 sm:px-7 sm:py-6"
      footerClassName="border-t border-border/60 bg-card/60"
      hideClose={false}
      footer={
        <div className="flex w-full items-center justify-between gap-2.5">
          <button type="button" onClick={() => setShowAssociations(true)} className="min-h-11 text-start text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {locale === 'ar' ? 'ربط دروسي بالبرنامج' : locale === 'en' ? 'Link my chapters to the curriculum' : 'Relier mes chapitres au programme'}
          </button>
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
        {isOpen && showAssociations && <React.Suspense fallback={null}><OfficialCurriculumModal isOpen onClose={() => setShowAssociations(false)} classInfo={classInfo} config={config} lessonsData={lessonsData} /></React.Suspense>}
        <CurriculumProgressLabel classInfo={classInfo} config={config} lessonsData={lessonsData} />
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('analysis.overview')}</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 [&>div]:min-w-0 [&>div]:p-2.5 sm:[&>div]:p-4 [&_.text-3xl]:text-2xl sm:[&_.text-3xl]:text-3xl">
            <div className="rounded-2xl border border-border/70 bg-background shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{t('analysis.completion')}</div>
              <div className="text-3xl font-black tracking-tight text-foreground">{number.format(stats.completionRate)}%</div>
              <div className="text-xs text-muted-foreground font-medium mt-1.5">{t('analysis.plannedOfTotal', { planned: number.format(stats.plannedCount), total: number.format(stats.totalItems) })}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{t('analysis.sessions')}</div>
              <div className="text-3xl font-black tracking-tight text-foreground">{number.format(stats.sessionsCount)}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1.5">{t('analysis.distinctDays')}</div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">{t('analysis.toPlan')}</div>
              <div className="text-3xl font-black tracking-tight text-primary">{number.format(stats.unplannedItems.length)}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1.5">{t('analysis.withoutDate')}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('analysis.byChapter')}</h3>
          <div className="max-h-[min(35dvh,18rem)] space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-background p-4 pe-2.5 shadow-xs overscroll-contain">
            {stats.perChapter.map((chapter, i) => {
              const official = chapterProgress.get(i);
              if (lessonsData[i]?.type !== 'chapter') return null;
              if (chapter.total === 0 && !official) return null;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="min-w-0 break-words text-xs font-bold text-foreground" dir="auto">
                    <MathText source={chapter.title} cacheKey={`analysis-${chapter.title}`} inline>
                      {chapter.title}
                    </MathText>
                  </div>
                  {official ? <CurriculumChapterProgress row={official} label={chapter.title} /> : <DualProgressBar value={chapter.rate} label={chapter.title} />}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </Modal>
  );
};
