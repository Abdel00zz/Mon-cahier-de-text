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
export function renderDescriptionWithBold(text: string): React.ReactNode[] {
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

const INLINE_MARKERS = ['***', '**', '++', '*'] as const;

function applyInlineFormatting(segment: string, keyBase: string): React.ReactNode[] {
  if (!segment) return [];
  const out: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < segment.length) {
    let openingIndex = -1;
    let marker: typeof INLINE_MARKERS[number] | null = null;
    INLINE_MARKERS.forEach(candidate => {
      const index = segment.indexOf(candidate, cursor);
      if (index < 0) return;
      if (openingIndex < 0 || index < openingIndex || (index === openingIndex && candidate.length > (marker?.length ?? 0))) {
        openingIndex = index;
        marker = candidate;
      }
    });

    if (openingIndex < 0 || !marker) {
      out.push(segment.slice(cursor));
      break;
    }

    const closingIndex = segment.indexOf(marker, openingIndex + marker.length);
    if (closingIndex < 0) {
      out.push(segment.slice(cursor));
      break;
    }

    if (openingIndex > cursor) out.push(segment.slice(cursor, openingIndex));
    const inner = segment.slice(openingIndex + marker.length, closingIndex);
    const children = applyInlineFormatting(inner, `${keyBase}-${openingIndex}`);
    const key = `${keyBase}-${openingIndex}-${closingIndex}`;

    if (marker === '***') {
      out.push(React.createElement('strong', { key }, React.createElement('em', null, ...children)));
    } else if (marker === '**') {
      out.push(React.createElement('strong', { key }, ...children));
    } else if (marker === '++') {
      out.push(React.createElement('u', { key, className: 'decoration-current underline-offset-2' }, ...children));
    } else {
      out.push(React.createElement('em', { key }, ...children));
    }
    cursor = closingIndex + marker.length;
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
