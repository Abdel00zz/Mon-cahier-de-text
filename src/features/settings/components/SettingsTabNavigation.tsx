import type { ComponentType } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/i18n/LocaleProvider';

export function SettingsTabNavigation<T extends string>({ items, activeId, onChange, onPrepare, translate, idPrefix, label }: {
  items: readonly { id: T; titleKey: string; icon?: ComponentType<{ className?: string }> }[];
  activeId: T; onChange: (id: T) => void; onPrepare: (id: T) => void;
  translate: (key: string) => string; idPrefix: string; label: string;
}) {
  const { isRtl } = useLocale();
  return (
    <nav aria-label={label} className="settings-tab-navigation">
      <Tabs value={activeId} onValueChange={val => onChange(val as T)} dir={isRtl ? 'rtl' : 'ltr'}>
        <TabsList aria-label={label} className="flex w-full min-w-0 items-center overflow-x-auto no-scrollbar bg-transparent border-0 p-0">
          {items.map(item => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              id={`${idPrefix}-${item.id}`}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={activeId === item.id ? 0 : -1}
              onTouchStart={() => onPrepare(item.id)}
              onPointerDown={() => onPrepare(item.id)}
              onPointerEnter={() => onPrepare(item.id)}
              onFocus={() => onPrepare(item.id)}
              className="settings-tab-navigation__tab shrink-0 whitespace-nowrap data-[state=active]:bg-primary/12 dark:data-[state=active]:bg-primary/22 data-[state=active]:text-primary data-[state=active]:font-semibold"
            >
              {translate(item.titleKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  );
}

