import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du fond du tableau de bord.
 *
 *  Neutres légèrement teintés : l'accent reste réservé aux actions.
 *  Les clés historiques sont partagées avec la coque de l'application.
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** Neutres teintés : la page s'accorde au papier profond de la palette. */
    colors: {
        mint: '#f3f1e8',
        rose: '#f2f0e8',
        sky: '#efede3',
    },
    /** Mode sombre : versions étagées autour du fond nuit d'argile */
    darkColors: {
        mint: '#1e1d1b',
        rose: '#201f1d',
        sky: '#232120',
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
