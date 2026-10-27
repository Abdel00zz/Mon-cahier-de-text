import { NavigationButton } from './NavigationButton';
import { WORKSPACE_TABS, type NavigationCopy, type TabType } from './navigationConfig';
import { useTabSwipe } from './useNavigationGestures';

export function MobileTabBar({ activeTab, goTo, copy, isRtl }: {
  activeTab: TabType; goTo: (tab: TabType) => void; copy: NavigationCopy; isRtl: boolean;
}) {
  const swipe = useTabSwipe(activeTab, isRtl, goTo);
  return <nav {...swipe} aria-label={copy.mobileNav} dir={isRtl ? 'rtl' : 'ltr'}
    className="mobile-tab-bar z-40 overflow-hidden rounded-[16px] border text-muted-foreground print:hidden font-sans">
    <div className="mobile-tab-bar__items grid w-full grid-cols-3 items-center gap-1 p-1">
      {([...WORKSPACE_TABS, 'help'] as const).map(tab => <NavigationButton key={tab} tab={tab} active={activeTab === tab} onSelect={goTo} copy={copy} mobile />)}
    </div>
  </nav>;
}
