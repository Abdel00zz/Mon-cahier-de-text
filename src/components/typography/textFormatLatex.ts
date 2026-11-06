import React from 'react';
import { splitMathText } from '../../lib/text/math';
import { expandHtmlTags } from '../../lib/text/htmlTags';
import { renderKatexHtml } from '../../config/katex';
import { toDisplayText } from '../../lib/text/textValue';
import { nestHandTypedLists } from '../../lib/text/handLists';
import { textDirectionAttribute } from '../../lib/text/textDirection';
import { HEADING_LINE, renderHeading, renderLine, splitBareme } from './textFormatInline';
import { HAND_TYPED_ITEM, parseBlocks, tokenizeLatex, type DescriptionBlock, type DescriptionItem, type ListKind, type ParseCursor } from './textFormatParser';
import { DISPLAY_MARK, INLINE_MARK, glueAfterFormulas, hasDisplayMath, isDisplayMath } from './textFormatGlue';
import { expandLatexTextCommands } from './textFormatCommands';

/** Marqueur d'un item : puce ou numérotation selon la profondeur de la liste. */
type MarkerStyle = 'bullet' | 'arabic' | 'alpha' | 'roman';

/**
 * Marqueur d'une liste selon sa PROFONDEUR : puce au premier niveau, puis
 * lettres (a., b.), puis chiffres romains (i., ii.), puis de nouveau des
 * chiffres. La hiérarchie des sous-questions se lit d'un coup d'œil, comme
 * dans un énoncé (« 1. … a. … i. … ») et quel que soit l'environnement :
 * `itemize` imbriqué donne donc a., b., c. et non des puces.
 */
function markerStyleFor(type: ListKind, depth: number): MarkerStyle {
  if (depth <= 1) return type === 'ordered' ? 'arabic' : 'bullet';
  const cycle: MarkerStyle[] = ['alpha', 'roman', 'arabic'];
  return cycle[(depth - 2) % cycle.length];
}

/** 1 → a, 26 → z, 27 → aa (numérotation bijective, comme LaTeX). */
function alphaMarker(position: number): string {
  let value = position;
  let out = '';
  do {
    out = String.fromCharCode(97 + (value % 26)) + out;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return out;
}

/** 1 → i, 4 → iv, 9 → ix : minuscules, comme les sous-questions d'un énoncé. */
function romanMarker(position: number): string {
  const steps: ReadonlyArray<readonly [number, string]> = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let value = position + 1;
  let out = '';
  for (const [amount, symbol] of steps) {
    while (value >= amount) {
      out += symbol;
      value -= amount;
    }
  }
  return out;
}

function markerFor(style: MarkerStyle, position: number): string {
  if (style === 'bullet') return '•';
  if (style === 'alpha') return `${alphaMarker(position)}.`;
  if (style === 'roman') return `${romanMarker(position)}.`;
  return `${position + 1}.`;
}

/** Marqueur et contenu d'un item : deux CELLULES d'une même grille
 *  `.editor-list`. La colonne des marqueurs prend la largeur du plus large de la
 *  liste — puces et numéros laissent donc leur texte démarrer sur la même
 *  verticale, comme dans un traitement de texte.
 *  `isLabel` distingue le LIBELLÉ d'une liste de définitions (`\item[terme]`) :
 *  c'est la seule cellule qui a le droit de se replier, sinon sa largeur
 *  minimale (le mot le plus long) peut dépasser le plafond de 45 % et écraser
 *  la colonne de texte à zéro (constaté sur téléphone : 173 lignes d'une lettre). */
function blockProseText(blocks: DescriptionBlock[]): string {
  return blocks.map(block => (
    block.kind === 'lines'
      ? block.lines.join('\n')
      : block.items.map(item => `${item.label ?? ''} ${blockProseText(item.blocks)}`).join('\n')
  )).join('\n');
}

function renderItemCells(
  marker: React.ReactNode,
  content: React.ReactNode[],
  key: string,
  decorative: boolean,
  isLabel = false
): React.ReactNode[] {
  return [
    React.createElement(
      'span',
      {
        key: `${key}-marker`,
        className: isLabel ? 'editor-item-marker editor-item-marker-label' : 'editor-item-marker',
        'aria-hidden': decorative ? true : undefined,
      },
      marker
    ),
    // `whitespace-pre-wrap` garde les retours à la ligne de l'auteur DANS
    // l'item. Aucun conteneur de défilement : une formule trop large est
    // coupée par KaTeX lui-même (displayOverflow: 'linebreak'), la zone
    // reste donc souple et ne montre jamais de barre de défilement.
    React.createElement(
      'span',
      { key: `${key}-body`, className: 'editor-item-body whitespace-pre-wrap break-words' },
      ...content
    ),
  ];
}

function renderItem(type: ListKind, item: DescriptionItem, position: number, key: string, depth: number): React.ReactNode[] {
  const style = markerStyleFor(type, depth);
  const marker = item.label
    ? (type === 'described' ? React.createElement('strong', { key: `${key}-label` }, item.label) : item.label)
    : markerFor(style, position);
  // Une puce est décorative (l'item est déjà annoncé comme tel) ; un numéro ou
  // une lettre porte une information : il reste lu par les lecteurs d'écran.
  const decorative = item.label === '•' || (!item.label && style === 'bullet');
  const content = renderBlocks(item.blocks, `${key}-c`, depth + 1);
  return renderItemCells(marker, content.length ? content : [''], key, decorative, Boolean(item.label));
}

function renderBlocks(blocks: DescriptionBlock[], keyBase: string, depth = 1): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  blocks.forEach((block, blockIndex) => {
    const key = `${keyBase}-b${blockIndex}`;
    if (block.kind === 'list') {
      // UNE grille par liste : la colonne des marqueurs se règle sur le plus
      // large d'entre eux, donc tous les textes démarrent au même x — puces,
      // numéros et libellés de longueurs différentes compris.
      const cells: React.ReactNode[] = [];
      block.items.forEach((item, position) => {
        cells.push(...renderItem(block.type, item, position, `${key}-i${position}`, depth));
      });
      const listDir = textDirectionAttribute(blockProseText([block]));
      out.push(React.createElement('span', { key, className: 'editor-list whitespace-normal', dir: listDir }, ...cells));
      return;
    }
    out.push(...renderTextLines(block.lines, key));
  });
  return out;
}



