import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface FluidTabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
}

interface FluidTabRailProps<T extends string = string> {
  items: FluidTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
  layoutId?: string;
  showEdgeArrows?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

/**
 * Rail d'onglets ultra-fluide pour mobile et desktop.
 * - Auto-centrage immédiat et fluide de l'onglet actif au clic et au changement d'état.
 * - Défilement inertiel natif sans blocage (touch pan-x, overscroll contain).
 * - Indicateurs de débordement progressifs (masques de fondu aux extrémités).
 * - Navigation au clavier (Flèches Gauche/Droite) et flèches discrètes si débordement.
 * - Animation fluide de la pastille active (Spring physics).
 */
export function FluidTabRail<T extends string = string>({
  items,
  activeId,
  onChange,
  className,
  tabClassName,
  activeTabClassName,
  inactiveTabClassName,
  layoutId = 'fluid-tab-pill',
  showEdgeArrows = false,
  size = 'md',
  ariaLabel,
}: FluidTabRailProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Vérification de la visibilité des extrémités sans dépendre du modèle RTL interne
  const checkOverflow = useCallback(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const firstItem = itemRefs.current[items[0].id];
    const lastItem = itemRefs.current[items[items.length - 1].id];

    if (!firstItem || !lastItem) return;

    const firstRect = firstItem.getBoundingClientRect();
    const lastRect = lastItem.getBoundingClientRect();

    // L'extrémité gauche est masquée si l'un des éléments dépasse à gauche
    const minLeft = Math.min(firstRect.left, lastRect.left);
    const maxRight = Math.max(firstRect.right, lastRect.right);

    setCanScrollLeft(minLeft < containerRect.left - 4);
    setCanScrollRight(maxRight > containerRect.right + 4);
  }, [items]);

  // Défilement centré haute fluidité basé sur les coordonnées réelles à l'écran
  const scrollToTab = useCallback((id: string, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    const item = itemRefs.current[id];
    if (!container || !item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const itemCenter = itemRect.left + itemRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const diff = itemCenter - containerCenter;

    if (Math.abs(diff) > 2) {
      try {
        container.scrollBy({ left: diff, behavior });
      } catch {
        item.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
      }
    }
  }, []);

  // Déplacement au montage et à chaque changement d'onglet actif
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToTab(activeId, 'smooth');
      checkOverflow();
    }, 40);

    return () => clearTimeout(timer);
  }, [activeId, scrollToTab, checkOverflow]);

  // Surveillance du redimensionnement et du scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => checkOverflow();
    container.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
      scrollToTab(activeId, 'auto');
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [checkOverflow, scrollToTab, activeId]);

  const handleSelect = (id: T) => {
    onChange(id);
    scrollToTab(id, 'smooth');
    setTimeout(checkOverflow, 250);
  };

  const handleScrollStep = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    const delta = direction === 'left' ? -180 : 180;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const isRtl = document.documentElement.dir === 'rtl';
      const step = (e.key === 'ArrowRight' ? (isRtl ? -1 : 1) : (isRtl ? 1 : -1));
      const nextIndex = Math.max(0, Math.min(items.length - 1, currentIndex + step));
      if (nextIndex !== currentIndex && !items[nextIndex].disabled) {
        handleSelect(items[nextIndex].id);
      }
    }
  };

  const sizeClasses = {
    sm: 'h-9 px-2.5 text-[11px] rounded-lg gap-1.5',
    md: 'min-h-11 px-3 py-1.5 text-xs rounded-xl gap-1.5',
    lg: 'min-h-12 px-4 py-2 text-sm rounded-xl gap-2',
  }[size];

  return (
    <div className={cn('relative flex w-full items-center', className)}>
      {/* Bouton flèche gauche discrète (desktop/tablet ou si activé) */}
      {showEdgeArrows && canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScrollStep('left')}
          className="absolute -start-2 z-20 hidden h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 sm:flex cursor-pointer"
          aria-label="Faire défiler vers la gauche"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Masque de dégradé gauche si débordement */}
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-r from-background/90 to-transparent transition-opacity duration-200',
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />

      {/* Conteneur de défilement horizontal haute fluidité */}
      <div
        ref={containerRef}
        role="tablist"
        aria-label={ariaLabel}
        className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-2.5 pt-0.5 px-1 no-scrollbar select-none"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        {items.map((item, index) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              ref={el => { itemRefs.current[item.id] = el; }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={item.disabled}
              disabled={item.disabled}
              onClick={() => handleSelect(item.id)}
              onKeyDown={e => handleKeyDown(e, index)}
              className={cn(
                'group relative flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                sizeClasses,
                isActive
                  ? cn(
                      'text-primary font-bold shadow-xs',
                      activeTabClassName || 'bg-primary/10 dark:bg-primary/20 border border-primary/30'
                    )
                  : cn(
                      'border border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      inactiveTabClassName
                    ),
                item.disabled && 'cursor-not-allowed opacity-40',
                tabClassName
              )}
            >
              {/* Pastille coulissante dynamique (Spring Pill) pour fluidité absolue */}
              {isActive && layoutId && (
                <motion.div
                  layoutId={layoutId}
                  className="pointer-events-none absolute inset-0 rounded-[inherit] bg-primary/12 dark:bg-primary/20 border border-primary/35 shadow-xs"
                  transition={{ type: 'spring', stiffness: 480, damping: 34, mass: 0.7 }}
                />
              )}

              {Icon && (
                <Icon className={cn('relative z-10 h-4 w-4 shrink-0 transition-transform duration-150 group-active:scale-95', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              )}
              <span className="relative z-10 select-none">{item.label}</span>
              {item.badge && (
                <span className="relative z-10">{item.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Masque de dégradé droit si débordement */}
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-gradient-to-l from-background/90 to-transparent transition-opacity duration-200',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />

      {/* Bouton flèche droite discrète (desktop/tablet ou si activé) */}
      {showEdgeArrows && canScrollRight && (
        <button
          type="button"
          onClick={() => handleScrollStep('right')}
          className="absolute -end-2 z-20 hidden h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 sm:flex cursor-pointer"
          aria-label="Faire défiler vers la droite"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
