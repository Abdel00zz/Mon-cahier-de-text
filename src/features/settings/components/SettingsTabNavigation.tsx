import { useEffect, useId, useRef, type ComponentType } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/i18n/LocaleProvider';

export function SettingsTabNavigation<T extends string>({ items, activeId, onChange, onPrepare, translate, idPrefix, label }: {
  items: readonly { id: T; titleKey: string; icon?: ComponentType<{ className?: string }> }[];
  activeId: T; onChange: (id: T) => void; onPrepare: (id: T) => void;
  translate: (key: string) => string; idPrefix: string; label: string;
}) {
  const { isRtl } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorId = useId();
  const reducedMotion = useReducedMotion();

  // Move only the tab strip, never the page, when a selected tab is clipped.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!list || !active) return;
    const revealActiveTab = () => {
      const viewport = list.getBoundingClientRect();
      const target = active.getBoundingClientRect();
      const inset = 6;
      const before = target.left - viewport.left - inset;
      const after = target.right - viewport.right + inset;
      const delta = target.width > viewport.width - inset * 2
        ? (isRtl ? after : before)
        : before < 0 ? before : after > 0 ? after : 0;
      if (Math.abs(delta) < 1) return;
      list.scrollBy({ left: delta, behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    revealActiveTab();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(revealActiveTab);
    observer?.observe(list);
    observer?.observe(active);
    return () => observer?.disconnect();
  }, [activeId, isRtl, reducedMotion]);

  return (
    <nav aria-label={label} className="settings-tab-navigation">
      <Tabs value={activeId} onValueChange={val => onChange(val as T)} dir={isRtl ? 'rtl' : 'ltr'}>
        <TabsList ref={listRef} aria-label={label} className="flex w-full min-w-0 items-center justify-start overflow-x-auto no-scrollbar bg-transparent border-0 p-0">
          {items.map(item => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              id={`${idPrefix}-${item.id}`}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={activeId === item.id ? 0 : -1}
              onTouchStart={() => onPrepare(item.id)}
              onPointerDown={() => onPrepare(item.id)}
              onPointerEnter={() => onPrepare(item.id)}
              onFocus={() => onPrepare(item.id)}
              className="settings-tab-navigation__tab shrink-0 whitespace-nowrap"
            >
              {activeId === item.id && <motion.span aria-hidden="true" className="settings-tab-navigation__indicator"
                layoutId={`settings-tab-indicator-${indicatorId}`}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="settings-tab-navigation__label">{translate(item.titleKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  );
}

