/*
 * LE SURLIGNAGE `==texte==` — ce qui est (et n'est pas) un délimiteur.
 *
 * Un délimiteur `==` n'est valable que s'il est SEUL (jamais collé à un autre `=`), et s'il touche le texte
 * qu'il entoure, comme en Markdown :
 *   - l'ouvrant est suivi d'un caractère visible (pas d'espace) ;
 *   - le fermant est précédé d'un caractère visible (pas d'espace).
 * Conséquences voulues :
 *   `x == y`, `a === b`, `====`, `===texte===`  → restent du texte, rien n'est surligné ni dupliqué ;
 *   `==texte==`, `==a=b==`, `==$\frac{a}{b}$==` → surlignés (une formule est un jeton insécable, grande ou haute).
 *
 * Module pur : le moteur de description et la barre d'outils de l'éditeur lisent la MÊME définition.
 */

const isSpace = (char: string | undefined): boolean => char === undefined || /\s/u.test(char);

/** `==` à cet indice, ouvrant valable. */
export const highlightOpenAt = (text: string, index: number): boolean =>
  index >= 0 && text.startsWith('==', index) && text[index - 1] !== '=' && text[index + 2] !== '=' && !isSpace(text[index + 2]);

/** `==` à cet indice, fermant valable. */
const highlightCloseAt = (text: string, index: number): boolean =>
  index >= 0 && text.startsWith('==', index) && text[index - 1] !== '=' && text[index + 2] !== '=' && !isSpace(text[index - 1]);

/** Premier ouvrant valable à partir de `from`, ou -1. */
export function findHighlightOpen(text: string, from = 0): number {
  for (let index = text.indexOf('==', from); index >= 0; index = text.indexOf('==', index + 1)) {
    if (highlightOpenAt(text, index)) return index;
  }
  return -1;
}

/** Premier fermant valable à partir de `from`, ou -1. */
export function findHighlightClose(text: string, from: number): number {
  for (let index = text.indexOf('==', from); index >= 0; index = text.indexOf('==', index + 1)) {
    if (highlightCloseAt(text, index)) return index;
  }
  return -1;
}

/** Retire les surlignages bien formés d'un texte (le contenu reste). */
export function stripHighlights(text: string): string {
  let out = '';
  let cursor = 0;
  for (;;) {
    const open = findHighlightOpen(text, cursor);
    const close = open >= 0 ? findHighlightClose(text, open + 2) : -1;
    if (open < 0 || close < 0) break;
    out += text.slice(cursor, open) + text.slice(open + 2, close);
    cursor = close + 2;
  }
  return out + text.slice(cursor);
}

export interface HighlightEdit { value: string; start: number; end: number }

/**
 * Bascule le surlignage d'une sélection. Un seul geste, jamais de `====` :
 *   - la sélection porte ses marqueurs, ou ils l'entourent déjà → on les retire ;
 *   - sinon on entoure le texte visible (les espaces de bord restent dehors), en aplatissant d'abord les
 *     surlignages déjà présents dans la sélection ;
 *   - si le texte commence ou finit par `=` (un `==` serait ambigu), on prend la balise `<mark>`.
 * `start`/`end` : la sélection à rétablir après l'édition.
 */
export function toggleHighlight(value: string, start: number, end: number): HighlightEdit {
  const selected = value.slice(start, end);
  const coreStart = start + (selected.length - selected.trimStart().length);
  const coreEnd = end - (selected.length - selected.trimEnd().length);
  if (coreEnd <= coreStart) return { value, start, end };
  const core = value.slice(coreStart, coreEnd);

  // 1. La sélection embrasse ses marqueurs : `==texte==`.
  if (core.length > 4 && highlightOpenAt(core, 0) && findHighlightClose(core, 2) === core.length - 2) {
    const inner = core.slice(2, -2);
    return { value: value.slice(0, coreStart) + inner + value.slice(coreEnd), start: coreStart, end: coreStart + inner.length };
  }
  // 2. Les marqueurs entourent la sélection : `==` [texte] `==`.
  if (highlightOpenAt(value, coreStart - 2) && highlightCloseAt(value, coreEnd)) {
    return { value: value.slice(0, coreStart - 2) + core + value.slice(coreEnd + 2), start: coreStart - 2, end: coreEnd - 2 };
  }
  // 2 bis. Même chose avec la balise `<mark>`.
  if (core.startsWith('<mark>') && core.endsWith('</mark>') && core.length > 13) {
    const inner = core.slice(6, -7);
    return { value: value.slice(0, coreStart) + inner + value.slice(coreEnd), start: coreStart, end: coreStart + inner.length };
  }
  if (value.slice(coreStart - 6, coreStart) === '<mark>' && value.slice(coreEnd, coreEnd + 7) === '</mark>') {
    return { value: value.slice(0, coreStart - 6) + core + value.slice(coreEnd + 7), start: coreStart - 6, end: coreEnd - 6 };
  }
  // 3. Entourer le texte visible.
  const flat = stripHighlights(core);
  const [open, close] = flat.startsWith('=') || flat.endsWith('=') ? ['<mark>', '</mark>'] : ['==', '=='];
  return {
    value: value.slice(0, coreStart) + open + flat + close + value.slice(coreEnd),
    start: coreStart + open.length,
    end: coreStart + open.length + flat.length,
  };
}

/**
 * `==…==` DANS une formule. KaTeX ne connaît pas le surlignage : on le traduit en `\colorbox` (texte foncé
 * sur fond jaune, lisible aussi en mode sombre). Le contenu reste de la mathématique, `\displaystyle`
 * conservé dans une formule affichée, donc une fraction ou une limite garde sa forme et sa hauteur.
 * Les `==` isolés (`a == b`) et les suites de `=` ne sont jamais touchés.
 */
export function highlightMathSource(tex: string, display: boolean): string {
  if (!tex.includes('==')) return tex;
  let out = '';
  let cursor = 0;
  for (;;) {
    const open = findHighlightOpen(tex, cursor);
    const close = open >= 0 ? findHighlightClose(tex, open + 2) : -1;
    if (open < 0 || close < 0) break;
    const inner = tex.slice(open + 2, close);
    out += `${tex.slice(cursor, open)}\\colorbox{#fde68a}{$${display ? '\\displaystyle ' : ''}\\textcolor{#24231f}{${inner}}$}`;
    cursor = close + 2;
  }
  return out + tex.slice(cursor);
}
