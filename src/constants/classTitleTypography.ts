import type { CSSProperties } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
 *  SOURCE UNIQUE de la typographie des titres de classe.
 *
 *  Pour changer la police des titres, tout se passe ici :
 *    1. `TITLE_FAMILIES` — la pile de caractères par écriture ;
 *    2. `TITLE_RECIPES`  — la graisse et l'interlettrage par rôle.
 *
 *  Après un changement de famille, mettre à jour le CHARGEMENT de la police :
 *    • latin  : la requête Google Fonts dans `index.html` ;
 *    • arabe  : le fichier dans `public/` + son `@font-face` dans `index.css`.
 *
 *  Les composants (`ClassCard`, `ClassListItem`, `Dashboard`) n'écrivent JAMAIS
 *  de famille, de graisse ni d'interlettrage de titre : ils appellent
 *  `classTitleStyle(...)`. La taille, elle, reste au composant : elle est liée
 *  aux hauteurs posées dans `features/dashboard/classCards.css` (carte) et au
 *  jeton `--class-list-row-h` (liste) : ne pas les changer sans recalculer la
 *  géométrie.
 * ────────────────────────────────────────────────────────────────────────── */

/** Écriture du titre : interface arabe, sinon interface latine. */
type TitleScript = 'latin' | 'arabic';

/** Rôle du titre, du plus discret au plus affirmé. */
export type TitleFontRole = 'card' | 'list' | 'page';

/** Piles de caractères. Les replis évitent tout rendu cassé si la police
 *  principale n'est pas encore chargée (`display=swap`). */
const TITLE_FAMILIES: Record<TitleScript, string> = {
    latin: "'Roboto Slab', 'Lato', 'DM Sans', ui-sans-serif, sans-serif",
    arabic: "'Maghribi Font 3', 'Rubik', 'DM Sans', serif",
};

/** Titres : demi-gras moderne en latin (Roboto Slab est plus large que Lora,
 *  d'où un interlettrage un peu plus serré) ; pas de gras synthétique en arabe. */
const TITLE_RECIPES: Record<TitleFontRole, Record<TitleScript, { weight: number; tracking: string }>> = {
    card: {
        latin: { weight: 500, tracking: '-0.012em' },
        arabic: { weight: 400, tracking: '0' },
    },
    list: {
        latin: { weight: 400, tracking: '-0.008em' },
        arabic: { weight: 400, tracking: '0' },
    },
    page: {
        latin: { weight: 600, tracking: '-0.022em' },
        arabic: { weight: 700, tracking: '0.015em' },
    },
};

const buildStyle = (script: TitleScript, role: TitleFontRole): CSSProperties => Object.freeze({
    fontFamily: TITLE_FAMILIES[script],
    fontWeight: TITLE_RECIPES[role][script].weight,
    letterSpacing: TITLE_RECIPES[role][script].tracking,
});

/** Un seul objet par couple rôle/écriture : jamais réalloué pendant un rendu. */
const TITLE_STYLES: Record<TitleFontRole, Record<TitleScript, CSSProperties>> = {
    card: { latin: buildStyle('latin', 'card'), arabic: buildStyle('arabic', 'card') },
    list: { latin: buildStyle('latin', 'list'), arabic: buildStyle('arabic', 'list') },
    page: { latin: buildStyle('latin', 'page'), arabic: buildStyle('arabic', 'page') },
};

/** Typographie à appliquer au titre d'une classe (`style={...}`). */
export function classTitleStyle(isRtl: boolean, role: TitleFontRole = 'card'): CSSProperties {
    return TITLE_STYLES[role][isRtl ? 'arabic' : 'latin'];
}
