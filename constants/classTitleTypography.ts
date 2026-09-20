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
 *  aux jetons de hauteur des cartes (`--class-card-title-box`,
 *  `--class-list-row-h`) et ne doit pas bouger sans recalculer la géométrie.
 * ────────────────────────────────────────────────────────────────────────── */

/** Écriture du titre : interface arabe, sinon interface latine. */
type TitleScript = 'latin' | 'arabic';

/** Rôle du titre, du plus discret au plus affirmé. */
export type TitleFontRole = 'card' | 'list' | 'page';

/** Piles de caractères. Les replis évitent tout rendu cassé si la police
 *  principale n'est pas encore chargée (`display=swap`). */
const TITLE_FAMILIES: Record<TitleScript, string> = {
    latin: "'Newsreader', 'Rubik', 'DM Sans', serif",
    arabic: "'Maghribi Font 3', 'Rubik', 'DM Sans', serif",
};

/** Graisse et interlettrage par rôle et par écriture. */
const TITLE_RECIPES: Record<TitleFontRole, Record<TitleScript, { weight: number; tracking: string }>> = {
    card: {
        latin: { weight: 400, tracking: '-0.01em' },
        arabic: { weight: 600, tracking: '0.015em' },
    },
    list: {
        latin: { weight: 400, tracking: '-0.01em' },
        arabic: { weight: 600, tracking: '0.015em' },
    },
    page: {
        latin: { weight: 500, tracking: '-0.02em' },
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
