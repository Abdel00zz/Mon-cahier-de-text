import React, { useMemo } from 'react';
import { CalendarRange, User, Palette, Bell } from 'lucide-react';
import type { SettingsTabType } from './types';
import { FluidTabRail, FluidTabItem } from '@/components/ui/FluidTabRail';

interface TabNavigationProps {
  activeTab: SettingsTabType;
  onSelectTab: (tab: SettingsTabType) => void;
}

const TABS = [
  { id: 'timetable' as const, labelFr: 'Emploi', labelAr: 'الجدول', icon: CalendarRange },
  { id: 'profile' as const, labelFr: 'Profil', labelAr: 'الملف', icon: User },
  { id: 'appearance' as const, labelFr: 'Apparence', labelAr: 'المظهر', icon: Palette },
  { id: 'notifications' as const, labelFr: 'Alertes', labelAr: 'التنبيهات', icon: Bell },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onSelectTab }) => {
  const items: FluidTabItem<SettingsTabType>[] = useMemo(() => {
    return TABS.map(tab => ({
      id: tab.id,
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span className="leading-none">{tab.labelFr}</span>
          <span className="text-[10px] font-normal leading-none opacity-70">
            {tab.labelAr}
          </span>
        </span>
      ),
      icon: tab.icon,
    }));
  }, []);

  return (
    <div className="shrink-0 border-b border-cream-300/60 dark:border-border/60 bg-cream-50/70 dark:bg-card/60 px-3 py-2">
      <FluidTabRail<SettingsTabType>
        items={items}
        activeId={activeTab}
        onChange={onSelectTab}
        layoutId="modal-settings-rail-pill"
        size="md"
        ariaLabel="Navigation des paramètres"
      />
    </div>
  );
};
