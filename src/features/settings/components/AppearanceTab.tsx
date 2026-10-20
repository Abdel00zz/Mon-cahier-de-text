import React from 'react';
import { Sun, Moon, Laptop, Globe, Type } from '@/components/ui/icons';
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
 */
export const AppearanceTab: React.FC<AppearanceTabProps> = ({ config, onConfigChange }) => {
  const { locale, t } = useLocale();
  const currentTheme: ThemeMode = config.theme || 'light';
  const currentTextSize: AppTextSize = config.appTextSize || 'md';
  const currentLocale = config.applicationLocale ?? locale;
  const isDefault = currentTheme === 'light' && currentTextSize === 'md';

  return (
    <SettingsPanel title={t('settings.item.appearance')}>
      {/* Carte 1 : Thème et mode d'affichage */}
      <SettingsSection
        title={t('settings.appearance.themeTitle')}
        icon={Sun}
        action={
          <button
            type="button"
            onClick={() => onConfigChange({ theme: 'light', appTextSize: 'md' })}
            disabled={isDefault}
            className="min-h-9 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40"
          >
            {t('settings.appearance.resetDefaults')}
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-2.5 pt-0.5">
          {THEME_OPTIONS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              aria-pressed={currentTheme === id}
              onClick={() => onConfigChange({ theme: id })}
              className={cn(
                settingsChoiceClass(currentTheme === id),
                'min-w-0 gap-2 whitespace-nowrap px-3 rounded-xl'
              )}
            >
              <Icon className="size-4.5 shrink-0 stroke-[1.75]" />
              <span className="text-sm font-medium">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* Carte 2 : Taille du texte */}
      <SettingsSection
        title={t('settings.appearance.textSizeTitle')}
        hint={t('settings.appearance.textSizeDesc')}
        icon={Type}
      >
        <div className="grid grid-cols-2 gap-2.5 pt-0.5 sm:grid-cols-4">
          {TEXT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              aria-pressed={currentTextSize === size}
              onClick={() => onConfigChange({ appTextSize: size })}
              className={cn(settingsChoiceClass(currentTextSize === size), 'flex-col gap-1.5 py-3 rounded-xl')}
            >
              <span
                aria-hidden="true"
                className="flex flex-wrap justify-center gap-x-1.5 font-bold leading-relaxed text-foreground"
                style={{ fontSize: TEXT_SIZE_SAMPLE[size] }}
              >
                <bdi lang="ar">درس</bdi>
                <bdi lang="fr">Leçon</bdi>
              </span>
              <span className="text-xs text-muted-foreground font-medium">{t(`settings.appearance.textSize.${size}`)}</span>
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* Carte 3 : Langue de l'interface */}
      <SettingsSection title={t('language.settings.title')} icon={Globe}>
        <SettingsRow
          label={<span className="flex items-center gap-2">{t('language.settings.active')} :</span>}
        >
          <div className="flex gap-2.5">
            {INTERFACE_LOCALES.map(option => (
              <button
                key={option.value}
                type="button"
                aria-pressed={currentLocale === option.value}
                onClick={() => onConfigChange({ applicationLocale: option.value as AppLocale })}
                className={cn(
                  settingsChoiceClass(currentLocale === option.value),
                  'min-h-10 px-4 rounded-xl text-sm font-medium'
                )}
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
