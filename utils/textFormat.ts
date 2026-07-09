import React from 'react';

/*
 * Moteur de mise en page des descriptions — hors segments mathématiques :
 *   **gras**                       → <strong>
 *   *italique*                     → <em>
 *   « - texte » en début de ligne  → puce (équivalent \itemize)
 *   « 1. texte » en début de ligne → liste numérotée (équivalent \enumerate)
 * Les segments $...$ / $$...$$ sont transmis intacts à MathJax (qui gère
 * \frac, \array, \begin{cases}, matrices, etc. — voir README).
 */

// Split into math vs normal segments, then apply text formatting on normal parts only.
export function renderDescriptionWithBold(text: string): React.ReactNode[] {
  if (!text) return [];
  const nodes: React.ReactNode[] = [];
  // Match $$...$$ (multiline) or $...$ (single line)
  const regex = /(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [seg] = match;
    const start = match.index;
    const end = start + seg.length;

    // Non-math segment before
    if (start > lastIndex) {
      nodes.push(...applyTextLayout(text.slice(lastIndex, start), start));
    }
    // Math segment as-is
    nodes.push(seg);
    lastIndex = end;
  }

  // Trailing non-math
  if (lastIndex < text.length) {
    nodes.push(...applyTextLayout(text.slice(lastIndex), lastIndex));
  }

  return nodes;
}

/**
 * Listes à puces (- ) et numérotées (1. ) ligne par ligne, puis gras/italique.
 * Les items de liste sont des BLOCS (display:flex) : dans un conteneur
 * `whitespace-pre-wrap`, un '\n' résiduel juste avant un bloc créerait une
 * ligne vide illogique — on ne l'émet donc jamais autour des items de liste.
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
          { key: `li-${keyBase}-${index}`, className: 'flex gap-1.5 pl-2 whitespace-normal' },
          React.createElement('span', { className: 'select-none text-primary', 'aria-hidden': true }, '•'),
          React.createElement('span', { className: 'min-w-0 flex-1' }, ...applyBold(bullet[2]))
        )
      );
    } else if (numbered) {
      out.push(
        React.createElement(
          'span',
          { key: `ol-${keyBase}-${index}`, className: 'flex gap-1.5 pl-2 whitespace-normal' },
          React.createElement('span', { className: 'select-none font-semibold text-primary' }, `${numbered[2]}.`),
          React.createElement('span', { className: 'min-w-0 flex-1' }, ...applyBold(numbered[3]))
        )
      );
    } else {
      out.push(...applyBold(line));
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

function applyBold(segment: string): React.ReactNode[] {
  if (!segment) return [];
  const out: React.ReactNode[] = [];
  // **gras** puis *italique* (le gras est capturé en premier)
  const regexInline = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regexInline.exec(segment)) !== null) {
    const start = m.index;
    if (start > last) out.push(segment.slice(last, start));
    if (m[1] !== undefined) {
      out.push(React.createElement('strong', { key: `b-${start}-${regexInline.lastIndex}` }, m[1]));
    } else {
      out.push(React.createElement('em', { key: `i-${start}-${regexInline.lastIndex}` }, m[2]));
    }
    last = regexInline.lastIndex;
  }
  if (last < segment.length) out.push(segment.slice(last));
  return out;
}
