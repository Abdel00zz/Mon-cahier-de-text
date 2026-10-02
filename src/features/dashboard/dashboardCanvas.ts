import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du fond du tableau de bord.
 *
 *  Neutres légèrement teintés : l'accent reste réservé aux actions.
 *  Les clés historiques sont partagées avec la coque de l'application.
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** Neutres indigo et menthe : les notes colorées gardent la priorité. */
    colors: {
        mint: '#f3f8f5',
        rose: '#f7f7fb',
        sky: '#f2f4fc',
    },
    /** Mode sombre : versions étagées profondes et désaturées */
    darkColors: {
        mint: '#171e21',
        rose: '#191b2b',
        sky: '#1b2032',
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
