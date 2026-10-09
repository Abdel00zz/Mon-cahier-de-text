import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du fond futuriste haute qualité.
 *  Inspiré des plateformes IA modernes (auras cyan, pêche, lavande et trame micro-points).
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** Auras lumineuses mode clair */
    colors: {
        base: '#fafaf9',
        mint: '#2dd4bf', // Cyan / menthe lumineuse
        rose: '#fda4af', // Rose poudré / pêche douce
        sky: '#a5b4fc',  // Indigo céleste / pervenche
    },
    /** Auras profondes mode sombre */
    darkColors: {
        base: '#0c0f17',
        mint: '#14b8a6', // Cyan profond
        rose: '#e11d48', // Rose / fuchsia nocturne
        sky: '#6366f1',  // Indigo cosmique
    },
} as const;

const { colors, darkColors } = DASHBOARD_CANVAS;

/** Variables consommées par `dashboardCanvas.css`. Objet gelé : une seule
 *  référence, aucune allocation pendant les rendus. */
export const DASHBOARD_CANVAS_STYLE = Object.freeze({
    '--canvas-base': colors.base,
    '--canvas-mint': colors.mint,
    '--canvas-rose': colors.rose,
    '--canvas-sky': colors.sky,
    '--canvas-base-dark': darkColors.base,
    '--canvas-mint-dark': darkColors.mint,
    '--canvas-rose-dark': darkColors.rose,
    '--canvas-sky-dark': darkColors.sky,
} as CSSProperties);
