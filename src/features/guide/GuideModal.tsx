import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { GUIDE_AR, GUIDE_FR, searchGuide } from '@/constants/guides';
import type { GuideReference } from '@/constants/guide/model';
import { Modal } from '@/components/ui/modal';
import { Search, X } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { GuideText } from './GuideText';
import './guide.css';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusRequest?: GuideReference | null;
  initialReference?: GuideReference | null;
  variant?: 'modal' | 'page';
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, focusRequest = null, initialReference = null, variant = 'modal' }) => {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const isAr = locale === 'ar';
  const entries = isAr ? GUIDE_AR : GUIDE_FR;
  const reference = focusRequest ?? initialReference;
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [target, setTarget] = useState<GuideReference | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchGuide(entries, query), [entries, query]);

  useEffect(() => {
    setQuery('');
    setOpenId(isOpen && reference && entries.some(entry => entry.id === reference.chapterId) ? reference.chapterId : null);
    setTarget(isOpen ? reference : null);
  }, [isOpen, reference, entries]);

  useEffect(() => {
    if (!isOpen || !target) return;
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
  }, [isOpen, openId, target, reduced]);

  if (!isOpen) return null;

  const openChapter = (chapterId: string) => {
    setQuery('');
    setOpenId(chapterId);
    setTarget({ chapterId });
  };

  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} dir={isAr ? 'rtl' : 'ltr'}
      maxWidth="2xl" mobilePresentation={variant === 'page' ? 'dialog' : 'sheet'}
      mobileMaxHeight={0.94} dragHandle={variant !== 'page'} swipeToDismiss={variant !== 'page'}
      className="hub-modal learning-guide-modal learning-guide"
      headerClassName="hub-modal-header learning-guide-modal-header"
      bodyClassName="hub-modal-body learning-guide-modal-body"
      title={<span className="guide-heading" data-codex-title>
        <span className="guide-title">{isAr ? 'المساعدة' : 'Aide'}</span>
        <span className="guide-subtitle">{isAr ? 'أجوبة سريعة لأسئلتك' : 'Réponses rapides à vos questions'}</span>
      </span>}
    >
      <div className="guide-search">
        <Search size={18} aria-hidden="true" />
        <input ref={searchRef} type="search" value={query}
          onChange={event => { setQuery(event.target.value); setTarget(null); }}
          placeholder={isAr ? 'ابحث عن سؤال…' : 'Rechercher une question…'}
          aria-label={isAr ? 'البحث في المساعدة' : 'Rechercher dans l’aide'} />
        {query && <button type="button" onClick={clearSearch}
          aria-label={isAr ? 'مسح البحث' : 'Effacer la recherche'}><X size={17} aria-hidden="true" /></button>}
      </div>
      <div ref={contentRef} className="guide-main">
        {results.length === 0 ? <div className="guide-empty" role="status">
          <Search size={28} aria-hidden="true" />
          <p>{isAr ? 'لا توجد نتائج مطابقة لبحثك.' : 'Aucune réponse pour cette recherche.'}</p>
          <button type="button" onClick={clearSearch}>{isAr ? 'عرض جميع الأسئلة' : 'Voir toutes les questions'}</button>
        </div> : <div className="guide-questions">
          {results.map(entry => <details key={entry.id} open={openId === entry.id} data-guide-chapter={entry.id}>
            <summary onClick={event => {
              event.preventDefault();
              setTarget(null);
              setOpenId(current => current === entry.id ? null : entry.id);
            }}>
              <span>{entry.title}</span><span className="guide-plus" aria-hidden="true">+</span>
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
                  const related = entries.find(item => item.id === id);
                  return related && <button key={id} type="button" onClick={() => openChapter(id)}>{related.title}</button>;
                })}
              </div>}
            </div>}
          </details>)}
        </div>}
        <p className="guide-credit" aria-label={isAr ? 'إعداد وتصميم التطبيق' : 'Conception et réalisation'}>
          <span dir="ltr">BOUDOUH ABDELMALEK</span><span aria-hidden="true"> · </span><span dir="rtl" lang="ar">بدوح عبد المالك</span>
        </p>
      </div>
    </Modal>
  );
};
