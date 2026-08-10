import React from 'react';
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
    dashboard: 'Classes', evaluations: 'Évaluations', notifications: 'Pilotage', settings: 'Paramètres', help: 'Guide',
    collapse: 'Réduire la barre latérale', expand: 'Développer la barre latérale', mainNav: 'Navigation principale', mobileNav: 'Navigation principale mobile',
  },
  ar: {
    brand: 'دفتر النصوص الرقمي', teacherSpace: 'فضاء الأستاذ',
    dashboard: 'الأقسام', evaluations: 'التقويمات', notifications: 'القيادة', settings: 'الإعدادات', help: 'الدليل',
    collapse: 'تصغير الشريط الجانبي', expand: 'توسيع الشريط الجانبي', mainNav: 'التنقل الرئيسي', mobileNav: 'التنقل الرئيسي على الهاتف',
  },
} as const;

const countLabel = (count?: number) => count && count > 99 ? '99+' : count;

export const TabBar: React.FC<TabBarProps> = ({
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

  const goTo = (tab: TabType) => {
    impact('light');
    onTabChange(tab);
  };

  return (
    <>
      <nav
        className={cn(
          'fixed inset-y-0 z-40 hidden w-[76px] flex-col bg-background/70 py-3 text-card-foreground backdrop-blur-xl print:hidden sm:flex',
          isRtl ? 'right-0' : 'left-0',
          isExpanded ? 'lg:w-[248px]' : 'lg:w-[76px]',
        )}
        aria-label={copy.mainNav}
      >
        <div className={cn('flex h-14 items-center justify-center px-3', isExpanded && 'lg:justify-start lg:px-4')}>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label={isExpanded ? copy.collapse : copy.expand}
            title={isExpanded ? copy.collapse : copy.expand}
          >
            <Menu className="h-[15px] w-[15px]" />
          </button>
          <div className={cn('ms-3 hidden min-w-0', isExpanded && 'lg:block lg:max-w-[158px]')}>
            <span className="block truncate text-[15px] font-bold tracking-tight text-foreground">{copy.brand}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">{copy.teacherSpace}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-1 px-2 lg:px-0">
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
                  'relative flex h-11 w-full items-center justify-center rounded-full px-3 transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]/30 lg:h-12',
                  isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-5',
                  isActive
                    ? 'bg-[#c2e7ff] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#c2e7ff]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <Icon className={cn('h-[18px] w-[18px] transition-transform duration-200', isActive ? 'scale-110 text-[#0b57d0] dark:text-[#a8c7fa]' : '')} />
                  {count ? (
                    <span className={cn('absolute -top-[3px] flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b3261e] px-1 text-[8px] font-bold leading-none text-white ring-2 ring-white dark:bg-[#f2b8b5] dark:text-[#601410] dark:ring-[#1e1f20]', isRtl ? '-left-2' : '-right-2')}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </span>
                <span className={cn('hidden min-w-0 flex-1 truncate text-start text-sm', isExpanded && 'lg:block', isActive ? 'font-bold text-[#001d35] dark:text-[#c2e7ff]' : 'font-medium')}>
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-2 pb-2 lg:px-2">
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn(
              'flex h-11 w-full items-center justify-center rounded-full px-3 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]/30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-5',
              activeTab === 'settings' && 'bg-[#c2e7ff] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#c2e7ff]',
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-[18px] w-[18px] shrink-0', activeTab === 'settings' && 'text-[#0b57d0] dark:text-[#a8c7fa]')} />
            <span className={cn('hidden flex-1 text-start text-sm font-medium', isExpanded && 'lg:block', activeTab === 'settings' && 'font-bold text-[#001d35] dark:text-[#c2e7ff]')}>{copy.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('help')}
            className={cn(
              'mt-1 flex h-11 w-full items-center justify-center rounded-full px-3 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]/30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              isExpanded && 'lg:justify-start lg:gap-3.5 lg:px-5',
            )}
            aria-label={copy.help}
          >
            <CircleHelp className="h-[18px] w-[18px] shrink-0" />
            <span className={cn('hidden flex-1 text-start text-sm font-medium', isExpanded && 'lg:block')}>{copy.help}</span>
          </button>
        </div>
      </nav>

      <nav
        className="mobile-tab-bar fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-40 overflow-hidden rounded-full border border-slate-200/80 bg-white/90 text-slate-900 shadow-lg ring-1 ring-slate-900/5 backdrop-blur-xl transition-[transform,opacity] duration-200 print:hidden dark:border-slate-800 dark:bg-[#1e1f20]/90 dark:text-slate-100 sm:hidden"
        aria-label={copy.mobileNav}
      >
        <div className="mx-auto flex h-14 max-w-md items-center justify-around px-2">
          {tabs.filter(tab => tab.id !== 'evaluations').map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'notifications' ? notificationsCount : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goTo(tab.id)}
                className={cn('relative flex h-10 flex-1 flex-col items-center justify-center rounded-full py-1 transition-all duration-200 active:scale-95', isActive ? 'bg-[#c2e7ff] text-[#001d35] font-bold dark:bg-[#004a77] dark:text-[#c2e7ff]' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400')}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-105 stroke-[2.2] text-[#0b57d0] dark:text-[#a8c7fa]')} />
                  {count ? (
                    <span className={cn('absolute -top-[3px] flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#b3261e] px-1 text-[8px] font-bold leading-none text-white ring-2 ring-white dark:bg-[#f2b8b5] dark:text-[#601410]', isRtl ? '-left-1' : '-right-1')}>
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
            className={cn('relative flex h-10 flex-1 flex-col items-center justify-center rounded-full py-1 transition-all duration-200 active:scale-95', activeTab === 'settings' ? 'bg-[#c2e7ff] text-[#001d35] font-bold dark:bg-[#004a77] dark:text-[#c2e7ff]' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400')}
          >
            <Settings className={cn('h-5 w-5 transition-transform duration-200', activeTab === 'settings' && 'scale-105 stroke-[2.2] text-[#0b57d0] dark:text-[#a8c7fa]')} />
          </button>
        </div>
      </nav>
    </>
  );
};
