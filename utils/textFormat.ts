import React from 'react';
import { splitMathText } from './math';

/*
 * Moteur de mise en page des descriptions, hors segments mathématiques :
 *   **gras**                       → <strong>
 *   *italique*                     → <em>
 *   ++souligné++                   → <u>
 *   « - texte » en début de ligne  → puce (équivalent \itemize)
 *   « 1. texte » en début de ligne → liste numérotée (équivalent \enumerate)
 * Les segments $...$ / $$...$$ sont transmis intacts à MathJax (qui gère
 * \frac, \array, \begin{cases}, matrices, etc. ; macros de l'application
 * dans config/mathJax.ts).
 * Le LaTeX *de document* est analysé ici — jamais envoyé à MathJax, qui ne le
 * connaît pas : listes (\begin{enumerate}, \begin{itemize}, \begin{description})
 * avec leurs \item et leurs imbrications, emphases (\textbf, \textit, \emph,
 * \underline), sauts de ligne (\\, \newline, \par), espacements (\smallskip,
 * \bigskip, \vspace, \hspace).
 *
 * L'analyse est STRUCTURELLE (arbre items → blocs) : un \item se termine au
 * \item suivant, à \end{…} ou à une ligne vide — aucune ligne vide n'est
 * requise pour que la liste tienne debout, et un item peut s'étaler sur
 * plusieurs lignes (grande formule, retour à la ligne) sans sortir de sa
 * colonne de contenu.
 */

/* ── Analyse structurelle du LaTeX de document ───────────────────────── */

type ListKind = 'ordered' | 'bullet' | 'described';

type DescriptionItem = {
  /** Terme de \item[terme] (liste de définitions). */
  label?: string;
  blocks: DescriptionBlock[];
};

type DescriptionBlock =
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
 *  numéro `1.` / `1)`. Les deux formes sont reconnues en un seul test. */
const HAND_TYPED_ITEM = /^\s*(?:(\d+)[.)]|[-+])\s+(.*)$/;

/** Jetons structurels : \begin{…}, \end{…} et \item (avec son libellé).
 *  `g` requis par `String.prototype.matchAll`, qui clone l'expression : aucun
 *  état partagé entre deux appels (le `lastIndex` ne fuit pas). */
const LATEX_STRUCTURE = /\\(begin|end)\{([a-zA-Z]+\*?)\}|\\item\b[ \t]*(?:\[([^\]]*)\])?/g;

type LatexToken =
  | { kind: 'open'; name: string }
  | { kind: 'close'; name: string }
  | { kind: 'item'; label?: string }
  | { kind: 'text'; value: string };

