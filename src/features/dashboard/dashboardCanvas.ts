import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du fond du tableau de bord.
 *
 *  Neutres légèrement teintés : l'accent reste réservé aux actions.
 *  Les clés historiques sont partagées avec la coque de l'application.
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** Papier chaud et gris sauge, sans aplat saturé. */
    colors: {
        mint: '#f2f5f2',
        rose: '#f7f6f2',
        sky: '#f1f4f3',
    },
    /** Mode sombre : versions étagées profondes et désaturées */
    darkColors: {
        mint: '#18201d',
        rose: '#1b211f',
        sky: '#192120',
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
