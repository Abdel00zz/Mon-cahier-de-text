import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { impact, selection } = useHapticFeedback();
  const { locale } = useLocale();
  const { user } = useAuth();
  const copy = NAV_COPY[locale] ?? NAV_COPY.fr;
  const userName = teacherName?.trim() || (user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '') || copy.teacherSpace;
  const touchStartX = useRef(0);

  const isRtl = locale === 'ar';

  // Référence du menu et gestion gestuelle (On Drag / Swipe pour refermer)
  const navRef = useRef<HTMLElement>(null);
  const dragStartXRef = useRef<number | null>(null);
  const [dragDelta, setDragDelta] = useState<number>(0);

  const goTo = useCallback((tab: TabType) => {
    selection();
    onTabChange(tab);
  }, [selection, onTabChange]);

  const getMobileLabel = useCallback((id: TabType) => {
    if (id === 'dashboard') return copy.dashboardMobile ?? copy.dashboard;
    if (id === 'evaluations') return copy.evaluationsMobile ?? copy.evaluations;
    if (id === 'notifications') return copy.notificationsMobile ?? copy.notifications;
    if (id === 'settings') return copy.settingsMobile ?? copy.settings;
    return copy[id];
  }, [copy]);

  // Fermeture au clic à l'extérieur (Close when clicking outside)
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        onToggleExpanded();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isExpanded, onToggleExpanded]);

  // Gestion gestuelle tactile du menu latéral (On Drag to Close)
  const handleSidebarTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isExpanded) return;
    dragStartXRef.current = e.touches[0].clientX;
  }, [isExpanded]);

  const handleSidebarTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isExpanded || dragStartXRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStartXRef.current;
    // En LTR, glissement vers la gauche (diff < 0). En RTL, glissement vers la droite (diff > 0).
    const closingDelta = isRtl ? Math.max(0, diff) : Math.min(0, diff);
    // Limite l'effet visuel élastique
    const clamped = isRtl ? Math.min(closingDelta, 100) : Math.max(closingDelta, -100);
    setDragDelta(clamped);
  }, [isExpanded, isRtl]);

  const handleSidebarTouchEnd = useCallback(() => {
    if (!isExpanded) return;
    const threshold = 40;
    const shouldClose = isRtl ? dragDelta > threshold : dragDelta < -threshold;
    if (shouldClose) {
      impact('medium');
      onToggleExpanded();
    }
    dragStartXRef.current = null;
    setDragDelta(0);
  }, [dragDelta, impact, isExpanded, isRtl, onToggleExpanded]);

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
      {/* 2. Arrière-plan assombri derrière l'overlay (Add background behind overlay) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={() => {
              impact('light');
              onToggleExpanded();
            }}
            className="fixed inset-0 z-30 bg-stone-950/20 dark:bg-black/55 backdrop-blur-[2.5px] sm:block hidden cursor-pointer select-none"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 1. Barre latérale avec Glassmorphism & Position Top Left / Start */}
      <nav
        ref={navRef}
        className={cn(
          'fixed inset-y-0 start-0 z-40 hidden h-[100dvh] max-h-[100dvh] flex-col overflow-hidden',
          // Glassmorphism translucide avec background blur et fine bordure intérieure (1px)
'dashboard-artisan-nav bg-white/82 dark:bg-[#16171d]/88 backdrop-blur-[28px] backdrop-saturate-150',
          'border-e border-stone-200/60 dark:border-white/10 ring-1 ring-inset ring-white/50 dark:ring-white/5',
          'shadow-[6px_0_32px_rgba(0,0,0,0.06)] dark:shadow-[6px_0_32px_rgba(0,0,0,0.5)]',
          'text-stone-500 print:hidden sm:flex py-5 font-sans select-none rounded-e-[28px]',
          isExpanded ? 'w-[252px]' : 'w-[84px]',
          'transition-[width] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
        )}
        style={{
          transform: dragDelta ? `translateX(${dragDelta}px)` : undefined,
          transition: dragDelta ? 'none' : 'transform 200ms ease, width 250ms cubic-bezier(0.16,1,0.3,1)',
        }}
        onTouchStart={handleSidebarTouchStart}
        onTouchMove={handleSidebarTouchMove}
        onTouchEnd={handleSidebarTouchEnd}
        aria-label={copy.mainNav}
      >
        {/* Ligne spéculaire de réfraction de verre latérale */}
        <div className="pointer-events-none absolute inset-y-8 end-0 w-[1px] bg-gradient-to-b from-transparent via-stone-300/40 dark:via-white/10 to-transparent" aria-hidden="true" />

        {/* En-tête */}
        <div
          className={cn(
            'flex shrink-0 items-center transition-all ps-5 pe-4',
            isExpanded ? 'justify-start' : 'justify-center'
          )}
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-stone-100/90 hover:bg-stone-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-200 transition-colors shadow-2xs ring-1 ring-black/5 dark:ring-white/10"
            aria-label={isExpanded ? copy.collapse : copy.expand}
            title={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-5 w-5 stroke-[2]" />
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: isRtl ? 15 : -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRtl ? 15 : -15 }}
                transition={{ delay: 0.03, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="min-w-0 flex-1 ms-3"
              >
                <span
                  className={cn(
                    'block truncate font-bold tracking-tight text-stone-900 dark:text-stone-100',
                    locale === 'ar' ? 'font-sans text-2xl' : 'font-sans font-bold text-xl'
                  )}
                >
                  {copy.brand}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 truncate text-[10px] font-bold tracking-wider text-[#1B6A4D] dark:text-[#FF8252] uppercase mt-0.5 font-sans px-1.5 py-0.5 rounded-md",
                  locale === 'ar' && "text-[11px]"
                )}>
                  {userName || copy.teacherSpace}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Apparition en cascade (Staggered Animation) des liens principaux */}
        <div
          className="modern-scrollbar mt-6 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pb-2 ps-4 pe-4"
        >
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'evaluations' ? badgeCount : tab.id === 'notifications' ? (notificationsCount && notificationsCount > 0 ? notificationsCount : 3) : undefined;
            const staggerDelay = 0.04 * (idx + 1);

            return (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => goTo(tab.id)}
                title={copy[tab.id]}
                className={cn(
                  'group relative flex h-11 w-full cursor-pointer items-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6A4D]/40',
                  isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
                  isActive
                    ? 'font-bold'
                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100/60 dark:text-stone-500 dark:hover:text-stone-200 dark:hover:bg-white/5 font-medium',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Pastille dynamique animée */}
                {isActive && (
                  <motion.div
                    layoutId="desktop-sidebar-active-pill"
                    className="absolute inset-0 rounded-xl bg-[#1B6A4D]/12 dark:bg-[#1B6A4D]/20 border border-[#1B6A4D]/25 dark:border-[#1B6A4D]/30 shadow-xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
                  />
                )}

                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-transform duration-200 ease-out',
                      isActive
                        ? 'text-[#DE5B38] dark:text-[#F87171] stroke-[2.2] scale-105'
                        : 'text-stone-400 group-hover:text-stone-700 dark:text-stone-500 dark:group-hover:text-stone-200 stroke-[1.75] scale-100'
                    )}
                  />
                  {count ? (
                    <motion.span
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute -top-1.5 -end-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#16171d] shadow-[0_2px_8px_rgba(239,68,68,0.35)] tabular-nums"
                    >
                      {countLabel(count)}
                    </motion.span>
                  ) : null}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: isRtl ? 15 : -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRtl ? 15 : -15 }}
                      transition={{ delay: staggerDelay, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        'relative z-10 min-w-0 flex-1 truncate text-start text-[13px] leading-normal ms-3',
                        locale === 'ar' && 'text-[15px]',
                        isActive ? 'font-bold text-[#DE5B38] dark:text-[#F87171]' : 'text-stone-500 group-hover:text-stone-800 dark:text-stone-400 dark:group-hover:text-stone-200'
                      )}
                    >
                      {copy[tab.id]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Section inférieure : Paramètres & Guide en cascade */}
        <div
          className="mt-auto flex shrink-0 flex-col gap-2 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] ps-4 pe-4"
        >
          {/* Ligne de séparation subtile */}
          <div className="mx-2 mb-1 h-px bg-gradient-to-r from-transparent via-stone-200/70 dark:via-white/10 to-transparent" aria-hidden="true" />

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => goTo('settings')}
            onPointerEnter={preloadSettingsPage}
            onFocus={preloadSettingsPage}
            title={copy.settings}
            className={cn(
              'group relative flex h-11 w-full cursor-pointer items-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6A4D]/40',
              isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
              activeTab === 'settings'
                ? 'font-bold'
                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100/60 dark:text-stone-500 dark:hover:text-stone-200 dark:hover:bg-white/5 font-medium',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            {activeTab === 'settings' && (
              <motion.div
                layoutId="desktop-sidebar-active-pill"
                className="absolute inset-0 rounded-xl bg-[#1B6A4D]/12 dark:bg-[#1B6A4D]/20 border border-[#1B6A4D]/25 dark:border-[#1B6A4D]/30 shadow-xs"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}

            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
              <Settings
                className={cn(
                  'h-5 w-5 shrink-0 transition-transform duration-200 ease-out',
                  activeTab === 'settings'
                    ? 'text-[#DE5B38] dark:text-[#F87171] stroke-[2.2] scale-105'
                    : 'text-stone-400 group-hover:text-stone-700 dark:text-stone-500 dark:group-hover:text-stone-200 stroke-[1.75] scale-100'
                )}
              />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: isRtl ? 15 : -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 15 : -15 }}
                  transition={{ delay: 0.04 * 4, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'relative z-10 flex-1 truncate text-start text-[13px] leading-normal ms-3',
                    locale === 'ar' && 'text-[15px]',
                    activeTab === 'settings' ? 'font-bold text-[#DE5B38] dark:text-[#F87171]' : 'text-stone-500 group-hover:text-stone-800 dark:text-stone-400 dark:group-hover:text-stone-200'
                  )}
                >
                  {copy.settings}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => goTo('help')}
            title={copy.help}
            className={cn(
              'group relative flex h-11 w-full cursor-pointer items-center rounded-xl transition-colors duration-150 hover:bg-stone-100/60 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6A4D]/40',
              isExpanded ? 'justify-start px-3.5' : 'justify-center px-1.5',
              activeTab === 'help'
                ? 'font-bold'
                : 'text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 font-medium'
            )}
            aria-label={copy.help}
          >
            {activeTab === 'help' && (
              <motion.div
                layoutId="desktop-sidebar-active-pill"
                className="absolute inset-0 rounded-xl bg-[#1B6A4D]/12 dark:bg-[#1B6A4D]/20 border border-[#1B6A4D]/25 dark:border-[#1B6A4D]/30 shadow-xs"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}

            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
              <CircleHelp className={cn(
                'h-5 w-5 shrink-0 transition-all',
                activeTab === 'help'
                  ? 'text-[#DE5B38] dark:text-[#F87171] stroke-[2.2]'
                  : 'stroke-[1.75] text-stone-400 group-hover:text-stone-700 dark:text-stone-500 dark:group-hover:text-stone-200'
              )} />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: isRtl ? 15 : -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 15 : -15 }}
                  transition={{ delay: 0.04 * 5, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'relative z-10 flex-1 truncate text-start text-[13px] leading-normal font-medium ms-3',
                    locale === 'ar' && 'text-[15px]',
                    activeTab === 'help' ? 'font-bold text-[#DE5B38] dark:text-[#F87171]' : 'text-stone-500 group-hover:text-stone-800 dark:text-stone-400 dark:group-hover:text-stone-200'
                  )}
                >
                  {copy.help}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </nav>

      {/* Barre mobile compacte - Ergonomie avancée style iPhone 17 sans coupure de texte ni écrasement */}
      <nav
        className="mobile-tab-bar fixed inset-x-3 z-40 overflow-hidden rounded-2xl border border-border bg-background/95 backdrop-blur-md text-muted-foreground shadow-lg print:hidden sm:hidden will-change-transform font-sans"
        style={{ bottom: 'max(0.65rem, env(safe-area-inset-bottom, 0.65rem))' }}
        aria-label={copy.mobileNav}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ligne spéculaire de réfraction de verre */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" aria-hidden="true" />

        <div className="relative mx-auto flex h-[62px] max-w-md items-center justify-around px-1 pt-0.5 pb-1">
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
                className="relative flex flex-1 flex-col items-center justify-center pt-1 pb-1.5 px-0.5 rounded-xl min-h-[52px] min-w-0 cursor-pointer select-none"
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Pastille coulissante dynamique (Spring Pill) */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-active-pill"
                    className="absolute inset-x-0.5 inset-y-1 rounded-lg bg-primary/12 dark:bg-primary/20 border border-primary/25 shadow-xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
                  />
                )}

                <motion.div
                  animate={{ scale: isActive ? 1.08 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative z-10 flex h-6 w-6 items-center justify-center shrink-0"
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200 ease-out",
                      isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground stroke-[1.8]"
                    )}
                  />
                  {count ? (
                    <span
                      className="absolute -top-1.5 -end-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-1 ring-card"
                    >
                      {countLabel(count)}
                    </span>
                  ) : null}
                </motion.div>

                <span className={cn(
                  "mobile-tab-label relative z-10 mt-1 block max-w-full text-center whitespace-nowrap overflow-visible pb-0.5 transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground"
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
            className="relative flex flex-1 flex-col items-center justify-center pt-1 pb-1.5 px-0.5 rounded-xl min-h-[52px] min-w-0 cursor-pointer select-none"
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            {/* Pastille coulissante dynamique si settings actif */}
            {activeTab === 'settings' && (
              <motion.div
                layoutId="mobile-tab-active-pill"
                className="absolute inset-x-0.5 inset-y-1 rounded-lg bg-primary/12 dark:bg-primary/20 border border-primary/25 shadow-xs"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}

            <motion.div
              animate={{ scale: activeTab === 'settings' ? 1.08 : 1, y: activeTab === 'settings' ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative z-10 flex h-6 w-6 items-center justify-center shrink-0"
            >
              <Settings
                className={cn(
                  "h-5 w-5 transition-all duration-200 ease-out",
                  activeTab === 'settings' ? "text-primary stroke-[2.5]" : "text-muted-foreground stroke-[1.8]"
                )}
              />
            </motion.div>

            <span className={cn(
              "mobile-tab-label relative z-10 mt-1 block max-w-full text-center whitespace-nowrap overflow-visible pb-0.5 transition-colors duration-150",
              activeTab === 'settings' ? "text-primary" : "text-muted-foreground"
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
