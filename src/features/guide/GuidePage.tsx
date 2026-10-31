import { useEffect, useMemo, useRef, useState, FC } from 'react';
import { useReducedMotion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { GUIDE_AR, GUIDE_FR, searchGuide } from '@/constants/guides';
import { Search, X, ChevronRight, ChevronLeft, Menu, BookOpen } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/i18n/LocaleProvider';
import { GuideFigure } from './GuideFigure';
import { GuideText } from './GuideText';
import { APP_VERSION } from '@/platform/appVersion';
import { GUIDE_GROUPS, GuideNavigationList } from './GuideNavigationList';
import './guide.css';

export interface GuidePageProps {
  onBack?: () => void;
  onClose?: () => void;
}

export const GuidePage: FC<GuidePageProps> = ({ onBack, onClose }) => {
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const lang = locale === 'ar' ? 'ar' : 'fr';
  const isAr = lang === 'ar';
  const entries = isAr ? GUIDE_AR : GUIDE_FR;

  const [query, setQuery] = useState('');
  const [chapterId, setChapterId] = useState('start');
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const results = useMemo(() => searchGuide(entries, query), [entries, query]);
  const active = results.find(entry => entry.id === chapterId) ?? results[0];
  const activeIndex = entries.findIndex(entry => entry.id === active?.id);

  const prevEntry = activeIndex > 0 ? entries[activeIndex - 1] : null;
  const nextEntry = activeIndex >= 0 && activeIndex < entries.length - 1 ? entries[activeIndex + 1] : null;

  useEffect(() => {
    setQuery('');
    setChapterId('start');
    setMobileDrawerOpen(false);
  }, [locale]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setMobileDrawerOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    closeOnDesktop();
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [chapterId]);

  const selectChapter = (id: string, clearSearch = true) => {
    if (clearSearch) setQuery('');
    setChapterId(id);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const toc = isAr ? 'فهرس الدليل' : 'Sommaire du guide';
  const handleExit = onBack ?? onClose;

  // Trouver le groupe du chapitre actif pour le fil d'Ariane
  const currentGroup = GUIDE_GROUPS.find(g => g.chapterIds.includes(active?.id ?? ''));
  const currentGroupTitle = currentGroup ? (isAr ? currentGroup.titleAr : currentGroup.titleFr) : null;


  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      lang={lang}
      className="guide-page-root w-full max-w-[1400px] mx-auto py-5 sm:py-8 px-3.5 sm:px-6 lg:px-8"
    >
      {/* Topbar globale de la page d'aide */}
      <header className="guide-page-header flex items-center justify-between pb-3 mb-6 sm:mb-8 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
              {isAr ? 'دليل الاستخدام والتأطير التربوي' : 'Guide d’utilisation & accompagnement'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'توثيق بيداغوجي وتنظيمي شامل لدفتر النصوص' : 'Documentation pédagogique et technique du cahier'}
            </p>
          </div>
        </div>
      </header>

      {/* Bouton de sélection rapide sur mobile et tablette */}
      <Dialog.Root open={isMobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
      <div className="lg:hidden mb-5">
        <Dialog.Trigger asChild><button
          type="button"
          aria-label={toc}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-border/75 bg-card/85 dark:bg-card/60 shadow-xs backdrop-blur-sm cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Menu size={18} className="shrink-0 text-primary" />
            <div className="min-w-0 text-start">
              <span className="text-[11px] text-muted-foreground block">
                {toc} · {entries.length} {isAr ? 'محوراً' : 'chapitres'}
              </span>
              <span className="text-sm font-semibold text-foreground truncate block">
                {active?.title}
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary px-2.5 py-1 rounded-xl bg-primary/10 shrink-0">
            {isAr ? 'الفهرس' : 'Sommaire'}
          </span>
        </button></Dialog.Trigger>
      </div>

      {/* Tiroir / Sheet Mobile pour le Sommaire */}
      <Dialog.Portal>
          <Dialog.Overlay className="guide-drawer-overlay lg:hidden" />
          <Dialog.Content dir={isAr ? 'rtl' : 'ltr'} lang={lang} className="guide-drawer lg:hidden" aria-describedby={undefined}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <Dialog.Title className="font-bold text-sm text-foreground">{toc}</Dialog.Title>
              </div>
              <Dialog.Close asChild><button
                type="button"
                aria-label={isAr ? 'إغلاق الفهرس' : 'Fermer le sommaire'}
                className="size-11 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <X size={16} aria-hidden="true" />
              </button></Dialog.Close>
            </div>

            {/* Champ de recherche mobile */}
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 bg-background mb-4">
              <Search size={14} className="shrink-0 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label={isAr ? 'البحث في الدليل' : 'Rechercher dans le guide'}
                placeholder={isAr ? 'بحث في الدليل...' : 'Rechercher...'}
                className="min-h-11 min-w-0 w-full border-0 bg-transparent px-0 text-base text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-0"
              />
              {query.trim() && (
                <button type="button" className="grid size-11 shrink-0 place-items-center" aria-label={isAr ? 'مسح البحث' : 'Effacer la recherche'} onClick={() => setQuery('')}>
                  <X size={14} aria-hidden="true" className="text-muted-foreground" />
                </button>
              )}
            </label>

            {/* Liste scrollable */}
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain modern-scrollbar pe-1" aria-label={toc}>
              <GuideNavigationList entries={entries} results={results} query={query} activeId={active?.id} isAr={isAr} onSelect={selectChapter} />
            </nav>
          </Dialog.Content>
      </Dialog.Portal>
      </Dialog.Root>

      {/* Layout principal : Sidebar fixe & Article pleine page */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Sidebar Bureau : Dock ergonomique et catégorisé */}
        <aside
          className="hidden lg:flex flex-col w-80 lg:w-84 xl:w-88 shrink-0 sticky top-6 max-h-[calc(100vh-3rem)] rounded-3xl border border-border/75 bg-card/85 dark:bg-card/55 shadow-xs backdrop-blur-md p-4 overflow-hidden"
          aria-label={toc}
        >
          {/* En-tête du sommaire avec recherche */}
          <div className="pb-3 mb-3 border-b border-border/60">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-primary shrink-0" />
                <span className="font-bold text-sm text-foreground">{toc}</span>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/80">
                {entries.length} {isAr ? 'محوراً' : 'chapitres'}
              </span>
            </div>

            {/* Champ de recherche */}
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 bg-background/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Search size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label={isAr ? 'البحث في الدليل' : 'Rechercher dans le guide'}
                placeholder={isAr ? 'بحث في الفهرس...' : 'Rechercher...'}
                className="h-auto w-full border-0 bg-transparent px-0 py-0 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-0"
              />
              {query.trim() && (
                <button type="button" onClick={() => setQuery('')} aria-label={isAr ? 'مسح البحث' : 'Effacer la recherche'} className="grid size-11 place-items-center text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </label>
          </div>

          {/* Liste des chapitres scrollable indépendamment */}
          <nav className="flex-1 overflow-y-auto modern-scrollbar pe-1" aria-label={toc}>
            <GuideNavigationList entries={entries} results={results} query={query} activeId={active?.id} isAr={isAr} onSelect={selectChapter} />
          </nav>

          {/* Pied de sidebar */}
          <div className="pt-3 mt-3 border-t border-border/60 text-[11px] text-muted-foreground text-center">
            <span>{isAr ? 'بدوح عبد المالك' : 'BOUDOUH ABDELMALEK'}</span>
            <span className="mx-1.5">·</span>
            <span>v{APP_VERSION}</span>
          </div>
        </aside>

        {/* Zone de lecture principale (Article) */}
        <main className="flex-1 min-w-0 w-full">
          <div className="guide-page-panel rounded-2xl sm:rounded-3xl border border-border/80 bg-card/90 dark:bg-card/70 shadow-sm p-5 sm:p-8 md:p-10 backdrop-blur-sm">
            {active ? (
              <article className="guide-article max-w-3xl mx-auto" aria-labelledby="guide-chapter-title">
                {/* Fil d'Ariane & Titre */}
                <header className="mb-6">
                  {currentGroupTitle && (
                    <div className="guide-eyebrow mb-2">
                      {currentGroupTitle}
                    </div>
                  )}
                  <h2
                    id="guide-chapter-title"
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-xl sm:text-3xl font-bold tracking-tight text-foreground outline-none"
                  >
                    {active.title}
                  </h2>
                  <p className="guide-summary mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    <GuideText>{active.summary}</GuideText>
                  </p>
                </header>

                {/* Figure avec légende centrée et concise */}
                {active.image && (
                  <div className="my-6">
                    <GuideFigure
                      key={`${active.image.key}-${lang}`}
                      image={active.image}
                      lang={lang}
                    />
                  </div>
                )}

                {/* Sections pédagogiques structurées */}
                <div className="space-y-6">
                  {active.sections.map((section, index) => (
                    <section key={`${active.id}-${index}`} className="border-t border-border/50 pt-5 first:border-0 first:pt-0">
                      <h3 className="text-sm sm:text-base font-bold text-foreground mb-2.5">
                        {section.title}
                      </h3>
                      {section.body && (
                        <p dir="auto" className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          <GuideText>{section.body}</GuideText>
                        </p>
                      )}
                      {section.steps && (
                        <ol className="guide-steps mt-3">
                          {section.steps.map((step, i) => (
                            <li key={i}>
                              <span dir="auto"><GuideText>{step}</GuideText></span>
                            </li>
                          ))}
                        </ol>
                      )}
                      {section.items && (
                        <dl className="guide-terms mt-3">
                          {section.items.map(item => (
                            <div key={item.term}>
                              <dt>{item.term}</dt>
                              <dd dir="auto"><GuideText>{item.detail}</GuideText></dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </section>
                  ))}
                </div>

                {/* Conseil / Astuce */}
                {active.tip && (
                  <div className="guide-tip mt-6">
                    <strong>{isAr ? 'نصيحة' : 'Conseil'}</strong> — <GuideText>{active.tip}</GuideText>
                  </div>
                )}

                {/* Sujets connexes */}
                {active.related && active.related.length > 0 && (
                  <nav className="guide-related mt-8 pt-5 border-t border-border/60" aria-label={isAr ? 'محاور ذات صلة' : 'Pour aller plus loin'}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      {isAr ? 'مواضيع ذات صلة' : 'À lire aussi'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {active.related.map(id => {
                        const entry = entries.find(item => item.id === id);
                        return entry ? (
                          <button
                            key={id}
                            type="button"
                            onClick={() => selectChapter(id, true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 hover:border-primary/50 bg-background/60 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer"
                          >
                            <span>{entry.title}</span>
                            {isAr ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                          </button>
                        ) : null;
                      })}
                    </div>
                  </nav>
                )}

                {/* Pagination des chapitres (Précédent / Suivant) */}
                <nav className="guide-pagination mt-10 pt-6 border-t border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label={isAr ? 'التنقل بين الفصول' : 'Parcourir les chapitres'}>
                  {prevEntry ? (
                    <button
                      type="button"
                      onClick={() => selectChapter(prevEntry.id)}
                      className="flex flex-col gap-1 p-3.5 sm:p-4 rounded-2xl border border-border/70 hover:border-primary/50 bg-background/50 hover:bg-muted/40 transition-all text-start cursor-pointer group"
                    >
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                        {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        <span>{isAr ? 'الفصل السابق' : 'Chapitre précédent'}</span>
                      </span>
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                        {prevEntry.title}
                      </span>
                    </button>
                  ) : <div />}

                  {nextEntry ? (
                    <button
                      type="button"
                      onClick={() => selectChapter(nextEntry.id)}
                      className="flex flex-col gap-1 p-3.5 sm:p-4 rounded-2xl border border-border/70 hover:border-primary/50 bg-background/50 hover:bg-muted/40 transition-all text-end cursor-pointer group ms-auto w-full"
                    >
                      <span className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                        <span>{isAr ? 'الفصل الموالي' : 'Chapitre suivant'}</span>
                        {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                      </span>
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                        {nextEntry.title}
                      </span>
                    </button>
                  ) : handleExit ? (
                    <button
                      type="button"
                      onClick={handleExit}
                      className="flex items-center justify-center p-3.5 sm:p-4 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs sm:text-sm transition-all ms-auto w-full cursor-pointer"
                    >
                      {isAr ? 'العودة للدفتر' : 'Revenir au cahier'}
                    </button>
                  ) : null}
                </nav>
              </article>
            ) : (
              <div className="guide-empty py-16 text-center">
                <Search size={28} className="mx-auto text-muted-foreground opacity-60 mb-3" aria-hidden="true" />
                <h2 className="text-base font-bold text-foreground">
                  {isAr ? 'لم يُعثر على نتائج مطابقة' : 'Aucun résultat trouvé'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {isAr ? 'جرّب البحث بكلمات دقيقة من قبيل: فرض، تقويم تشخيصي، استعمال الزمن، تأريخ، طباعة.' : 'Par exemple : devoir, séance, horaire, date ou impression.'}
                </p>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-4 px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted"
                >
                  <X size={12} className="inline me-1" />
                  {isAr ? 'إلغاء التصفية' : 'Effacer la recherche'}
                </button>
              </div>
            )}
          </div>

          {/* Crédit et version globale */}
          <footer className="guide-credit mt-8 mb-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-3">
            <span>{isAr ? <>الفكرة والتصميم: <bdi className="font-semibold text-foreground">بدوح عبد المالك</bdi></> : <>Idée et conception : <bdi className="font-semibold text-foreground">BOUDOUH ABDELMALEK</bdi></>}</span>
            <span>·</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/60">v{APP_VERSION}</span>
          </footer>
        </main>
      </div>
    </div>
  );
};
