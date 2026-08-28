import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  Type,
  Check,
  Eye,
  RotateCcw,
  Palette,
  Layout,
  Table as TableIcon,
  Sparkles,
  Sliders,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { AppConfig, ThemeMode, ThemeCustomization } from '@/types';
import { LATIN_FONTS, ARABIC_FONTS } from '@/constants/typography';
import {
  ACCENT_PALETTES,
  BORDER_RADIUS_MAP,
  UI_FONTS_MAP,
  AccentColorKey,
  BorderRadiusOption,
  CardStyleOption,
  TableStyleOption,
  UIFontOption,
} from '@/constants/themePresets';
import { useLocale } from '@/i18n/LocaleProvider';
import { MathText } from '@/components/ui/math-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppearanceTabProps {
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
}

const CARD_STYLES: { id: CardStyleOption; labelFr: string; labelAr: string; descFr: string }[] = [
  {
    id: 'classic',
    labelFr: 'Classique & Épuré',
    labelAr: 'كلاسيكي ونقي',
    descFr: 'Fond blanc/sombre standard, bordures légères',
  },
  {
    id: 'bordered',
    labelFr: 'Bordures Précises',
    labelAr: 'إطارات محددة',
    descFr: 'Contour accentué et sans ombre superflue',
  },
  {
    id: 'elevated',
    labelFr: 'Élégance & Relief',
    labelAr: 'أناقة وظلال ناعمة',
    descFr: 'Ombre portée douce et subtile profondeur',
  },
  {
    id: 'glass',
    labelFr: 'Verre Dépoli (Glass)',
    labelAr: 'زجاج ضبابي عصري',
    descFr: 'Transparence et flou d’arrière-plan moderne',
  },
];

const TABLE_STYLES: { id: TableStyleOption; labelFr: string; labelAr: string; descFr: string }[] = [
  {
    id: 'clean',
    labelFr: 'Moderne Épuré',
    labelAr: 'عصري نقي',
    descFr: 'Lignes épurées et lisibilité maximale',
  },
  {
    id: 'striped',
    labelFr: 'Lignes Alternées (Zébré)',
    labelAr: 'خطوط متناوبة (مخطط)',
    descFr: 'Alternance de teintes douces une ligne sur deux',
  },
  {
    id: 'bordered',
    labelFr: 'Quadrillage Défini',
    labelAr: 'شبكة مؤطرة',
    descFr: 'Bordures verticales et horizontales distinctes',
  },
  {
    id: 'compact',
    labelFr: 'Vue Compacte',
    labelAr: 'عرض مكثف',
    descFr: 'Densité optimisée pour afficher plus de contenu',
  },
];

