import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { FluidTabRail } from '@/components/ui/FluidTabRail';

export function SettingsTabNavigation<T extends string>({ items, activeId, onChange, onPrepare, translate, idPrefix, label }: {
  items: readonly { id: T; titleKey: string; icon?: ComponentType<{ className?: string }> }[];
  activeId: T; onChange: (id: T) => void; onPrepare: (id: T) => void;
  translate: (key: string) => string; idPrefix: string; label: string;
}) {
  const tabs = useMemo(() => items.map(item => ({ id: item.id, label: translate(item.titleKey) })), [items, translate]);
  return <nav aria-label={label} className="settings-tab-navigation">
    <FluidTabRail items={tabs} activeId={activeId} onChange={onChange} onPrepare={onPrepare}
      idPrefix={idPrefix} panelId={`${idPrefix}-panel`} ariaLabel={label} size="md"
      tabClassName="settings-tab-navigation__tab"
      activeTabClassName="settings-tab-navigation__tab--active"
      inactiveTabClassName="settings-tab-navigation__tab--inactive" />
  </nav>;
}

