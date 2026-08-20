import React, { useState } from 'react';
import { Sun, Moon, Laptop, Type, Check, Eye, RotateCcw } from 'lucide-react';
import { AppConfig, ThemeMode } from '@/types';
import { LATIN_FONTS, ARABIC_FONTS } from '@/constants/typography';
import { useLocale } from '@/i18n/LocaleProvider';
import { MathText } from '@/components/ui/math-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AppearanceTabProps {
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({ config, onConfigChange }) => {
  const { t, isRtl } = useLocale();
  const [activeTab, setActiveTab] = useState<'latin' | 'arabic'>('latin');

  const currentTheme = config.theme || 'light';
  const currentLatinFont = config.contentFontLatin || 'itim';
  const currentArabicFont = config.contentFontArabic || 'ibm-plex';

  const handleSelectTheme = (theme: ThemeMode) => {
    onConfigChange({ theme });
  };

  const handleSelectLatinFont = (fontId: string) => {
    onConfigChange({ contentFontLatin: fontId });
  };

  const handleSelectArabicFont = (fontId: string) => {
    onConfigChange({ contentFontArabic: fontId });
  };

  const handleResetDefaults = () => {
    onConfigChange({
      theme: 'light',
      contentFontLatin: 'itim',
      contentFontArabic: 'ibm-plex',
    });
  };

  const selectedLatinObj = LATIN_FONTS.find(f => f.id === currentLatinFont) || LATIN_FONTS[0];
  const selectedArabicObj = ARABIC_FONTS.find(f => f.id === currentArabicFont) || ARABIC_FONTS[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── Section 1 : Thème de l'interface (Clair / Sombre / Système) ── */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="h-5 w-5 hidden dark:block" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t('settings.appearance.themeTitle')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('settings.appearance.themeSubtitle')}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5"
            title={t('settings.appearance.resetDefaults')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('settings.appearance.resetDefaults')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option Clair */}
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            className={`group relative flex items-center gap-3.5 rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer ${
              currentTheme === 'light'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/70 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              currentTheme === 'light' ? 'bg-amber-500/15 border-amber-500/30 text-amber-600' : 'bg-muted border-border text-muted-foreground'
            }`}>
              <Sun className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">
                  {t('settings.appearance.themeLight')}
                </span>
                {currentTheme === 'light' && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {t('settings.appearance.themeLightDesc')}
              </p>
            </div>
          </button>

          {/* Option Sombre */}
          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            className={`group relative flex items-center gap-3.5 rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer ${
              currentTheme === 'dark'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/70 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              currentTheme === 'dark' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-muted border-border text-muted-foreground'
            }`}>
              <Moon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">
                  {t('settings.appearance.themeDark')}
                </span>
                {currentTheme === 'dark' && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {t('settings.appearance.themeDarkDesc')}
              </p>
            </div>
          </button>

          {/* Option Système */}
          <button
            type="button"
            onClick={() => handleSelectTheme('system')}
            className={`group relative flex items-center gap-3.5 rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer ${
              currentTheme === 'system'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/70 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              currentTheme === 'system' ? 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400' : 'bg-muted border-border text-muted-foreground'
            }`}>
              <Laptop className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">
                  {t('settings.appearance.themeSystem')}
                </span>
                {currentTheme === 'system' && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {t('settings.appearance.themeSystemDesc')}
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* ── Section 2 : Banc d'essai & Aperçu en Direct ── */}
      <section className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            {t('settings.appearance.previewTitle')}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Aperçu Français / Latin */}
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-1.5">
              <span className="font-semibold text-foreground">Français / Latin : {selectedLatinObj.name}</span>
              <Badge variant="outline" className="text-[10px] uppercase">{selectedLatinObj.category}</Badge>
            </div>
            <div style={{ fontFamily: selectedLatinObj.family }} className="space-y-1.5 text-foreground">
              <div className="text-[14px] font-semibold flex items-center justify-between">
                <span>Activité 2 : Étude de fonction</span>
                <span className="text-xs font-normal text-muted-foreground">(p. 42)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {"Soit la fonction $f(x) = \\frac{x^2 - 1}{x + 2}$. Calculer $f'(x)$ et dresser le tableau de variations."}
              </p>
              <div className="pt-1">
                <MathText source="f'(x) = \frac{x^2 + 4x + 1}{(x+2)^2}" cacheKey="preview-latin" inline>
                  {"f'(x) = \\frac{x^2 + 4x + 1}{(x+2)^2}"}
                </MathText>
              </div>
            </div>
          </div>

          {/* Aperçu Arabe */}
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2" dir="rtl">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-1.5">
              <span className="font-semibold text-foreground">العربية : {selectedArabicObj.name}</span>
              <Badge variant="outline" className="text-[10px]">{selectedArabicObj.category}</Badge>
            </div>
            <div style={{ fontFamily: selectedArabicObj.family }} className="space-y-1.5 text-foreground">
              <div className="text-[14px] font-semibold flex items-center justify-between">
                <span>نشاط 2: دراسة الدوال وتطبيقات الاشتقاق</span>
                <span className="text-xs font-normal text-muted-foreground">(ص. 42)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {"لتكن الدالة $f(x) = \\frac{x^2 - 1}{x + 2}$. احسب المشتقة $f'(x)$ ثم أنشئ جدول التغيرات."}
              </p>
              <div className="pt-1">
                <MathText source="f'(x) = \frac{x^2 + 4x + 1}{(x+2)^2}" cacheKey="preview-arabic" inline>
                  {"f'(x) = \\frac{x^2 + 4x + 1}{(x+2)^2}"}
                </MathText>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3 : Sélection des Polices du Contenu (Français vs Arabe) ── */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Type className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t('settings.appearance.fontTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('settings.appearance.fontSubtitle')}
            </p>
          </div>
        </div>

        {/* Onglets de bascule Latin / Arabe */}
        <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl mb-5 w-fit border border-border/70">
          <button
            type="button"
            onClick={() => setActiveTab('latin')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'latin'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('settings.appearance.latinTab')} ({LATIN_FONTS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('arabic')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'arabic'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('settings.appearance.arabicTab')} ({ARABIC_FONTS.length})
          </button>
        </div>

        {/* Grille des polices Latines (Français / Anglais) */}
        {activeTab === 'latin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {LATIN_FONTS.map(font => {
              const isSelected = currentLatinFont === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleSelectLatinFont(font.id)}
                  className={`group flex flex-col justify-between rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                      : 'border-border/70 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">
                        {font.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-mono">
                          {font.category}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {isRtl ? font.descriptionAr : font.descriptionFr}
                    </p>
                  </div>

                  <div
                    style={{ fontFamily: font.family }}
                    className="mt-3.5 pt-2.5 border-t border-border/60 text-foreground text-[13px] leading-snug w-full"
                  >
                    {font.sampleFr}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Grille des polices Arabes */}
        {activeTab === 'arabic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" dir="rtl">
            {ARABIC_FONTS.map(font => {
              const isSelected = currentArabicFont === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleSelectArabicFont(font.id)}
                  className={`group flex flex-col justify-between rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                      : 'border-border/70 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">
                        {font.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {font.category}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {font.descriptionAr}
                    </p>
                  </div>

                  <div
                    style={{ fontFamily: font.family }}
                    className="mt-3.5 pt-2.5 border-t border-border/60 text-foreground text-[14px] leading-snug w-full"
                  >
                    {font.sampleAr}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