function tokenizeLatex(source: string): LatexToken[] {
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

interface ParseCursor {
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
function parseBlocks(state: ParseCursor, terminator?: string): DescriptionBlock[] {
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

/** Une ligne de liste : puce décorative ou numéro porté par l'auteur. */
function renderListRow(marker: React.ReactNode, content: React.ReactNode[], key: string, decorative: boolean): React.ReactNode {
  return React.createElement(
    'span',
    { key, className: 'flex items-start gap-1.5 pl-1 whitespace-normal' },
    React.createElement(
      'span',
      { className: 'shrink-0 select-none font-semibold text-primary', 'aria-hidden': decorative ? true : undefined },
      marker
    ),
    // `whitespace-pre-wrap` garde les retours à la ligne de l'auteur DANS
    // l'item, et `overflow-x-auto` laisse une grande formule défiler sur sa
    // propre ligne au lieu de pousser la mise en page du cahier. Le conteneur
    // est monté même sans formule : sans débordement aucun ascenseur
    // n'apparaît, et le texte continue de se replier normalement.
    React.createElement(
      'span',
      { className: 'min-w-0 flex-1 whitespace-pre-wrap break-words overflow-x-auto' },
      ...content
    )
  );
}

function renderItem(type: ListKind, item: DescriptionItem, position: number, key: string): React.ReactNode {
  const marker = item.label
    ? (type === 'described' ? React.createElement('strong', { key: `${key}-label` }, item.label) : item.label)
    : type === 'ordered' ? `${position + 1}.` : '•';
  const content = renderBlocks(item.blocks, `${key}-c`);
  return renderListRow(marker, content.length ? content : [''], key, !item.label && type !== 'ordered');
}

function renderBlocks(blocks: DescriptionBlock[], keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  blocks.forEach((block, blockIndex) => {
    const key = `${keyBase}-b${blockIndex}`;
    if (block.kind === 'list') {
      block.items.forEach((item, position) => {
        out.push(renderItem(block.type, item, position, `${key}-i${position}`));
      });
      return;
    }
    out.push(...renderTextLines(block.lines, key));
  });
  return out;
}

/**
 * Commandes de mise en page LaTeX d'un texte courant : la sortie est aux
 * marqueurs natifs du moteur, donc MathJax n'en voit jamais un seul. Les
 * variantes \text… sont listées AVANT le \text{…} générique pour ne pas être
 * avalées par lui.
 */
const LATEX_TEXT_COMMANDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\\textbf\{([^{}]*)\}/g, '**$1**'],
  [/\\textit\{([^{}]*)\}/g, '*$1*'],
  [/\\textsl\{([^{}]*)\}/g, '*$1*'],
  [/\\emph\{([^{}]*)\}/g, '*$1*'],
  [/\\underline\{([^{}]*)\}/g, '++$1++'],
  [/\\textsc\{([^{}]*)\}/g, '$1'],
  // Générique : les suffixes déjà traités ci-dessus (it, bf) en sont EXCLUS,
  // sinon il avale leurs marqueurs à la passe suivante — cas mesuré :
  // \textbf{\emph{X}} perdait le gras et ne gardait que l'italique.
  [/\\text(?:rm|sf|tt|up|md|normal)?\{([^{}]*)\}/g, '$1'],
  [/\\mbox\{([^{}]*)\}/g, '$1'],
];

function expandLatexTextCommands(source: string): string {
  let out = source;
  // Trois passes couvrent les imbrications usuelles (\textbf{\emph{…}}).
  for (let pass = 0; pass < 3; pass += 1) {
    for (const [pattern, replacement] of LATEX_TEXT_COMMANDS) {
      out = out.replace(pattern, replacement);
    }
  }
  out = out
    // Fins de ligne (\\ ou \\[2mm]) et paragraphes.
    .replace(/\\\\(?:\s*\[[^\]]*\])?/g, '\n')
    .replace(/\\(?:newline|linebreak)\b/g, '\n')
    .replace(/\\(?:par|bigskip|medskip)\b/g, '\n\n')
    .replace(/\\smallskip\b/g, '\n')
    // Espacements : une respiration verticale ou une espace insécable.
    .replace(/\\vspace\*?\{[^{}]*\}/g, '\n')
    .replace(/\\hspace\*?\{[^{}]*\}/g, '\u00A0')
    .replace(/~/g, '\u00A0')
    // Commandes sans équivalent en texte courant : retirées, pas imprimées.
    .replace(/\\(?:noindent|centering|raggedright|raggedleft|newpage|clearpage|pagebreak|nopagebreak|vfill|hfill)\b/g, '')
    // Les listes ne sont PAS traitées ici : l'analyseur structurel (parseBlocks)
    // les reconnaît avant la mise en page, imbrications comprises, et sans
    // exiger la moindre ligne vide.
    // Échappements LaTeX, espaces fines et accolades vides ({ } de garde).
    .replace(/\\([%&_#{}])/g, '$1')
    .replace(/\\[,;:!]/g, ' ')
    .replace(/\{\}/g, '')
    // Symboles fréquents.
    .replace(/\\(?:ldots|dots|textellipsis)\b/g, '…')
    .replace(/\\textendash\b/g, '–')
    .replace(/\\textemdash\b/g, '—')
    .replace(/\\guillemotleft\b/g, '«')
    .replace(/\\guillemotright\b/g, '»')
    .replace(/\\textbullet\b/g, '•');
  // Aucun rognage ici : cette passe s'applique FRAGMENT par fragment, rogner
  // les '\n' de tête supprimerait le saut de ligne qui suit une formule.
  return out;
}

/**
 * Point d'entrée : formules protégées par des jetons indivisibles, commandes de
 * document traduites, puis analyse structurelle (listes, items imbriqués) et
 * mise en page. Les formules étant déjà des jetons, ni leurs \item ni leurs
 * accolades ne peuvent perturber l'analyse.
 */
export function renderDescriptionWithBold(text: string | undefined): React.ReactNode[] {
  if (!text) return [];
  let prefix = '\uE000';
  while (text.includes(prefix)) prefix += '\uE000';
  const formulas: string[] = [];
  const protectedSource = splitMathText(text).map(part => {
    // Seul le TEXTE reçoit les commandes de mise en page : dans une formule,
    // c'est MathJax qui les interprète (\textbf, \text, \underline…).
    if (!part.math) return expandLatexTextCommands(part.text);
    const index = formulas.push(part.text) - 1;
    return prefix + index + '\uE001';
  }).join('').replace(/\n{3,}/g, '\n\n');
  const token = new RegExp(prefix + '(\\d+)\uE001', 'g');
  const restore = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') return node.replace(token, (_, index) => formulas[Number(index)]);
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
      return React.cloneElement(node, {}, React.Children.map(node.props.children, restore));
    }
    return node;
  };
  const state: ParseCursor = { tokens: tokenizeLatex(protectedSource), index: 0 };
  return renderBlocks(parseBlocks(state), '0').map(restore);
}

/**
 * Lignes de texte : paragraphes, puces (- ou +, jamais `*` qui reste l'italique) et listes
 * numérotées (1. / 1)).
 * Une ligne qui suit un item sans commencer par une puce lui appartient
 * (continuation « paresseuse », comme LaTeX et Markdown) : l'auteur n'a pas à
 * insérer une ligne vide pour que sa liste tienne debout. Les items sont des
 * BLOCS (display:flex) : dans un conteneur `whitespace-pre-wrap`, un '\n'
 * résiduel juste avant un bloc créerait une ligne vide illogique, on ne l'émet
 * donc jamais autour des items de liste.
 */
function renderTextLines(lines: string[], keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Un seul passage de détection : chaque ligne est testée une fois, et la
  // continuation sait immédiatement où s'arrêter (aucun test répété).
  const markers = lines.map((line) => {
    const match = line.match(HAND_TYPED_ITEM);
    return match ? { number: match[1], content: match[2] } : null;
  });

  for (let index = 0; index < lines.length; index += 1) {
    const marker = markers[index];

    if (!marker) {
      out.push(...applyInlineFormatting(lines[index], `text-${keyBase}-${index}`));
      // '\n' uniquement entre deux lignes de TEXTE : jamais avant/après un
      // item de liste (le bloc flex crée déjà sa propre ligne).
      if (markers[index + 1] === null) out.push('\n');
      continue;
    }

    // L'item absorbe les lignes suivantes tant qu'elles ne sont ni vides ni une
    // nouvelle puce : elles restent DANS sa colonne de contenu.
    const contentLines = [marker.content];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() !== '' && !markers[cursor]) {
      contentLines.push(lines[cursor]);
      cursor += 1;
    }
    const children: React.ReactNode[] = [];
    contentLines.forEach((contentLine, contentIndex) => {
      if (contentIndex > 0) children.push('\n');
      children.push(...applyInlineFormatting(contentLine, `li-${keyBase}-${index}-${contentIndex}`));
    });
    out.push(renderListRow(
      marker.number ? `${marker.number}.` : '•',
      children,
      `row-${keyBase}-${index}`,
      !marker.number
    ));
    index = cursor - 1;
  }

  return out;
}

