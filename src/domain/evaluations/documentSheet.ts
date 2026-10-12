/*
 * EN-TÊTE D'UNE FEUILLE DE DEVOIR — ce qui s'écrit en haut de la page.
 *
 * À gauche (à droite en arabe) : le titre de l'élément, « Devoir surveillé 2 ».
 * À l'autre bord : la classe. Le même en-tête sert l'aperçu, l'impression A5 et la
 * relecture de la direction, pour que ce que l'on voit soit ce qui sort de
 * l'imprimante.
 *
 * Un document qui s'ouvre déjà par son propre titre (`# Devoir surveillé 2`)
 * le répète en grand, centré : l'en-tête ne le redit pas, il garde la classe. La
 * comparaison ignore casse, accents, ponctuation et « n° ».
 *
 * Module pur : aucune dépendance à React.
 */

const comparable = (value: string): string => value
  .normalize('NFKD')
  .replace(/\p{M}/gu, '')
  .toLowerCase()
  .replace(/\bn\s*[°º.]\s*(?=\d)/gu, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');

/** Texte du premier titre (`#`, `##`, `###`) quand il ouvre le document, sinon `null`. */
const openingHeading = (source: string): string | null => {
  for (const line of source.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;
    return text.match(/^#{1,3}[ \t]+(\S.*)$/)?.[1] ?? null;
  }
  return null;
};

/** Titre à porter en en-tête, ou `undefined` quand le document le dit déjà lui-même. */
export const headerTitleFor = (title: string | null | undefined, source: string | null | undefined): string | undefined => {
  const wanted = title?.trim();
  if (!wanted) return undefined;
  const heading = openingHeading(source ?? '');
  if (heading !== null) {
    const key = comparable(heading);
    if (key && key === comparable(wanted)) return undefined;
  }
  return wanted;
};
