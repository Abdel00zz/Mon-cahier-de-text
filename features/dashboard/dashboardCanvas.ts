import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE du fond du tableau de bord.
 *
 *  Pour changer l'ambiance du tableau de bord, tout se passe ici :
 *    • `DASHBOARD_CANVAS.colors` — les trois teintes pastel ;
 *    • `DASHBOARD_CANVAS.light` / `.dark` — leurs intensités par zone ;
 *    • `DASHBOARD_CANVAS.arcs` — taille, position, épaisseur et opacité des
 *      deux arcs décoratifs.
 *
 *  La STRUCTURE (trois dégradés radiaux, deux arcs, bascule du mode sombre)
 *  vit dans `dashboardCanvas.css` et ne lit que les variables produites ici :
 *  aucune couleur n'y est écrite en dur. Le composant ne fait que poser
 *  `style={DASHBOARD_CANVAS_STYLE}` sur la racine du tableau de bord.
 *
 *  Charte : jamais de blanc pur, les teintes restent très désaturées et le
 *  mode sombre n'est pas une inversion (gris profonds, teintes atténuées).
 *  Rien n'est animé : aucun coût GPU continu, aucun décalage de mise en page.
 * ────────────────────────────────────────────────────────────────────────── */

const DASHBOARD_CANVAS = {
    /** Teintes de base, désaturées. */
    colors: {
        /** Lavande froide, posée en haut à gauche. */
        left: '#c9d2f5',
        /** Blush chaud, posé en haut à droite et rappelé en bas à droite. */
        right: '#f3c0d6',
        /** Aqua des arcs décoratifs. */
        arc: '#7ed4da',
    },
    /** Intensités en mode clair, en pourcentage de la teinte. */
    light: {
        left: 62,
        right: 66,
        /** Voile de rappel en bas à droite. */
        endVeil: 30,
    },
    /** Intensités en mode sombre : mêmes teintes, franchement atténuées. */
    dark: {
        left: 22,
        right: 20,
    },
    arcs: {
        /** Épaisseur du trait. */
        border: '1.5px',
        /** Part de la teinte dans le trait (%) : aqua au loin, blush au près. */
        tint: 60,
        tintEnd: 70,
        /** Arc le plus proche : haut du bord d'attaque, très large. */
        near: { start: '-6%', top: '-16%', size: '46vw' },
        /** Arc le plus éloigné : bas du bord de fin, plus large encore. */
        far: { end: '-8%', bottom: '-22%', size: '52vw' },
        opacity: { near: 0.4, far: 0.36 },
        opacityDark: { near: 0.2, far: 0.18 },
    },
} as const;

const { colors, light, dark, arcs } = DASHBOARD_CANVAS;

/** Variables consommées par `dashboardCanvas.css`. Objet gelé : une seule
 *  référence, aucune allocation pendant les rendus. */
export const DASHBOARD_CANVAS_STYLE = Object.freeze({
    '--canvas-left': colors.left,
    '--canvas-right': colors.right,
    '--canvas-arc-color': colors.arc,
    '--canvas-left-strength': `${light.left}%`,
    '--canvas-right-strength': `${light.right}%`,
    '--canvas-end-strength': `${light.endVeil}%`,
    '--canvas-left-strength-dark': `${dark.left}%`,
    '--canvas-right-strength-dark': `${dark.right}%`,
    '--canvas-arc-border': arcs.border,
    '--canvas-arc-tint': `${arcs.tint}%`,
    '--canvas-arc-tint-end': `${arcs.tintEnd}%`,
    '--canvas-arc-near-start': arcs.near.start,
    '--canvas-arc-near-top': arcs.near.top,
    '--canvas-arc-near-size': arcs.near.size,
    '--canvas-arc-far-end': arcs.far.end,
    '--canvas-arc-far-bottom': arcs.far.bottom,
    '--canvas-arc-far-size': arcs.far.size,
    '--canvas-arc-near-opacity': `${arcs.opacity.near}`,
    '--canvas-arc-far-opacity': `${arcs.opacity.far}`,
    '--canvas-arc-near-opacity-dark': `${arcs.opacityDark.near}`,
    '--canvas-arc-far-opacity-dark': `${arcs.opacityDark.far}`,
} as CSSProperties);
