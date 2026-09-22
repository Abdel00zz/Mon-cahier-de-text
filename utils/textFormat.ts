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
 * \frac, \array, \begin{cases}, matrices, etc., voir README).
 */

// Protect formulas before line layout, so math remains inside its list item.
export function renderDescriptionWithBold(text: string | undefined): React.ReactNode[] {
  if (!text) return [];
  let prefix = '\uE000';
  while (text.includes(prefix)) prefix += '\uE000';
  const formulas: string[] = [];
  const protectedText = splitMathText(text).map(part => {
    if (!part.math) return part.text;
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