const INLINE_MARKERS = ['***', '**', '++', '==', '*'] as const;

function getColorClass(color: string): string {
  const c = color.toLowerCase();
  switch (c) {
    case 'red':
    case 'rouge':
    case 'rose':
      return 'text-rose-600 dark:text-rose-400 font-medium';
    case 'blue':
    case 'bleu':
    case 'sky':
      return 'text-sky-600 dark:text-sky-400 font-medium';
    case 'green':
    case 'vert':
    case 'emerald':
      return 'text-emerald-600 dark:text-emerald-400 font-medium';
    case 'amber':
    case 'orange':
    case 'jaune':
      return 'text-amber-600 dark:text-amber-400 font-medium';
    case 'purple':
    case 'violet':
      return 'text-purple-600 dark:text-purple-400 font-medium';
    case 'gray':
    case 'gris':
      return 'text-stone-500 dark:text-stone-400';
    default:
      return '';
  }
}

type InlineMatch =
  | { type: 'marker'; index: number; marker: typeof INLINE_MARKERS[number]; openLen: number; closeTag: string }
  | { type: 'color'; index: number; color: string; openLen: number; closeTag: string };

function findNextInlineOpen(segment: string, from: number): InlineMatch | null {
  let best: InlineMatch | null = null;

  for (const marker of INLINE_MARKERS) {
    const idx = segment.indexOf(marker, from);
    if (idx < 0) continue;
    if (!best || idx < best.index || (idx === best.index && marker.length > best.openLen)) {
      best = { type: 'marker', index: idx, marker, openLen: marker.length, closeTag: marker };
    }
  }

  const colorOpenIdx = segment.indexOf('[color:', from);
  if (colorOpenIdx >= 0) {
    const bracketClose = segment.indexOf(']', colorOpenIdx + 7);
    if (bracketClose > colorOpenIdx + 7 && bracketClose - colorOpenIdx <= 30) {
      const colorVal = segment.slice(colorOpenIdx + 7, bracketClose).trim();
      const openLen = bracketClose + 1 - colorOpenIdx;
      if (!best || colorOpenIdx < best.index) {
        best = { type: 'color', index: colorOpenIdx, color: colorVal, openLen, closeTag: '[/color]' };
      }
    }
  }

  return best;
}

