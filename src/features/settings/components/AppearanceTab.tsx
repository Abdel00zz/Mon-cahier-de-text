import React from 'react';
import { Sun, Moon, Laptop, Check, Type, RotateCcw } from 'lucide-react';
import { AppConfig, AppTextSize, ThemeMode } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { Button } from '@/components/ui/button';

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

interface ThemeOption {
  id: ThemeMode;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descKey: string;
  /** Teinte pédagogique du pictogramme, neutre quand l'option est inactive. */
  tint: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    icon: Sun,
    labelKey: 'settings.appearance.themeLight',
    descKey: 'settings.appearance.themeLightDesc',
    tint: 'bg-amber-500/15 border-amber-500/30 text-amber-600',
  },
  {
    id: 'dark',
    icon: Moon,
    labelKey: 'settings.appearance.themeDark',
    descKey: 'settings.appearance.themeDarkDesc',
    tint: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
  },
  {
    id: 'system',
    icon: Laptop,
    labelKey: 'settings.appearance.themeSystem',
    descKey: 'settings.appearance.themeSystemDesc',
    tint: 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400',
  },
];

/**
 * Onglet « Apparence et typographie ».
 *
 * Volontairement réduit à deux réglages : le mode d'affichage et la taille du
 * texte. Les couleurs, rayons, styles de cartes et polices ne sont plus des
 * choix : ils appartiennent à la charte (index.css) et la langue choisie
 * détermine la paire typographique (DM Sans/Rubik en latin, Arabswell 3 et
 * Maghribi Font 3 en arabe).
 */
export const AppearanceTab: React.FC<AppearanceTabProps> = ({ config, onConfigChange }) => {
  const { t } = useLocale();
  const currentTheme: ThemeMode = config.theme || 'light';
  const currentTextSize: AppTextSize = config.appTextSize || 'md';

  const isDefault = currentTheme === 'light' && currentTextSize === 'md';
  const resetDefaults = () => onConfigChange({ theme: 'light', appTextSize: 'md' });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── Section 1 : Mode d'affichage ─────────────────────────────────── */}
      <section className="rounded-lg border border-border/70 p-2.5 sm:p-3" id="theme-mode-section">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary sm:h-9 sm:w-9">
              <Sun className="h-4.5 w-4.5 dark:hidden" />
              <Moon className="hidden h-4.5 w-4.5 dark:block" />
            </div>
            <h3 className="text-sm font-semibold text-foreground sm:text-[14.5px]">
              {t('settings.appearance.themeTitle')}
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetDefaults}
            disabled={isDefault}
            className="h-8 cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            title={t('settings.appearance.resetDefaults')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('settings.appearance.resetDefaults')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map(option => {
            const active = currentTheme === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onConfigChange({ theme: option.id })}
                className={`group flex min-h-[44px] cursor-pointer items-center gap-3.5 rounded-md border-2 p-3.5 text-start transition-all duration-200 ${
                  active
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                    active ? option.tint : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {t(option.labelKey)}
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {t(option.descKey)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section 2 : Taille du texte ──────────────────────────────────── */}
      <section className="rounded-lg border border-border/70 p-2.5 sm:p-3" id="text-size-section">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary sm:h-9 sm:w-9">
            <Type className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground sm:text-[14.5px]">
              {t('settings.appearance.textSizeTitle')}
            </h3>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              {t('settings.appearance.textSizeDesc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TEXT_SIZES.map(size => {
            const active = currentTextSize === size;
            return (
              <button
                key={size}
                type="button"
                aria-pressed={active}
                onClick={() => onConfigChange({ appTextSize: size })}
                className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 p-3.5 text-center transition-all duration-200 ${
                  active
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40'
                }`}
              >
                <span
                  aria-hidden="true"
                  dir="ltr"
                  className="font-semibold leading-none text-foreground"
                  style={{ fontSize: TEXT_SIZE_SAMPLE[size] }}
                >
                  Aa
                </span>
                <span className="text-xs font-bold text-foreground">
                  {t(`settings.appearance.textSize.${size}`)}
                </span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
