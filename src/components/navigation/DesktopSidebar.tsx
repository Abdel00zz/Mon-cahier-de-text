import { Menu } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { NavigationButton } from './NavigationButton';
import { useSidebarGesture } from './useNavigationGestures';
import type { NavigationCopy, TabType } from './navigationConfig';

export function DesktopSidebar({ activeTab, goTo, copy, teacherName, expanded, toggle, isRtl }: {
  activeTab: TabType; goTo: (tab: TabType) => void; copy: NavigationCopy; teacherName: string;
  expanded: boolean; toggle: () => void; isRtl: boolean;
}) {
  const gestures = useSidebarGesture(expanded, isRtl, toggle);
  return <nav {...gestures} data-app-sidebar aria-label={copy.mainNav}
    className={cn('workspace-sidebar fixed inset-y-0 start-0 z-40 h-dvh flex-col overflow-x-hidden overflow-y-auto py-5 font-sans print:hidden', expanded ? 'w-[252px]' : 'w-[84px]')}>
    <div className="flex min-h-11 items-center gap-3 px-4">
      <button type="button" onClick={toggle} aria-expanded={expanded} aria-label={expanded ? copy.collapse : copy.expand}
        className="workspace-menu-toggle flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground">
        <Menu className="size-[22px]" aria-hidden />
      </button>
      {expanded && <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground" dir="auto">{teacherName}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{copy.teacherSpace}</p></div>}
    </div>
    <div className="mt-8 space-y-1 px-4">
      <NavigationButton tab="dashboard" active={activeTab === 'dashboard'} onSelect={goTo} copy={copy} expanded={expanded} />
      <NavigationButton tab="settings" active={activeTab === 'settings'} onSelect={goTo} copy={copy} expanded={expanded} />
    </div>
    <div className="mt-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))]">
      <NavigationButton tab="help" active={false} onSelect={goTo} copy={copy} expanded={expanded} />
    </div>
  </nav>;
}
