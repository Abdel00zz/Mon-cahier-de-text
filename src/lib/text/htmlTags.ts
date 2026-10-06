/**
 * Balises HTML de mise en forme : le professeur peut les écrire à la main ou
 * coller un document, elles sont TRADUITES vers les marqueurs natifs du moteur
 * de description (`**gras**`, `*italique*`, `++souligné++`, `==surligné==`,
 * listes `- ` / `1. `).
 *
 * Aucune balise n'atteint jamais le DOM : le moteur rend des nœuds React, donc
 * une balise NON reconnue reste du TEXTE VISIBLE — jamais du HTML exécuté. On
 * élargit donc la tolérance à la saisie sans ouvrir la moindre faille : il n'y a
 * ni `innerHTML` de contenu utilisateur, ni liste noire à tenir à jour.
 *
 * Les commandes LaTeX de document (`\textbf`, `\item`, `\begin{enumerate}`…)
 * restent traitées par le moteur juste après, dans la même passe.
 */

/** Balises reconnues, dans l'ordre où elles sont traduites. */
export const SUPPORTED_HTML_TAGS = [
  'br', 'p', 'div', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'u', 'mark',
] as const;

/** Entités courantes : rendues en caractères, jamais en code HTML. */
const ENTITIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/&nbsp;/gi, '\u00A0'],
  [/&amp;/gi, '&'],
  [/&lt;/gi, '<'],
  [/&gt;/gi, '>'],
  [/&quot;/gi, '"'],
  [/&times;/gi, '×'],
  [/&middot;/gi, '·'],
  [/&hellip;/gi, '…'],
];

/** Traductions : chaque entrée est [balise ouvrante, balise fermante]. */
const PAIRS: ReadonlyArray<readonly [RegExp, string, RegExp, string]> = [
  [/<strong\b[^>]*>/gi, '**', /<\/strong\s*>/gi, '**'],
  [/<b\b[^>]*>/gi, '**', /<\/b\s*>/gi, '**'],
  [/<em\b[^>]*>/gi, '*', /<\/em\s*>/gi, '*'],
  [/<i\b[^>]*>/gi, '*', /<\/i\s*>/gi, '*'],
  [/<u\b[^>]*>/gi, '++', /<\/u\s*>/gi, '++'],
  [/<mark\b[^>]*>/gi, '==', /<\/mark\s*>/gi, '=='],
];

/** Sauts et blocs : un paragraphe devient une respiration, une puce une ligne. */
const BLOCKS: ReadonlyArray<readonly [RegExp, string]> = [
  [/<br\s*\/?>/gi, '\n'],
  [/<\/p\s*>/gi, '\n\n'],
  [/<p\b[^>]*>/gi, ''],
  [/<\/div\s*>/gi, '\n'],
  [/<div\b[^>]*>/gi, ''],
  [/<\/?(?:ul|ol)\b[^>]*>/gi, '\n'],
  [/<li\b[^>]*>/gi, '- '],
  [/<\/li\s*>/gi, '\n'],
];

/**
 * Traduit les balises reconnues. Idempotent sur un texte déjà converti (une
 * chaîne sans chevron ressort identique), et sans effet sur les formules
 * mathématiques : l'appelant ne lui présente que les segments NON mathématiques.
 */
export function expandHtmlTags(source: string): string {
  // Sortie rapide : sans chevron ni esperluette, il n'y a rien à traduire — et
  // c'est le cas de la quasi-totalité des descriptions déjà enregistrées.
  if (!source || (!source.includes('<') && !source.includes('&'))) return source;
  let out = source;
  for (const [open, openReplacement, close, closeReplacement] of PAIRS) {
    out = out.replace(open, openReplacement).replace(close, closeReplacement);
  }
  for (const [pattern, replacement] of BLOCKS) {
    out = out.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of ENTITIES) {
    out = out.replace(pattern, replacement);
  }
  // Trois sauts de suite au maximum : un document collé en contient souvent cinq.
  return out.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n');
}
