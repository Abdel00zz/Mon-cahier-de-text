import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du fond du tableau de bord.
 *
 *  Neutres légèrement teintés : l'accent reste réservé aux actions.
 *  Les clés historiques sont partagées avec la coque de l'application.
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** Neutres teintés pistache : les notes colorées gardent la priorité. */
    colors: {
        mint: '#f6f4ec',
        rose: '#faf9f5',
        sky: '#f3efe6',
    },
    /** Mode sombre : versions étagées profondes et désaturées */
    darkColors: {
        mint: '#232322',
        rose: '#262625',
        sky: '#2a2927',
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
