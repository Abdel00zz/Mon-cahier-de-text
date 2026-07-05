import React, { useEffect, useMemo, useRef } from 'react';
import { GUIDE_FR, GUIDE_AR } from '../../constants';
import { Dialog } from '../ui/dialog';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const slugify = (txt: string) =>
    encodeURIComponent(
      txt
        .toLowerCase()
        .replace(/<[^>]*>/g, '') // strip HTML tags like <i>
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
        .trim()
        .replace(/\s+/g, '-')
    );

  const toHtml = (markdown: string) => {
    return markdown
      .replace(/^# (.+)/gm, (_, t) => `<h1 id="${slugify(t)}" class="text-2xl font-bold font-slab mb-6 text-teal-700 text-center">${t}</h1>`)
      .replace(/^## (.+)/gm, (_, t) => `<h2 id="${slugify(t)}" class="text-xl font-semibold font-slab mt-8 mb-4 pb-2 border-b border-slate-200 text-teal-600 flex items-center gap-2">${t}</h2>`)
      .replace(/^### (.+)/gm, (_, t) => `<h3 id="${slugify(t)}" class="text-lg font-semibold mt-6 mb-3">${t}</h3>`)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-slate-100 text-red-600 px-1.5 py-0.5 rounded-md text-sm">$1</code>')
      .replace(/^---$/gm, '<hr class="my-6 border-slate-200">')
      .replace(/\[(.+?)\]\(mailto:(.+?)\)/g, '<a href="mailto:$2" class="text-teal-600 hover:underline">$1</a>')
      .replace(/<i class="(.+?)"><\/i>/g, '<i class="$1"></i>')
      .split('\n').map(p => p.trim() ? `<p class="mb-3 leading-relaxed">${p}</p>` : '').join('')
      .replace(/<p><(h[1-3]|hr)>/g, (match) => match.replace('<p>', ''))
      .replace(/<\/(h[1-3]|hr)><\/p>/g, (match) => match.replace('</p>', ''));
  };

  const htmlFr = useMemo(() => toHtml(GUIDE_FR), []);
  const htmlAr = useMemo(() => toHtml(GUIDE_AR), []);

  useEffect(() => {
    if (!isOpen) return;
    const isEditor = !!document.querySelector('[data-editor-root]');
    const isDashboard = !!document.querySelector('[data-dashboard-root]');
    const anchor = isEditor ? '#barre-doutils-haut-de-lediteur' : isDashboard ? '#tableau-de-bord' : null;
    if (!anchor) return;

    const target = document.getElementById(anchor.replace('#',''))
      || document.getElementById(encodeURIComponent(anchor.replace('#','')));
    if (!target) return;

    const left = leftRef.current;
    const right = rightRef.current;
    left?.scrollTo({ top: target.offsetTop - 24, behavior: 'smooth' });
    right?.scrollTo({ top: target.offsetTop - 24, behavior: 'smooth' });
  }, [isOpen]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Guide d'utilisation"
      description="Documentation complète en français et arabe"
      maxWidth="5xl"
      className="max-w-6xl sm:max-w-6xl h-[92vh] sm:h-[86vh]"
    >
      <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_2px_1fr] -mx-4 sm:-mx-5 -my-4 sm:-my-5 bg-slate-50 overflow-hidden">
        <div
          ref={leftRef}
          className="relative overflow-y-auto overscroll-contain bg-white"
          style={{ scrollbarGutter: 'stable', height: '100%' }}
        >
          <div className="p-4 sm:p-6 pb-12">
            <div className="prose max-w-none text-black" dangerouslySetInnerHTML={{ __html: htmlFr }} />
          </div>
        </div>
        <div className="hidden lg:block bg-gradient-to-b from-gray-200 to-gray-300" aria-hidden="true"></div>
        <div
          ref={rightRef}
          className="relative overflow-y-auto overscroll-contain bg-[#FFFBEA]"
          style={{ scrollbarGutter: 'stable', height: '100%' }}
          dir="rtl" lang="ar"
        >
          <div className="p-4 sm:p-6 pb-12">
            <div className="prose max-w-none text-right font-ar text-base sm:text-lg leading-relaxed text-black" dangerouslySetInnerHTML={{ __html: htmlAr }} />
          </div>
        </div>
      </div>
    </Dialog>
  );
};