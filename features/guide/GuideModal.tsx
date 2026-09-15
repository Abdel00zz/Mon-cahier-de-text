import { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDE_AR, GUIDE_FR, searchGuide } from '@/constants/guides';
import { Modal } from '@/components/ui/modal';
import { BookOpen, Search, X } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { GuideFigure } from './GuideFigure';
import { GuideText } from './GuideText';
import './guide.css';

interface GuideModalProps { isOpen: boolean; onClose: () => void }

export const GuideModal = ({ isOpen, onClose }: GuideModalProps) => {
  const { locale } = useLocale();
  const [lang, setLang] = useState<'fr' | 'ar'>(locale === 'ar' ? 'ar' : 'fr');
  const [query, setQuery] = useState('');
  const [chapterId, setChapterId] = useState('start');
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isAr = lang === 'ar';
  const entries = isAr ? GUIDE_AR : GUIDE_FR;
  const results = useMemo(() => searchGuide(entries, query), [entries, query]);
  const active = results.find(entry => entry.id === chapterId) ?? results[0];
  const activeIndex = active ? entries.indexOf(active) : -1;

  useEffect(() => {
    if (!isOpen) return;
    setLang(locale === 'ar' ? 'ar' : 'fr');
    setQuery('');
    setChapterId('start');
  }, [isOpen, locale]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [active?.id, lang, isOpen]);

  const openChapter = (id: string, clearSearch = false) => {
    if (clearSearch) setQuery('');
    setChapterId(id);
    // Content heading remains stable across chapter changes, so keyboard users
    // arrive at the article instead of having to traverse the entire contents.
    headingRef.current?.focus({ preventScroll: true });
  };
  const changeLanguage = (next: 'fr' | 'ar') => { setLang(next); setQuery(''); };
  const toc = isAr ? 'فهرس الدليل' : 'Sommaire du guide';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl"
      dir={isAr ? 'rtl' : 'ltr'}
      mobileDetents={[0.94]} initialMobileDetent={0.94}
      className="learning-guide h-[90dvh] sm:rounded-2xl"
      headerClassName="learning-guide-header" bodyClassName="learning-guide-body"
      title={
        <div className="guide-heading" dir={isAr ? 'rtl' : 'ltr'} lang={lang}>
          <span className="guide-mark"><BookOpen size={26} strokeWidth={1.8} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <span className="guide-title">{isAr ? 'دليل دفتر النصوص' : 'Guide du cahier'}</span>
            <span className="guide-subtitle">{isAr ? 'تعلّم استخدام التطبيق، خطوة بخطوة' : 'Prenez en main l’application, étape par étape'}</span>
          </div>
          <div className="guide-languages" aria-label={isAr ? 'لغة الدليل' : 'Langue du guide'}>
            <button type="button" lang="fr" aria-pressed={!isAr} onClick={() => changeLanguage('fr')}>FR</button>
            <button type="button" lang="ar" aria-pressed={isAr} onClick={() => changeLanguage('ar')}>العربية</button>
          </div>
        </div>
      }>
      <div className="guide-layout" dir={isAr ? 'rtl' : 'ltr'} lang={lang}>
        <aside className="guide-navigation" aria-label={toc}>
          <label className="guide-search">
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)}
              aria-label={isAr ? 'البحث في الدليل' : 'Rechercher dans le guide'}
              placeholder={isAr ? 'قسم، تاريخ، إشعارات…' : 'Classe, date, notifications…'} />
          </label>
          <p className="guide-result-count" role="status" aria-live="polite">
            {query.trim()
              ? (isAr ? `${results.length} محاور مطابقة` : `${results.length} résultat${results.length === 1 ? '' : 's'}`)
              : (isAr ? `${entries.length} مواضيع للمساعدة` : `${entries.length} rubriques d’aide`)}
          </p>
          <label className="guide-mobile-toc">
            <span className="sr-only">{toc}</span>
            <select value={active?.id ?? ''} disabled={!results.length} onChange={event => openChapter(event.target.value)}>
              {!results.length && <option value="">{isAr ? 'لا توجد نتائج مطابقة' : 'Aucun résultat'}</option>}
              {results.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
            </select>
          </label>
          <nav className="guide-desktop-toc" aria-label={toc}>
            <ol>{results.map(entry => <li key={entry.id}>
              <button type="button" aria-current={entry.id === active?.id ? 'page' : undefined}
                onClick={() => openChapter(entry.id)}>
                <span aria-hidden="true">{String(entries.indexOf(entry) + 1).padStart(2, '0')}</span>
                {entry.title}
              </button>
            </li>)}</ol>
          </nav>
        </aside>

        <div ref={scrollRef} className="guide-reader" tabIndex={0}
          aria-label={isAr ? 'محتوى الدليل' : 'Contenu du guide'}>
          {active ? <article className="guide-article" aria-labelledby="guide-chapter-title">
            <header>
              <p className="guide-eyebrow">{isAr ? 'دليل الاستخدام' : 'Mode d’emploi'} · {activeIndex + 1} / {entries.length}</p>
              <h2 id="guide-chapter-title" ref={headingRef} tabIndex={-1}>{active.title}</h2>
              <p className="guide-summary"><GuideText>{active.summary}</GuideText></p>
            </header>
            {active.image && <GuideFigure key={`${active.image.key}-${lang}`} image={active.image} lang={lang} />}
            {active.sections.map((section, index) => <section key={`${active.id}-${index}`}>
              <h3>{section.title}</h3>
              {section.body && <p dir="auto"><GuideText>{section.body}</GuideText></p>}
              {section.steps && <ol className="guide-steps">{section.steps.map((step, i) =>
                <li key={i}><span dir="auto"><GuideText>{step}</GuideText></span></li>)}</ol>}
              {section.items && <dl className="guide-terms">{section.items.map(item => <div key={item.term}>
                <dt>{item.term}</dt><dd dir="auto"><GuideText>{item.detail}</GuideText></dd>
              </div>)}</dl>}
            </section>)}
            {active.tip && <p className="guide-tip"><strong>{isAr ? 'نصيحة' : 'Conseil'}</strong> — <GuideText>{active.tip}</GuideText></p>}
            <nav className="guide-related" aria-label={isAr ? 'محاور ومساطر ذات صلة' : 'Pour aller plus loin'}>
              <h3>{isAr ? 'مواضيع ذات صلة' : 'À lire aussi'}</h3>
              {active.related.map(id => {
                const entry = entries.find(item => item.id === id);
                return entry && <button key={id} type="button" onClick={() => openChapter(id, true)}>{entry.title}<span aria-hidden="true">{isAr ? '←' : '→'}</span></button>;
              })}
            </nav>
            <nav className="guide-pagination" aria-label={isAr ? 'التنقل بين الفصول' : 'Parcourir les chapitres'}>
              <button type="button" disabled={activeIndex <= 0} onClick={() => openChapter(entries[activeIndex - 1].id, true)}>{isAr ? 'الفصل السابق' : 'Chapitre précédent'}</button>
              {activeIndex < entries.length - 1
                ? <button type="button" onClick={() => openChapter(entries[activeIndex + 1].id, true)}>{isAr ? 'الفصل الموالي' : 'Chapitre suivant'}</button>
                : <button type="button" onClick={onClose}>{isAr ? 'إغلاق والعودة للدفتر' : 'Fermer et revenir au cahier'}</button>}
            </nav>
          </article> : <div className="guide-empty">
            <Search size={28} aria-hidden="true" />
            <h2>{isAr ? 'لم يُعثر على نتائج مطابقة' : 'Aucun résultat trouvé'}</h2>
            <p>{isAr ? 'جرّب البحث بكلمات دقيقة من قبيل: فرض، تقويم تشخيصي، استعمال الزمن، تأريخ، طباعة.' : 'Par exemple : devoir, séance, horaire, date ou impression.'}</p>
            <button type="button" onClick={() => setQuery('')}><X size={16} aria-hidden="true" />{isAr ? 'إلغاء التصفية' : 'Effacer la recherche'}</button>
          </div>}
        </div>
      </div>
      <footer className="guide-credit" dir={isAr ? 'rtl' : 'ltr'} lang={lang}>
        {isAr ? <>الفكرة والتصميم: <bdi>بدوح عبد المالك</bdi></> : <>Idée et conception : <bdi>BOUDOUH ABDELMALEK</bdi></>}
      </footer>
    </Modal>
  );
};
