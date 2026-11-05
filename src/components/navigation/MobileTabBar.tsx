import { NavigationButton } from './NavigationButton';
import { WORKSPACE_TABS, type NavigationCopy, type TabType } from './navigationConfig';
import { useTabSwipe } from './useNavigationGestures';

export function MobileTabBar({ activeTab, goTo, copy, isRtl, presentation = 'fixed' }: {
  activeTab: TabType; goTo: (tab: TabType) => void; copy: NavigationCopy; isRtl: boolean;
  presentation?: 'fixed' | 'modal';
}) {
  const swipe = useTabSwipe(activeTab, isRtl, goTo);
  return (
    <>
      <nav
        {...swipe}
        aria-label={copy.mobileNav}
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`mobile-tab-bar ${presentation === 'modal' ? 'mobile-tab-bar--modal' : 'z-40'} print:hidden font-sans`}
      >
        <div className="mobile-tab-bar__items">
          {([...WORKSPACE_TABS, 'help'] as const).map(tab => (
            <NavigationButton
              key={tab}
              tab={tab}
              active={activeTab === tab}
              onSelect={goTo}
              copy={copy}
              mobile
            />
          ))}
        </div>
      </nav>
    </>
  );
}
