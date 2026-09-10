import React, { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
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
  dashboardMobile?: string; evaluationsMobile?: string; notificationsMobile?: string; settingsMobile?: string;
  collapse: string; expand: string; mainNav: string; mobileNav: string;
}> = {
  fr: {
    brand: 'Cahier de textes', teacherSpace: 'ESPACE ENSEIGNANT',
    dashboard: 'Classes', evaluations: 'Contrôle continu', notifications: 'Pilotage', settings: 'Paramètres', help: 'Guide',
    dashboardMobile: 'Classes', evaluationsMobile: 'Évaluations', notificationsMobile: 'Pilotage', settingsMobile: 'Paramètres',
    collapse: 'Réduire', expand: 'Développer', mainNav: 'Navigation principale', mobileNav: 'Navigation mobile',
  },
  ar: {
    brand: 'دفتر النصوص', teacherSpace: 'فضاء الأستاذ',
    dashboard: 'أقسامك', evaluations: 'المراقبة المستمرة', notifications: 'لوحة القيادة', settings: 'الإعدادات', help: 'الدليل التربوي',
    dashboardMobile: 'أقسامك', evaluationsMobile: 'المراقبة', notificationsMobile: 'لوحة القيادة', settingsMobile: 'الإعدادات',
    collapse: 'تصغير القائمة', expand: 'توسيع القائمة', mainNav: 'التنقل الرئيسي', mobileNav: 'التنقل على الهاتف',
  },
  en: {
    brand: 'Lesson Notebook', teacherSpace: 'TEACHER SPACE',
    dashboard: 'Classes', evaluations: 'Continuous Assessment', notifications: 'Dashboard', settings: 'Settings', help: 'Pedagogical Guide',
    dashboardMobile: 'Classes', evaluationsMobile: 'Assessments', notificationsMobile: 'Dashboard', settingsMobile: 'Settings',
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

  const isRtl = locale === 'ar';

  const goTo = useCallback((tab: TabType) => {
    impact('light');
    onTabChange(tab);
  }, [impact, onTabChange]);

  const getMobileLabel = useCallback((id: TabType) => {
    if (id === 'dashboard') return copy.dashboardMobile ?? copy.dashboard;
    if (id === 'evaluations') return copy.evaluationsMobile ?? copy.evaluations;
    if (id === 'notifications') return copy.notificationsMobile ?? copy.notifications;
    if (id === 'settings') return copy.settingsMobile ?? copy.settings;
    return copy[id];
  }, [copy]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) < 45) return;
    const allNavTabs: TabType[] = ['dashboard', 'evaluations', 'notifications', 'settings'];
    const currentIndex = allNavTabs.indexOf(activeTab);
    if (currentIndex === -1) return;
    const direction = isRtl ? (delta > 0 ? 1 : -1) : (delta > 0 ? -1 : 1);
    const nextIndex = Math.max(0, Math.min(allNavTabs.length - 1, currentIndex + direction));
    if (nextIndex !== currentIndex) {
      impact('medium');
      onTabChange(allNavTabs[nextIndex]);
    }
  }, [activeTab, impact, onTabChange, isRtl]);

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
                  'group relative flex h-11 w-full cursor-pointer items-center rounded-[var(--radius-md,0.625rem)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
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
              'group flex h-11 w-full cursor-pointer items-center rounded-[var(--radius-md,0.625rem)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
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
              'group flex h-11 w-full cursor-pointer items-center rounded-[var(--radius-md,0.625rem)] text-muted-foreground transition-all duration-150 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
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

      {/* Barre mobile compacte - Ergonomie avancée style iPhone 17 sans coupure de texte ni écrasement */}
      <nav
        className="mobile-tab-bar fixed inset-x-3 z-40 overflow-hidden rounded-2xl border border-border/70 bg-card/90 dark:bg-card/85 backdrop-blur-2xl text-muted-foreground shadow-[0_12px_36px_-6px_rgba(43,38,32,0.14),0_4px_16px_-2px_rgba(43,38,32,0.06)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.6)] print:hidden sm:hidden will-change-transform font-sans"
        style={{ bottom: 'max(0.65rem, env(safe-area-inset-bottom, 0.65rem))' }}
        aria-label={copy.mobileNav}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ligne spéculaire de réfraction de verre */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" aria-hidden="true" />

        <div className="relative mx-auto flex h-[68px] max-w-md items-center justify-around px-1 pt-1 pb-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'evaluations' ? badgeCount : tab.id === 'notifications' ? notificationsCount : undefined;

            return (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.90 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                onClick={() => goTo(tab.id)}
                className="relative flex flex-1 flex-col items-center justify-center pt-1.5 pb-2 px-0.5 rounded-xl min-h-[58px] min-w-0 cursor-pointer select-none"
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Pastille coulissante dynamique (Spring Pill) */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-active-pill"
                    className="absolute inset-x-0.5 inset-y-1 rounded-xl bg-primary/12 dark:bg-primary/20 border border-primary/25 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
                  />
                )}

                <motion.div
                  animate={{ scale: isActive ? 1.08 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative z-10 flex items-center justify-center shrink-0"
                >
                  <Icon className={cn("h-5 w-5 transition-colors duration-150", isActive ? "text-primary" : "text-muted-foreground")} />
                  {count ? (
                    <span
                      className="absolute -top-1.5 -end-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-1 ring-card"
                    >
                      {countLabel(count)}
                    </span>
                  ) : null}
                </motion.div>

                <span className={cn(
                  "relative z-10 mt-1 block max-w-full text-center whitespace-nowrap overflow-visible leading-normal transition-colors duration-150",
                  locale === 'ar'
                    ? "text-[11.5px] font-bold leading-normal tracking-normal pb-0.5"
                    : "text-[10.5px] font-semibold leading-normal pb-0.5",
                  isActive ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                  {getMobileLabel(tab.id)}
                </span>
              </motion.button>
            );
          })}

          <motion.button
            type="button"
            whileTap={{ scale: 0.90 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            onClick={() => goTo('settings')}
            onTouchStart={preloadSettingsPage}
            onPointerEnter={preloadSettingsPage}
            onFocus={preloadSettingsPage}
            className="relative flex flex-1 flex-col items-center justify-center pt-1.5 pb-2 px-0.5 rounded-xl min-h-[58px] min-w-0 cursor-pointer select-none"
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            {/* Pastille coulissante dynamique si settings actif */}
            {activeTab === 'settings' && (
              <motion.div
                layoutId="mobile-tab-active-pill"
                className="absolute inset-x-0.5 inset-y-1 rounded-xl bg-primary/12 dark:bg-primary/20 border border-primary/25 shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
              />
            )}

            <motion.div
              animate={{ scale: activeTab === 'settings' ? 1.08 : 1, y: activeTab === 'settings' ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative z-10 flex items-center justify-center shrink-0"
            >
              <Settings className={cn("h-5 w-5 transition-colors duration-150", activeTab === 'settings' ? "text-primary" : "text-muted-foreground")} />
            </motion.div>

            <span className={cn(
              "relative z-10 mt-1 block max-w-full text-center whitespace-nowrap overflow-visible leading-normal transition-colors duration-150",
              locale === 'ar'
                ? "text-[11.5px] font-bold leading-normal tracking-normal pb-0.5"
                : "text-[10.5px] font-semibold leading-normal pb-0.5",
              activeTab === 'settings' ? "text-primary font-bold" : "text-muted-foreground"
            )}>
              {getMobileLabel('settings')}
            </span>
          </motion.button>
        </div>
      </nav>
    </>
  );
});

TabBar.displayName = 'TabBar';
