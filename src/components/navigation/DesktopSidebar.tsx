import { Menu } from '@/components/ui/icons';
import { NavigationButton } from './NavigationButton';
import { useSidebarGesture } from './useNavigationGestures';
import type { NavigationCopy, TabType } from './navigationConfig';

export function DesktopSidebar({ activeTab, goTo, copy, teacherName, expanded, toggle, isRtl }: {
  activeTab: TabType; goTo: (tab: TabType) => void; copy: NavigationCopy; teacherName: string;
  expanded: boolean; toggle: () => void; isRtl: boolean;
}) {
  const gestures = useSidebarGesture(expanded, isRtl, toggle);
  return <nav {...gestures} data-app-sidebar data-expanded={expanded} aria-label={copy.mainNav}
    className="workspace-sidebar fixed inset-y-0 start-0 z-40 h-dvh flex-col overflow-x-hidden overflow-y-auto py-3.5 lg:py-5 font-sans print:hidden">
    <div className="flex min-h-10 lg:min-h-11 items-center gap-2.5 lg:gap-3 px-2.5 lg:px-4">
      <button type="button" onClick={toggle} aria-expanded={expanded} aria-label={expanded ? copy.collapse : copy.expand}
        className="workspace-menu-toggle flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground">
        <Menu className="size-5 lg:size-[22px]" aria-hidden />
      </button>
      {expanded && <div className="min-w-0"><p className="truncate text-xs lg:text-sm font-semibold text-foreground" dir="auto">{teacherName}</p>
        <p className="mt-0.5 truncate text-[9px] lg:text-[10px] text-muted-foreground">{copy.teacherSpace}</p></div>}
    </div>
    <div className="mt-5 lg:mt-8 space-y-1 px-2.5 lg:px-4">
      <NavigationButton tab="dashboard" active={activeTab === 'dashboard'} onSelect={goTo} copy={copy} expanded={expanded} />
      <NavigationButton tab="settings" active={activeTab === 'settings'} onSelect={goTo} copy={copy} expanded={expanded} />
    </div>
    <div className="mt-auto px-2.5 lg:px-4 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] lg:pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))]">
      <NavigationButton tab="help" active={false} onSelect={goTo} copy={copy} expanded={expanded} />
    </div>
  </nav>;
}
