export type AccentColorKey =
  | 'blue'
  | 'emerald'
  | 'indigo'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'slate'
  | 'crimson'
  | 'custom';

export type BorderRadiusOption = 'sharp' | 'default' | 'soft' | 'pill';
export type CardStyleOption = 'classic' | 'bordered' | 'elevated' | 'glass';
export type TableStyleOption = 'clean' | 'striped' | 'bordered' | 'compact';
export type UIFontOption = 'jakarta' | 'outfit' | 'lexend' | 'inter' | 'fira' | 'system';
export type BackgroundContrastOption = 'normal' | 'soft' | 'vibrant';

export interface AccentColorPreset {
  id: AccentColorKey;
  nameFr: string;
  nameAr: string;
  hex: string;
  light: {
    primary: string; // HSL values, e.g. "221 83% 53%"
    primaryForeground: string;
    ring: string;
    accent: string;
    accentForeground: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    ring: string;
    accent: string;
    accentForeground: string;
  };
}

export const ACCENT_PALETTES: AccentColorPreset[] = [
  {
    id: 'blue',
    nameFr: 'Bleu Royal (Standard)',
    nameAr: 'أزرق ملكي (افتراضي)',
    hex: '#2563eb',
    light: {
      primary: '221 83% 53%',
      primaryForeground: '0 0% 100%',
      ring: '221 83% 53%',
      accent: '217 91% 95%',
      accentForeground: '221 83% 45%',
    },
    dark: {
      primary: '217 91% 60%',
      primaryForeground: '222 47% 8%',
      ring: '217 91% 60%',
      accent: '217 91% 18%',
      accentForeground: '217 91% 75%',
    },
  },
  {
    id: 'emerald',
    nameFr: 'Émeraude Pédagogique',
    nameAr: 'زمردي أكاديمي',
    hex: '#059669',
    light: {
      primary: '160 84% 39%',
      primaryForeground: '0 0% 100%',
      ring: '160 84% 39%',
      accent: '152 76% 94%',
      accentForeground: '160 84% 30%',
    },
    dark: {
      primary: '158 64% 52%',
      primaryForeground: '160 84% 6%',
      ring: '158 64% 52%',
      accent: '160 84% 16%',
      accentForeground: '158 64% 75%',
    },
  },
  {
    id: 'indigo',
    nameFr: 'Indigo Profond',
    nameAr: 'نيلي عميق',
    hex: '#4f46e5',
    light: {
      primary: '239 84% 67%',
      primaryForeground: '0 0% 100%',
      ring: '239 84% 67%',
      accent: '238 100% 96%',
      accentForeground: '239 84% 50%',
    },
    dark: {
      primary: '239 84% 67%',
      primaryForeground: '239 84% 8%',
      ring: '239 84% 67%',
      accent: '239 84% 20%',
      accentForeground: '238 100% 80%',
    },
  },
  {
    id: 'cyan',
    nameFr: 'Cyan & Lagon',
    nameAr: 'سماوي بحري',
    hex: '#0891b2',
    light: {
      primary: '192 91% 36%',
      primaryForeground: '0 0% 100%',
      ring: '192 91% 36%',
      accent: '186 94% 94%',
      accentForeground: '192 91% 30%',
    },
    dark: {
      primary: '189 94% 43%',
      primaryForeground: '192 91% 8%',
      ring: '189 94% 43%',
      accent: '192 91% 16%',
      accentForeground: '189 94% 75%',
    },
  },
  {
    id: 'amber',
    nameFr: 'Ambre & Ocre',
    nameAr: 'عنبري دافئ',
    hex: '#d97706',
    light: {
      primary: '38 92% 50%',
      primaryForeground: '0 0% 100%',
      ring: '38 92% 50%',
      accent: '48 100% 95%',
      accentForeground: '38 92% 35%',
    },
    dark: {
      primary: '43 96% 56%',
      primaryForeground: '38 92% 8%',
      ring: '43 96% 56%',
      accent: '38 92% 18%',
      accentForeground: '43 96% 80%',
    },
  },
  {
    id: 'rose',
    nameFr: 'Rose & Corail',
    nameAr: 'وردي مرجاني',
    hex: '#e11d48',
    light: {
      primary: '346 87% 53%',
      primaryForeground: '0 0% 100%',
      ring: '346 87% 53%',
      accent: '350 100% 96%',
      accentForeground: '346 87% 45%',
    },
    dark: {
      primary: '351 95% 71%',
      primaryForeground: '346 87% 8%',
      ring: '351 95% 71%',
      accent: '346 87% 20%',
      accentForeground: '351 95% 85%',
    },
  },
  {
    id: 'violet',
    nameFr: 'Violet Impérial',
    nameAr: 'بنفسجي ملكي',
    hex: '#7c3aed',
    light: {
      primary: '262 83% 58%',
      primaryForeground: '0 0% 100%',
      ring: '262 83% 58%',
      accent: '268 100% 96%',
      accentForeground: '262 83% 45%',
    },
    dark: {
      primary: '263 70% 66%',
      primaryForeground: '262 83% 8%',
      ring: '263 70% 66%',
      accent: '262 83% 20%',
      accentForeground: '263 70% 85%',
    },
  },
  {
    id: 'slate',
    nameFr: 'Graphite & Ardoise',
    nameAr: 'جرافيت وأردواز',
    hex: '#475569',
    light: {
      primary: '215 19% 35%',
      primaryForeground: '0 0% 100%',
      ring: '215 19% 35%',
      accent: '210 20% 93%',
      accentForeground: '215 19% 25%',
    },
    dark: {
      primary: '215 20% 65%',
      primaryForeground: '222 47% 8%',
      ring: '215 20% 65%',
      accent: '215 19% 20%',
      accentForeground: '215 20% 85%',
    },
  },
  {
    id: 'crimson',
    nameFr: 'Rubis Académique',
    nameAr: 'ياقوتي أكاديمي',
    hex: '#dc2626',
    light: {
      primary: '0 84% 60%',
      primaryForeground: '0 0% 100%',
      ring: '0 84% 60%',
      accent: '0 100% 96%',
      accentForeground: '0 84% 45%',
    },
    dark: {
      primary: '0 72% 51%',
      primaryForeground: '0 84% 8%',
      ring: '0 72% 51%',
      accent: '0 84% 20%',
      accentForeground: '0 72% 80%',
    },
  },
];