function applyInlineFormatting(segment: string, keyBase: string): React.ReactNode[] {
  if (!segment) return [];
  const out: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < segment.length) {
    const opening = findNextInlineOpen(segment, cursor);

    if (!opening) {
      out.push(segment.slice(cursor));
      break;
    }

    const closingIndex = segment.indexOf(opening.closeTag, opening.index + opening.openLen);
    if (closingIndex < 0) {
      out.push(segment.slice(cursor, opening.index + opening.openLen));
      cursor = opening.index + opening.openLen;
      continue;
    }

    if (opening.index > cursor) out.push(segment.slice(cursor, opening.index));
    const inner = segment.slice(opening.index + opening.openLen, closingIndex);
    const children = applyInlineFormatting(inner, `${keyBase}-${opening.index}`);
    const key = `${keyBase}-${opening.index}-${closingIndex}`;

    if (opening.type === 'color') {
      const isHex = opening.color.startsWith('#');
      const cls = getColorClass(opening.color);
      out.push(
        React.createElement(
          'span',
          {
            key,
            className: cls || undefined,
            style: isHex ? { color: opening.color } : undefined,
          },
          ...children,
        ),
      );
    } else if (opening.marker === '***') {
      out.push(React.createElement('strong', { key }, React.createElement('em', null, ...children)));
    } else if (opening.marker === '**') {
      out.push(React.createElement('strong', { key }, ...children));
    } else if (opening.marker === '++') {
      out.push(React.createElement('u', { key, className: 'decoration-current underline-offset-2' }, ...children));
    } else if (opening.marker === '==') {
      out.push(React.createElement('mark', { key, className: 'rounded-sm bg-amber-200/90 dark:bg-amber-400/30 text-inherit px-1 py-0.5 font-normal' }, ...children));
    } else {
      out.push(React.createElement('em', { key }, ...children));
    }
    cursor = closingIndex + opening.closeTag.length;
  }

  return out;
}

/**
 * Détecte si un texte contient principalement des caractères arabes.
 */
export function isArabicText(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}
