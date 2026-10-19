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

/** A quoted `>` belongs to an attribute, never to the end of the tag.
 * Only the existing allowlist is translated; all attributes are discarded. */
const HTML_TAG = /<\/?([a-z][a-z0-9]*)(?=[\s/>])(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
const INLINE_TAGS: Readonly<Record<string, string>> = {
  strong: '**', b: '**', em: '*', i: '*', u: '++', mark: '==',
};

function translateTag(tag: string, rawName: string): string {
  const name = rawName.toLowerCase();
  const close = tag.startsWith('</');
  if (Object.hasOwn(INLINE_TAGS, name)) return INLINE_TAGS[name];
  if (name === 'br') return '\n';
  if (name === 'p') return close ? '\n\n' : '';
  if (name === 'div') return close ? '\n' : '';
  // Reuse the structural list parser: ordered and nested HTML lists must not
  // collapse into a flat list of bullets. Works across protected math fragments.
  if (name === 'ul' || name === 'ol') return `\n\\${close ? 'end' : 'begin'}{${name === 'ol' ? 'enumerate' : 'itemize'}}\n`;
  if (name === 'li') return close ? '\n' : '\\item ';
  return tag;
}

/**
 * Traduit les balises reconnues. Sans effet sur les formules
 * mathématiques : l'appelant ne lui présente que les segments NON mathématiques.
 */
export function expandHtmlTags(source: string): string {
  // Sortie rapide : sans chevron ni esperluette, il n'y a rien à traduire — et
  // c'est le cas de la quasi-totalité des descriptions déjà enregistrées.
  if (!source || (!source.includes('<') && !source.includes('&'))) return source;
  // `<mark> texte </mark>` : les espaces de bord restent dehors, un `==` doit toucher le texte qu'il entoure.
  let out = source.replace(/<mark(?=[\s/>])(?:[^"'<>]|"[^"]*"|'[^']*')*>([^<]*)<\/mark\s*>/gi, (_match, inner: string) => {
    const core = inner.trim();
    return core ? `${inner.slice(0, inner.indexOf(core))}==${core}==${inner.slice(inner.indexOf(core) + core.length)}` : inner;
  });
  out = out.replace(HTML_TAG, translateTag);
  for (const [pattern, replacement] of ENTITIES) {
    out = out.replace(pattern, replacement);
  }
  // Deux sauts de suite au maximum : un document collé en contient souvent cinq.
  return out.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n');
}
