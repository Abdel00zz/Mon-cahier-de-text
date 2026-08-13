import React, { useCallback, useRef } from 'react';
import { BookOpen, Settings, CircleHelp, PieChart, CalendarCheck, Menu } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

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
  { id: 'dashboard', icon: BookOpen },
  { id: 'evaluations', icon: CalendarCheck },
  { id: 'notifications', icon: PieChart },
];

const NAV_COPY = {
  fr: {
    brand: 'Cahier de textes', teacherSpace: 'Espace enseignant',
    dashboard: 'Classes', evaluations: 'Contrôle continu', notifications: 'Pilotage', settings: 'Paramètres', help: 'Guide',
    collapse: 'Réduire', expand: 'Développer', mainNav: 'Navigation principale', mobileNav: 'Navigation mobile',
  },
  ar: {
    brand: 'دفتر النصوص الرقمي', teacherSpace: 'فضاء الأستاذ',
    dashboard: 'الأقسام', evaluations: 'المراقبة المستمرة', notifications: 'القيادة', settings: 'الإعدادات', help: 'الدليل',
    collapse: 'تصغير', expand: 'توسيع', mainNav: 'التنقل الرئيسي', mobileNav: 'التنقل على الهاتف',
  },
} as const;

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
  const copy = NAV_COPY[locale === 'ar' ? 'ar' : 'fr'];
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
                    ? 'bg-amber-50 text-amber-700 font-semibold'
                    : 'text-foreground/70 hover:bg-muted/50',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative flex shrink-0 items-center justify-center">
                  <Icon className={cn(
                    'h-[22px] w-[22px] transition-colors duration-150',
                    isActive ? 'text-amber-600' : '',
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
                  isActive ? 'font-semibold text-amber-700' : 'font-medium',
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
              activeTab === 'settings' && 'bg-amber-50 text-amber-700 font-semibold',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-[22px] w-[22px] shrink-0 transition-colors duration-150', activeTab === 'settings' && 'text-amber-600')} />
            <span className={cn('hidden flex-1 text-start text-[14px] font-medium', isExpanded && 'lg:block', activeTab === 'settings' && 'font-semibold text-amber-700')}>{copy.settings}</span>
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

      {/* Mobile bottom tab bar — Google Keep style */}
      <nav
        className="mobile-tab-bar fixed inset-x-3 z-40 overflow-hidden rounded-2xl border border-border/30 bg-card text-card-foreground shadow-[0_2px_16px_rgba(0,0,0,0.06)] print:hidden sm:hidden will-change-transform"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
        aria-label={copy.mobileNav}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto flex h-[56px] max-w-md items-center justify-around px-2">
          {tabs.filter(tab => tab.id !== 'evaluations').map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'notifications' ? notificationsCount : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goTo(tab.id)}
                className={cn(
                  'relative flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-150',
                  'min-h-[48px] min-w-[48px]',
                  isActive ? 'text-amber-600' : 'text-foreground/60',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="h-[22px] w-[22px]" />
                  {count ? (
                    <span className={cn(
                      'absolute -top-[5px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-destructive px-[4px] text-[9px] font-bold leading-none text-white ring-2 ring-card',
                      isRtl ? '-left-1.5' : '-right-1.5',
                    )}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>
                {isActive && <span className="h-[3px] w-5 rounded-full bg-amber-500" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn(
              'relative flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-150',
              'min-h-[48px] min-w-[48px]',
              activeTab === 'settings' ? 'text-amber-600' : 'text-foreground/60',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className="h-[22px] w-[22px]" />
            {activeTab === 'settings' && <span className="h-[3px] w-5 rounded-full bg-amber-500" />}
          </button>
        </div>
      </nav>
    </>
  );
});

TabBar.displayName = 'TabBar';