export const AppearanceTab: React.FC<AppearanceTabProps> = ({ config, onConfigChange }) => {
  const { t, isRtl, locale } = useLocale();
  const [showAdvancedColors, setShowAdvancedColors] = useState(false);

  const currentTheme = config.theme || 'light';
  const custom = config.themeCustomization || {};
  const currentAccent: AccentColorKey = custom.accentColor || 'blue';
  const currentCustomHex: string = custom.customPrimaryColor || '#2563eb';
  const currentRadius: BorderRadiusOption = custom.borderRadius || 'default';
  const currentCardStyle: CardStyleOption = custom.cardStyle || 'classic';
  const currentTableStyle: TableStyleOption = custom.tableStyle || 'clean';
  const currentUIFont: UIFontOption = custom.uiFont || 'jakarta';
  const currentLatinFont = config.contentFontLatin || 'fira';
  const currentArabicFont = config.contentFontArabic || 'ibm-plex';

  const updateCustomization = (partial: Partial<ThemeCustomization>) => {
    onConfigChange({
      themeCustomization: {
        ...custom,
        ...partial,
      },
    });
  };

  const handleSelectTheme = (theme: ThemeMode) => {
    onConfigChange({ theme });
  };

  const handleResetDefaults = () => {
    onConfigChange({
      theme: 'light',
      contentFontLatin: 'fira',
      contentFontArabic: 'ibm-plex',
      themeCustomization: {
        accentColor: 'blue',
        customPrimaryColor: '#2563eb',
        borderRadius: 'default',
        cardStyle: 'classic',
        tableStyle: 'clean',
        uiFont: 'jakarta',
        customBackgroundColor: undefined,
        customTextColor: undefined,
        customCardColor: undefined,
      },
    });
  };

  const selectedLatinObj = LATIN_FONTS.find(f => f.id === currentLatinFont) || LATIN_FONTS[0];
  const selectedArabicObj = ARABIC_FONTS.find(f => f.id === currentArabicFont) || ARABIC_FONTS[0];
  const selectedUIFont = UI_FONTS_MAP[currentUIFont] || UI_FONTS_MAP.jakarta;
  const fontCopy = locale === 'ar'
    ? { title: 'الخطوط', subtitle: 'خطوط الواجهة ومحتوى الجداول في قائمة واحدة', open: 'فتح قائمة الخطوط', ui: 'واجهة التطبيق', latin: 'المحتوى اللاتيني', arabic: 'المحتوى العربي' }
    : locale === 'en'
      ? { title: 'Typography', subtitle: 'Interface and table-content fonts in one list', open: 'Open font list', ui: 'App interface', latin: 'Latin content', arabic: 'Arabic content' }
      : { title: 'Typographie', subtitle: 'Polices de l’interface et du contenu réunies dans une seule liste', open: 'Ouvrir la liste des polices', ui: 'Interface de l’application', latin: 'Contenu français et latin', arabic: 'Contenu arabe' };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── Section 1 : Thème Global (Clair / Sombre / Système) ── */}
      <section className="settings-section-block p-4 sm:p-6" id="theme-mode-section">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sun className="h-4.5 w-4.5 dark:hidden" />
              <Moon className="h-4.5 w-4.5 hidden dark:block" />
            </div>
            <div>
              <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">
                {t('settings.appearance.themeTitle')}
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {t('settings.appearance.themeSubtitle')}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5 cursor-pointer"
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

      {/* ── Section 2 : Palette d'Accent & Couleur Principale ── */}
      <section className="settings-section-block p-4 sm:p-6" id="accent-color-section">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">
              {isRtl ? 'لون التمييز والواجهة الرئيسي' : 'Couleur d’Accent & Palette de l’Application'}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {isRtl ? 'اختر اللون المميز للأزرار والشارات والمؤشرات في كامل التطبيق' : 'Personnalisez la couleur active des boutons, onglets, badges et sélections'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {ACCENT_PALETTES.map(palette => {
            const isSelected = currentAccent === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => updateCustomization({ accentColor: palette.id })}
                className={`flex flex-col items-center gap-2.5 rounded-xl border-2 p-3 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div
                  className="h-8 w-8 rounded-full shadow-xs border-2 border-white dark:border-slate-800 flex items-center justify-center"
                  style={{ backgroundColor: palette.hex }}
                >
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
                <div className="w-full">
                  <p className="text-xs font-bold text-foreground truncate">
                    {isRtl ? palette.nameAr : palette.nameFr}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {palette.hex}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Option Sur-Mesure / Custom Hex Picker */}
          <div
            className={`flex flex-col items-center justify-between gap-2 rounded-xl border-2 p-3 text-center transition-all ${
              currentAccent === 'custom'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                : 'border-border/70 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <input
                type="color"
                value={currentCustomHex}
                onChange={e => {
                  updateCustomization({
                    accentColor: 'custom',
                    customPrimaryColor: e.target.value,
                  });
                }}
                className="h-8 w-8 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
                title={isRtl ? 'اختر لوناً مخصصاً' : 'Choisir une couleur personnalisée'}
              />
            </div>
            <div className="w-full">
              <button
                type="button"
                onClick={() => updateCustomization({ accentColor: 'custom' })}
                className="text-xs font-bold text-foreground truncate block w-full cursor-pointer"
              >
                {isRtl ? 'لون مخصص' : 'Sur-Mesure'}
              </button>
              <input
                type="text"
                value={currentCustomHex}
                onChange={e => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    updateCustomization({
                      accentColor: 'custom',
                      customPrimaryColor: val,
                    });
                  }
                }}
                maxLength={7}
                placeholder="#2563eb"
                className="mt-1 w-full text-center text-[10px] font-mono px-1 py-0.5 rounded border border-border bg-background text-foreground"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3 : Rayon de Courbure & Arrondi des Composants ── */}
      <section className="settings-section-block p-4 sm:p-6" id="border-radius-section">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layout className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">
              {isRtl ? 'انحناء حواف المكونات والبطاقات' : 'Rayon & Courbure des Angles'}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {isRtl ? 'حدد درجة استدارة البطاقات والأزرار والنوافذ' : 'Choisissez le style géométrique des cartes, boutons et champs de saisie'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(BORDER_RADIUS_MAP) as BorderRadiusOption[]).map(radiusKey => {
            const rad = BORDER_RADIUS_MAP[radiusKey];
            const isSelected = currentRadius === radiusKey;
            return (
              <button
                key={radiusKey}
                type="button"
                onClick={() => updateCustomization({ borderRadius: radiusKey })}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-3.5 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div
                  className={`h-9 w-16 border-2 border-primary/60 bg-primary/10 flex items-center justify-center`}
                  style={{
                    borderRadius: rad.md,
                  }}
                >
                  <span className="text-[10px] font-bold text-primary">{rad.md}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isRtl ? rad.labelAr : rad.labelFr}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section 4 : Style des Cartes & Surfaces ── */}
      <section className="settings-section-block p-4 sm:p-6" id="card-style-section">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">
              {isRtl ? 'مظهر وأسلوب البطاقات والأسطح' : 'Style des Surfaces & Cartes'}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {isRtl ? 'تحكم في عمق وتظليل وخلفيات بطاقات الأقسام' : 'Définissez le traitement visuel des conteneurs, blocs et listes'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CARD_STYLES.map(style => {
            const isSelected = currentCardStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => updateCustomization({ cardStyle: style.id })}
                className={`flex flex-col justify-between rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {isRtl ? style.labelAr : style.labelFr}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {style.descFr}
                  </p>
                </div>
                {isSelected && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-primary/20 pt-2 text-[10px] font-bold text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{isRtl ? 'مفعّل' : locale === 'en' ? 'Active' : 'Actif'}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section 5 : Style du Tableau du Cahier de Textes ── */}
      <section className="settings-section-block p-4 sm:p-6" id="table-style-section">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TableIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">
              {isRtl ? 'نمط شبكة وجدول دفتر النصوص' : 'Style du Tableau du Cahier'}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {isRtl ? 'تخصيص نمط العرض والتسطير والتظليل لصفوف الجذاذات والدروس' : 'Personnalisez le lignage, les bandes alternées et l’espacement des séances'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TABLE_STYLES.map(style => {
            const isSelected = currentTableStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => updateCustomization({ tableStyle: style.id })}
                className={`flex flex-col justify-between rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {isRtl ? style.labelAr : style.labelFr}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {style.descFr}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section 6 : Typographie unifiée ── */}
      <section className="settings-section-block p-4 sm:p-6" id="typography-section">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Type className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">
              {fontCopy.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {fontCopy.subtitle}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={fontCopy.open}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 text-start shadow-xs transition-all hover:border-primary/35 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-4"
            >
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{fontCopy.ui}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-foreground" style={{ fontFamily: selectedUIFont.family }}>
                    {isRtl ? selectedUIFont.labelAr : selectedUIFont.labelFr}
                  </span>
                </div>
                <div className="min-w-0 border-t border-border/60 pt-2 sm:border-s sm:border-t-0 sm:ps-3 sm:pt-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{fontCopy.latin}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-foreground" style={{ fontFamily: selectedLatinObj.family }} dir="ltr">
                    {selectedLatinObj.name}
                  </span>
                </div>
                <div className="min-w-0 border-t border-border/60 pt-2 sm:border-s sm:border-t-0 sm:ps-3 sm:pt-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{fontCopy.arabic}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-foreground" style={{ fontFamily: selectedArabicObj.family }} dir="rtl">
                    {selectedArabicObj.name}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isRtl ? 'end' : 'start'}
            sideOffset={8}
            className="w-[min(32rem,calc(100vw-2rem))] max-h-[min(70dvh,36rem)] overscroll-contain p-2"
          >
            <DropdownMenuLabel>{fontCopy.ui}</DropdownMenuLabel>
            {(Object.keys(UI_FONTS_MAP) as UIFontOption[]).map(fontKey => {
              const font = UI_FONTS_MAP[fontKey];
              const selected = currentUIFont === fontKey;
              return (
                <DropdownMenuItem key={`ui-${fontKey}`} onSelect={() => updateCustomization({ uiFont: fontKey })} className="py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">{selected && <Check className="text-primary" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground" style={{ fontFamily: font.family }}>{isRtl ? font.labelAr : font.labelFr}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{font.descriptionFr}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>{fontCopy.latin}</DropdownMenuLabel>
            {LATIN_FONTS.map(font => {
              const selected = currentLatinFont === font.id;
              return (
                <DropdownMenuItem key={`latin-${font.id}`} onSelect={() => onConfigChange({ contentFontLatin: font.id })} className="py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">{selected && <Check className="text-primary" />}</span>
                  <span className="min-w-0 flex-1" dir="ltr">
                    <span className="block truncate text-sm font-semibold text-foreground" style={{ fontFamily: font.family }}>{font.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground" style={{ fontFamily: font.family }}>{font.sampleFr}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>{fontCopy.arabic}</DropdownMenuLabel>
            {ARABIC_FONTS.map(font => {
              const selected = currentArabicFont === font.id;
              return (
                <DropdownMenuItem key={`arabic-${font.id}`} onSelect={() => onConfigChange({ contentFontArabic: font.id })} className="py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">{selected && <Check className="text-primary" />}</span>
                  <span className="min-w-0 flex-1" dir="rtl">
                    <span className="block truncate text-sm font-semibold text-foreground" style={{ fontFamily: font.family }}>{font.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground" style={{ fontFamily: font.family }}>{font.sampleAr}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {/* ── Section 7 : Aperçu Typographique & Pédagogique ── */}
      <section className="settings-section-block p-4 sm:p-5" id="font-preview-section">
        <div className="mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            {t('settings.appearance.previewTitle')}
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="settings-surface space-y-2 p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Français / Latin : {selectedLatinObj.name}</span>
              <Badge variant="outline" className="text-[10px] uppercase">{selectedLatinObj.category}</Badge>
            </div>
            <div style={{ fontFamily: selectedLatinObj.family }} className="space-y-1.5 text-foreground" dir="ltr">
              <div className="flex items-center justify-between text-[14px] font-semibold">
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

          <div className="settings-surface space-y-2 p-3.5" dir="rtl">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">العربية : {selectedArabicObj.name}</span>
              <Badge variant="outline" className="text-[10px]">{selectedArabicObj.category}</Badge>
            </div>
            <div style={{ fontFamily: selectedArabicObj.family }} className="space-y-1.5 text-foreground">
              <div className="flex items-center justify-between text-[14px] font-semibold">
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

      {/* ── Section 8 : Personnalisation Directe & Avancée des Couleurs ── */}
      <section className="settings-section-block p-4 sm:p-6" id="advanced-colors-section">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sliders className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">
                {isRtl ? 'تخصيص متقدم لدرجات الألوان' : 'Personnalisation Avancée des Couleurs & Zones'}
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {isRtl ? 'تحكم دقيق في درجات خلفية التطبيق والنصوص والبطاقات' : 'Ajustement précis des codes hexadécimaux pour le fond, le texte et les cartes'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedColors(!showAdvancedColors)}
            className="text-xs cursor-pointer"
          >
            {showAdvancedColors ? (isRtl ? 'إخفاء' : 'Masquer') : (isRtl ? 'إظهار' : 'Afficher')}
          </Button>
        </div>

        {showAdvancedColors && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/70">
            {/* Fond Global */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                {isRtl ? 'لون خلفية الصفحة' : 'Arrière-plan global (Fond)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={custom.customBackgroundColor || (currentTheme === 'dark' ? '#0b1120' : '#f8fafc')}
                  onChange={e => updateCustomization({ customBackgroundColor: e.target.value })}
                  className="h-8 w-8 rounded cursor-pointer border border-border"
                />
                <input
                  type="text"
                  placeholder={currentTheme === 'dark' ? '#0b1120' : '#f8fafc'}
                  value={custom.customBackgroundColor || ''}
                  onChange={e => updateCustomization({ customBackgroundColor: e.target.value || undefined })}
                  className="flex-1 text-xs font-mono px-2 py-1 rounded border border-border bg-background text-foreground"
                />
              </div>
            </div>

            {/* Texte Principal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                {isRtl ? 'لون النص الأساسي' : 'Couleur du texte principal'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={custom.customTextColor || (currentTheme === 'dark' ? '#f8fafc' : '#0f172a')}
                  onChange={e => updateCustomization({ customTextColor: e.target.value })}
                  className="h-8 w-8 rounded cursor-pointer border border-border"
                />
                <input
                  type="text"
                  placeholder={currentTheme === 'dark' ? '#f8fafc' : '#0f172a'}
                  value={custom.customTextColor || ''}
                  onChange={e => updateCustomization({ customTextColor: e.target.value || undefined })}
                  className="flex-1 text-xs font-mono px-2 py-1 rounded border border-border bg-background text-foreground"
                />
              </div>
            </div>

            {/* Fond des Cartes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                {isRtl ? 'لون خلفية البطاقات' : 'Arrière-plan des Cartes'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={custom.customCardColor || (currentTheme === 'dark' ? '#1e293b' : '#ffffff')}
                  onChange={e => updateCustomization({ customCardColor: e.target.value })}
                  className="h-8 w-8 rounded cursor-pointer border border-border"
                />
                <input
                  type="text"
                  placeholder={currentTheme === 'dark' ? '#1e293b' : '#ffffff'}
                  value={custom.customCardColor || ''}
                  onChange={e => updateCustomization({ customCardColor: e.target.value || undefined })}
                  className="flex-1 text-xs font-mono px-2 py-1 rounded border border-border bg-background text-foreground"
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