export const BORDER_RADIUS_MAP: Record<BorderRadiusOption, { sm: string; md: string; lg: string; xl: string; '2xl': string; '3xl': string; labelFr: string; labelAr: string }> = {
  sharp: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem',
    '2xl': '0.625rem',
    '3xl': '0.75rem',
    labelFr: 'Épuré & Rectiligne (4px)',
    labelAr: 'مستقيم وأنيق (4px)',
  },
  default: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    labelFr: 'Moderne Standard (12px)',
    labelAr: 'عصري قياسي (12px)',
  },
  soft: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.75rem',
    labelFr: 'Doux & Arrondi (18px)',
    labelAr: 'ناعم ومنحنٍ (18px)',
  },
  pill: {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    '2xl': '1.75rem',
    '3xl': '2rem',
    labelFr: 'Très Arrondi / Pilule (24px)',
    labelAr: 'كبسولة دائرية (24px)',
  },
};

export const UI_FONTS_MAP: Record<UIFontOption, { family: string; labelFr: string; labelAr: string; descriptionFr: string }> = {
  jakarta: {
    family: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif",
    labelFr: 'Plus Jakarta Sans',
    labelAr: 'بلس جاكرتا سانس',
    descriptionFr: 'Typographie d’interface contemporaine, nette et équilibrée',
  },
  outfit: {
    family: "'Outfit', 'Alexandria', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif",
    labelFr: 'Outfit Geometric',
    labelAr: 'أوتفيت الهندسية',
    descriptionFr: 'Style géométrique élégant et aéré',
  },
  lexend: {
    family: "'Lexend', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif",
    labelFr: 'Lexend Reader',
    labelAr: 'ليكسيند للقراءة السريعة',
    descriptionFr: 'Optimisé pour la rapidité de lecture et le confort visuel',
  },
  inter: {
    family: "'Inter', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif",
    labelFr: 'Inter UI',
    labelAr: 'إنتر القياسية',
    descriptionFr: 'Police d’application dense, neutre et universelle',
  },
  fira: {
    family: "'Fira Sans', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif",
    labelFr: 'Fira Sans',
    labelAr: 'فيرا سانس التعليمية',
    descriptionFr: 'Clarté académique rigoureuse et lisibilité technique',
  },
  system: {
    family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'IBM Plex Sans Arabic', sans-serif",
    labelFr: 'Police Système Native',
    labelAr: 'خط النظام الافتراضي',
    descriptionFr: 'Utilise la police native de votre appareil (macOS, iOS, Windows, Android)',
  },
};

/** Convert any 6-digit hex code to HSL values string "H S% L%" */
export function hexToHslString(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return '221 83% 53%';

  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
