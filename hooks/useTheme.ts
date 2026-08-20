import { useEffect, useState, useMemo, useCallback } from 'react';
import { ThemeMode } from '@/types';
import { getLatinFontFamily, getArabicFontFamily } from '@/constants/typography';

const THEME_STORAGE_KEY = 'app_theme_mode_v1';

export function useTheme(
  configTheme?: ThemeMode,
  contentFontLatin?: string,
  contentFontArabic?: string,
  onThemeChange?: (theme: ThemeMode) => void
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
