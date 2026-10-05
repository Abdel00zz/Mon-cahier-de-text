import React, { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '@/types';
import { CurriculumChapterProgress } from '@/components/curriculum/CurriculumChapterProgress';
import { CurriculumProgramView } from '@/components/curriculum/CurriculumProgramView';
import { useCurriculumProgress } from '@/hooks/useCurriculumProgress';
import { useCurriculumCatalog } from '@/hooks/useCurriculumCatalog';
import { useClassManager } from '@/hooks/useClassManager';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import { computeProgressionStats } from '@/domain/curriculum/progression';
import { chapterAssociations, findMatchingCurriculum } from '@/domain/curriculum/officialCurriculum';
import { schoolYearLabelFromDate } from '@/domain/calendar/calendar';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { Modal } from '@/components/ui/modal';
import { MathText } from '@/components/ui/math-text';
import { MathTitle } from '@/components/ui/math-title';
import { BookOpen, ChevronLeft, ChevronRight, Network, TriangleAlert } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { titleDirection } from '@/domain/notebook/contentDirection';

const CurriculumLinkView = React.lazy(() => import('@/components/curriculum/CurriculumLinkView').then(module => ({ default: module.CurriculumLinkView })));

/** Une seule fenêtre, trois vues : le suivi, le programme officiel, et le lien chapitres ↔ programme. */
type AnalysisView = 'overview' | 'program' | 'link';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonsData: LessonsData;
  classInfo: ClassInfo;
  config: AppConfig;
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

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, lessonsData, getDateWarnings, classInfo, config }) => {
  const { t, locale } = useLocale();
  const today = useMoroccoToday();
  const [view, setView] = useState<AnalysisView>('overview');
  const [linkOpened, setLinkOpened] = useState(false);
  useEffect(() => { if (!isOpen) { setView('overview'); setLinkOpened(false); } }, [isOpen]);
  useEffect(() => { if (view === 'link') setLinkOpened(true); }, [view]);
  // Le catalogue publié remplace l'embarqué tant que la vue « Relier » n'a pas été ouverte.
  const catalog = useCurriculumCatalog(isOpen, linkOpened);
  // La classe à jour (un lien enregistré dans la vue « Relier » se voit aussitôt dans le suivi).
  const { classes } = useClassManager();
  const current = useMemo(() => classes.find(item => item.id === classInfo.id) ?? classInfo, [classes, classInfo]);
  const stats = useMemo(() => computeProgressionStats(lessonsData), [lessonsData]);
  // Un seul calcul d'avancement, partagé par les trois vues.
  const curriculumProgress = useCurriculumProgress(current, config, lessonsData, catalog);
  const plan = useMemo(
    () => findMatchingCurriculum(current, catalog, schoolYearLabelFromDate(config.schoolYearStart || today)),
    [current, catalog, config.schoolYearStart, today],
  );
  const chapterProgress = useMemo(() => new Map(curriculumProgress?.rows.flatMap(row => row.indices.map(index => [index, row] as const)) ?? []), [curriculumProgress]);
  const number = useMemo(() => new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA'), [locale]);

  const warningItems = useMemo(() => {
    if (!getDateWarnings) return [];
    return getWarningItems(lessonsData, getDateWarnings, t('analysis.item'));
  }, [lessonsData, getDateWarnings, t]);

  const startedCount = useMemo(
    () => curriculumProgress?.rows.filter(row => row.startDate && row.startDate <= today && row.indices.length).length ?? 0,
    [curriculumProgress, today],
  );
  const linkedCount = useMemo(
    () => (plan ? Object.values(chapterAssociations(current, lessonsData, plan)).filter(Boolean).length : 0),
    [plan, current, lessonsData],
  );
  const chapterCount = useMemo(() => lessonsData.filter(chapter => chapter.type === 'chapter').length, [lessonsData]);
  const programHint = curriculumProgress
    ? curriculumProgress.completionRate !== null
      ? t('analysis.card.programRate', { started: number.format(startedCount), total: number.format(curriculumProgress.rows.length), rate: number.format(curriculumProgress.completionRate) })
      : t('analysis.card.programHint', { started: number.format(startedCount), total: number.format(curriculumProgress.rows.length) })
    : '';

  const viewTitle = view === 'program' ? t('analysis.card.program') : t('analysis.card.link');
  const title = view === 'overview'
    ? <span className="hub-titlebar"><span className="min-w-0 truncate">{t('analysis.title')}</span></span>
    : (
      <span className="hub-titlebar">
        <button type="button" onClick={() => setView('overview')} className="hub-back" aria-label={t('analysis.back')}>
          <ChevronLeft aria-hidden className="hub-back__chevron" />
        </button>
        <span className="min-w-0 truncate">{viewTitle}</span>
      </span>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="xl"
      className="hub-modal sm:rounded-2xl"
      headerClassName="hub-modal-header"
      bodyClassName="hub-modal-body"
    >
      {view === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 [&>div]:min-w-0 [&>div]:p-3">
            <div className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <div className="mb-1 text-[11px] font-medium leading-tight text-muted-foreground">{t('analysis.completion')}</div>
              <div className="text-2xl font-black tracking-tight text-foreground">{number.format(stats.completionRate)}%</div>
              <div className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground">{t('analysis.plannedOfTotal', { planned: number.format(stats.plannedCount), total: number.format(stats.totalItems) })}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background shadow-xs">
              <div className="mb-1 text-[11px] font-medium leading-tight text-muted-foreground">{t('analysis.sessions')}</div>
              <div className="text-2xl font-black tracking-tight text-foreground">{number.format(stats.sessionsCount)}</div>
              <div className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground">{t('analysis.distinctDays')}</div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] shadow-xs">
              <div className="mb-1 text-[11px] font-medium leading-tight text-[var(--workspace-active-ink)]">{t('analysis.toPlan')}</div>
              <div className="text-2xl font-black tracking-tight text-primary">{number.format(stats.unplannedItems.length)}</div>
              <div className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground">{t('analysis.withoutDate')}</div>
            </div>
          </div>

          {plan && curriculumProgress ? (
            <ul className="hub-grid" data-rows aria-label={t('analysis.card.program')}>
              <li className="contents">
                <button type="button" data-tone="blue" data-layout="row" className="hub-card" onClick={() => setView('program')}>
                  <span className="hub-card__icon" aria-hidden="true"><BookOpen /></span>
                  <span className="hub-card__body">
                    <span className="hub-card__title">{t('analysis.card.program')}</span>
                    <span className="hub-card__hint">{programHint}</span>
                  </span>
                  <ChevronRight aria-hidden className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                </button>
              </li>
              <li className="contents">
                <button type="button" data-tone="violet" data-layout="row" className="hub-card" onClick={() => setView('link')}>
                  <span className="hub-card__icon" aria-hidden="true"><Network /></span>
                  <span className="hub-card__body">
                    <span className="hub-card__title">{t('analysis.card.link')}</span>
                    <span className="hub-card__hint">{t('analysis.card.linkHint', { linked: number.format(linkedCount), total: number.format(chapterCount) })}</span>
                  </span>
                  <ChevronRight aria-hidden className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                </button>
              </li>
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border/70 px-3 py-2.5 text-xs text-muted-foreground">{t('analysis.noPlan')}</p>
          )}
          {curriculumProgress && !curriculumProgress.projectionAvailable && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{t('analysis.needDate')}</p>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('analysis.byChapter')}</h3>
            {chapterProgress.size > 0 && <p className="text-[11px] leading-relaxed text-muted-foreground">{t('analysis.paceLegend')}</p>}
            <div className="max-h-[min(38dvh,19rem)] space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-background p-3.5 pe-2 shadow-xs overscroll-contain">
              {stats.perChapter.map((chapter, i) => {
                const official = chapterProgress.get(i);
                if (chapter.total === 0 && !official) return null;
                return (
                  <div key={i} className="space-y-1.5 text-start" dir={titleDirection(chapter.title, locale === 'ar' ? 'rtl' : 'ltr')}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 break-words text-xs font-bold text-foreground" dir="auto">
                        <MathText source={chapter.title} cacheKey={`analysis-${chapter.title}`} inline>
                          {chapter.title}
                        </MathText>
                      </div>
                      {!official && <bdi dir="ltr" className="shrink-0 font-mono text-xs font-bold text-muted-foreground">{number.format(chapter.rate)}%</bdi>}
                    </div>
                    {official && official.officialChapter.title !== chapter.title && <p className="text-[11px] text-muted-foreground" dir="auto"><MathTitle text={official.officialChapter.title} />{official.indices.length > 1 ? ` · ${t('analysis.sharedProgress')}` : ''}</p>}
                    {official ? <CurriculumChapterProgress row={official} /> : <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                        style={{ width: `${chapter.rate}%` }}
                      />
                    </div>}
                  </div>
                );
              })}
            </div>
          </section>

          {warningItems.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-pulse" />
                {t('analysis.calendarWarnings', { count: number.format(warningItems.length) })}
              </h3>
              <div className="max-h-[min(30dvh,14rem)] space-y-2 overflow-y-auto pe-1.5 overscroll-contain">
                {warningItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs">
                    <div dir={titleDirection(item.title, locale === 'ar' ? 'rtl' : 'ltr')} className="flex items-center justify-between gap-2 text-start font-bold text-foreground">
                      <span className="min-w-0 truncate">
                        <MathText source={item.title} cacheKey={`warn-${item.title}`} inline>{item.title}</MathText>
                      </span>
                      <span dir="ltr" className="shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        {formatDateDDMMYYYY(item.date) ?? item.date}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {item.messages.map((m, i) => (
                        <p key={i} className="border-s-2 border-amber-400 ps-2.5 text-[11px] font-medium text-muted-foreground">
                          <TriangleAlert aria-hidden className="me-1 inline-block h-3.5 w-3.5 align-[-0.2em] text-amber-600 dark:text-amber-400" />
                          {m}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {view === 'program' && plan && curriculumProgress && <CurriculumProgramView plan={plan} progress={curriculumProgress} />}

      {view === 'link' && plan && (
        <React.Suspense fallback={null}>
          <CurriculumLinkView classInfo={current} lessonsData={lessonsData} plan={plan} />
        </React.Suspense>
      )}
    </Modal>
  );
};
