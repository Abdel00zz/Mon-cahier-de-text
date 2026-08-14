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
      {/* Desktop sidebar — Google Keep style */}
      <nav
        className={cn(
          'fixed inset-y-0 z-40 hidden w-[80px] flex-col bg-card py-4 text-card-foreground print:hidden sm:flex',
          isRtl ? 'right-0 border-l border-border/30' : 'left-0 border-r border-border/30',
          isExpanded ? 'lg:w-[260px]' : 'lg:w-[80px]',
          'transition-[width] duration-200 ease-out',
        )}
        aria-label={copy.mainNav}
      >
        <div className={cn('flex h-12 items-center justify-center px-3', isExpanded && 'lg:justify-start lg:px-4')}>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 focus:outline-none"
            aria-label={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-[20px] w-[20px]" />
          </button>
          <div className={cn('ms-3 hidden min-w-0', isExpanded && 'lg:block lg:max-w-[170px]')}>
            <span className="block truncate text-[15px] font-semibold text-foreground">{copy.brand}</span>
            <span className="block truncate text-[11px] font-medium text-muted-foreground">{copy.teacherSpace}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-0.5 px-2.5">
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
                  'relative flex h-[46px] w-full items-center justify-center rounded-2xl transition-colors duration-150 focus:outline-none',
                  isExpanded && 'lg:justify-start lg:gap-4 lg:px-4',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground/70 hover:bg-muted/50',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative flex shrink-0 items-center justify-center">
                  <Icon className={cn(
                    'h-[22px] w-[22px] transition-colors duration-150',
                    isActive ? 'text-primary' : '',
                  )} />
                  {count ? (
                    <span className={cn(
                      'absolute -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-[5px] text-[9px] font-bold leading-none text-white ring-2 ring-card',
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

        <div className="mt-auto px-2.5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn(
              'flex h-[46px] w-full items-center justify-center rounded-2xl text-foreground/70 transition-colors duration-150 hover:bg-muted/50 focus:outline-none',
              isExpanded && 'lg:justify-start lg:gap-4 lg:px-4',
              activeTab === 'settings' && 'bg-primary/10 text-primary font-semibold',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-[22px] w-[22px] shrink-0 transition-colors duration-150', activeTab === 'settings' && 'text-primary')} />
            <span className={cn('hidden flex-1 text-start text-[14px] font-medium', isExpanded && 'lg:block', activeTab === 'settings' && 'font-semibold text-primary')}>{copy.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('help')}
            className={cn(
              'mt-0.5 flex h-[46px] w-full items-center justify-center rounded-2xl text-foreground/70 transition-colors duration-150 hover:bg-muted/50 focus:outline-none',
              isExpanded && 'lg:justify-start lg:gap-4 lg:px-4',
            )}
            aria-label={copy.help}
          >
            <CircleHelp className="h-[22px] w-[22px] shrink-0" />
            <span className={cn('hidden flex-1 text-start text-[14px] font-medium', isExpanded && 'lg:block')}>{copy.help}</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar — Android 16 / Material You Expressive */}
      <nav
        className="mobile-tab-bar fixed inset-x-3 z-40 overflow-hidden rounded-full border border-border/40 bg-card/95 text-card-foreground shadow-[0_4px_16px_rgba(0,0,0,0.07)] backdrop-blur-md print:hidden sm:hidden will-change-transform"
        style={{ bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.6rem))' }}
        aria-label={copy.mobileNav}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto flex h-[48px] max-w-sm items-center justify-around px-1">
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
                  'relative flex h-9 flex-1 flex-col items-center justify-center rounded-full transition-all duration-200 active:scale-95',
                  'min-h-[40px] min-w-[40px]',
                  isActive ? 'text-primary' : 'text-foreground/60 hover:text-foreground',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={cn(
                  'relative flex items-center justify-center rounded-full px-2.5 py-1 transition-all',
                  isActive ? 'bg-primary/10' : ''
                )}>
                  <Icon className="h-[18px] w-[18px]" />
                  {count ? (
                    <span className={cn(
                      'absolute -top-[2px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-destructive px-[3px] text-[7.5px] font-bold leading-none text-white ring-2 ring-card',
                      isRtl ? '-left-1' : '-right-1',
                    )}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn(
              'relative flex h-9 flex-1 flex-col items-center justify-center rounded-full transition-all duration-200 active:scale-95',
              'min-h-[40px] min-w-[40px]',
              activeTab === 'settings' ? 'text-primary' : 'text-foreground/60 hover:text-foreground',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <div className={cn(
              'relative flex items-center justify-center rounded-full px-2.5 py-1 transition-all',
              activeTab === 'settings' ? 'bg-primary/10' : ''
            )}>
              <Settings className="h-[18px] w-[18px]" />
            </div>
          </button>
        </div>
      </nav>
    </>
  );
});

TabBar.displayName = 'TabBar';
