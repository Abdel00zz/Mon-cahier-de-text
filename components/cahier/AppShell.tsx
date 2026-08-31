import React from 'react';
import { Sidebar, NavTabId } from './Sidebar';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  notificationsCount?: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isRtl?: boolean;
  children: React.ReactNode;
  showNavigation?: boolean;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  notificationsCount,
  isExpanded,
  onToggleExpanded,
  isRtl = false,
  children,
  showNavigation = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative min-h-screen bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] font-sans selection:bg-slate-100 dark:bg-[#3c4043]',
        className
      )}
      data-cahier-shell
    >
      {showNavigation && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          notificationsCount={notificationsCount}
          isExpanded={isExpanded}
          onToggleExpanded={onToggleExpanded}
          isRtl={isRtl}
        />
      )}

      <main
        className={cn(
          'relative min-h-screen transition-[margin,padding] duration-300 ease-out',
          showNavigation && (
            isRtl
              ? isExpanded ? 'sm:mr-[240px]' : 'sm:mr-[72px]'
              : isExpanded ? 'sm:ml-[240px]' : 'sm:ml-[72px]'
          ),
          showNavigation && 'pb-20 sm:pb-8'
        )}
      >
        {children}
      </main>
    </div>
  );
};
