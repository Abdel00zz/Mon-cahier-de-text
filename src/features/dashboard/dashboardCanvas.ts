import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du canevas du tableau de bord.
 *  Inspiré de l'esthétique Claude (Anthropic) : papier ivoire chaud et nuit d'argile noble.
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** Auras lumineuses mode clair (Claude Anthropic warm paper) */
    colors: {
        base: '#faf9f5',
        warm: '#d97757', // Terracotta chaud
        amber: '#f59e0b',
        sand: '#f7f5ed',
    },
    /** Auras profondes mode sombre (Claude Anthropic dark ink) */
    darkColors: {
        base: '#181816',
        warm: '#c25e3e',
        amber: '#d97706',
        sand: '#151413',
    },
} as const;

const { colors, darkColors } = DASHBOARD_CANVAS;

/** Variables consommées par `dashboardCanvas.css`. Objet gelé : une seule
 *  référence, aucune allocation pendant les rendus. */
export const DASHBOARD_CANVAS_STYLE = Object.freeze({
    '--canvas-base': colors.base,
    '--canvas-warm': colors.warm,
    '--canvas-amber': colors.amber,
    '--canvas-sand': colors.sand,
    '--canvas-base-dark': darkColors.base,
    '--canvas-warm-dark': darkColors.warm,
    '--canvas-amber-dark': darkColors.amber,
    '--canvas-sand-dark': darkColors.sand,
} as CSSProperties);
