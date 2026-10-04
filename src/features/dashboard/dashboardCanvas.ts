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
        mint: '#f2f7ea',
        rose: '#f7f8f1',
        sky: '#eff5ee',
    },
    /** Mode sombre : versions étagées profondes et désaturées */
    darkColors: {
        mint: '#141a13',
        rose: '#161a14',
        sky: '#18201a',
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
