import React, { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '@/types';
import { CurriculumProgramView } from '@/components/curriculum/CurriculumProgramView';
import { useCurriculumProgress } from '@/hooks/useCurriculumProgress';
import { useCurriculumCatalog } from '@/hooks/useCurriculumCatalog';
import { useClassManager } from '@/hooks/useClassManager';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import { findMatchingCurriculum } from '@/domain/curriculum/officialCurriculum';
import { schoolYearLabelFromDate } from '@/domain/calendar/calendar';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { Modal } from '@/components/ui/modal';
import { MathText } from '@/components/ui/math-text';
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
  // Un seul calcul d'avancement, partagé par les trois vues.
  const curriculumProgress = useCurriculumProgress(current, config, lessonsData, catalog);
  const plan = useMemo(
    () => findMatchingCurriculum(current, catalog, schoolYearLabelFromDate(config.schoolYearStart || today)),
    [current, catalog, config.schoolYearStart, today],
  );
  const number = useMemo(() => new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA'), [locale]);

  const warningItems = useMemo(() => {
    if (!getDateWarnings) return [];
    return getWarningItems(lessonsData, getDateWarnings, t('analysis.item'));
  }, [lessonsData, getDateWarnings, t]);

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
          {plan && curriculumProgress ? (
            <ul className="hub-grid" data-rows aria-label={t('analysis.card.program')}>
              <li className="contents">
                <button type="button" data-tone="blue" data-layout="row" className="hub-card" onClick={() => setView('program')}>
                  <span className="hub-card__icon" aria-hidden="true"><BookOpen /></span>
                  <span className="hub-card__body">
                    <span className="hub-card__title">{t('analysis.card.program')}</span>
                  </span>
                  <ChevronRight aria-hidden className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                </button>
              </li>
              <li className="contents">
                <button type="button" data-tone="violet" data-layout="row" className="hub-card" onClick={() => setView('link')}>
                  <span className="hub-card__icon" aria-hidden="true"><Network /></span>
                  <span className="hub-card__body">
                    <span className="hub-card__title">{t('analysis.card.link')}</span>
                  </span>
                  <ChevronRight aria-hidden className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                </button>
              </li>
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border/70 px-3 py-2.5 text-xs text-muted-foreground">{t('analysis.noPlan')}</p>
          )}
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
