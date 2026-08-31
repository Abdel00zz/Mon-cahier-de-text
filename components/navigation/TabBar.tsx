import React, { useCallback, useRef } from 'react';
import { Users, Settings, CircleHelp, PieChart, CalendarCheck, Menu } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useLocale, AppLocale } from '@/i18n/LocaleProvider';
import { preloadSettingsPage } from '@/utils/performance';
import { useAuth } from '@/contexts/AuthContext';

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
    brand: 'Cahier de textes', teacherSpace: 'ESPACE ENSEIGNANT',
    dashboard: 'Classes', evaluations: 'Contrôle continu', notifications: 'Pilotage', settings: 'Paramètres', help: 'Guide',
    collapse: 'Réduire', expand: 'Développer', mainNav: 'Navigation principale', mobileNav: 'Navigation mobile',
  },
  ar: {
    brand: 'دفتر النصوص', teacherSpace: 'فضاء الأستاذ',
    dashboard: 'الأقسام', evaluations: 'المراقبة المستمرة', notifications: 'لوحة القيادة', settings: 'الإعدادات', help: 'الدليل التربوي',
    collapse: 'تصغير القائمة', expand: 'توسيع القائمة', mainNav: 'التنقل الرئيسي', mobileNav: 'التنقل على الهاتف',
  },
  en: {
    brand: 'Lesson Notebook', teacherSpace: 'TEACHER SPACE',
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
  const { user } = useAuth();
  const copy = NAV_COPY[locale] ?? NAV_COPY.fr;
  const userName = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : copy.teacherSpace;
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
      {/* Barre latérale classeur / cahier de textes */}
      <nav
        className={cn(
          'fixed inset-y-0 z-40 hidden h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-white dark:bg-[#202124] text-[#5f6368] dark:text-[#e8eaed] print:hidden shadow-2xl sm:flex py-4 font-sans select-none',
          isRtl ? 'right-0 border-l border-[#e0e0e0] dark:border-[#5f6368]' : 'left-0 border-r border-[#e0e0e0] dark:border-[#5f6368]',
          isExpanded ? 'w-[252px]' : 'w-[84px]',
          'transition-[width] duration-200 ease-out',
        )}
        aria-label={copy.mainNav}
      >
        {/* Perforations reliure de cahier le long du bord extérieur */}
        <div
          className={cn(
            'absolute inset-y-0 flex flex-col justify-between py-6 pointer-events-none z-20',
            isRtl ? 'right-1 sm:right-1.5' : 'left-1 sm:left-1.5'
          )}
          aria-hidden="true"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#EAE2D0] shadow-xs opacity-80"
            />
          ))}
        </div>

        {/* En-tête */}
        <div
          className={cn(
            'flex shrink-0 items-center transition-all',
            isRtl ? 'pl-4 pr-5' : 'pl-5 pr-4',
            isExpanded ? 'justify-start' : 'justify-center'
          )}
        >
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[#e0e0e0] dark:border-[#5f6368] bg-slate-100 dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] transition-colors hover:bg-slate-200 dark:hover:bg-[#5f6368] hover:text-[#202124] dark:hover:text-[#e8eaed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-95 shadow-sm"
            aria-label={isExpanded ? copy.collapse : copy.expand}
            title={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className={cn('hidden min-w-0 flex-1 ml-3', isExpanded && 'block', isRtl && 'mr-3 ml-0')}>
            <span
              className={cn(
                'block truncate font-bold leading-tight text-[#202124] dark:text-[#e8eaed]',
                locale === 'ar' ? 'font-sans text-2xl' : 'font-sans font-bold text-xl'
              )}
            >
              {copy.brand}
            </span>
            <span className="block truncate text-[10px] font-bold tracking-wider text-blue-500 uppercase mt-0.5 font-sans">
              {userName || copy.teacherSpace}
            </span>
          </div>
        </div>

        {/* Éléments de navigation principale */}
        <div
          className={cn(
            'modern-scrollbar mt-6 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pb-2',
            isRtl ? 'pl-2.5 pr-5' : 'pl-5 pr-2.5'
          )}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'evaluations' ? badgeCount : tab.id === 'notifications' ? notificationsCount : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goTo(tab.id)}
                title={copy[tab.id]}
                className={cn(
                  'group relative flex h-11 w-full cursor-pointer items-center rounded-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:bg-[#feefc3] focus-visible:text-[#202124] active:scale-98',
                  isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
                  isActive
                    ? 'bg-[#feefc3] dark:bg-[#41331c] text-[#202124] dark:text-amber-100 shadow-xs font-bold'
                    : 'bg-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed] font-medium',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex shrink-0 items-center justify-center">
                  <Icon className={cn('h-5 w-5 shrink-0 stroke-[2]', isActive ? 'text-[#202124] dark:text-amber-200' : 'text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#202124] dark:hover:text-[#e8eaed]')} />
                  {count ? (
                    <span
                      className={cn(
                        'absolute -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#B23A50] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#1E1914]',
                        isRtl ? '-left-2' : '-right-2',
                      )}
                    >
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>

                <span
                  className={cn(
                    'hidden min-w-0 flex-1 truncate text-start text-[13px] leading-normal transition-all duration-150',
                    isExpanded && 'block',
                    isRtl ? 'mr-3' : 'ml-3',
                    isActive ? 'font-bold text-[#202124] dark:text-amber-100' : 'text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#202124] dark:hover:text-[#e8eaed]'
                  )}
                >
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section inférieure : Paramètres & Guide */}
        <div
          className={cn(
            'mt-auto flex shrink-0 flex-col gap-1.5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]',
            isRtl ? 'pl-2.5 pr-5' : 'pl-5 pr-2.5'
          )}
        >
          <button
            type="button"
            onClick={() => goTo('settings')}
            onPointerEnter={preloadSettingsPage}
            onFocus={preloadSettingsPage}
            title={copy.settings}
            className={cn(
              'group flex h-11 w-full cursor-pointer items-center rounded-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:bg-[#feefc3] focus-visible:text-[#202124] active:scale-98',
              isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
              activeTab === 'settings'
                ? 'bg-[#feefc3] dark:bg-[#41331c] text-[#202124] dark:text-amber-100 shadow-xs font-bold'
                : 'bg-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed] font-medium',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-5 w-5 shrink-0 stroke-[2]', activeTab === 'settings' ? 'text-[#202124] dark:text-amber-200' : 'text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#202124] dark:hover:text-[#e8eaed]')} />
            <span
              className={cn(
                'hidden flex-1 truncate text-start text-[13px] leading-normal',
                isExpanded && 'block',
                isRtl ? 'mr-3' : 'ml-3',
                activeTab === 'settings' ? 'font-bold text-[#202124] dark:text-amber-100' : 'text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#202124] dark:hover:text-[#e8eaed]'
              )}
            >
              {copy.settings}
            </span>
          </button>

          <button
            type="button"
            onClick={() => goTo('help')}
            title={copy.help}
            className={cn(
              'group flex h-11 w-full cursor-pointer items-center rounded-[14px] text-[#5f6368] dark:text-[#9aa0a6] transition-all duration-150 hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-98',
              isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
            )}
            aria-label={copy.help}
          >
            <CircleHelp className="h-5 w-5 shrink-0 stroke-[2] text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#202124] dark:hover:text-[#e8eaed]" />
            <span
              className={cn(
                'hidden flex-1 truncate text-start text-[13px] leading-normal font-medium text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#202124] dark:hover:text-[#e8eaed]',
                isExpanded && 'block',
                isRtl ? 'mr-3' : 'ml-3',
              )}
            >
              {copy.help}
            </span>
          </button>
        </div>
      </nav>

      {/* Barre mobile compacte */}
      <nav
        className="mobile-tab-bar fixed inset-x-2.5 z-40 overflow-visible rounded-[18px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white/95 dark:bg-[#202124]/95 text-[#5f6368] dark:text-[#e8eaed] shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] backdrop-blur-xl print:hidden sm:hidden will-change-transform font-sans"
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
                  'relative flex flex-1 flex-col items-center justify-center py-1 rounded-[12px] transition-all duration-200 active:scale-95 cursor-pointer',
                  'min-h-[50px] min-w-[48px]',
                  isActive ? 'bg-[#feefc3] dark:bg-[#41331c] text-[#202124] dark:text-amber-100 font-bold shadow-xs' : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                  {count ? (
                    <span
                      className={cn(
                        'absolute -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#B23A50] px-1 text-[9px] font-bold leading-none text-white ring-1 ring-[#1E1914]',
                        isRtl ? '-left-2' : '-right-2',
                      )}
                    >
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>
                <span className="mt-0.5 block max-w-full truncate text-[10px] leading-tight font-medium">
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
              'relative flex flex-1 flex-col items-center justify-center py-1 rounded-[12px] transition-all duration-200 active:scale-95 cursor-pointer',
              'min-h-[50px] min-w-[48px]',
              activeTab === 'settings' ? 'bg-[#feefc3] dark:bg-[#41331c] text-[#202124] dark:text-amber-100 font-bold shadow-xs' : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <div className="relative flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <span className="mt-0.5 block max-w-full truncate text-[10px] leading-tight font-medium">
              {copy.settings}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
});

TabBar.displayName = 'TabBar';
