import React from 'react';
import { Users, CalendarCheck, PieChart, Settings, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale, AppLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export type NavTabId = 'dashboard' | 'evaluations' | 'notifications' | 'settings' | 'help';

export interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  notificationsCount?: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isRtl?: boolean;
  className?: string;
}

const NAV_LABELS: Record<AppLocale, {
  brand: string;
  subBrand: string;
  dashboard: string;
  evaluations: string;
  notifications: string;
  settings: string;
  help: string;
}> = {
  fr: {
    brand: 'Mon cahier',
    subBrand: 'de textes',
    dashboard: 'Classes',
    evaluations: 'Évaluations',
    notifications: 'Pilotage',
    settings: 'Paramètres',
    help: 'Guide',
  },
  ar: {
    brand: 'دفتر النصوص',
    subBrand: 'فضاء الأستاذ',
    dashboard: 'الأقسام',
    evaluations: 'المراقبة',
    notifications: 'القيادة',
    settings: 'الإعدادات',
    help: 'الدليل',
  },
  en: {
    brand: 'Notebook',
    subBrand: 'Lesson planner',
    dashboard: 'Classes',
    evaluations: 'Assessments',
    notifications: 'Dashboard',
    settings: 'Settings',
    help: 'Guide',
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  notificationsCount,
  isExpanded,
  onToggleExpanded,
  isRtl = false,
  className,
}) => {
  const { locale } = useLocale();
  const { impact } = useHapticFeedback();
  const labels = NAV_LABELS[locale] ?? NAV_LABELS.fr;

  const handleNavClick = (tab: NavTabId) => {
    impact('light');
    onTabChange(tab);
  };

  const navItems = [
    { id: 'dashboard' as const, label: labels.dashboard, icon: Users },
    { id: 'evaluations' as const, label: labels.evaluations, icon: CalendarCheck },
    { id: 'notifications' as const, label: labels.notifications, icon: PieChart, badge: notificationsCount },
    { id: 'settings' as const, label: labels.settings, icon: Settings },
    { id: 'help' as const, label: labels.help, icon: BookOpen },
  ];

  return (
    <>
      {/* ── DESKTOP SIDEBAR : Reliure de classeur avec anneaux ── */}
      <aside
        className={cn(
          'fixed inset-y-0 z-40 hidden sm:flex flex-col justify-between overflow-hidden bg-white dark:bg-[#202124] text-[#5f6368] dark:text-[#e8eaed] shadow-2xl transition-[width] duration-300 ease-out select-none print:hidden',
          isRtl ? 'right-0 border-l border-[#e0e0e0] dark:border-[#5f6368]' : 'left-0 border-r border-[#e0e0e0] dark:border-[#5f6368]',
          isExpanded ? 'w-[240px]' : 'w-[72px]',
          className
        )}
        aria-label="Reliure du classeur"
      >
        {/* Ligne d'anneaux de reliure métalliques / spirale de classeur */}
        <div
          className={cn(
            'absolute inset-y-0 flex flex-col justify-around py-8 pointer-events-none z-20',
            isRtl ? 'left-1' : 'right-1'
          )}
          aria-hidden="true"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center my-1"
            >
              {/* Anneau métallique brillant */}
              <div className="h-2.5 w-4 rounded-full bg-gradient-to-r from-[#D9CFB6] via-[#F6F1E4] to-[#8C8275] shadow-sm" />
            </div>
          ))}
        </div>

        {/* En-tête : Titre en Caveat */}
        <div className="p-4 flex items-center gap-3 ">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#feefc3] dark:bg-[#41331c] text-[#5f6368] dark:text-[#e8eaed] shadow-inner">
            <BookOpen className="h-5 w-5 stroke-[2]" />
          </div>
          {isExpanded && (
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="font-sans font-bold text-xl leading-none text-[#202124] dark:text-[#e8eaed] truncate">
                {labels.brand}
              </span>
              <span className="text-[11px] font-sans text-[#5f6368] dark:text-[#9aa0a6] truncate">
                {labels.subBrand}
              </span>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 pr-2 py-4 space-y-1.5 overflow-y-auto no-scrollbar font-sans">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-r-full px-6 py-3 text-sm font-medium transition-all duration-200 cursor-pointer active:scale-98',
                  isActive
                    ? 'bg-[#feefc3] dark:bg-[#41331c] text-[#202124] dark:text-amber-100 font-bold shadow-xs'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed] font-medium'
                )}
                title={item.label}
              >
                {/* Feutre d'indication actif */}
                {isActive && (
                  <span
                    className={cn(
                      'absolute inset-y-1.5 w-1 rounded-full bg-[#3D6FB4]',
                      isRtl ? 'right-1' : 'left-1'
                    )}
                  />
                )}

                <Icon className={cn('h-5 w-5 shrink-0 transition-transform group-hover:scale-105', isActive ? 'text-[#202124] dark:text-amber-200' : 'text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#202124]')} />

                {isExpanded && (
                  <span className="truncate flex-1 text-left rtl:text-right">
                    {item.label}
                  </span>
                )}

                {item.badge && item.badge > 0 ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C1791F] px-1 text-[10px] font-bold text-white ">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Bouton pour plier/déplier la reliure */}
        <div className="p-3 ">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] p-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3] dark:bg-[#41331c] hover:text-[#5f6368] dark:text-[#e8eaed] transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Réduire' : 'Déplier'}
          >
            {isExpanded ? (
              <>
                <ChevronLeft className={cn('h-4 w-4', isRtl && 'rotate-180')} />
                <span className="font-sans">{isRtl ? 'تصغير' : 'Réduire'}</span>
              </>
            ) : (
              <ChevronRight className={cn('h-4 w-4', isRtl && 'rotate-180')} />
            )}
          </button>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM BAR : Navigation pour petit écran ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-[#e0e0e0] dark:border-[#5f6368] bg-white dark:bg-[#202124] px-2 py-1 text-[#5f6368] dark:text-[#e8eaed] sm:hidden shadow-lg select-none print:hidden"
        aria-label="Navigation mobile"
      >
        {navItems.slice(0, 4).map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center py-1 px-3 rounded-[8px] text-[11px] font-sans transition-colors cursor-pointer',
                isActive ? 'bg-[#feefc3] dark:bg-[#41331c] text-[#202124] dark:text-amber-100 font-bold shadow-xs' : 'text-[#5f6368] dark:text-[#9aa0a6]'
              )}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -top-1 h-1 w-6 rounded-full bg-[#3D6FB4]" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
