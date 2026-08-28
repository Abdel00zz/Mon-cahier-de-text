import React, { useCallback, useRef } from 'react';
import { Users, Settings, CircleHelp, PieChart, CalendarCheck, Menu } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useLocale, AppLocale } from '@/i18n/LocaleProvider';
import { preloadSettingsPage } from '@/utils/performance';

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
          'fixed inset-y-0 z-40 hidden h-[100dvh] max-h-[100dvh] w-[76px] flex-col overflow-hidden bg-[linear-gradient(180deg,#fcf8f0_0%,#f5ecdd_58%,#f1e5d3_100%)] py-3 text-slate-900 print:hidden shadow-[6px_0_28px_rgba(92,70,42,0.07)] sm:flex landscape:py-2 dark:bg-[linear-gradient(180deg,#172033_0%,#101827_100%)] dark:text-slate-100 dark:shadow-[6px_0_28px_rgba(0,0,0,0.24)]',
          isRtl ? 'right-0 border-l border-[#e5d6c0] dark:border-slate-800' : 'left-0 border-r border-[#e5d6c0] dark:border-slate-800',
          isExpanded ? 'lg:w-[248px]' : 'lg:w-[76px]',
          'transition-[width] duration-200 ease-out',
        )}
        aria-label={copy.mainNav}
      >
        <div className={cn('flex h-11 items-center justify-center px-2.5 landscape:h-10', isExpanded && 'lg:justify-start lg:px-3.5')}>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#75644f] transition-colors hover:bg-white/65 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 landscape:h-9 landscape:w-9 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
            aria-label={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-[20px] w-[20px]" />
          </button>
          <div className={cn('ms-3 hidden min-w-0', isExpanded && 'lg:block lg:max-w-[170px]')}>
            <span className="block truncate text-[15px] font-bold tracking-tight text-[#2f2922] dark:text-white">{copy.brand}</span>
            <span className="block truncate text-[11px] font-medium text-[#81715d] dark:text-slate-400">{copy.teacherSpace}</span>
          </div>
        </div>

        <div className="modern-scrollbar mt-2.5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-2 landscape:mt-1.5">
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
                  'group relative flex h-11 w-full items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 landscape:h-10 cursor-pointer',
                  isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-3.5',
                  isActive
                    ? 'border border-white/80 bg-white/75 text-primary font-semibold shadow-[0_5px_16px_rgba(92,70,42,0.08)] dark:border-white/10 dark:bg-white/10'
                    : 'text-[#756752] hover:bg-white/55 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-white',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative flex shrink-0 items-center justify-center">
                  <Icon className={cn(
                    'h-[20px] w-[20px] transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-[#81715d] group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-white',
                  )} />
                  {count ? (
                    <span className={cn(
                      'absolute -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-[5px] text-[9px] font-bold leading-none text-white ring-2 ring-[#f8f1e5] dark:ring-slate-900',
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

        <div className="mt-auto flex flex-col gap-1 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] landscape:pb-1.5">
          <button
            type="button"
            onClick={() => goTo('settings')}
            onPointerEnter={preloadSettingsPage}
            onFocus={preloadSettingsPage}
            className={cn(
              'group flex h-11 w-full items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 landscape:h-10 cursor-pointer',
              isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-3.5',
              activeTab === 'settings'
                ? 'border border-white/80 bg-white/75 text-primary font-semibold shadow-[0_5px_16px_rgba(92,70,42,0.08)] dark:border-white/10 dark:bg-white/10'
                : 'text-[#756752] hover:bg-white/55 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-white',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-[20px] w-[20px] shrink-0 transition-colors duration-150', activeTab === 'settings' ? 'text-primary' : 'text-[#81715d] group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-white')} />
            <span className={cn('hidden flex-1 text-start text-[14px] font-medium', isExpanded && 'lg:block', activeTab === 'settings' ? 'font-semibold text-primary' : '')}>{copy.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('help')}
            className={cn(
              'group flex h-11 w-full items-center justify-center rounded-xl text-[#756752] transition-all duration-150 hover:bg-white/55 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 landscape:h-10 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-white cursor-pointer',
              isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-3.5',
            )}
            aria-label={copy.help}
          >
            <CircleHelp className="h-[20px] w-[20px] shrink-0 text-[#81715d] transition-colors duration-150 group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-white" />
            <span className={cn('hidden flex-1 text-start text-[14px] font-medium', isExpanded && 'lg:block')}>{copy.help}</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar with clean labels */}
      <nav
        className="mobile-tab-bar fixed inset-x-3 z-40 overflow-hidden rounded-2xl border border-[#e5d6c0] bg-[linear-gradient(135deg,rgba(252,248,240,0.97),rgba(245,236,221,0.97))] text-[#514535] shadow-[0_10px_28px_rgba(92,70,42,0.14)] backdrop-blur-xl print:hidden sm:hidden will-change-transform dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(23,32,51,0.97),rgba(16,24,39,0.97))] dark:text-slate-200"
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
                  isActive ? 'text-primary font-bold' : 'text-[#756752] hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={cn(
                  'relative flex items-center justify-center rounded-xl px-2.5 py-0.5 transition-all',
                  isActive ? 'bg-white/75 text-primary shadow-xs scale-105 dark:bg-white/10' : ''
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
                  isActive ? 'font-bold text-primary' : 'font-medium text-[#756752] dark:text-slate-400'
                )}>
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo('settings')}
            onTouchStart={preloadSettingsPage}
            onPointerEnter={preloadSettingsPage}
            onFocus={preloadSettingsPage}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer',
              'min-h-[46px] min-w-[48px]',
              activeTab === 'settings' ? 'text-primary font-bold' : 'text-[#756752] hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <div className={cn(
              'relative flex items-center justify-center rounded-xl px-2.5 py-0.5 transition-all',
              activeTab === 'settings' ? 'bg-white/75 text-primary shadow-xs scale-105 dark:bg-white/10' : ''
            )}>
              <Settings className="h-[19px] w-[19px]" />
            </div>
            <span className={cn(
              'mt-0.5 text-[10px] tracking-tight leading-none truncate max-w-[68px]',
              activeTab === 'settings' ? 'font-bold text-primary' : 'font-medium text-[#756752] dark:text-slate-400'
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
