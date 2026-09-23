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
 * Le LaTeX *de document* est traduit ici — jamais envoyé à MathJax, qui ne le
 * connaît pas : environnements de liste (\begin{enumerate}, \begin{itemize},
 * \begin{description}), emphases (\textbf, \textit, \emph, \underline),
 * sauts de ligne (\\, \newline, \par), espacements (\smallskip, \bigskip,
 * \vspace, \hspace) et \item orphelins.
 */

/**
 * Convertit les listes LaTeX en lignes que applyTextLayout sait déjà composer.
 * On traite de l'intérieur vers l'extérieur : la première occurrence trouvée est
 * la plus profonde (son corps ne contient plus ni \begin ni \end), donc une
 * liste imbriquée est résolue avant sa liste parente.
 */
function expandLatexLists(source: string): string {
  if (!source.includes('\\begin{enumerate}')
    && !source.includes('\\begin{itemize}')
    && !source.includes('\\begin{description}')) {
    return source;
  }
  const innermost = /\\begin\{(enumerate|itemize|description)\}((?:(?!\\(?:begin|end)\{)[\s\S])*?)\\end\{\1\}/;
  let out = source;
  let previous = '';
  for (let guard = 0; out !== previous && guard < 8; guard += 1) {
    previous = out;
    out = out.replace(innermost, (_match, environment: string, body: string) => {
      // Le chapeau éventuel est le texte qui précède le premier \item : on le
      // repère à sa position, sinon le premier item passerait pour un chapeau.
      const firstItem = body.search(/\\item\b/);
      const lead = firstItem > 0 ? body.slice(0, firstItem).trim() : '';
      const items = (firstItem < 0 ? body : body.slice(firstItem))
        .split(/\\item\b\s*/)
        .map(part => part.trim())
        .filter(Boolean);
      if (items.length === 0) return lead;
      const lines = items.map((item, index) => {
        if (environment === 'itemize') return `- ${item}`;
        if (environment === 'description') {
          const labelled = item.match(/^\[([^\]]*)\]\s*([\s\S]*)$/);
          return labelled ? `- **${labelled[1]}** : ${labelled[2]}` : `- ${item}`;
        }
        return `${index + 1}. ${item}`;
      });
      // Un éventuel chapeau avant le premier \item reste au-dessus de la liste.
      return (lead ? [lead, ...lines] : lines).join('\n');
    });
  }
  return out.trimStart();
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
    // Liste sans environnement : « \item » orphelin rendu en puce.
    .replace(/\\item\s*\[([^\]]*)\]\s*/g, '\n- **$1** : ')
    .replace(/\\item\b\s*/g, '\n- ')
    // Environnement resté ouvert : on garde le texte, pas l'enveloppe.
    .replace(/\\(?:begin|end)\{[^{}]*\}/g, '')
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
  return out.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
}

// Protect formulas before line layout, so math remains inside its list item.
export function renderDescriptionWithBold(text: string | undefined): React.ReactNode[] {
  if (!text) return [];
  const expanded = expandLatexLists(text);
  let prefix = '\uE000';
  while (expanded.includes(prefix)) prefix += '\uE000';
  const formulas: string[] = [];
  const protectedText = splitMathText(expanded).map(part => {
    // Seul le TEXTE reçoit les commandes de mise en page : dans une formule,
    // c'est MathJax qui les interprète (\textbf, \text, \underline…).
    if (!part.math) return expandLatexTextCommands(part.text);
    const index = formulas.push(part.text) - 1;
    return prefix + index + '\uE001';
  }).join('');
  const token = new RegExp(prefix + '(\\d+)\uE001', 'g');
  const restore = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') return node.replace(token, (_, index) => formulas[Number(index)]);
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
      return React.cloneElement(node, {}, React.Children.map(node.props.children, restore));
    }
    return node;
  };
  return applyTextLayout(protectedText, 0).map(restore);
}

/**
 * Listes à puces (- ) et numérotées (1. ) ligne par ligne, puis gras/italique.
 * Les items de liste sont des BLOCS (display:flex) : dans un conteneur
 * `whitespace-pre-wrap`, un '\n' résiduel juste avant un bloc créerait une
 * ligne vide illogique, on ne l'émet donc jamais autour des items de liste.
 */
function applyTextLayout(segment: string, keyBase: number): React.ReactNode[] {
  if (!segment) return [];
  const lines = segment.split('\n');
  const out: React.ReactNode[] = [];

  const isListLine = (line: string) => /^\s*(-|\d+[.)])\s+/.test(line);

  lines.forEach((line, index) => {
    const bullet = line.match(/^(\s*)-\s+(.*)$/);
    const numbered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);

    if (bullet) {
      out.push(
        React.createElement(
          'span',
          { key: `li-${keyBase}-${index}`, className: 'flex gap-1.5 pl-1 whitespace-normal' },
          React.createElement('span', { className: 'select-none text-primary', 'aria-hidden': true }, '•'),
          React.createElement('span', { className: 'min-w-0 flex-1' }, ...applyInlineFormatting(bullet[2], `bullet-${keyBase}-${index}`))
        )
      );
    } else if (numbered) {
      out.push(
        React.createElement(
          'span',
          { key: `ol-${keyBase}-${index}`, className: 'flex gap-1.5 pl-1 whitespace-normal' },
          React.createElement('span', { className: 'select-none font-semibold text-primary' }, `${numbered[2]}.`),
          React.createElement('span', { className: 'min-w-0 flex-1' }, ...applyInlineFormatting(numbered[3], `number-${keyBase}-${index}`))
        )
      );
    } else {
      out.push(...applyInlineFormatting(line, `text-${keyBase}-${index}`));
      // '\n' uniquement entre deux lignes de TEXTE : jamais avant/après un
      // item de liste (le bloc flex crée déjà sa propre ligne).
      const next = lines[index + 1];
      if (next !== undefined && !isListLine(next) && !isListLine(line)) {
        out.push('\n');
      }
    }
  });

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
