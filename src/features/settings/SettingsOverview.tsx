import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { ChevronDown, Settings } from '@/components/ui/icons';
import { WorkspacePage } from '@/components/ui/WorkspacePage';
import { useLocale } from '@/i18n/LocaleProvider';
import { SettingsContent, preloadSettingsSection } from './SettingsContent';
import { SETTINGS_SECTIONS, consumeSettingsTarget, type SettingsCategory } from './settingsSections';
import { useSettingsProfile } from './useSettingsProfile';
import './settingsPage.css';

type Props = Omit<ComponentProps<typeof SettingsContent>, 'category' | 'profile'> & {
  initialSection?: 'emploi' | 'notifications';
};
const PAGE_ORDER = ['emploi', 'profil', 'apparence', 'absences', 'notifications', 'compte'] as const;
const COLLAPSIBLE_CATEGORIES = new Set<SettingsCategory>(['emploi', 'apparence', 'absences', 'notifications']);
const PAGE_SECTIONS = PAGE_ORDER.map(id => SETTINGS_SECTIONS.find(section => section.id === id)!);

export function SettingsOverview({ initialSection, ...props }: Props) {
  const { t } = useLocale();
  const profile = useSettingsProfile(props.config, props.onChange, true);
  const [requested] = useState(consumeSettingsTarget);
  const target = initialSection ?? requested;
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => ({
    emploi: target === 'emploi',
    apparence: target === 'apparence',
    absences: target === 'absences',
    notifications: target === 'notifications',
  }));

  useEffect(() => {
    if (!target) return;
    if (COLLAPSIBLE_CATEGORIES.has(target)) {
      setExpandedMap(prev => (prev[target] ? prev : { ...prev, [target]: true }));
    }
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

  const toggleCategory = (id: SettingsCategory) => {
    void preloadSettingsSection(id);
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return <WorkspacePage title={t('settings.title')} icon={Settings} className="settings-overview">
    <div data-settings-ui className="settings-overview__sections">
      {PAGE_SECTIONS.map(({ id, titleKey, hintKey, icon: Icon, tone }) => {
        const isCollapsible = COLLAPSIBLE_CATEGORIES.has(id);
        if (!isCollapsible) {
          return <section key={id} aria-labelledby={`settings-${id}`} data-settings-section={id} data-tone={tone} className="settings-overview__section">
            <header className="settings-overview__section-header">
              <h2 id={`settings-${id}`} tabIndex={-1} data-route-focus={target === id || undefined}><Icon aria-hidden="true" />{t(titleKey)}</h2>
              {id === 'profil' && <span role="status" className="settings-overview__save">{t(profile.hasChanges ? 'toolbar.saving' : 'toolbar.saved')}</span>}
            </header>
            <SettingsContent {...props} profile={id === 'profil' ? profile : undefined} category={id} />
          </section>;
        }

        const isExpanded = Boolean(expandedMap[id]);
        return <section
          key={id}
          aria-labelledby={`settings-${id}`}
          data-settings-section={id}
          data-tone={tone}
          data-expanded={isExpanded ? 'true' : 'false'}
          className="settings-overview__section settings-overview__section--dropdown"
        >
          <header className="settings-overview__dropdown-header">
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={`settings-panel-${id}`}
              onClick={() => toggleCategory(id)}
              onPointerEnter={() => preloadSettingsSection(id)}
              onFocus={() => preloadSettingsSection(id)}
              className="settings-overview__trigger"
            >
              <span className="settings-overview__trigger-icon" aria-hidden="true"><Icon /></span>
              <span className="settings-overview__trigger-copy">
                <h2 id={`settings-${id}`} tabIndex={-1} data-route-focus={target === id || undefined}>
                  {t(titleKey)}
                </h2>
                <span className="settings-overview__trigger-hint">{t(hintKey)}</span>
              </span>
              <span className="settings-overview__chevron" aria-hidden="true">
                <ChevronDown />
              </span>
            </button>
          </header>
          <div
            id={`settings-panel-${id}`}
            className="settings-collapse"
            data-expanded={isExpanded ? 'true' : 'false'}
          >
            <div className="settings-collapse__inner">
              {isExpanded && (
                <div className="settings-overview__section-content">
                  <SettingsContent {...props} category={id} />
                </div>
              )}
            </div>
          </div>
        </section>;
      })}
    </div>
  </WorkspacePage>;
}
