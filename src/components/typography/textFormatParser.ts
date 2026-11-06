// Analyse structurelle du LaTeX de document (listes, items, environnements).
/* ── Analyse structurelle du LaTeX de document ───────────────────────── */

export type ListKind = 'ordered' | 'bullet' | 'described';

export type DescriptionItem = {
  /** Terme de \item[terme] (liste de définitions). */
  label?: string;
  blocks: DescriptionBlock[];
};

export type DescriptionBlock =
  | { kind: 'lines'; lines: string[] }
  | { kind: 'list'; type: ListKind; items: DescriptionItem[] };

/** Environnements de liste reconnus. Les autres enveloppes (center, quote…) sont
 *  transparentes : on garde leur contenu, pas leur balise. */
const LIST_ENVIRONMENTS: Record<string, ListKind> = {
  enumerate: 'ordered',
  itemize: 'bullet',
  description: 'described',
};

/** Puce tapée à la main : `-` ou `+` (jamais `*`, réservé à l'italique), et
 *  numéro `1.` / `1)`, chiffres arabo-indiens (`١.`) et persans compris.
 *  Les deux formes sont reconnues en un seul test. */
export const HAND_TYPED_ITEM = /^\s*(?:([0-9\u0660-\u0669\u06F0-\u06F9]+)[.)]|[-+])\s+(.*)$/;

/** Jetons structurels : \begin{…}, \end{…} et \item (avec son libellé).
 *  `g` requis par `String.prototype.matchAll`, qui clone l'expression : aucun
 *  état partagé entre deux appels (le `lastIndex` ne fuit pas). */
const LATEX_STRUCTURE = /\\(begin|end)\{([a-zA-Z]+\*?)\}|\\item\b[ \t]*(?:\[([^\]]*)\])?/g;

export type LatexToken =
  | { kind: 'open'; name: string }
  | { kind: 'close'; name: string }
  | { kind: 'item'; label?: string }
  | { kind: 'text'; value: string };

export function tokenizeLatex(source: string): LatexToken[] {
  const tokens: LatexToken[] = [];
  let cursor = 0;
  for (const match of source.matchAll(LATEX_STRUCTURE)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ kind: 'text', value: source.slice(cursor, index) });
    if (match[1] === 'begin') tokens.push({ kind: 'open', name: match[2] });
    else if (match[1] === 'end') tokens.push({ kind: 'close', name: match[2] });
    else tokens.push({ kind: 'item', label: match[3]?.trim() || undefined });
    cursor = index + match[0].length;
  }
  if (cursor < source.length) tokens.push({ kind: 'text', value: source.slice(cursor) });
  return tokens;
}

export interface ParseCursor {
  tokens: LatexToken[];
  index: number;
}

/** Les lignes vides de bord (fin de ligne source, passage à l'item suivant)
 *  n'appartiennent pas au bloc : elles créeraient un blanc parasite. Les lignes
 *  vides INTÉRIEURES sont conservées (vraie respiration voulue par l'auteur). */
function trimEmptyEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start += 1;
  while (end > start && lines[end - 1].trim() === '') end -= 1;
  return lines.slice(start, end);
}

/** Contenu d'une liste : des items, chacun portant ses propres blocs. */
function parseItems(state: ParseCursor, terminator: string | undefined, first?: LatexToken): DescriptionItem[] {
  const items: DescriptionItem[] = [];
  let current: DescriptionItem | null = first && first.kind === 'item' ? { label: first.label, blocks: [] } : null;
  let pending: string[] = [];

  const flushLines = () => {
    if (current && pending.join('').trim()) current.blocks.push({ kind: 'lines', lines: trimEmptyEdges(pending) });
    pending = [];
  };
  const closeItem = () => {
    flushLines();
    if (current) items.push(current);
    current = null;
  };

  while (state.index < state.tokens.length) {
    const token = state.tokens[state.index];
    if (token.kind === 'item') {
      state.index += 1;
      closeItem();
      current = { label: token.label, blocks: [] };
      continue;
    }
    if (token.kind === 'open') {
      state.index += 1;
      flushLines();
      const type = LIST_ENVIRONMENTS[token.name];
      // Liste imbriquée sans item porteur (LaTeX invalide) : on crée l'item
      // manquant plutôt que de perdre le contenu.
      if (!current) current = { blocks: [] };
      if (type) current.blocks.push({ kind: 'list', type, items: parseItems(state, token.name) });
      else current.blocks.push(...parseBlocks(state, token.name));
      continue;
    }
    if (token.kind === 'close') {
      state.index += 1;
      // Seule la fermeture ATTENDUE clôt la liste. Une fermeture orpheline
      // (LaTeX mal formé) est ignorée : le contenu qui suit est conservé.
      if (token.name === terminator) break;
      continue;
    }
    state.index += 1;
    pending.push(...token.value.split('\n'));
  }

  closeItem();
  return items;
}

/** Suite de blocs jusqu'à la fin du document ou à la fermeture `terminator`. */
export function parseBlocks(state: ParseCursor, terminator?: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let pending: string[] = [];
  const flushLines = () => {
    if (pending.join('').trim()) blocks.push({ kind: 'lines', lines: trimEmptyEdges(pending) });
    pending = [];
  };

  while (state.index < state.tokens.length) {
    const token = state.tokens[state.index];
    if (token.kind === 'text') {
      state.index += 1;
      pending.push(...token.value.split('\n'));
      continue;
    }
    if (token.kind === 'open') {
      state.index += 1;
      flushLines();
      const type = LIST_ENVIRONMENTS[token.name];
      if (type) blocks.push({ kind: 'list', type, items: parseItems(state, token.name) });
      // Enveloppe non-liste (center, quote…) : transparente.
      else blocks.push(...parseBlocks(state, token.name));
      continue;
    }
    if (token.kind === 'close') {
      state.index += 1;
      // Fermeture attendue : fin du bloc. Orpheline : ignorée et lecture
      // poursuivie, sinon tout ce qui suit serait perdu.
      if (token.name === terminator) break;
      continue;
    }
    // \item sans environnement : liste à puces tolérante.
    state.index += 1;
    flushLines();
    blocks.push({ kind: 'list', type: 'bullet', items: parseItems(state, terminator, token) });
  }

  flushLines();
  return blocks;
}
