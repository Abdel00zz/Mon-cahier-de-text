import { splitMathText } from './math';

/** Direction d'écriture déduite d'un texte : `rtl` (arabe, hébreu…), `ltr`, ou
 *  `null` quand rien ne permet de trancher (texte vide, chiffres seuls). */
export type TextDirection = 'rtl' | 'ltr';

/** Écritures de droite à gauche : arabe, hébreu, syriaque, thaana, n'ko. */
const RTL_SCRIPTS = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u08A0-\u08FF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/u;

/** Toute lettre, quelle que soit l'écriture. Les chiffres, la ponctuation et
 *  les symboles sont *neutres* pour l'algorithme bidi : ils ne doivent jamais
 *  décider de l'orientation. */
const ANY_LETTER = /\p{L}/u;

/**
 * Orientation du texte d'après sa **première lettre**.
 *
 * Les segments mathématiques (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) sont ignorés :
 * une formule commence toujours par des lettres latines et ferait basculer à
 * tort en LTR une phrase arabe (« $\lim f$ الدالة متصلة » reste RTL).
 *
 * Renvoie `null` si aucun caractère fort n'existe : l'appelant conserve alors
 * la direction du cahier, ce qui évite de casser les lignes de chiffres.
 */
export function detectTextDirection(text?: string | null): TextDirection | null {
  if (!text) return null;
  const plain = splitMathText(text)
    .filter(part => !part.math)
    .map(part => part.text)
    .join(' ');
  for (const char of plain) {
    if (!ANY_LETTER.test(char)) continue;
    return RTL_SCRIPTS.test(char) ? 'rtl' : 'ltr';
  }
  return null;
}

/**
 * Attribut `dir` prêt à étaler sur un bloc de texte, `undefined` pour hériter
 * de la direction du cahier.
 */
export const textDirectionAttribute = (text?: string | null): TextDirection | undefined =>
  detectTextDirection(text) ?? undefined;
