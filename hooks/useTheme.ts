import { useEffect, useMemo, useState } from 'react';
import { AppTextSize, ThemeMode } from '@/types';

/**
 * Crans de densité de texte.
 *
 * Ces multiplicateurs alimentent `--app-text-scale` (voir index.css) : toute
 * l'échelle typographique — interface, cahier, modales — en dépend. Les
 * espacements, rayons et cibles tactiles restent en pixels : agrandir le texte
 * ne casse donc jamais la mise en page ni les zones de 44 px.
 */
const TEXT_SIZE_SCALE: Record<AppTextSize, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.12,
  xl: 1.25,
};

/**
 * Contrôleur d'apparence : mode clair/sombre/système et densité de texte.
 *
 * Tous les autres réglages visuels (couleurs, rayons, styles de cartes, choix
 * de polices) ont été supprimés : la charte les fixe dans index.css et la
 * police est déterminée par la langue (DM Sans/Rubik, Arabswell 3/Maghribi
 * Font 3). Aucun réglage utilisateur ne peut donc plus les contredire.
 */
export function useTheme(configTheme?: ThemeMode, appTextSize?: AppTextSize) {
  const activeTheme: ThemeMode = configTheme ?? 'light';

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
    }
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  const isDark = useMemo(() => {
    if (activeTheme === 'dark') return true;
    if (activeTheme === 'light') return false;
    return systemIsDark;
  }, [activeTheme, systemIsDark]);

  // Classe .dark + barre d'état des navigateurs mobiles / PWA.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'only dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'only light';
    }

    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.setAttribute('content', isDark ? '#121214' : '#faf9f9');
    });

    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  // Densité de texte : une seule variable CSS, lue par toute l'échelle.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--app-text-density',
      String(TEXT_SIZE_SCALE[appTextSize ?? 'md'])
    );
  }, [appTextSize]);

  return {
    theme: activeTheme,
    isDark,
    resolvedTheme: isDark ? 'dark' : 'light',
  };
}
