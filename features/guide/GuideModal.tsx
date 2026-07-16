import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDE_FR, GUIDE_AR } from '@/constants';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

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

/** Markdown minimal → HTML de lecture, volontairement léger et sans grandes cartes. */
const toHtml = (markdown: string, prefix: Lang): string => {
  let headingIndex = 0;
  const isArabic = prefix === 'ar';
  const headingFontClass = isArabic ? 'font-ar' : 'font-display';
  const bodyClass = isArabic
    ? 'text-[17px] leading-[2] text-slate-700 sm:text-[18px]'
    : 'text-[15px] leading-7 text-slate-600 sm:text-base';
  const inline = (value: string) => value
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-extrabold text-slate-950">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded-md border border-[#e2cf8f] bg-[#f3e5b6] px-1.5 py-0.5 font-mono text-[0.82em] text-slate-800">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="font-bold text-primary underline underline-offset-4 hover:text-primary/80">$1</a>');

  return markdown
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) {
        const t = line.replace('# ', '').trim();
        return `<h1 class="mb-3 ${headingFontClass} text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">${t}</h1>`;
      }
      if (line.startsWith('## ')) {
        const t = line.replace('## ', '').trim();
        const id = `${prefix}-sec-${headingIndex}`;
        headingIndex++;
        return `<h2 id="${id}" class="mb-5 mt-12 scroll-mt-4 pb-1 ${headingFontClass} text-2xl font-black text-slate-950 sm:text-[26px]">${t}</h2>`;
      }
      if (line.startsWith('### ')) {
        const t = line.replace('### ', '').trim();
        return `<h3 class="mb-3 mt-8 ${headingFontClass} text-lg font-extrabold text-slate-950 sm:text-xl">${t}</h3>`;
      }

      // Les illustrations peuvent être remplacées sans toucher au composant :
      // captures statiques ou animations GIF, avec les formats web usuels.
      const imageMatch = line.match(/^!\[(.+?)\]\((\/guide\/[^\s)]+\.(?:png|jpe?g|webp|gif))\)$/i);
      if (imageMatch) {
        const [, caption, src] = imageMatch;
        return `<figure class="my-7 overflow-hidden rounded-2xl border border-[#e5d59f] bg-[#fffdf4] shadow-sm"><img src="${src}" alt="${caption}" loading="lazy" decoding="async" class="block h-auto w-full bg-[#fffdf4] object-contain"><figcaption class="px-4 py-3 text-center text-sm font-bold leading-relaxed text-slate-600">${caption}</figcaption></figure>`;
      }

      // Les étapes restent structurées, sans boîte ni pastille numérotée.
      const numListMatch = line.match(/^([0-9]+)\. \*\*(.+?)\*\* : (.+)$/);
      if (numListMatch) {
        const [, , title, desc] = numListMatch;
        return `<section class="mb-6"><h3 class="mb-1.5 ${headingFontClass} text-lg font-black text-slate-950 sm:text-xl">${title}</h3><p class="${bodyClass}">${inline(desc)}</p></section>`;
      }

      // Les actions quotidiennes utilisent le même rythme éditorial léger.
      const boldBulletMatch = line.match(/^- \*\*(.+?)\*\* : (.+)$/);
      if (boldBulletMatch) {
        const [, title, desc] = boldBulletMatch;
        return `<section class="mb-6"><h3 class="mb-1.5 ${headingFontClass} text-lg font-black text-slate-950 sm:text-xl">${title}</h3><p class="${bodyClass}">${inline(desc)}</p></section>`;
      }

      // puce simple
      if (line.startsWith('- ')) {
        const content = inline(line.replace('- ', '').trim());
        return `<div class="mb-3 flex items-start gap-3"><span class="mt-[0.85em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span><span class="${bodyClass}">${content}</span></div>`;
      }

      if (line.trim() === '---') return '<div class="h-4" aria-hidden="true"></div>';
      if (!line.trim()) return '';

      return `<p class="mb-5 ${bodyClass}">${inline(line)}</p>`;
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
        <div className={`flex w-full select-none flex-col justify-between gap-3 sm:items-center ${isAr ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
          <div dir={isAr ? 'rtl' : 'ltr'} className={isAr ? 'text-right font-ar' : 'text-left'}>
            <span className={`${isAr ? 'font-ar' : 'font-display'} text-lg font-extrabold text-slate-800`}>
              {isAr ? 'دليل الاستخدام' : "Guide d'utilisation"}
            </span>
            <span className="block text-xs font-semibold text-slate-500">
              {isAr ? 'الأساسيات خطوة بخطوة — ببساطة ووضوح' : "L'essentiel pas à pas — simple et complet"}
            </span>
          </div>

          {/* Bascule de langue : UNE langue à la fois, choix mémorisé */}
          <div className="flex shrink-0 items-center self-start rounded-full border border-slate-200 bg-slate-100 p-0.5 sm:self-center">
            {(['fr', 'ar'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-extrabold transition-all duration-200 ${
                  lang === l ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-primary'
                }`}
              >
                {l === 'fr' ? 'Français' : 'العربية'}
              </button>
            ))}
          </div>
        </div>
      }
      maxWidth="5xl"
      className="h-[94vh] max-w-6xl overflow-hidden sm:h-[88vh] sm:max-w-6xl"
      bodyClassName="flex flex-col overflow-hidden bg-white p-0 sm:p-0"
      footer={
        <div className={`flex w-full ${isAr ? 'justify-start' : 'justify-end'}`}>
          <Button type="button" dir={isAr ? 'rtl' : 'ltr'} onClick={onClose} className="w-full px-4 font-bold sm:w-auto">
            {isAr ? '\u0625\u063a\u0644\u0627\u0642' : 'Fermer'}
          </Button>
        </div>
      }
    >
      {/* Chips d'ancrage — mobile, dans la langue active */}
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="no-scrollbar flex shrink-0 select-none items-center gap-1.5 overflow-x-auto border-b border-slate-200/80 bg-slate-50/90 px-3 py-2.5 lg:hidden"
      >
        {tocItems.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleScrollTo(item.id)}
            className={`shrink-0 cursor-pointer rounded-full px-3.5 py-2 font-extrabold transition-all duration-200 ${isAr ? 'font-ar text-[13px]' : 'text-[11px]'} ${
              activeSection === item.id
                ? 'bg-primary text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-primary/25 hover:text-primary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={`grid h-full flex-1 grid-cols-1 overflow-hidden bg-card ${isAr ? 'lg:grid-cols-[1fr_250px]' : 'lg:grid-cols-[250px_1fr]'}`}>
        {/* Sommaire latéral — ordinateur, monolingue */}
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className={`custom-scrollbar hidden w-[250px] shrink-0 select-none flex-col overflow-y-auto border-slate-200/80 bg-slate-50/75 p-4 lg:flex ${isAr ? 'border-l lg:order-2' : 'border-r lg:order-1'}`}
        >
          <div className={`mb-4 px-2 font-black uppercase tracking-wider text-slate-400 ${isAr ? 'font-ar text-sm' : 'text-[10px]'}`}>
            {isAr ? 'الفهرس' : 'Sommaire'}
          </div>
          <nav className="space-y-1.5">
            {tocItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleScrollTo(item.id)}
                className={`w-full cursor-pointer rounded-xl px-3.5 py-2.5 font-bold transition-all duration-200 ${
                  isAr ? 'text-right font-ar text-[15px] leading-7' : 'text-left text-[12.5px] leading-snug'
                } ${
                  activeSection === item.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
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
          className={`guide-paper-surface custom-scrollbar relative flex-1 overflow-y-auto overscroll-contain ${isAr ? 'lg:order-1' : 'lg:order-2'}`}
          style={{ scrollbarGutter: 'stable', height: '100%' }}
          dir={isAr ? 'rtl' : 'ltr'}
          lang={lang}
        >
          <div className="mx-auto max-w-3xl px-5 py-8 pb-24 sm:px-10 sm:py-12">
            <div
              className={`max-w-none ${isAr ? 'font-ar text-right' : ''}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
