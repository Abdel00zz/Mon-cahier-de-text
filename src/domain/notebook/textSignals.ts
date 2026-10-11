/*
 * SIGNAUX DE TEXTE — règles partagées par le diagnostic d'import et le
 * conseiller de cahier.
 *
 * Deux défauts sont invisibles à l'œil nu dans un cahier :
 *  - une formule ouverte mais jamais fermée : le TeX brut s'affiche tel quel ;
 *  - des caractères de contrôle collés depuis un traitement de texte.
 * La règle vit ici, une fois, pour que les deux moteurs ne puissent pas
 * diverger sur ce qu'est « un texte douteux ».
 */

/** Caractères de contrôle invisibles (copier-coller depuis un traitement de texte). */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const hasControlCharacters = (text: string): boolean => CONTROL_CHARACTERS.test(text);

/**
 * Vrai si un texte porte un nombre IMPAIR de délimiteurs `$` isolés.
 * `$$…$$` (formule display) est neutralisé avant comptage : il ne compte pas.
 */
export const hasUnclosedFormula = (text: string): boolean =>
  text.replace(/\$\$/g, '').split('$').length % 2 === 0;
