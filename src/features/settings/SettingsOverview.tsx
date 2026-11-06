import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Settings } from '@/components/ui/icons';
import { WorkspacePage } from '@/components/ui/WorkspacePage';
import { useLocale } from '@/i18n/LocaleProvider';
import { SettingsContent, preloadSettingsSection } from './SettingsContent';
import { SETTINGS_SECTIONS, consumeSettingsTarget } from './settingsSections';
import { useSettingsProfile } from './useSettingsProfile';
import './settingsPage.css';

type Props = Omit<ComponentProps<typeof SettingsContent>, 'category' | 'profile'> & {
  initialSection?: 'emploi' | 'notifications';
};
const PAGE_ORDER = ['profil', 'apparence', 'emploi', 'absences', 'notifications', 'compte'] as const;
const PAGE_SECTIONS = PAGE_ORDER.map(id => SETTINGS_SECTIONS.find(section => section.id === id)!);

export function SettingsOverview({ initialSection, ...props }: Props) {
  const { t } = useLocale();
  const profile = useSettingsProfile(props.config, props.onChange, true);
  const [requested] = useState(consumeSettingsTarget);
  const target = initialSection ?? requested;
  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    let frame = 0;
    void Promise.all(PAGE_ORDER.map(preloadSettingsSection)).then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        const heading = document.getElementById(`settings-${target}`);
        heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
        heading?.focus({ preventScroll: true });
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [target, props.scheduleClassId]);

  return <WorkspacePage title={t('settings.title')} icon={Settings} className="settings-overview">
    <div data-settings-ui className="settings-overview__sections">
      {PAGE_SECTIONS.map(({ id, titleKey, icon: Icon }) => <section key={id} aria-labelledby={`settings-${id}`} data-settings-section={id} className="settings-overview__section">
        <header className="settings-overview__section-header">
          <h2 id={`settings-${id}`} tabIndex={-1} data-route-focus={target === id || undefined}><Icon aria-hidden="true" />{t(titleKey)}</h2>
          {id === 'profil' && <span role="status" className="settings-overview__save">{t(profile.hasChanges ? 'toolbar.saving' : 'toolbar.saved')}</span>}
        </header>
        <SettingsContent {...props} profile={id === 'profil' ? profile : undefined} category={id} />
      </section>)}
    </div>
  </WorkspacePage>;
}
