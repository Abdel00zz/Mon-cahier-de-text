import { useEffect, useLayoutEffect, useMemo } from 'react';
import { AppTextSize, ThemeMode } from '@/types';
import { readThemeBackground } from '@/platform/themeColor';
import { useMediaQuery } from './useMediaQuery';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Crans de densité de texte.
 *
 * Ces multiplicateurs alimentent `--app-text-density`, qui est multiplié par
 * `--app-text-scale-base` pour produire `--app-text-scale` (voir `theme-tokens.css`).
 * Toute l'échelle typographique en dépend sans altérer les cibles tactiles minimales (≥ 44 px).
 */
const TEXT_SIZE_SCALE: Record<AppTextSize, number> = {
  sm: 0.94,
  md: 1,
  lg: 1.08,
  xl: 1.16,
};

/**
 * Contrôleur d'apparence : mode clair/sombre/système et échelle de texte.
 *
 * Utilise `useMediaQuery` pour un suivi instantané sans réabonnement inutile,
 * et applique le thème via `useLayoutEffect` pour éliminer tout flash visuel au montage.
 */
export function useTheme(configTheme?: ThemeMode, appTextSize?: AppTextSize) {
  const activeTheme: ThemeMode = configTheme ?? 'light';
  const systemIsDark = useMediaQuery('(prefers-color-scheme: dark)');

  const isDark = useMemo(() => {
    if (activeTheme === 'dark') return true;
    if (activeTheme === 'light') return false;
    return systemIsDark;
  }, [activeTheme, systemIsDark]);

  // Classe .dark + barre d'état appliquée avant peinture pour éviter tout flash blanc
  useIsomorphicLayoutEffect(() => {
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
      meta.setAttribute('content', readThemeBackground());
    });

    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  // Densité de texte : posée immédiatement sur le root pour éviter le CLS
  useIsomorphicLayoutEffect(() => {
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
