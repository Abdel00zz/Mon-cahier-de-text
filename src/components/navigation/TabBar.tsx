import React, { useCallback } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileTabBar } from './MobileTabBar';
import { NAV_COPY, type TabType } from './navigationConfig';
import './navigation.css';

export type { TabType } from './navigationConfig';
interface TabBarProps {
  activeTab: TabType; onTabChange: (tab: TabType) => void; isExpanded: boolean;
  onToggleExpanded: () => void; teacherName?: string;
}

export const TabBar = React.memo<TabBarProps>(({ activeTab, onTabChange, isExpanded, onToggleExpanded, teacherName }) => {
  const { selection } = useHapticFeedback();
  const { locale } = useLocale();
  const { user } = useAuth();
  const copy = NAV_COPY[locale];
  const userName = teacherName?.trim() || (user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '') || copy.teacherSpace;
  const goTo = useCallback((tab: TabType) => { if (tab !== activeTab) { selection(); onTabChange(tab); } }, [activeTab, selection, onTabChange]);
  return <>
    <DesktopSidebar activeTab={activeTab} goTo={goTo} copy={copy} teacherName={userName} expanded={isExpanded} toggle={onToggleExpanded} isRtl={locale === 'ar'} />
    <MobileTabBar activeTab={activeTab} goTo={goTo} copy={copy} isRtl={locale === 'ar'} />
  </>;
});
TabBar.displayName = 'TabBar';
