import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du fond du tableau de bord.
 *
 *  Dégradé linéaire horizontal en 3 tons pastel :
 *    • ~0%  (gauche) : Turquoise / menthe très clair (#d3fffb)
 *    • ~45% (centre) : Rose pâle (#fee3ec)
 *    • ~80% (droite) : Bleu ciel pâle (#bde7ff)
 *
 *  Texture de grille de petits carrés réguliers (~24px, opacité ~10-15%).
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** 3 tons pastel extraits des pixels de référence */
    colors: {
        mint: '#d3fffb',
        rose: '#fee3ec',
        sky: '#bde7ff',
    },
    /** Mode sombre : versions étagées profondes et désaturées */
    darkColors: {
        mint: '#081d1c',
        rose: '#20111a',
        sky: '#0d1a27',
    },
} as const;

const { colors, darkColors } = DASHBOARD_CANVAS;

/** Variables consommées par `dashboardCanvas.css`. Objet gelé : une seule
 *  référence, aucune allocation pendant les rendus. */
export const DASHBOARD_CANVAS_STYLE = Object.freeze({
    '--canvas-mint': colors.mint,
    '--canvas-rose': colors.rose,
    '--canvas-sky': colors.sky,
    '--canvas-mint-dark': darkColors.mint,
    '--canvas-rose-dark': darkColors.rose,
    '--canvas-sky-dark': darkColors.sky,
} as CSSProperties);
