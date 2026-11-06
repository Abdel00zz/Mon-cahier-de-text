import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { GUIDE_AR, GUIDE_FR, createGuideSearch } from '@/constants/guides';
import type { GuideReference } from '@/constants/guide/model';
import { GUIDE_GROUPS } from '@/constants/guide/groups';
import { Search, X, ChevronDown, BookOpen, Settings, CheckSquare, LayoutGrid } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { GuideText } from './GuideText';
import './guide.css';

interface GuideContentProps { reference?: GuideReference | null; }
const GROUP_ICONS = { start: LayoutGrid, notebook: BookOpen, teaching: CheckSquare, application: Settings };
export function GuideContent({ reference = null }: GuideContentProps) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const isAr = locale === 'ar';
  const entries = isAr ? GUIDE_AR : GUIDE_FR;
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [target, setTarget] = useState<GuideReference | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useMemo(() => createGuideSearch(entries), [entries]);
  const results = useMemo(() => search(query), [search, query]);
  const entriesById = useMemo(() => new Map(entries.map(entry => [entry.id, entry])), [entries]);

  useEffect(() => {
    setQuery('');
    setOpenId(reference && entries.some(entry => entry.id === reference.chapterId) ? reference.chapterId : null);
    setTarget(reference);
  }, [reference, entries]);

  useEffect(() => {
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      const container = contentRef.current;
      const chapter = container?.querySelector<HTMLElement>(`[data-guide-chapter="${CSS.escape(target.chapterId)}"]`);
      const section = target.sectionId
        ? chapter?.querySelector<HTMLElement>(`[data-guide-section="${CSS.escape(target.sectionId)}"]`)
        : null;
      const anchor = section ?? chapter?.querySelector<HTMLElement>('summary');
      anchor?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' });
      anchor?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openId, target, reduced]);


  const openChapter = (chapterId: string) => {
    setQuery('');
    setOpenId(chapterId);
    setTarget({ chapterId });
  };

  const clearSearch = () => {
    setQuery('');
    if (contentRef.current) contentRef.current.scrollTop = 0;
    searchRef.current?.focus();
  };

  const goToGroup = (id: string) => {
    const heading = contentRef.current?.querySelector<HTMLElement>(`#guide-group-${id}`);
    heading?.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
    heading?.focus({ preventScroll: true });
  };

  return (
    <>
      <div className="guide-search">
        <Search size={18} aria-hidden="true" />
        <input ref={searchRef} type="search" value={query}
          onChange={event => {
            if (contentRef.current) contentRef.current.scrollTop = 0;
            setQuery(event.target.value);
            setTarget(null);
          }}
          placeholder={isAr ? 'ابحث عن سؤال…' : 'Rechercher une question…'}
          aria-label={isAr ? 'البحث في المساعدة' : 'Rechercher dans l’aide'} />
        {query && <button type="button" onClick={clearSearch}
          aria-label={isAr ? 'مسح البحث' : 'Effacer la recherche'}><X size={17} aria-hidden="true" /></button>}
      </div>
      <div className="guide-layout" data-searching={Boolean(query.trim())}>
        {!query.trim() && <nav className="guide-directory" aria-label={isAr ? 'مواضيع المساعدة' : 'Rubriques de l’aide'}>
          {GUIDE_GROUPS.map(group => {
            const Icon = GROUP_ICONS[group.id as keyof typeof GROUP_ICONS];
            return <button key={group.id} type="button" onClick={() => goToGroup(group.id)}>
              <Icon size={18} aria-hidden="true" /><span>{isAr ? group.ar : group.fr}</span>
            </button>;
          })}
        </nav>}
      <div ref={contentRef} className="guide-main">
        {query.trim() && results.length > 0 && <p className="guide-result-count" role="status" aria-atomic="true">
          {isAr
            ? `عدد النتائج: ${results.length}`
            : `${results.length} rubrique${results.length > 1 ? 's' : ''} trouvée${results.length > 1 ? 's' : ''}`}
        </p>}
        {results.length === 0 ? <div className="guide-empty" role="status">
          <Search size={28} aria-hidden="true" />
          <p>{isAr ? 'لا توجد نتائج مطابقة لبحثك.' : 'Aucune réponse pour cette recherche.'}</p>
          <button type="button" onClick={clearSearch}>{isAr ? 'عرض جميع الأسئلة' : 'Voir toutes les questions'}</button>
        </div> : <div className="guide-groups">
          {GUIDE_GROUPS.map(group => {
            const groupEntries = results.filter(entry => group.chapters.includes(entry.id));
            return groupEntries.length > 0 && <section key={group.id} className="guide-group" aria-labelledby={`guide-group-${group.id}`}>
            <h2 id={`guide-group-${group.id}`} tabIndex={-1} className="guide-group__title">{isAr ? group.ar : group.fr}</h2>
            <div className="guide-questions">{groupEntries.map(entry => <details key={entry.id} open={openId === entry.id} data-guide-chapter={entry.id} data-route-focus={target?.chapterId === entry.id || undefined}>
            <summary onClick={event => {
              event.preventDefault();
              setTarget(null);
              setOpenId(current => current === entry.id ? null : entry.id);
            }}>
              <span>{entry.title}</span><ChevronDown className="guide-chevron" size={16} aria-hidden="true" />
            </summary>
            {openId === entry.id && <div className="guide-answer">
              <p className="guide-summary"><GuideText>{entry.summary}</GuideText></p>
              {entry.sections.map(section => <section key={section.id ?? section.title}
                data-guide-section={section.id} tabIndex={-1}
                className={target?.sectionId === section.id && target?.chapterId === entry.id ? 'is-focused' : undefined}>
                <h3>{section.title}</h3>
                {section.body && <p><GuideText>{section.body}</GuideText></p>}
                {section.steps && <ol>{section.steps.map((step, index) => <li key={index}><GuideText>{step}</GuideText></li>)}</ol>}
                {section.items && <dl>{section.items.map(item => <div key={item.term}>
                  <dt><GuideText>{item.term}</GuideText></dt><dd><GuideText>{item.detail}</GuideText></dd>
                </div>)}</dl>}
              </section>)}
              {entry.tip && <p className="guide-tip"><GuideText>{entry.tip}</GuideText></p>}
              {entry.related.length > 0 && <div className="guide-related">
                <span>{isAr ? 'مواضيع ذات صلة' : 'Voir aussi'}</span>
                {entry.related.map(id => {
                  const related = entriesById.get(id);
                  return related && <button key={id} type="button" onClick={() => openChapter(id)}>{related.title}</button>;
                })}
              </div>}
            </div>}
          </details>)}</div></section>;
          })}
        </div>}
        <p className="guide-credit" aria-label={isAr ? 'إعداد وتصميم التطبيق' : 'Conception et réalisation'}>
          <span dir="ltr">BOUDOUH ABDELMALEK</span><span aria-hidden="true"> · </span><span dir="rtl" lang="ar">بدوح عبد المالك</span>
        </p>
      </div>
      </div>
    </>
  );
};
