import React, { lazy, Suspense } from 'react';
import type { AppConfig, ClassInfo, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { SettingsPanel } from './components/SettingsPrimitives';
import { ProfileTab } from './components/ProfileTab';
import type { SettingsCategory } from './settingsSections';
import type { useSettingsProfile } from './useSettingsProfile';

const loaders = {
  emploi: () => import('./components/ScheduleTab'),
  absences: () => import('./components/AbsencesTab'),
  apparence: () => import('./components/AppearanceTab'),
  notifications: () => import('./components/NotificationsTab'),
  compte: () => import('./components/AccountDataTab'),
};
const ScheduleTab = lazy(() => loaders.emploi().then(m => ({ default: m.ScheduleTab })));
const AbsencesTab = lazy(() => loaders.absences().then(m => ({ default: m.AbsencesTab })));
const AppearanceTab = lazy(() => loaders.apparence().then(m => ({ default: m.AppearanceTab })));
const NotificationsTab = lazy(() => loaders.notifications().then(m => ({ default: m.NotificationsTab })));
const AccountDataTab = lazy(() => loaders.compte().then(m => ({ default: m.AccountDataTab })));
export function preloadSettingsSection(category: SettingsCategory) {
  return category === 'profil' ? Promise.resolve() : loaders[category]().then(() => undefined);
}
interface SettingsContentProps {
  category: SettingsCategory;
  config: AppConfig;
  classes: ClassInfo[];
  profile?: ReturnType<typeof useSettingsProfile>;
  onChange: (patch: Partial<AppConfig>) => void;
  onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
  scheduleClassId?: string;
  onExport: () => void;
  onImport: () => void;
}
export const SettingsContent = React.memo(function SettingsContent({ category, config, classes, profile, onChange, onCreateClass, scheduleClassId, onExport, onImport }: SettingsContentProps) {
  const { t } = useLocale();
  let content: React.ReactNode;
  switch (category) {
    case 'profil': content = profile && <ProfileTab config={profile.localConfig} onDraft={profile.change} onToggleSubject={profile.toggleSubject} onToggleCycle={profile.toggleCycle} />; break;
    case 'apparence': content = <AppearanceTab config={config} onConfigChange={onChange} />; break;
    case 'emploi': content = <SettingsPanel title={t('settings.item.schedule')}><ScheduleTab classes={classes} config={config} onChange={onChange} onCreateClass={onCreateClass} suggestedClassId={scheduleClassId} /></SettingsPanel>; break;
    case 'notifications': content = <SettingsPanel title={t('settings.item.notifications')}><NotificationsTab config={config} onChange={onChange} /></SettingsPanel>; break;
    case 'absences': content = <AbsencesTab config={config} onConfigChange={onChange} />; break;
    case 'compte': content = <AccountDataTab config={config} onExport={onExport} onImport={onImport} />; break;
  }
  return <Suspense fallback={<div className="settings-section-skeleton skeleton-shimmer" aria-busy="true" />}>{content}</Suspense>;
});
