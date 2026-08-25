import React, { useCallback, useRef } from 'react';
import { Users, Settings, CircleHelp, PieChart, CalendarCheck, Menu } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useLocale, AppLocale } from '@/i18n/LocaleProvider';

export type TabType = 'dashboard' | 'evaluations' | 'settings' | 'notifications' | 'help';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  badgeCount?: number;
  notificationsCount?: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isRtl: boolean;
}

const tabs: Array<{ id: TabType; icon: React.FC<{ className?: string }> }> = [
  { id: 'dashboard', icon: Users },
  { id: 'evaluations', icon: CalendarCheck },
  { id: 'notifications', icon: PieChart },
];

const NAV_COPY: Record<AppLocale, {
  brand: string; teacherSpace: string;
  dashboard: string; evaluations: string; notifications: string; settings: string; help: string;
  collapse: string; expand: string; mainNav: string; mobileNav: string;
}> = {
  fr: {
    brand: 'Cahier de textes', teacherSpace: 'Espace enseignant',
    dashboard: 'Classes', evaluations: 'Contrôle continu', notifications: 'Pilotage', settings: 'Paramètres', help: 'Guide',
    collapse: 'Réduire', expand: 'Développer', mainNav: 'Navigation principale', mobileNav: 'Navigation mobile',
  },
  ar: {
    brand: 'دفتر النصوص الرقمي', teacherSpace: 'فضاء الأستاذ(ة)',
    dashboard: 'الأقسام', evaluations: 'المراقبة المستمرة', notifications: 'لوحة القيادة', settings: 'الإعدادات', help: 'الدليل التربوي',
    collapse: 'تصغير القائمة', expand: 'توسيع القائمة', mainNav: 'التنقل الرئيسي', mobileNav: 'التنقل على الهاتف',
  },
  en: {
    brand: 'Lesson Notebook', teacherSpace: 'Teacher Space',
    dashboard: 'Classes', evaluations: 'Continuous Assessment', notifications: 'Dashboard', settings: 'Settings', help: 'Pedagogical Guide',
    collapse: 'Collapse', expand: 'Expand', mainNav: 'Main navigation', mobileNav: 'Mobile navigation',
  },
};

const countLabel = (count?: number) => count && count > 99 ? '99+' : count;

