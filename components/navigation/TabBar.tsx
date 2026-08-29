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
      {/* Navigation sombre neutre, compacte et lisible. */}
      <nav
        className={cn(
          'fixed inset-y-0 z-40 hidden h-[100dvh] max-h-[100dvh] w-[76px] flex-col overflow-hidden bg-zinc-950 text-white print:hidden shadow-[8px_0_32px_rgba(9,9,11,0.3)] sm:flex py-3.5 landscape:py-2.5',
          isRtl ? 'right-0 border-l border-zinc-800' : 'left-0 border-r border-zinc-800',
          isExpanded ? 'lg:w-[252px]' : 'lg:w-[76px]',
          'transition-[width] duration-200 ease-out',
        )}
        aria-label={copy.mainNav}
      >
        <div className={cn('flex h-11 shrink-0 items-center justify-center px-2.5 landscape:h-10', isExpanded && 'lg:justify-start lg:px-3.5')}>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 landscape:h-9 landscape:w-9 active:scale-95"
            aria-label={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-[19px] w-[19px]" />
          </button>
          <div className={cn('ms-3 hidden min-w-0', isExpanded && 'lg:block lg:max-w-[175px]')}>
            <span className="block truncate text-[14px] font-bold tracking-tight text-white">{copy.brand}</span>
            <span className="block truncate text-[11px] font-medium text-zinc-400">{copy.teacherSpace}</span>
          </div>
        </div>

        <div className="modern-scrollbar mt-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-2.5 pb-2 landscape:mt-2">
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
                  'group relative flex h-11 w-full cursor-pointer items-center justify-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 landscape:h-10',
                  isExpanded && 'lg:justify-start lg:gap-3 lg:px-1.5',
                  isActive
                    ? 'bg-zinc-800/80 text-white'
                    : 'text-zinc-400 hover:bg-zinc-900/90 hover:text-white',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={cn(
                  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:border-zinc-700 group-hover:bg-zinc-800 group-hover:text-white',
                )}>
                  <Icon className="h-[19px] w-[19px] shrink-0" />
                  {count ? (
                    <span className={cn(
                      'absolute -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-[5px] text-[9px] font-bold leading-none text-white ring-2 ring-black',
                      isRtl ? '-left-1' : '-right-1',
                    )}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </span>
                <span className={cn(
                  'hidden min-w-0 flex-1 truncate text-start text-[14px] leading-normal py-0.5 transition-all duration-150',
                  isExpanded && 'lg:block',
                  isActive ? 'font-bold text-white' : 'font-medium text-zinc-300 group-hover:text-white',
                )}>
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-1.5 px-2.5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] border-t border-zinc-900 landscape:pb-2">
          <button
            type="button"
            onClick={() => goTo('settings')}
            onPointerEnter={preloadSettingsPage}
            onFocus={preloadSettingsPage}
            className={cn(
              'group flex h-11 w-full cursor-pointer items-center justify-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 landscape:h-10',
              isExpanded && 'lg:justify-start lg:gap-3 lg:px-1.5',
              activeTab === 'settings'
                ? 'bg-zinc-800/80 text-white'
                : 'text-zinc-400 hover:bg-zinc-900/90 hover:text-white',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <span className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
              activeTab === 'settings'
                ? 'bg-white text-black shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:border-zinc-700 group-hover:bg-zinc-800 group-hover:text-white',
            )}>
              <Settings className="h-[19px] w-[19px] shrink-0" />
            </span>
            <span className={cn(
              'hidden flex-1 text-start text-[14px] leading-normal py-0.5',
              isExpanded && 'lg:block',
              activeTab === 'settings' ? 'font-bold text-white' : 'font-medium text-zinc-300 group-hover:text-white',
            )}>
              {copy.settings}
            </span>
          </button>
          <button
            type="button"
            onClick={() => goTo('help')}
            className={cn(
              'group flex h-11 w-full cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-colors duration-150 hover:bg-zinc-900/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 landscape:h-10',
              isExpanded && 'lg:justify-start lg:gap-3 lg:px-1.5',
            )}
            aria-label={copy.help}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors group-hover:border-zinc-700 group-hover:bg-zinc-800 group-hover:text-white">
              <CircleHelp className="h-[19px] w-[19px] shrink-0" />
            </span>
            <span className={cn(
              'hidden flex-1 text-start text-[14px] leading-normal py-0.5 font-medium text-zinc-300 group-hover:text-white',
              isExpanded && 'lg:block',
            )}>
              {copy.help}
            </span>
          </button>
        </div>
      </nav>

      {/* Barre mobile compacte : texte court, zones tactiles de 48 px minimum. */}
      <nav
        className="mobile-tab-bar fixed inset-x-2.5 z-40 overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/95 text-zinc-200 shadow-[0_12px_36px_rgba(9,9,11,0.38)] backdrop-blur-xl print:hidden sm:hidden will-change-transform"
        style={{ bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.6rem))' }}
        aria-label={copy.mobileNav}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto flex h-[62px] max-w-md items-center justify-around px-1 py-1">
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
                  'relative flex flex-1 flex-col items-center justify-center py-0.5 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer',
                  'min-h-[50px] min-w-[48px]',
                  isActive ? 'text-white font-bold' : 'text-zinc-400 hover:text-white',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-white text-black shadow-xs scale-105'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300',
                )}>
                  <Icon className="h-[17px] w-[17px]" />
                  {count ? (
                    <span className={cn(
                      'absolute -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-600 px-1 text-[8px] font-bold leading-none text-white ring-2 ring-black shadow-xs',
                      isRtl ? '-left-1.5' : '-right-1.5',
                    )}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>
                <span className={cn(
                  'mt-1 text-[11px] leading-tight text-center whitespace-nowrap px-1',
                  isActive ? 'font-bold text-white' : 'font-medium text-zinc-400',
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
              'relative flex flex-1 flex-col items-center justify-center py-0.5 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer',
              'min-h-[50px] min-w-[48px]',
              activeTab === 'settings' ? 'text-white font-bold' : 'text-zinc-400 hover:text-white',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <div className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              activeTab === 'settings'
                ? 'bg-white text-black shadow-xs scale-105'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300',
            )}>
              <Settings className="h-[17px] w-[17px]" />
            </div>
            <span className={cn(
              'mt-1 text-[11px] leading-tight text-center whitespace-nowrap px-1',
              activeTab === 'settings' ? 'font-bold text-white' : 'font-medium text-zinc-400',
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
