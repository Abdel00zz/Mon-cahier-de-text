import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDE_FR, GUIDE_AR } from '../../constants';
import { Modal } from '../ui/modal';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Lang = 'fr' | 'ar';
const LANG_KEY = 'guide_lang_v1';

/*
 * Guide REFONDU — esprit « papier doux » :
 *  — UNE langue à la fois (séparation nette FR / AR), choix mémorisé ;
 *  — colonne de lecture étroite et très aérée (respiration entre sections) ;
 *  — sommaire monolingue (latéral sur ordinateur, chips sur mobile) ;
 *  — palette papier chaud (#fdfbf7 / #f4f1ea / #e8e4d9, sauge, terracotta).
 */

const readLang = (): Lang => {
  try {
    return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'fr';
  } catch {
    return 'fr';
  }
};

/** markdown minimal → HTML « papier » (titres, cartes numérotées, cartes à rail, puces) */
const toHtml = (markdown: string, prefix: Lang): string => {
  let headingIndex = 0;
  return markdown
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) {
        const t = line.replace('# ', '').trim();
        return `<h1 class="text-3xl font-black font-display mb-3 text-[#2f3e46] tracking-tight">${t}</h1>`;
      }
      if (line.startsWith('## ')) {
        const t = line.replace('## ', '').trim();
        const id = `${prefix}-sec-${headingIndex}`;
        headingIndex++;
        return `<h2 id="${id}" class="text-xl font-extrabold font-display mt-14 mb-6 pb-3 border-b-2 border-[#e8e4d9] text-[#2f3e46] scroll-mt-4">${t}</h2>`;
      }
      if (line.startsWith('### ')) {
        const t = line.replace('### ', '').trim();
        return `<h3 class="text-base font-bold font-display mt-8 mb-4 text-[#2f3e46]">${t}</h3>`;
      }

      // « 1. **Titre** : description » → carte numérotée (pastille terracotta)
      const numListMatch = line.match(/^([0-9]+)\. \*\*(.+?)\*\* : (.+)$/);
      if (numListMatch) {
        const [, num, title, desc] = numListMatch;
        return `<div class="flex gap-4 items-start rounded-2xl border-2 border-[#e8e4d9] bg-[#fdfbf7] p-5 mb-4 shadow-sm"><div class="flex-shrink-0 w-9 h-9 rounded-full bg-[#fff3ec] border border-[#ffd6c2] text-[#e76f51] font-black flex items-center justify-center font-mono">${num}</div><div class="min-w-0 flex-1"><div class="font-bold text-[#2f3e46] font-display mb-1.5 text-[15px]">${title}</div><div class="text-[#52796f] text-[13.5px] leading-relaxed">${desc}</div></div></div>`;
      }

      // « - **Titre** : description » → carte à rail sauge
      const boldBulletMatch = line.match(/^- \*\*(.+?)\*\* : (.+)$/);
      if (boldBulletMatch) {
        const [, title, desc] = boldBulletMatch;
        return `<div class="relative overflow-hidden rounded-2xl border-2 border-[#e8e4d9] bg-[#fdfbf7] p-5 mb-4 shadow-sm"><div class="absolute start-0 top-0 bottom-0 w-1.5 bg-[#84a98c]"></div><div class="font-bold text-[#2f3e46] font-display mb-1.5 text-[15px]">${title}</div><div class="text-[#52796f] text-[13.5px] leading-relaxed">${desc}</div></div>`;
      }

      // puce simple
      if (line.startsWith('- ')) {
        const content = line.replace('- ', '').trim();
        return `<div class="flex gap-3 mb-3 items-start"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#84a98c]"></span><span class="text-[#52796f] text-[14px] leading-relaxed">${content}</span></div>`;
      }

      if (line.trim() === '---') return '<hr class="my-8 border-[#e8e4d9]">';
      if (!line.trim()) return '';

      const html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[#2f3e46]">$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="bg-[#f4f1ea] text-[#c05a38] px-1.5 py-0.5 rounded-md text-xs font-mono border border-[#e8e4d9]">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#52796f] font-semibold underline underline-offset-2 hover:text-[#2f3e46] transition-colors">$1</a>');

      return `<p class="mb-4 text-[14px] text-[#52796f] leading-relaxed">${html}</p>`;
    })
    .join('\n');
};

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [lang, setLangState] = useState<Lang>(readLang);
  const [activeSection, setActiveSection] = useState<string>('sec-0');
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // stockage indisponible : le choix vaut pour cette session
    }
    // changement de langue = nouveau document : retour en haut
    setActiveSection('sec-0');
    contentRef.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (isOpen) setActiveSection('sec-0');
  }, [isOpen]);

  const isAr = lang === 'ar';
  const html = useMemo(() => toHtml(isAr ? GUIDE_AR : GUIDE_FR, lang), [lang, isAr]);

  const tocItems = useMemo(() => {
    const source = isAr ? GUIDE_AR : GUIDE_FR;
    return source
      .split('\n')
      .filter(l => l.startsWith('## '))
      .map((l, i) => ({ label: l.replace('## ', '').trim(), id: `sec-${i}` }));
  }, [isAr]);

  const handleScrollTo = (sectionId: string) => {
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimeoutRef.current) window.clearTimeout(programmaticScrollTimeoutRef.current);
    setActiveSection(sectionId);

    const container = contentRef.current;
    const target = document.getElementById(`${lang}-${sectionId}`);
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      // scroll INSTANTANÉ (affectation directe) : les défilements « smooth »
      // programmés sont annulés dans certains moteurs — la fiabilité prime.
      container.scrollTop = targetRect.top - containerRect.top + container.scrollTop - 16;
    }
    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 150);
  };

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    const container = contentRef.current;
    if (!container) return;
    let current = activeSection;
    for (const header of Array.from(container.querySelectorAll('h2'))) {
      const rect = header.getBoundingClientRect();
      if (rect.top - container.getBoundingClientRect().top < 120) {
        current = header.id.replace(`${lang}-`, '');
      }
    }
    if (current !== activeSection) setActiveSection(current);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex w-full select-none flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div dir={isAr ? 'rtl' : 'ltr'} className={isAr ? 'text-right font-ar' : 'text-left'}>
            <span className="font-display text-lg font-extrabold text-[#2f3e46]">
              {isAr ? 'دليل الاستخدام' : "Guide d'utilisation"}
            </span>
            <span className="block text-xs font-semibold text-[#84a98c]">
              {isAr ? 'الأساسيات خطوة بخطوة — ببساطة ووضوح' : "L'essentiel pas à pas — simple et complet"}
            </span>
          </div>

          {/* Bascule de langue : UNE langue à la fois, choix mémorisé */}
          <div className="flex shrink-0 items-center self-start rounded-full border border-[#e8e4d9] bg-[#f4f1ea] p-0.5 sm:self-center">
            {(['fr', 'ar'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-extrabold transition-all duration-200 ${
                  lang === l ? 'bg-[#52796f] text-white shadow-sm' : 'text-[#84a98c] hover:text-[#52796f]'
                }`}
              >
                {l === 'fr' ? 'Français' : 'العربية'}
              </button>
            ))}
          </div>
        </div>
      }
      maxWidth="5xl"
      className="flex h-[94vh] max-w-6xl flex-col overflow-hidden p-0 sm:h-[88vh] sm:max-w-6xl"
    >
      {/* Chips d'ancrage — mobile, dans la langue active */}
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="no-scrollbar flex shrink-0 select-none items-center gap-1.5 overflow-x-auto border-b border-[#e8e4d9] bg-[#f4f1ea]/60 px-3 py-2.5 lg:hidden"
      >
        {tocItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleScrollTo(item.id)}
            className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition-all duration-200 ${isAr ? 'font-ar' : ''} ${
              activeSection === item.id
                ? 'bg-[#52796f] text-white shadow-sm'
                : 'bg-[#fdfbf7] text-[#84a98c] border border-[#e8e4d9] hover:text-[#52796f]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid h-full flex-1 grid-cols-1 overflow-hidden bg-[#fdfbf7] lg:grid-cols-[250px_1fr]">
        {/* Sommaire latéral — ordinateur, monolingue */}
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className="custom-scrollbar hidden w-[250px] shrink-0 select-none flex-col overflow-y-auto border-e border-[#e8e4d9] bg-[#f4f1ea]/50 p-4 lg:flex"
        >
          <div className={`mb-4 px-2 text-[10px] font-black uppercase tracking-wider text-[#84a98c] ${isAr ? 'font-ar' : ''}`}>
            {isAr ? 'الفهرس' : 'Sommaire'}
          </div>
          <nav className="space-y-1.5">
            {tocItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleScrollTo(item.id)}
                className={`w-full cursor-pointer rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold leading-snug transition-all duration-200 ${
                  isAr ? 'text-right font-ar' : 'text-left'
                } ${
                  activeSection === item.id
                    ? 'bg-[#52796f] text-white shadow-sm'
                    : 'text-[#52796f] hover:bg-[#e8f0ec] hover:text-[#2f3e46]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Corps de lecture — colonne étroite très AÉRÉE, une seule langue */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="custom-scrollbar relative flex-1 overflow-y-auto overscroll-contain"
          style={{ scrollbarGutter: 'stable', height: '100%' }}
          dir={isAr ? 'rtl' : 'ltr'}
          lang={lang}
        >
          <div className="mx-auto max-w-2xl px-5 py-8 pb-24 sm:px-8 sm:py-12">
            <div
              className={`max-w-none ${isAr ? 'font-ar text-right text-[15px] leading-loose' : ''}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
