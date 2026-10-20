import { motion, useReducedMotion } from 'framer-motion';
import { CircleHelp, Settings, Users } from '@/components/ui/icons';
import { preloadSettingsPage } from '@/app/preload';
import { cn } from '@/lib/utils';
import type { NavigationCopy, TabType } from './navigationConfig';

export function NavigationButton({ tab, active, onSelect, copy, expanded = true, mobile = false }: {
  tab: TabType; active: boolean; onSelect: (tab: TabType) => void; copy: NavigationCopy;
  expanded?: boolean; mobile?: boolean;
}) {
  const reduced = useReducedMotion();
  const Icon = tab === 'dashboard' ? Users : tab === 'settings' ? Settings : CircleHelp;
  const prepare = tab === 'settings' ? preloadSettingsPage : undefined;
  return <motion.button type="button" onClick={() => onSelect(tab)} onPointerEnter={prepare} onFocus={prepare}
    whileTap={reduced ? undefined : { scale: mobile ? 0.92 : 0.96 }}
    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
    aria-label={copy[tab]} aria-current={active ? 'page' : undefined} title={copy[tab]}
    className={cn('workspace-nav-button', mobile ? 'workspace-nav-button--mobile' : 'workspace-nav-button--desktop',
      !expanded && 'workspace-nav-button--compact')}>
    {active && (
      <motion.span
        aria-hidden
        className="workspace-nav-active"
        layoutId={mobile ? 'mobile-navigation-active' : 'sidebar-navigation-active'}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 32 }}
      />
    )}
    <Icon aria-hidden className={cn('relative z-10 shrink-0 stroke-[1.9]', tab === 'help' ? 'size-7' : 'size-[22px]')} />
    {(mobile || expanded) && <span className={cn('workspace-nav-label relative z-10 min-w-0', mobile ? 'mobile-tab-label' : 'truncate text-sm')}>{copy[tab]}</span>}
  </motion.button>;
}
