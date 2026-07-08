import React, { useEffect, useMemo, useRef } from 'react';
import { GUIDE_FR, GUIDE_AR } from '../../constants';
import { Modal } from '../ui/modal';

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
      .replace(/^# (.+)/gm, (_, t) => `<h1 id="${slugify(t)}" class="text-3xl font-bold font-display mb-8 text-primary text-center tracking-tight">${t}</h1>`)
      .replace(/^## (.+)/gm, (_, t) => `<h2 id="${slugify(t)}" class="text-xl font-bold font-display mt-10 mb-5 pb-2 border-b border-border/60 text-foreground flex items-center gap-2">${t}</h2>`)
      .replace(/^### (.+)/gm, (_, t) => `<h3 id="${slugify(t)}" class="text-lg font-semibold font-display mt-6 mb-3 text-foreground">${t}</h3>`)
      
      // Convert numbered lists to cards with numbers
      .replace(/^([0-9]+)\. \*\*(.+?)\*\* : (.+)$/gm, '<div class="group bg-card border border-border/60 rounded-2xl p-5 shadow-sm mb-4 hover:-translate-y-1 hover:shadow-md hover:border-primary/40 transition-all duration-300 ease-out flex gap-4 items-start"><div class="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-primary font-bold flex items-center justify-center font-mono mt-0.5 group-hover:bg-primary group-hover:text-card transition-colors">$1</div><div><div class="font-bold text-foreground font-display mb-1.5 text-base group-hover:text-primary transition-colors">$2</div><div class="text-muted-foreground text-[15px] leading-relaxed">$3</div></div></div>')
      
      // Convert standard bold bullet lists to cards
      .replace(/^- \*\*(.+?)\*\* : (.+)$/gm, '<div class="group bg-card border border-border/60 rounded-2xl p-5 shadow-sm mb-4 hover:-translate-y-1 hover:shadow-md hover:border-primary/40 transition-all duration-300 ease-out relative overflow-hidden"><div class="absolute start-0 top-0 bottom-0 w-1.5 bg-border group-hover:bg-primary transition-colors"></div><div class="font-bold text-foreground font-display mb-1.5 text-base group-hover:text-primary transition-colors">$1</div><div class="text-muted-foreground text-[15px] leading-relaxed">$2</div></div>')
      
      // Convert unbolded bullet lists to smaller cards
      .replace(/^- (.+?) : (.+)$/gm, '<div class="group bg-card border border-border/60 rounded-xl p-4 shadow-sm mb-3 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 transition-all duration-300 ease-out"><div class="font-bold text-foreground font-display mb-1 text-[15px] group-hover:text-primary transition-colors">$1</div><div class="text-muted-foreground text-[14px] leading-relaxed">$2</div></div>')
      
      // Fallback for any other standard lists
      .replace(/^- (.+)$/gm, '<div class="flex gap-2 mb-2"><span class="text-primary mt-1">•</span><span class="text-muted-foreground text-[15px] leading-relaxed">$1</span></div>')
      
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-secondary text-primary px-1.5 py-0.5 rounded-md text-sm font-mono border border-border/40">$1</code>')
      .replace(/^---$/gm, '<hr class="my-8 border-border/40">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary font-medium hover:underline transition-colors">$1</a>')
      .split('\n')
      .map(p => {
         if (!p.trim()) return '';
         if (p.startsWith('<div') || p.startsWith('<h') || p.startsWith('<hr') || p.startsWith('<ul') || p.startsWith('<ol')) return p;
         return `<p class="mb-4 text-[15px] text-muted-foreground leading-relaxed">${p}</p>`;
      })
      .join('');
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guide d'utilisation"
      description="Documentation complète en français et arabe"
      maxWidth="5xl"
      className="max-w-6xl sm:max-w-6xl h-[92vh] sm:h-[86vh]"
    >
      <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_2px_1fr] -mx-4 sm:-mx-5 -my-4 sm:-my-5 bg-secondary overflow-hidden">
        <div
          ref={leftRef}
          className="relative overflow-y-auto overscroll-contain bg-secondary/40"
          style={{ scrollbarGutter: 'stable', height: '100%' }}
        >
          <div className="p-4 sm:p-8 pb-16">
            <div className="prose max-w-none text-black" dangerouslySetInnerHTML={{ __html: htmlFr }} />
          </div>
        </div>
        <div className="hidden lg:block bg-gradient-to-b from-[#E4D3AC]/60 to-[#E4D3AC]/20" aria-hidden="true"></div>
        <div
          ref={rightRef}
          className="relative overflow-y-auto overscroll-contain bg-card"
          style={{ scrollbarGutter: 'stable', height: '100%' }}
          dir="rtl" lang="ar"
        >
          <div className="p-4 sm:p-8 pb-16">
            <div className="prose max-w-none text-right font-ar text-base sm:text-lg leading-relaxed text-black" dangerouslySetInnerHTML={{ __html: htmlAr }} />
          </div>
        </div>
      </div>
    </Modal>
  );
};