/*
 * COLONNES — la commande des corrigés.
 *
 * `\begin{multicols}{2} … \end{multicols}` (alias français `\begin{colonnes}{2}`) range son contenu en
 * 2 ou 3 colonnes dans la feuille de document (aperçu et impression A5). Par défaut, RIEN n'est mis en
 * colonnes : c'est le contenu lui-même qui porte la commande, typiquement pour la correction d'un devoir
 * maison ou d'un devoir surveillé. Hors feuille de document (description de séance), le conteneur n'a
 * pas de style et le texte reste dans son flux ordinaire.
 *
 * Le découpage a lieu AVANT la protection des formules : sinon `\begin{multicols}` serait pris pour un
 * environnement mathématique.
 */
const COLUMNS_BLOCK = /\\begin\{(?:multicols|colonnes)\*?\}(?:\{(\d)\})?([\s\S]*?)\\end\{(?:multicols|colonnes)\*?\}/g;
const COLUMNS_STRAY = /\\(?:begin|end)\{(?:multicols|colonnes)\*?\}(?:\{\d\})?/g;
const clampColumns = (value: string | undefined): number => Math.min(3, Math.max(2, Number(value) || 2));

function renderColumnSegments(text: string): React.ReactNode[] | null {
  if (!/\\(?:begin|end)\{(?:multicols|colonnes)/.test(text)) return null;
  // Un début ou une fin orphelins ne s'affichent jamais tels quels.
  if (!/\\begin\{(?:multicols|colonnes)[^}]*\}[\s\S]*\\end\{(?:multicols|colonnes)/.test(text)) {
    return renderDescriptionWithBold(text.replace(COLUMNS_STRAY, ''));
  }
  const out: React.ReactNode[] = [];
  let last = 0;
  let segment = 0;
  const flush = (source: string, columns?: number) => {
    const clean = source.replace(COLUMNS_STRAY, '');
    if (!clean.trim()) return;
    const key = `seg-${segment++}`;
    const nodes = renderDescriptionWithBold(clean);
    out.push(columns
      ? React.createElement('div', { key, className: 'doc-columns', 'data-columns': columns }, ...nodes)
      : React.createElement(React.Fragment, { key }, ...nodes));
  };
  for (const match of text.matchAll(COLUMNS_BLOCK)) {
    const start = match.index ?? 0;
    flush(text.slice(last, start));
    flush(match[2], clampColumns(match[1]));
    last = start + match[0].length;
  }
  flush(text.slice(last));
  return out;
}

/**
 * \textcolor{rouge}{…} (LaTeX) devient la couleur native [color:rouge]…[/color]. Appliqué APRÈS la protection
 * des formules : leur contenu est alors un jeton sans accolades, et \textcolor à l'intérieur d'une formule
 * reste l'affaire de KaTeX.
 */
const TEXTCOLOR = /\\textcolor\{([#A-Za-z0-9]{2,20})\}\{([^{}]*)\}/g;

/**
 * Point d'entrée : formules protégées par des jetons indivisibles, commandes de
 * document traduites, puis analyse structurelle (listes, items imbriqués) et
 * mise en page. Les formules étant déjà des jetons, ni leurs \item ni leurs
 * accolades ne peuvent perturber l'analyse.
 */
export function renderDescriptionWithBold(input: unknown): React.ReactNode[] {
  const text = toDisplayText(input);
  if (!text) return [];
  const columns = renderColumnSegments(text);
  if (columns) return columns;
  let prefix = '\uE000';
  while (text.includes(prefix)) prefix += '\uE000';
  const formulas: string[] = [];
  const protectedSource = splitMathText(text).map(part => {
    // Seul le TEXTE reçoit les commandes de mise en page : dans une formule,
    // c'est KaTeX qui les interprète (\textbf, \text, \underline…).
    // Les balises HTML reconnues sont traduites AVANT les commandes LaTeX : un
    // document collé mélange les deux notations, et une balise inconnue reste du
    // texte visible (jamais du HTML exécuté — le rendu produit des nœuds React).
    if (!part.math) return expandLatexTextCommands(expandHtmlTags(part.text));
    const index = formulas.push(part.text) - 1;
    return prefix + index + (isDisplayMath(part.text) ? DISPLAY_MARK : INLINE_MARK);
  }).join('').replace(/\n{3,}/g, '\n\n').replace(TEXTCOLOR, '[color:$1]$2[/color]');
  // Sous-questions tapées à la main (1. / a. / -, indentées) : réécrites en listes imbriquées, marqueurs conservés.
  const structuredSource = nestHandTypedLists(protectedSource);
  const token = new RegExp(prefix + '(\\d+)[\uE001\uE002]', 'g');
  // Les formules ne sont plus recopiées en TeX dans le DOM puis composées
  // après coup : elles arrivent ici déjà rendues par KaTeX, au milieu du texte
  // riche (gras, listes, surlignage), sans mutation ultérieure.
  const restoreMath = (value: string): React.ReactNode => {
    if (!value.includes('\uE001') && !value.includes('\uE002')) return value;
    const out: React.ReactNode[] = [];
    let last = 0;
    for (const match of value.matchAll(token)) {
      const start = match.index ?? 0;
      if (start > last) out.push(value.slice(last, start));
      const formula = formulas[Number(match[1])] ?? '';
      out.push(React.createElement('span', {
        key: `katex-${match[1]}-${start}`,
        className: 'math-text',
        dangerouslySetInnerHTML: { __html: renderKatexHtml(formula, isDisplayMath(formula)) },
      }));
      last = start + match[0].length;
    }
    if (last < value.length) out.push(value.slice(last));
    const glued = glueAfterFormulas(out);
    return glued.length === 1 ? glued[0] : React.createElement(React.Fragment, null, ...glued);
  };

  const restore = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') return restoreMath(node);
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
      const mapped = React.Children.map(node.props.children, restore);
      return React.cloneElement(node, {}, Array.isArray(mapped) ? glueAfterFormulas(mapped) : mapped);
    }
    return node;
  };
  const state: ParseCursor = { tokens: tokenizeLatex(structuredSource), index: 0 };
  return glueAfterFormulas(renderBlocks(parseBlocks(state), '0').map((node, index) => {
    const restored = restore(node);
    return React.isValidElement(restored) && restored.key === null
      ? React.cloneElement(restored, { key: `restored-${index}` })
      : restored;
  }));
}

function renderTextLines(lines: string[], keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Les items tapés à la main forment UNE grille, comme les listes LaTeX : la
  // colonne des marqueurs prend la largeur du plus large, donc les textes
  // démarrent tous sur la même verticale.
  let itemCells: React.ReactNode[] = [];
  let itemTexts: string[] = [];
  const flushItems = () => {
    if (itemCells.length === 0) return;
    const listDir = textDirectionAttribute(itemTexts.join('\n'));
    out.push(React.createElement(
      'span',
      { key: `hand-list-${keyBase}-${out.length}`, className: 'editor-list whitespace-normal', dir: listDir },
      ...itemCells
    ));
    itemCells = [];
    itemTexts = [];
  };
  // Un seul passage de détection : chaque ligne est testée une fois, et la
  // continuation sait immédiatement où s'arrêter (aucun test répété).
  const markers = lines.map((line) => {
    const match = line.match(HAND_TYPED_ITEM);
    return match ? { number: match[1], content: match[2] } : null;
  });
  // Titres et barèmes sont reconnus dans la MÊME passe : les lignes de texte
  // sont ensuite composées sans revérifier, et le barème est retiré du texte
  // avant que la mise en forme en ligne ne le voie.
  const headings = lines.map((line, index) => (markers[index] ? null : line.match(HEADING_LINE)));
  const bodies = lines.map((line, index) => (headings[index] ? { text: '', baremes: [] as string[] } : splitBareme(line)));

  let gapOpen = false;
  for (let index = 0; index < lines.length; index += 1) {
    const marker = markers[index];

    // Un titre occupe sa propre ligne, en barre ou en sous-titre : aucun saut
    // de ligne n'est émis autour (le bloc se place seul sur la ligne suivante).
    const heading = headings[index];
    if (heading) {
      flushItems();
      out.push(...renderHeading(heading[1].length, heading[2], `head-${keyBase}-${index}`));
      continue;
    }

    // Ligne vide = respiration entre deux paragraphes : un espacement compact (réglé par la feuille), jamais
    // deux de suite. Une vraie ligne blanche par paragraphe donnerait un document aéré à l'excès.
    if (!marker && !lines[index].trim()) {
      flushItems();
      if (!gapOpen) out.push(React.createElement('span', { key: `gap-${keyBase}-${index}`, className: 'doc-gap', 'aria-hidden': true }));
      gapOpen = true;
      continue;
    }
    gapOpen = false;

    if (!marker) {
      flushItems();
      out.push(...renderLine(bodies[index].text, bodies[index].baremes, `line-${keyBase}-${index}`));
      // '\n' uniquement entre deux lignes de TEXTE : jamais avant/après un
      // item de liste (bloc flex), une formule display (elle occupe déjà sa
      // propre ligne) ou une rangée de barème (bloc à part entière).
      if (markers[index + 1] === null && !headings[index + 1] && bodies[index].baremes.length === 0
        && !hasDisplayMath(lines[index]) && !hasDisplayMath(lines[index + 1])) out.push('\n');
      continue;
    }

    // L'item absorbe les lignes suivantes tant qu'elles ne sont ni vides, ni
    // une nouvelle puce, ni un titre : elles restent DANS sa colonne de contenu.
    const contentIndexes = [index];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() !== '' && !markers[cursor] && !headings[cursor]) {
      contentIndexes.push(cursor);
      cursor += 1;
    }
    // Le préfixe de la puce (« 1. ») est retiré du texte NETTOYÉ : le barème a
    // pu se trouver dans la suite de la ligne.
    const rawLine = lines[index];
    const prefixLength = rawLine.length - marker.content.length;
    const children: React.ReactNode[] = [];
    const currentItemLines: string[] = [];
    contentIndexes.forEach((lineIndex, contentIndex) => {
      if (contentIndex > 0 && !hasDisplayMath(lines[lineIndex - 1]) && !hasDisplayMath(lines[lineIndex])) children.push('\n');
      const text = contentIndex === 0 ? bodies[lineIndex].text.slice(prefixLength) : bodies[lineIndex].text;
      currentItemLines.push(text);
      children.push(...renderLine(text, bodies[lineIndex].baremes, `lib-${keyBase}-${lineIndex}`));
    });
    const itemTextJoined = currentItemLines.join('\n');
    itemTexts.push(itemTextJoined);
    itemCells.push(...renderItemCells(
      marker.number ? `${marker.number}.` : '•',
      children,
      `row-${keyBase}-${index}`,
      !marker.number
    ));
    index = cursor - 1;
  }

  flushItems();

  return out;
}