export const TabBar = React.memo<TabBarProps>(({
  activeTab,
  onTabChange,
  badgeCount,
  notificationsCount,
  isExpanded,
  onToggleExpanded,
  isRtl,
}) => {
  const { impact } = useHapticFeedback();
  const { locale } = useLocale();
  const copy = NAV_COPY[locale] ?? NAV_COPY.fr;
  const touchStartX = useRef(0);

  const goTo = useCallback((tab: TabType) => {
    impact('light');
    onTabChange(tab);
  }, [impact, onTabChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) < 60) return;
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex === -1) return;
    const nextIndex = delta > 0
      ? Math.max(0, currentIndex - 1)
      : Math.min(tabs.length - 1, currentIndex + 1);
    if (nextIndex !== currentIndex) {
      impact('light');
      onTabChange(tabs[nextIndex].id);
    }
  }, [activeTab, impact, onTabChange]);

  return (
    <>
      {/* Desktop sidebar — modern, crisp, professional */}
      <nav
        className={cn(
          'fixed inset-y-0 z-40 hidden w-[80px] flex-col bg-card/95 backdrop-blur-md py-4 text-foreground print:hidden sm:flex shadow-[1px_0_12px_rgba(15,23,42,0.03)]',
          isRtl ? 'right-0 border-l border-border/80' : 'left-0 border-r border-border/80',
          isExpanded ? 'lg:w-[260px]' : 'lg:w-[80px]',
          'transition-[width] duration-200 ease-out',
        )}
        aria-label={copy.mainNav}
      >
        <div className={cn('flex h-12 items-center justify-center px-3', isExpanded && 'lg:justify-start lg:px-4')}>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none cursor-pointer"
            aria-label={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-[20px] w-[20px]" />
          </button>
          <div className={cn('ms-3 hidden min-w-0', isExpanded && 'lg:block lg:max-w-[170px]')}>
            <span className="block truncate text-[15px] font-bold text-foreground tracking-tight">{copy.brand}</span>
            <span className="block truncate text-[11px] font-medium text-muted-foreground">{copy.teacherSpace}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-1 px-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'evaluations' ? badgeCount : tab.id === 'notifications' ? notificationsCount : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goTo(tab.id)}
                className={cn(
                  'group relative flex h-[46px] w-full items-center justify-center rounded-xl transition-all duration-150 focus:outline-none cursor-pointer',
                  isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-3.5',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative flex shrink-0 items-center justify-center">
                  <Icon className={cn(
                    'h-[20px] w-[20px] transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )} />
                  {count ? (
                    <span className={cn(
                      'absolute -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-[5px] text-[9px] font-bold leading-none text-white ring-2 ring-card',
                      isRtl ? '-left-3' : '-right-3',
                    )}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </span>
                <span className={cn(
                  'hidden min-w-0 flex-1 truncate text-start text-[14px] transition-all duration-150',
                  isExpanded && 'lg:block',
                  isActive ? 'font-semibold text-primary' : 'font-medium',
                )}>
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto px-2.5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] flex flex-col gap-1">
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn(
              'group flex h-[46px] w-full items-center justify-center rounded-xl transition-all duration-150 focus:outline-none cursor-pointer',
              isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-3.5',
              activeTab === 'settings'
                ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-[20px] w-[20px] shrink-0 transition-colors duration-150', activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
            <span className={cn('hidden flex-1 text-start text-[14px] font-medium', isExpanded && 'lg:block', activeTab === 'settings' ? 'font-semibold text-primary' : '')}>{copy.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('help')}
            className={cn(
              'group flex h-[46px] w-full items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:bg-muted/80 hover:text-foreground focus:outline-none cursor-pointer',
              isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-3.5',
            )}
            aria-label={copy.help}
          >
            <CircleHelp className="h-[20px] w-[20px] shrink-0 text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
            <span className={cn('hidden flex-1 text-start text-[14px] font-medium', isExpanded && 'lg:block')}>{copy.help}</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar with clean labels */}
      <nav
        className="mobile-tab-bar fixed inset-x-3 z-40 overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.1)] backdrop-blur-lg print:hidden sm:hidden will-change-transform"
        style={{ bottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
        aria-label={copy.mobileNav}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto flex h-[58px] max-w-md items-center justify-around px-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'evaluations' ? badgeCount : tab.id === 'notifications' ? notificationsCount : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goTo(tab.id)}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer',
                  'min-h-[46px] min-w-[48px]',
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={cn(
                  'relative flex items-center justify-center rounded-xl px-2.5 py-0.5 transition-all',
                  isActive ? 'bg-primary/15 text-primary scale-105' : ''
                )}>
                  <Icon className="h-[19px] w-[19px]" />
                  {count ? (
                    <span className={cn(
                      'absolute -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold leading-none text-white ring-2 ring-card shadow-xs',
                      isRtl ? '-left-1.5' : '-right-1.5',
                    )}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>
                <span className={cn(
                  'mt-0.5 text-[10px] tracking-tight leading-none truncate max-w-[68px]',
                  isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
                )}>
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer',
              'min-h-[46px] min-w-[48px]',
              activeTab === 'settings' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <div className={cn(
              'relative flex items-center justify-center rounded-xl px-2.5 py-0.5 transition-all',
              activeTab === 'settings' ? 'bg-primary/15 text-primary scale-105' : ''
            )}>
              <Settings className="h-[19px] w-[19px]" />
            </div>
            <span className={cn(
              'mt-0.5 text-[10px] tracking-tight leading-none truncate max-w-[68px]',
              activeTab === 'settings' ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
            )}>
              {copy.settings}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
});

TabBar.displayName = 'TabBar';
