import React from 'react';
import { Sun, Moon, Laptop, Globe } from '@/components/ui/icons';
import { AppConfig, AppLocale, AppTextSize, ThemeMode } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeMetadata } from '@/i18n/messages';
import { cn } from '@/lib/utils';
import { SettingsPanel, SettingsRow, SettingsSection, settingsChoiceClass } from './SettingsPrimitives';

interface AppearanceTabProps {
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
}

/** Les quatre seuls crans de densité, du plus compact au plus lisible. */
const TEXT_SIZES: AppTextSize[] = ['sm', 'md', 'lg', 'xl'];

/** Exemple affiché dans chaque cran (le rendu suit la taille réelle du CSS). */
const TEXT_SIZE_SAMPLE: Record<AppTextSize, string> = {
  sm: '0.94rem',
  md: '1.05rem',
  lg: '1.18rem',
  xl: '1.3rem',
};

const THEME_OPTIONS: { id: ThemeMode; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { id: 'light', icon: Sun, labelKey: 'settings.appearance.themeLight' },
  { id: 'dark', icon: Moon, labelKey: 'settings.appearance.themeDark' },
  { id: 'system', icon: Laptop, labelKey: 'settings.appearance.themeSystem' },
];

const INTERFACE_LOCALES = localeMetadata.filter(option => option.value === 'fr' || option.value === 'ar');

/**
 * Onglet « Apparence » : thème, taille du texte et langue de l'interface.
 * Les couleurs, rayons et polices appartiennent à la charte (index.css) ;
 * la langue choisie détermine la paire typographique.
 */
export const AppearanceTab: React.FC<AppearanceTabProps> = ({ config, onConfigChange }) => {
  const { locale, t } = useLocale();
  const currentTheme: ThemeMode = config.theme || 'light';
  const currentTextSize: AppTextSize = config.appTextSize || 'md';
  const currentLocale = config.applicationLocale ?? locale;
  const isDefault = currentTheme === 'light' && currentTextSize === 'md';

  return (
    <SettingsPanel title={t('settings.item.appearance')}>
      <SettingsSection
        title={t('settings.appearance.themeTitle')}
        action={
          <button
            type="button"
            onClick={() => onConfigChange({ theme: 'light', appTextSize: 'md' })}
            disabled={isDefault}
            className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40"
          >
            {t('settings.appearance.resetDefaults')}
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-2 py-3.5">
          {THEME_OPTIONS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              aria-pressed={currentTheme === id}
              onClick={() => onConfigChange({ theme: id })}
              className={cn(settingsChoiceClass(currentTheme === id), 'min-w-0 gap-1.5 whitespace-nowrap px-2 sm:gap-2 sm:px-3.5')}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.5]" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.appearance.textSizeTitle')} hint={t('settings.appearance.textSizeDesc')}>
        <div className="grid grid-cols-2 gap-2 py-3.5 sm:grid-cols-4">
          {TEXT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              aria-pressed={currentTextSize === size}
              onClick={() => onConfigChange({ appTextSize: size })}
              className={cn(settingsChoiceClass(currentTextSize === size), 'flex-col gap-1 py-2')}
            >
              <span aria-hidden="true" className="flex flex-wrap justify-center gap-x-1 font-semibold leading-relaxed text-foreground" style={{ fontSize: TEXT_SIZE_SAMPLE[size] }}><bdi lang="ar">درس</bdi><bdi lang="fr">Leçon</bdi></span>
              <span className="text-xs">{t(`settings.appearance.textSize.${size}`)}</span>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t('language.settings.title')}>
        <SettingsRow label={<span className="flex items-center gap-2"><Globe className="h-[18px] w-[18px] stroke-[1.5] text-muted-foreground" />{t('language.settings.active')}</span>}>
          <div className="flex gap-2">
            {INTERFACE_LOCALES.map(option => (
              <button
                key={option.value}
                type="button"
                aria-pressed={currentLocale === option.value}
                onClick={() => onConfigChange({ applicationLocale: option.value as AppLocale })}
                className={settingsChoiceClass(currentLocale === option.value)}
              >
                <span lang={option.value}>{option.nativeName}</span>
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>
    </SettingsPanel>
  );
};
