import React, { useState } from 'react';
import { BookOpen, Settings, CircleHelp, Bell, Menu } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

export type TabType = 'dashboard' | 'evaluations' | 'settings' | 'notifications' | 'help';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  badgeCount?: number;
  notificationsCount?: number;
}

const tabs: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Mes Classes', icon: BookOpen },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  badgeCount,
  notificationsCount,
}) => {
  const { impact } = useHapticFeedback();
  const [, setHoveredTab] = useState<TabType | null>(null);

  return (
    <>
      {/* ─── Desktop / Tablet: Integrated Vertical Navigation Sidebar ─── */}
      <nav
        className="fixed left-0 top-0 bottom-0 z-40 hidden sm:flex flex-col justify-between
                   w-[72px] hover:w-60 group/sidebar transition-all duration-300 ease-out
                   bg-card border-r border-border text-card-foreground
                   py-4 shadow-xs print:hidden overflow-hidden"
        aria-label="Navigation principale"
      >
        {/* Top Header: Brand / Menu Icon */}
        <div className="flex items-center gap-3.5 px-3">
          <button 
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
            aria-label="Menu Cahier de Textes"
          >
            <Menu className="h-4 w-4 stroke-[2]" />
          </button>
          <div className="flex flex-col min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <span className="text-[14px] font-bold text-foreground truncate tracking-tight">
              Cahier de Textes
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate">
              Espace Enseignant
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-1.5 mt-6 mb-auto px-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  impact('light');
                  onTabChange(tab.id);
                }}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className={cn(
                  'relative flex h-10 w-full items-center rounded-xl px-2.5 transition-all duration-200 active:scale-[0.98]',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex items-center justify-center shrink-0 w-6 h-6 ml-0.5">
                  <Icon className={cn('h-[18px] w-[18px] transition-transform duration-200', isActive ? 'stroke-[2.2]' : 'stroke-[1.75]')} />
                  
                  {tab.id === 'evaluations' && badgeCount && badgeCount > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground shadow-xs border border-background">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  ) : null}
                  {tab.id === 'notifications' && notificationsCount && notificationsCount > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground shadow-xs border border-background">
                      {notificationsCount > 99 ? '99+' : notificationsCount}
                    </span>
                  ) : null}
                </div>

                <span className={cn('ml-3.5 text-[13px] opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap min-w-0 flex-1 text-left', isActive ? 'font-bold text-foreground' : 'font-medium')}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Quick Help Action */}
        <div className="pb-2 px-2.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              impact('light');
              onTabChange('help');
            }}
            className="flex items-center gap-3.5 px-2.5 py-2 h-10 w-full rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Guide et Aide"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center ml-0.5">
              <CircleHelp className="h-[18px] w-[18px] stroke-[1.75]" />
            </div>
            <div className="flex flex-col min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap text-left">
              <span className="text-[13px] font-medium truncate">Guide & Aide</span>
            </div>
          </button>
        </div>
      </nav>

      {/* ─── Mobile: Bottom Integrated Tab Bar ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden border-t border-border bg-card/95 backdrop-blur-2xl transition-all text-card-foreground print:hidden"
        aria-label="Navigation principale mobile"
      >
        <div className="mx-auto flex h-14 max-w-md items-center justify-around px-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  impact('light');
                  onTabChange(tab.id);
                }}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110 stroke-[2.2]')} />
                  {tab.id === 'evaluations' && badgeCount && badgeCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground shadow-xs border border-background">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  ) : null}
                  {tab.id === 'notifications' && notificationsCount && notificationsCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground shadow-xs border border-background">
                      {notificationsCount > 99 ? '99+' : notificationsCount}
                    </span>
                  ) : null}
                </div>
                <span
                  className={cn(
                    'mt-0.5 text-[10px] tracking-tight transition-all',
                    isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
