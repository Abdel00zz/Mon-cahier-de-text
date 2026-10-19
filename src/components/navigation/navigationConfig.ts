import type { AppLocale } from '@/types';

export type TabType = 'dashboard' | 'settings' | 'help';
export type WorkspaceTab = Exclude<TabType, 'help'>;
export const WORKSPACE_TABS: readonly WorkspaceTab[] = ['dashboard', 'settings'];

export function navigationSwipeTarget(active: TabType, dx: number, dy: number, duration: number, isRtl: boolean): WorkspaceTab | undefined {
  if (duration < 0 || duration > 650 || Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const index = WORKSPACE_TABS.findIndex(tab => tab === active);
  if (index < 0) return;
  const direction = (dx > 0 ? -1 : 1) * (isRtl ? -1 : 1);
  return WORKSPACE_TABS[index + direction];
}

export const NAV_COPY = {
  fr: { dashboard: 'Classes', settings: 'Paramètres', help: 'Aide', teacherSpace: 'ESPACE ENSEIGNANT', mainNav: 'Navigation principale', mobileNav: 'Navigation mobile', collapse: 'Réduire', expand: 'Développer' },
  ar: { dashboard: 'الأقسام', settings: 'الإعدادات', help: 'المساعدة', teacherSpace: 'فضاء الأستاذ', mainNav: 'التنقل الرئيسي', mobileNav: 'التنقل على الهاتف', collapse: 'طي القائمة', expand: 'توسيع القائمة' },
  en: { dashboard: 'Classes', settings: 'Settings', help: 'Help', teacherSpace: 'TEACHER SPACE', mainNav: 'Main navigation', mobileNav: 'Mobile navigation', collapse: 'Collapse', expand: 'Expand' },
} satisfies Record<AppLocale, Record<string, string>>;
export type NavigationCopy = typeof NAV_COPY[AppLocale];
