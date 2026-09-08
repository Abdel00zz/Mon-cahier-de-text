import React, { useCallback, useRef } from 'react';
import { Users, Settings, CircleHelp, AlarmBell, CalendarCheck, Menu } from '@/components/ui/icons';
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
  teacherName?: string;
}

const tabs: Array<{ id: TabType; icon: React.FC<{ className?: string }> }> = [
  { id: 'dashboard', icon: Users },
  { id: 'evaluations', icon: CalendarCheck },
  { id: 'notifications', icon: AlarmBell },
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
    dashboard: 'أقسامك', evaluations: 'المراقبة المستمرة', notifications: 'لوحة القيادة', settings: 'الإعدادات', help: 'الدليل التربوي',
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
  teacherName,
}) => {
  const { impact } = useHapticFeedback();
  const { locale } = useLocale();
  const { user } = useAuth();
  const copy = NAV_COPY[locale] ?? NAV_COPY.fr;
  const userName = teacherName?.trim() || (user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '') || copy.teacherSpace;
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
          'fixed inset-y-0 start-0 z-40 hidden h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-card text-muted-foreground print:hidden shadow-2xl sm:flex py-4 font-sans select-none border-inline-end border-border/80',
          isExpanded ? 'w-[252px]' : 'w-[84px]',
          'transition-[width] duration-200 ease-out',
        )}
        aria-label={copy.mainNav}
      >
        {/* Perforations reliure de cahier le long du bord extérieur */}
        <div
          className="absolute inset-y-0 start-1 sm:start-1.5 flex flex-col justify-between py-6 pointer-events-none z-20"
          aria-hidden="true"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-muted/80 shadow-xs"
            />
          ))}
        </div>

        {/* En-tête */}
        <div
          className={cn(
            'flex shrink-0 items-center transition-all ps-5 pe-4',
            isExpanded ? 'justify-start' : 'justify-center'
          )}
        >
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 shadow-2xs"
            aria-label={isExpanded ? copy.collapse : copy.expand}
            title={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className={cn('hidden min-w-0 flex-1 ms-3', isExpanded && 'block')}>
            <span
              className={cn(
                'block truncate font-bold leading-tight text-foreground',
                locale === 'ar' ? 'font-sans text-2xl' : 'font-sans font-bold text-xl'
              )}
            >
              {copy.brand}
            </span>
            <span className={cn(
              "block truncate text-[10px] font-bold tracking-wider text-primary uppercase mt-0.5 font-sans",
              locale === 'ar' && "text-[12px]"
            )}>
              {userName || copy.teacherSpace}
            </span>
          </div>
        </div>

        {/* Éléments de navigation principale */}
        <div
          className="modern-scrollbar mt-6 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pb-2 ps-5 pe-2.5"
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
                  'group relative flex h-11 w-full cursor-pointer items-center rounded-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
                  isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold shadow-xs'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground font-medium',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex shrink-0 items-center justify-center">
                  <Icon className={cn('h-5 w-5 shrink-0 stroke-[2]', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                  {count ? (
                    <span
                      className="absolute -top-1.5 -end-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-card"
                    >
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>

                <span
                  className={cn(
                    'hidden min-w-0 flex-1 truncate text-start text-[13px] leading-normal transition-all duration-150 ms-3',
                    locale === 'ar' && 'text-[15px]',
                    isExpanded && 'block',
                    isActive ? 'font-bold text-primary' : 'text-muted-foreground group-hover:text-foreground'
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
          className="mt-auto flex shrink-0 flex-col gap-1.5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] ps-5 pe-2.5"
        >
          <button
            type="button"
            onClick={() => goTo('settings')}
            onPointerEnter={preloadSettingsPage}
            onFocus={preloadSettingsPage}
            title={copy.settings}
            className={cn(
              'group flex h-11 w-full cursor-pointer items-center rounded-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
              isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
              activeTab === 'settings'
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold shadow-xs'
                : 'bg-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground font-medium',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-5 w-5 shrink-0 stroke-[2]', activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
            <span
              className={cn(
                'hidden flex-1 truncate text-start text-[13px] leading-normal ms-3',
                locale === 'ar' && 'text-[15px]',
                isExpanded && 'block',
                activeTab === 'settings' ? 'font-bold text-primary' : 'text-muted-foreground group-hover:text-foreground'
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
              'group flex h-11 w-full cursor-pointer items-center rounded-none text-muted-foreground transition-all duration-150 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
              isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
            )}
            aria-label={copy.help}
          >
            <CircleHelp className="h-5 w-5 shrink-0 stroke-[2] text-muted-foreground group-hover:text-foreground" />
            <span
              className={cn(
                'hidden flex-1 truncate text-start text-[13px] leading-normal font-medium text-muted-foreground group-hover:text-foreground ms-3',
                locale === 'ar' && 'text-[15px]',
                isExpanded && 'block',
              )}
            >
              {copy.help}
            </span>
          </button>
        </div>
      </nav>

      {/* Barre mobile compacte */}
      <nav
        className="mobile-tab-bar fixed inset-x-2.5 z-40 overflow-visible rounded-xl border border-border bg-card text-muted-foreground shadow-[0_8px_30px_rgba(63,58,52,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] print:hidden sm:hidden will-change-transform font-sans"
        style={{ bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.6rem))' }}
        aria-label={copy.mobileNav}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto flex h-[64px] max-w-md items-center justify-around px-1 py-1">
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
                  'relative flex flex-1 flex-col items-center justify-center py-1 rounded-lg transition-all duration-150 active:scale-[0.96] cursor-pointer',
                  'min-h-[50px] min-w-[48px]',
                  isActive ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                  {count ? (
                    <span
                      className="absolute -top-1.5 -end-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-1 ring-card"
                    >
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>
                <span className={cn(
                  "mt-0.5 block max-w-full truncate text-[10px] leading-tight font-medium",
                  locale === 'ar' && "text-[12px] font-bold leading-none"
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
              'relative flex flex-1 flex-col items-center justify-center py-1 rounded-lg transition-all duration-150 active:scale-[0.96] cursor-pointer',
              'min-h-[50px] min-w-[48px]',
              activeTab === 'settings' ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <div className="relative flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <span className={cn(
              "mt-0.5 block max-w-full truncate text-[10px] leading-tight font-medium",
              locale === 'ar' && "text-[12px] font-bold leading-none"
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
