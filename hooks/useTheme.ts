import { useEffect, useState, useMemo, useCallback } from 'react';
import { ThemeMode, ThemeCustomization } from '@/types';
import { getLatinFontFamily, getArabicFontFamily } from '@/constants/typography';
import {
  ACCENT_PALETTES,
  BORDER_RADIUS_MAP,
  UI_FONTS_MAP,
  hexToHslString,
} from '@/constants/themePresets';

const THEME_STORAGE_KEY = 'app_theme_mode_v1';

export function useTheme(
  configTheme?: ThemeMode,
  contentFontLatin?: string,
  contentFontArabic?: string,
  onThemeChange?: (theme: ThemeMode) => void,
  themeCustomization?: ThemeCustomization
) {
  const [themeState, setThemeState] = useState<ThemeMode>(() => {
    if (configTheme) return configTheme;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {}
    return 'light';
  });

  const activeTheme = configTheme || themeState;

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);

    if (media.addEventListener) {
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    } else if (media.addListener) {
      media.addListener(handler);
      return () => media.removeListener(handler);
    }
  }, []);

  const isDark = useMemo(() => {
    if (activeTheme === 'dark') return true;
    if (activeTheme === 'light') return false;
    return systemIsDark;
  }, [activeTheme, systemIsDark]);

  // Apply dark/light class and color-scheme
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Update theme-color meta tag for PWA and mobile status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0b1120' : '#ffffff');
    }

    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  // Apply Centralized Theme Customization Variables
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const accentKey = themeCustomization?.accentColor || 'blue';
    const borderRadiusKey = themeCustomization?.borderRadius || 'default';
    const uiFontKey = themeCustomization?.uiFont || 'jakarta';
    const cardStyleKey = themeCustomization?.cardStyle || 'classic';
    const tableStyleKey = themeCustomization?.tableStyle || 'clean';

    // 1. Accent & Primary Colors
    if (accentKey === 'custom' && themeCustomization?.customPrimaryColor) {
      const hsl = hexToHslString(themeCustomization.customPrimaryColor);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--ring', hsl);
      root.style.setProperty('--accent', isDark ? `${hsl} / 0.15` : `${hsl} / 0.08`);
      root.style.setProperty('--accent-foreground', isDark ? '210 40% 98%' : hsl);
    } else {
      const palette = ACCENT_PALETTES.find(p => p.id === accentKey) || ACCENT_PALETTES[0];
      const palTheme = isDark ? palette.dark : palette.light;
      root.style.setProperty('--primary', palTheme.primary);
      root.style.setProperty('--primary-foreground', palTheme.primaryForeground);
      root.style.setProperty('--ring', palTheme.ring);
      root.style.setProperty('--accent', palTheme.accent);
      root.style.setProperty('--accent-foreground', palTheme.accentForeground);
    }

    // 2. Border Radius Variables
    const radiusTokens = BORDER_RADIUS_MAP[borderRadiusKey] || BORDER_RADIUS_MAP.default;
    root.style.setProperty('--radius-sm', radiusTokens.sm);
    root.style.setProperty('--radius-md', radiusTokens.md);
    root.style.setProperty('--radius-lg', radiusTokens.lg);
    root.style.setProperty('--radius-xl', radiusTokens.xl);
    root.style.setProperty('--radius-2xl', radiusTokens['2xl']);
    root.style.setProperty('--radius-3xl', radiusTokens['3xl']);

    // 3. UI Font Family
    const uiFont = UI_FONTS_MAP[uiFontKey] || UI_FONTS_MAP.jakarta;
    root.style.setProperty('--font-sans', uiFont.family);

    // 4. Custom Direct Colors if set
    if (themeCustomization?.customBackgroundColor) {
      const bgHsl = hexToHslString(themeCustomization.customBackgroundColor);
      root.style.setProperty('--background', bgHsl);
    } else {
      root.style.removeProperty('--background');
    }

    if (themeCustomization?.customTextColor) {
      const textHsl = hexToHslString(themeCustomization.customTextColor);
      root.style.setProperty('--foreground', textHsl);
    } else {
      root.style.removeProperty('--foreground');
    }

    if (themeCustomization?.customCardColor) {
      const cardHsl = hexToHslString(themeCustomization.customCardColor);
      root.style.setProperty('--card', cardHsl);
      root.style.setProperty('--popover', cardHsl);
    } else {
      root.style.removeProperty('--card');
      root.style.removeProperty('--popover');
    }

    // 5. Data Attributes on root for CSS targeting
    root.setAttribute('data-card-style', cardStyleKey);
    root.setAttribute('data-table-style', tableStyleKey);
    root.setAttribute('data-radius', borderRadiusKey);
    root.setAttribute('data-ui-font', uiFontKey);
  }, [isDark, themeCustomization]);

  // Update dynamic content fonts on CSS variables
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const latinFamily = getLatinFontFamily(contentFontLatin);
    const arabicFamily = getArabicFontFamily(contentFontArabic);

    root.style.setProperty('--content-font-latin', latinFamily);
    root.style.setProperty('--content-font-arabic', arabicFamily);
  }, [contentFontLatin, contentFontArabic]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  }, [onThemeChange]);

  return {
    theme: activeTheme,
    isDark,
    resolvedTheme: isDark ? 'dark' : 'light',
    setTheme,
  };
}
