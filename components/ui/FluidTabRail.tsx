import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

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
  layoutId,
  showEdgeArrows = false,
  size = 'md',
  ariaLabel,
}: FluidTabRailProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const railId = useId();
  const reducedMotion = useReducedMotion();
  const { locale } = useLocale();
  const scrollBehavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';
  const pillId = layoutId ?? `fluid-tab-pill-${railId}`;

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
    const frame = requestAnimationFrame(() => {
      scrollToTab(activeId, scrollBehavior);
      checkOverflow();
    });

    return () => cancelAnimationFrame(frame);
  }, [activeId, scrollToTab, checkOverflow, scrollBehavior]);

  // Surveillance du redimensionnement et du scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame: number | null = null;
    const handleScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        checkOverflow();
      });
    };
    container.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
      scrollToTab(activeId, 'auto');
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [checkOverflow, scrollToTab, activeId]);

  const handleSelect = (id: T) => {
    onChange(id);
  };

  const handleScrollStep = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    const delta = direction === 'left' ? -180 : 180;
    container.scrollBy({ left: delta, behavior: scrollBehavior });
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const enabled = items.map((item, index) => item.disabled ? -1 : index).filter(index => index >= 0);
    if (!enabled.length) return;
    const isRtl = getComputedStyle(containerRef.current!).direction === 'rtl';
    const step = e.key === 'ArrowRight' ? (isRtl ? -1 : 1) : (isRtl ? 1 : -1);
    const position = enabled.indexOf(currentIndex);
    const nextIndex = e.key === 'Home' ? enabled[0] : e.key === 'End' ? enabled[enabled.length - 1]
      : enabled[(position + step + enabled.length) % enabled.length];
    handleSelect(items[nextIndex].id);
    itemRefs.current[items[nextIndex].id]?.focus({ preventScroll: true });
  };

  const sizeClasses = {
    sm: 'min-h-11 px-2.5 text-xs rounded-lg gap-1.5',
    md: 'min-h-11 px-3 py-1 text-xs rounded-xl gap-1.5',
    lg: 'min-h-11 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm rounded-xl gap-2',
  }[size];

  return (
    <div className={cn('relative flex w-full items-center', className)}>
      {/* Bouton flèche gauche discrète (desktop/tablet ou si activé) */}
      {showEdgeArrows && canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScrollStep('left')}
          className="absolute -left-2 z-20 hidden h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-card/95 text-foreground shadow-sm transition-colors hover:bg-muted sm:flex cursor-pointer"
          aria-label={locale === 'ar' ? 'التمرير لليسار' : locale === 'en' ? 'Scroll left' : 'Défiler vers la gauche'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Masque de dégradé gauche si débordement */}
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background/90 to-transparent transition-opacity duration-200 motion-reduce:transition-none',
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
          scrollBehavior,
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
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => handleSelect(item.id)}
              onKeyDown={e => handleKeyDown(e, index)}
              className={cn(
                'group relative flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
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
              {isActive && pillId && (
                <motion.div
                  layoutId={pillId}
                  className="pointer-events-none absolute inset-0 rounded-[inherit] bg-primary/12 dark:bg-primary/20 border border-primary/35 shadow-xs"
                  transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 34, mass: 0.7 }}
                />
              )}

              {Icon && (
                <Icon className={cn(
                  'relative z-10 shrink-0 transition-transform duration-150 group-active:scale-95 motion-reduce:transform-none motion-reduce:transition-none',
                  size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )} />
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
          'pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background/90 to-transparent transition-opacity duration-200 motion-reduce:transition-none',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />

      {/* Bouton flèche droite discrète (desktop/tablet ou si activé) */}
      {showEdgeArrows && canScrollRight && (
        <button
          type="button"
          onClick={() => handleScrollStep('right')}
          className="absolute -right-2 z-20 hidden h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-card/95 text-foreground shadow-sm transition-colors hover:bg-muted sm:flex cursor-pointer"
          aria-label={locale === 'ar' ? 'التمرير لليمين' : locale === 'en' ? 'Scroll right' : 'Défiler vers la droite'}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
