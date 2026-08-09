import React from 'react';
import { BookOpen, Settings, CircleHelp, Bell, CalendarCheck, ChevronRight } from '@/components/ui/icons';
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
  { id: 'notifications', icon: Bell },
];

const NAV_COPY = {
  fr: {
    brand: 'Cahier de textes', teacherSpace: 'Espace enseignant', organisation: 'Organisation',
    dashboard: 'Classes', evaluations: 'Évaluations', notifications: 'Alertes', settings: 'Paramètres', help: 'Guide',
    collapse: 'Réduire la barre latérale', expand: 'Développer la barre latérale', mainNav: 'Navigation principale', mobileNav: 'Navigation principale mobile',
  },
  ar: {
    brand: 'دفتر النصوص الرقمي', teacherSpace: 'فضاء الأستاذ', organisation: 'التنظيم',
    dashboard: 'الأقسام', evaluations: 'التقويمات', notifications: 'التنبيهات', settings: 'الإعدادات', help: 'الدليل',
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
          'fixed inset-y-0 z-40 hidden w-[76px] flex-col border-border/70 bg-card py-3 text-card-foreground print:hidden dark:bg-zinc-950 sm:flex',
          isRtl ? 'right-0 border-l shadow-[-1px_0_0_rgba(15,23,42,0.04)]' : 'left-0 border-r shadow-[1px_0_0_rgba(15,23,42,0.04)]',
          isExpanded ? 'lg:w-[248px]' : 'lg:w-[76px]',
        )}
        aria-label={copy.mainNav}
      >
        <div className={cn('relative flex h-14 items-center justify-center px-3', isExpanded && 'lg:justify-start lg:px-4')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className={cn('ms-2.5 hidden min-w-0', isExpanded && 'lg:block lg:max-w-[158px]')}>
            <span className="block truncate text-[15px] font-bold tracking-tight text-foreground">{copy.brand}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">{copy.teacherSpace}</span>
          </div>
          <button
            type="button"
            onClick={onToggleExpanded}
            className={cn('absolute top-3.5 hidden h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 lg:flex', isRtl ? 'left-2' : 'right-2')}
            aria-label={isExpanded ? copy.collapse : copy.expand}
            title={isExpanded ? copy.collapse : copy.expand}
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', (isRtl ? !isExpanded : isExpanded) && 'rotate-180')} />
          </button>
        </div>

        <div className="mt-5 flex flex-1 flex-col gap-1 px-2 lg:px-0">
          <p className={cn('hidden px-5 pb-1 text-[10px] font-bold text-muted-foreground/75', isExpanded && 'lg:block')}>{copy.organisation}</p>
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
                  'relative flex h-11 w-full items-center justify-center rounded-xl px-3 text-muted-foreground transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 lg:h-12',
                  isExpanded && 'lg:justify-start lg:gap-3 lg:px-5',
                  isActive
                    ? cn('bg-amber-100/90 text-amber-950 dark:bg-amber-500/15 dark:text-amber-200', isRtl ? 'lg:rounded-l-full lg:rounded-r-none' : 'lg:rounded-r-full lg:rounded-l-none')
                    : 'hover:bg-muted/75 hover:text-foreground',
                )}
                aria-label={copy[tab.id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                  <Icon className={cn('h-[18px] w-[18px] transition-transform duration-200', isActive ? 'scale-105' : '')} />
                  {count ? (
                    <span className={cn('absolute -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground ring-2 ring-white dark:ring-zinc-950', isRtl ? '-left-2' : '-right-2')}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </span>
                <span className={cn('hidden min-w-0 flex-1 truncate text-start text-[13px]', isExpanded && 'lg:block', isActive ? 'font-bold text-primary' : 'font-medium')}>
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-2 pb-2 lg:px-0">
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn(
              'flex h-11 w-full items-center justify-center rounded-xl px-3 text-muted-foreground transition-colors hover:bg-muted/75 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
              isExpanded && 'lg:justify-start lg:gap-3 lg:px-5',
              activeTab === 'settings' && cn('bg-amber-100/90 text-amber-950 dark:bg-amber-500/15 dark:text-amber-200', isRtl ? 'lg:rounded-l-full lg:rounded-r-none' : 'lg:rounded-r-full lg:rounded-l-none'),
            )}
            aria-label={copy.settings}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className={cn('h-[18px] w-[18px] shrink-0', activeTab === 'settings' && 'text-amber-700 dark:text-amber-300')} />
            <span className={cn('hidden flex-1 text-start text-[13px] font-medium', isExpanded && 'lg:block', activeTab === 'settings' && 'font-bold')}>{copy.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('help')}
            className={cn(
              'mt-1 flex h-11 w-full items-center justify-center rounded-xl px-3 text-muted-foreground transition-colors hover:bg-muted/75 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
              isExpanded && 'lg:justify-start lg:gap-3 lg:px-5',
            )}
            aria-label={copy.help}
          >
            <CircleHelp className="h-[18px] w-[18px] shrink-0" />
            <span className={cn('hidden flex-1 text-start text-[13px] font-medium', isExpanded && 'lg:block')}>{copy.help}</span>
          </button>
        </div>
      </nav>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 text-card-foreground backdrop-blur-2xl print:hidden sm:hidden"
        aria-label={copy.mobileNav}
      >
        <div className="mx-auto flex h-14 max-w-md items-center justify-around px-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
          {tabs.filter(tab => tab.id !== 'evaluations').map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'notifications' ? notificationsCount : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goTo(tab.id)}
                className={cn('relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110 stroke-[2.2]')} />
                  {count ? (
                <span className={cn('absolute -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground ring-2 ring-card', isRtl ? '-left-1' : '-right-1')}>
                      {countLabel(count)}
                    </span>
                  ) : null}
                </div>
                <span className={cn('mt-0.5 text-[10px] tracking-tight', isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground')}>
                  {copy[tab.id]}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo('settings')}
            className={cn('relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95', activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <Settings className={cn('h-5 w-5 transition-transform duration-200', activeTab === 'settings' && 'scale-110 stroke-[2.2]')} />
            <span className={cn('mt-0.5 text-[10px] tracking-tight', activeTab === 'settings' ? 'font-bold text-primary' : 'font-medium text-muted-foreground')}>{copy.settings}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
