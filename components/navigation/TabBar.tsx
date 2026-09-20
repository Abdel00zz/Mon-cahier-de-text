import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Users, Settings, CircleHelp, AlarmBell, CalendarCheck, Menu } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useLocale, AppLocale } from '@/i18n/LocaleProvider';
import { preloadNavigation } from '@/utils/performance';
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
  { id: 'settings', icon: Settings },
  { id: 'help', icon: CircleHelp },
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

export const TabBar = React.memo<TabBarProps>(({
  activeTab, onTabChange, badgeCount, notificationsCount, isExpanded, onToggleExpanded, teacherName,
}) => {
  const { impact, selection } = useHapticFeedback();
  const { locale } = useLocale();
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();
  const copy = NAV_COPY[locale] ?? NAV_COPY.fr;
  const userName = teacherName?.trim() || (user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '') || copy.teacherSpace;
  const isRtl = locale === 'ar';
  const navRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const dragStartXRef = useRef<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const transition = { duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' as const };

  const goTo = useCallback((tab: TabType) => {
    selection();
    onTabChange(tab);
  }, [selection, onTabChange]);

  useEffect(() => {
    if (!isExpanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) onToggleExpanded();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggleExpanded();
        navRef.current?.querySelector<HTMLButtonElement>('.workspace-nav-toggle')?.focus();
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isExpanded, onToggleExpanded]);

  const getMobileLabel = (id: TabType) => {
    if (id === 'dashboard') return copy.dashboardMobile ?? copy.dashboard;
    if (id === 'evaluations') return copy.evaluationsMobile ?? copy.evaluations;
    if (id === 'notifications') return copy.notificationsMobile ?? copy.notifications;
    if (id === 'settings') return copy.settingsMobile ?? copy.settings;
    return copy[id];
  };

  // Every destination shares the same visual and keyboard states.
  const renderTab = (tab: typeof tabs[number], mobile = false) => {
    const Icon = tab.icon;
    const active = activeTab === tab.id;
    const count = tab.id === 'evaluations' ? badgeCount : tab.id === 'notifications' ? notificationsCount : undefined;
    const hasCount = typeof count === 'number' && Number.isFinite(count) && count > 0;
    return (
      <motion.button
        key={tab.id}
        type="button"
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        transition={transition}
        onClick={() => goTo(tab.id)}
        onPointerEnter={() => preloadNavigation(tab.id)}
        onPointerDown={() => preloadNavigation(tab.id)}
        onFocus={() => preloadNavigation(tab.id)}
        title={copy[tab.id]}
        aria-label={copy[tab.id]}
        aria-current={active ? 'page' : undefined}
        className={cn('workspace-nav-item', mobile ? 'workspace-nav-item-mobile' : 'workspace-nav-item-desktop', !mobile && !isExpanded && 'workspace-nav-item-collapsed')}
      >
        {active && (
          <motion.span
            layoutId={reducedMotion ? undefined : mobile ? 'mobile-tab-active-pill' : 'desktop-sidebar-active-pill'}
            className="workspace-nav-active"
            transition={transition}
            aria-hidden="true"
          />
        )}
        <span className="workspace-nav-icon">
          <Icon className={cn('h-5 w-5', active ? 'stroke-[2.1]' : 'stroke-[1.75]')} />
          {hasCount && <span className="workspace-nav-count">{count > 99 ? '99+' : count}</span>}
        </span>
        {(mobile || isExpanded) && (
          <span className={cn('workspace-nav-label', mobile && 'mobile-tab-label')}>
            {mobile ? getMobileLabel(tab.id) : copy[tab.id]}
          </span>
        )}
      </motion.button>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}
            className="workspace-nav-scrim fixed inset-0 z-30 hidden sm:block print:hidden" aria-hidden="true" />
        )}
      </AnimatePresence>
      <nav ref={navRef} aria-label={copy.mainNav} dir={isRtl ? 'rtl' : 'ltr'}
        className={cn('workspace-nav dashboard-artisan-nav fixed inset-y-0 start-0 z-40 hidden h-dvh flex-col sm:flex print:hidden', isExpanded ? 'workspace-nav-expanded w-[252px]' : 'workspace-nav-collapsed w-[84px]')}
        style={{ transform: dragDelta ? `translateX(${dragDelta}px)` : undefined, transition: dragDelta || reducedMotion ? 'none' : undefined }}
        onTouchStart={event => { if (isExpanded) dragStartXRef.current = event.touches[0].clientX; }}
        onTouchMove={event => {
          if (!isExpanded || dragStartXRef.current === null) return;
          const diff = event.touches[0].clientX - dragStartXRef.current;
          setDragDelta(isRtl ? Math.min(100, Math.max(0, diff)) : Math.max(-100, Math.min(0, diff)));
        }}
        onTouchEnd={() => {
          if (Math.abs(dragDelta) > 40) { impact('medium'); onToggleExpanded(); }
          dragStartXRef.current = null;
          setDragDelta(0);
        }}
        onTouchCancel={() => { dragStartXRef.current = null; setDragDelta(0); }}
      >
        <div className="flex shrink-0 items-center gap-3 px-5 pt-3 pb-2">
          <button type="button" onClick={onToggleExpanded} className="workspace-nav-toggle"
            aria-expanded={isExpanded} aria-label={isExpanded ? copy.collapse : copy.expand} title={isExpanded ? copy.collapse : copy.expand}>
            <Menu className="h-5 w-5" />
          </button>
          {isExpanded && <div className="min-w-0">
            <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">{copy.brand}</span>
            <span className="mt-1 block truncate text-[11px] text-muted-foreground" title={userName}>{userName}</span>
          </div>}
        </div>
        <div className="modern-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-1">
          {tabs.slice(0, 3).map(tab => renderTab(tab))}
        </div>
        <div className="mx-4 flex shrink-0 flex-col gap-2 border-t border-border/70 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {tabs.slice(3).map(tab => renderTab(tab))}
        </div>
      </nav>
      <nav aria-label={copy.mobileNav} dir={isRtl ? 'rtl' : 'ltr'}
        className="workspace-nav mobile-tab-bar fixed inset-x-3 z-40 rounded-2xl sm:hidden print:hidden"
        style={{ bottom: 'max(0.65rem, env(safe-area-inset-bottom, 0.65rem))' }}
        onTouchStart={event => { touchStartX.current = event.touches[0].clientX; }}
        onTouchEnd={event => {
          const delta = event.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(delta) < 45) return;
          const mobileTabs = tabs.slice(0, 4);
          const index = mobileTabs.findIndex(tab => tab.id === activeTab);
          if (index < 0) return;
          const direction = isRtl ? (delta > 0 ? 1 : -1) : (delta > 0 ? -1 : 1);
          const next = Math.max(0, Math.min(mobileTabs.length - 1, index + direction));
          if (next !== index) { impact('medium'); onTabChange(mobileTabs[next].id); }
        }}>
        <div className="mx-auto flex min-h-[64px] max-w-md items-stretch gap-1 p-1.5">
          {tabs.slice(0, 4).map(tab => renderTab(tab, true))}
        </div>
      </nav>
    </>
  );
});

TabBar.displayName = 'TabBar';
