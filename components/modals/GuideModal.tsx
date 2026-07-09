import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDE_FR, GUIDE_AR } from '../../constants';
import { Modal } from '../ui/modal';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'fr' | 'ar' | 'split'>('split');
  const [activeSection, setActiveSection] = useState<string>('sec-0');
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set default viewMode depending on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024) {
        setViewMode('fr');
      } else {
        setViewMode('split');
      }
    }
  }, [isOpen]);

  // Handle auto-switching if the screen shrinks to mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'split') {
        setViewMode('fr');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const toHtml = (markdown: string, prefix: 'fr' | 'ar') => {
    let headingIndex = 0;
    return markdown
      .split('\n')
      .map(line => {
        if (line.startsWith('# ')) {
          const t = line.replace('# ', '').trim();
          return `<h1 class="text-2.5xl font-extrabold font-display mb-8 text-primary text-center tracking-tight">${t}</h1>`;
        }
        if (line.startsWith('## ')) {
          const t = line.replace('## ', '').trim();
          const id = `${prefix}-sec-${headingIndex}`;
          headingIndex++;
          return `<h2 id="${id}" class="text-lg font-extrabold font-display mt-10 mb-5 pb-2 border-b border-border/60 text-foreground flex items-center gap-2">${t}</h2>`;
        }
        if (line.startsWith('### ')) {
          const t = line.replace('### ', '').trim();
          return `<h3 class="text-base font-bold font-display mt-6 mb-3 text-foreground">${t}</h3>`;
        }
        
        // Convert numbered lists to cards with numbers
        const numListMatch = line.match(/^([0-9]+)\. \*\*(.+?)\*\* : (.+)$/);
        if (numListMatch) {
          const [, num, title, desc] = numListMatch;
          return `<div class="group bg-card border border-border/60 rounded-2xl p-4 shadow-sm mb-4 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-300 ease-out flex gap-4 items-start"><div class="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-primary font-bold flex items-center justify-center font-mono mt-0.5 group-hover:bg-primary group-hover:text-card transition-colors">${num}</div><div class="min-w-0 flex-1"><div class="font-bold text-foreground font-display mb-1 text-base group-hover:text-primary transition-colors">${title}</div><div class="text-muted-foreground text-[14px] leading-relaxed">${desc}</div></div></div>`;
        }
        
        // Convert standard bold bullet lists to cards
        const boldBulletMatch = line.match(/^- \*\*(.+?)\*\* : (.+)$/);
        if (boldBulletMatch) {
          const [, title, desc] = boldBulletMatch;
          return `<div class="group bg-card border border-border/60 rounded-2xl p-4 shadow-sm mb-4 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-300 ease-out relative overflow-hidden"><div class="absolute start-0 top-0 bottom-0 w-1.5 bg-border group-hover:bg-primary transition-colors"></div><div class="font-bold text-foreground font-display mb-1 text-base group-hover:text-primary transition-colors">${title}</div><div class="text-muted-foreground text-[14px] leading-relaxed">${desc}</div></div>`;
        }
        
        // Convert unbolded bullet lists to smaller cards
        const normalBulletMatch = line.match(/^- (.+?) : (.+)$/);
        if (normalBulletMatch) {
          const [, title, desc] = normalBulletMatch;
          return `<div class="group bg-card border border-border/60 rounded-xl p-3.5 shadow-sm mb-3 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 transition-all duration-300 ease-out"><div class="font-bold text-foreground font-display mb-1 text-[14px] group-hover:text-primary transition-colors">${title}</div><div class="text-muted-foreground text-[13px] leading-relaxed">${desc}</div></div>`;
        }
        
        // Fallback for bullet points
        if (line.startsWith('- ')) {
          const content = line.replace('- ', '').trim();
          return `<div class="flex gap-2 mb-2"><span class="text-primary mt-1">•</span><span class="text-muted-foreground text-[14px] leading-relaxed">${content}</span></div>`;
        }
        
        if (line.trim() === '---') {
          return '<hr class="my-6 border-border/40">';
        }
        
        if (!line.trim()) return '';
        
        // Process inline styles
        let html = line
          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
          .replace(/`([^`]+)`/g, '<code class="bg-secondary text-primary px-1.5 py-0.5 rounded-md text-xs font-mono border border-border/40">$1</code>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary font-medium hover:underline transition-colors">$1</a>');
          
        return `<p class="mb-3.5 text-[14px] text-muted-foreground leading-relaxed">${html}</p>`;
      })
      .join('\n');
  };

  const htmlFr = useMemo(() => toHtml(GUIDE_FR, 'fr'), []);
  const htmlAr = useMemo(() => toHtml(GUIDE_AR, 'ar'), []);

  const tocItems = useMemo(() => {
    const frLines = GUIDE_FR.split('\n')
      .filter(l => l.startsWith('## '))
      .map(l => l.replace('## ', '').trim());
    const arLines = GUIDE_AR.split('\n')
      .filter(l => l.startsWith('## '))
      .map(l => l.replace('## ', '').trim());

    const items = [];
    const maxLen = Math.max(frLines.length, arLines.length);
    for (let i = 0; i < maxLen; i++) {
      items.push({
        fr: frLines[i] || '',
        ar: arLines[i] || '',
        id: `sec-${i}`,
      });
    }
    return items;
  }, []);

  const handleScrollTo = (sectionId: string) => {
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
    }
    
    setActiveSection(sectionId);

    const index = sectionId.replace('sec-', '');

    const scrollContainer = (container: HTMLDivElement | null, targetId: string) => {
      if (!container) return;
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({ top: relativeTop - 16, behavior: 'smooth' });
      }
    };

    if (viewMode === 'fr' || viewMode === 'split') {
      scrollContainer(leftRef.current, `fr-sec-${index}`);
    }
    if (viewMode === 'ar' || viewMode === 'split') {
      scrollContainer(rightRef.current, `ar-sec-${index}`);
    }

    programmaticScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 850);
  };

  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, prefix: 'fr' | 'ar') => {
    if (isProgrammaticScrollRef.current) return;
    const container = ref.current;
    if (!container) return;

    const headers = container.querySelectorAll('h2');
    let currentActive = activeSection;

    for (const header of Array.from(headers)) {
      const rect = header.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (rect.top - containerRect.top < 120) {
        currentActive = header.id.replace(`${prefix}-`, '');
      }
    }

    if (currentActive && currentActive !== activeSection) {
      setActiveSection(currentActive);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full select-none">
          <div className="flex flex-col text-left">
            <span className="font-display text-lg font-extrabold text-foreground">
              Guide d'utilisation / دليل الاستخدام
            </span>
            <span className="text-xs font-semibold text-muted-foreground/80">
              Documentation bilingue interactive & synchronisée
            </span>
          </div>
          
          {/* Beautiful Segmented Language Control */}
          <div className="flex items-center bg-secondary/80 p-0.5 rounded-xl self-start sm:self-center border border-border/40 shrink-0">
            <button
              onClick={() => setViewMode('fr')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                viewMode === 'fr'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Français
            </button>
            <button
              onClick={() => setViewMode('ar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                viewMode === 'ar'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden lg:block px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Double affichage
            </button>
          </div>
        </div>
      }
      maxWidth="5xl"
      className="max-w-6xl sm:max-w-6xl h-[94vh] sm:h-[88vh] flex flex-col p-0 overflow-hidden"
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: hsl(var(--muted-foreground) / 0.15);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--muted-foreground) / 0.25);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Mobile Horizontal Anchor Shortcuts list */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5 px-3 border-b border-border/40 bg-muted/20 shrink-0 select-none">
        {tocItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleScrollTo(item.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {viewMode === 'fr' ? item.fr : item.ar}
            </button>
          );
        })}
      </div>

      {/* Main split-screen bilingually synced documentation body */}
      <div className={`h-full flex-1 grid overflow-hidden bg-background ${
        viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-[240px_1fr_2px_1fr]' : 'grid-cols-1 lg:grid-cols-[240px_1fr]'
      }`}>
        
        {/* Desktop Sidebar Table of Contents */}
        <div className="hidden lg:flex flex-col border-r border-border/40 bg-card/60 shrink-0 overflow-y-auto custom-scrollbar p-3.5 select-none w-[240px]">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 mb-3 px-2">
            Sommaire / الفهرس
          </div>
          <nav className="space-y-1">
            {tocItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleScrollTo(item.id)}
                  className={`w-full text-left flex flex-col gap-0.5 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15 font-bold'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-[12px] font-extrabold leading-tight truncate w-full group-hover:translate-x-0.5 transition-transform duration-200">
                    {item.fr}
                  </span>
                  <span className={`text-[10.5px] font-bold leading-tight text-right w-full font-ar mt-0.5 ${
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/60 group-hover:text-muted-foreground/80'
                  }`}>
                    {item.ar}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* French Pane */}
        {(viewMode === 'fr' || viewMode === 'split') && (
          <div
            ref={leftRef}
            onScroll={() => handleScroll(leftRef, 'fr')}
            className="relative overflow-y-auto overscroll-contain bg-background scroll-smooth custom-scrollbar flex-1"
            style={{ scrollbarGutter: 'stable', height: '100%' }}
          >
            <div className="p-4 sm:p-8 pb-16">
              <div className="prose max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: htmlFr }} />
            </div>
          </div>
        )}

        {/* Separator Line */}
        {viewMode === 'split' && (
          <div className="hidden lg:block bg-border/40 w-[2px] self-stretch" aria-hidden="true" />
        )}

        {/* Arabic Pane */}
        {(viewMode === 'ar' || viewMode === 'split') && (
          <div
            ref={rightRef}
            onScroll={() => handleScroll(rightRef, 'ar')}
            className="relative overflow-y-auto overscroll-contain bg-card/10 scroll-smooth custom-scrollbar flex-1"
            style={{ scrollbarGutter: 'stable', height: '100%' }}
            dir="rtl" lang="ar"
          >
            <div className="p-4 sm:p-8 pb-16">
              <div className="prose max-w-none text-right font-ar text-[15px] leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: htmlAr }} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
