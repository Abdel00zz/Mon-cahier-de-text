import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDE_FR, GUIDE_AR } from '@/constants';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { LangToggle, useModalLang, type ModalLang } from '@/components/ui/lang-toggle';
import { useLocale } from '@/i18n/LocaleProvider';
import { BookOpen } from '@/components/ui/icons';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/*
 * Guide REFONDU Pro Edition
 */

const LANG_KEY = 'guide_lang_v1';

/** Markdown minimal → HTML de lecture, compatible mode clair et sombre. */
const toHtml = (markdown: string, prefix: ModalLang): string => {
  let headingIndex = 0;
  const isArabic = prefix === 'ar';
  const headingFontClass = isArabic ? 'font-bold tracking-normal' : 'font-bold tracking-tight';
  const bodyClass = isArabic
    ? 'text-[16px] sm:text-[17px] leading-[2] text-muted-foreground'
    : 'text-[14px] sm:text-[15px] leading-relaxed text-muted-foreground';
  const inline = (value: string) => value
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded-lg border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground font-semibold">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="font-bold text-primary underline underline-offset-4 hover:text-primary/80">$1</a>');

  return markdown
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) {
        const t = line.replace('# ', '').trim();
        return `<h1 class="mb-4 ${headingFontClass} text-xl sm:text-2xl font-black text-foreground">${t}</h1>`;
      }
      if (line.startsWith('## ')) {
        const t = line.replace('## ', '').trim();
        const id = `${prefix}-sec-${headingIndex}`;
        headingIndex++;
        return `<h2 id="${id}" class="mb-3.5 mt-8 scroll-mt-4 ${headingFontClass} text-lg sm:text-xl font-bold text-foreground">${t}</h2>`;
      }
      if (line.startsWith('### ')) {
        const t = line.replace('### ', '').trim();
        return `<h3 class="mb-2.5 mt-5 ${headingFontClass} text-sm sm:text-base font-bold text-foreground">${t}</h3>`;
      }

      const imageMatch = line.match(/^!\[(.+?)\]\((\/guide\/[^\s)]+\.(?:png|jpe?g|webp|gif))\)$/i);
      if (imageMatch) {
        const [, caption, src] = imageMatch;
        return `<figure class="my-6 overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-xs"><img src="${src}" alt="${caption}" loading="lazy" decoding="async" class="block h-auto w-full object-contain"><figcaption class="px-4 py-3 text-center text-xs font-semibold leading-relaxed text-muted-foreground">${caption}</figcaption></figure>`;
      }

      const numListMatch = line.match(/^([0-9]+)\. \*\*(.+?)\*\* : (.+)$/);
      if (numListMatch) {
        const [, , title, desc] = numListMatch;
        return `<section class="mb-5 p-4 rounded-2xl border border-border/60 bg-card/60 shadow-xs"><h3 class="mb-1 ${headingFontClass} text-sm sm:text-base font-bold text-foreground">${title}</h3><p class="${bodyClass}">${inline(desc)}</p></section>`;
      }

      const boldBulletMatch = line.match(/^- \*\*(.+?)\*\* : (.+)$/);
      if (boldBulletMatch) {
        const [, title, desc] = boldBulletMatch;
        return `<section class="mb-5 p-4 rounded-2xl border border-border/60 bg-card/60 shadow-xs"><h3 class="mb-1 ${headingFontClass} text-sm sm:text-base font-bold text-foreground">${title}</h3><p class="${bodyClass}">${inline(desc)}</p></section>`;
      }

      if (line.startsWith('- ')) {
        const content = inline(line.replace('- ', '').trim());
        return `<div class="mb-2.5 flex items-start gap-2.5"><span class="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span><span class="${bodyClass}">${content}</span></div>`;
      }

      if (line.trim() === '---') return '<div class="h-4" aria-hidden="true"></div>';
      if (!line.trim()) return '';

      return `<p class="mb-4 ${bodyClass}">${inline(line)}</p>`;
    })
    .join('\n');
};

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const { locale } = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);
  const { lang, setLang: persistLang } = useModalLang(LANG_KEY, locale === 'ar' ? 'ar' : 'fr');
  const [activeSection, setActiveSection] = useState<string>('sec-0');

  const setLang = (next: ModalLang) => {
    persistLang(next);
    setActiveSection('sec-0');
    contentRef.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (isOpen) setActiveSection('sec-0');
  }, [isOpen]);

  const isAr = lang === 'ar';
  const html = useMemo(() => toHtml(isAr ? GUIDE_AR : GUIDE_FR, lang), [lang, isAr]);

  const handleScroll = () => {
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
          <div dir={isAr ? 'rtl' : 'ltr'} className={`flex items-center gap-3 ${isAr ? 'text-right' : 'text-left'}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <BookOpen className="h-5 w-5 stroke-[2.2]" />
            </span>
            <div>
              <span className={`${isAr ? 'font-bold tracking-normal' : 'font-bold tracking-tight'} text-lg sm:text-xl text-foreground block`}>
                {isAr ? 'دليل الاستخدام' : "Guide d'utilisation"}
              </span>
              <span className="block text-xs font-medium text-muted-foreground mt-0.5">
                {isAr ? 'الأساسيات خطوة بخطوة, ببساطة ووضوح' : "L'essentiel pas à pas, simple et complet"}
              </span>
            </div>
          </div>

          <LangToggle
            lang={lang}
            onChange={setLang}
            labels={{ fr: 'Français', ar: 'العربية' }}
            className="self-start sm:self-center"
          />
        </div>
      }
      maxWidth="5xl"
      hideClose={false}
      className="h-[92vh] max-w-5xl overflow-hidden sm:h-[88vh] sm:rounded-[32px]"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      bodyClassName="flex flex-col overflow-hidden bg-card p-0 sm:p-0"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      footer={
        <div className={`flex w-full ${isAr ? 'justify-start' : 'justify-end'}`}>
          <Button type="button" dir={isAr ? 'rtl' : 'ltr'} onClick={onClose} className="rounded-xl h-10 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto text-xs sm:text-sm shadow-sm">
            {isAr ? 'إغلاق' : 'Fermer le guide'}
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-card text-card-foreground">
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto overscroll-contain"
          style={{ scrollbarGutter: 'stable', height: '100%' }}
          dir={isAr ? 'rtl' : 'ltr'}
          lang={lang}
        >
          <div className="mx-auto max-w-4xl px-5 py-6 sm:px-10 sm:py-8">
            <div
              className={`max-w-none ${isAr ? 'text-right' : ''}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
