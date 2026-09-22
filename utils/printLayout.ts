import type { CSSProperties } from 'react';
import type { PrintPrefs } from './printMeta';

/* Tailles par palier : usage interne au module (aucun écran ne les lit seules). */
const PRINT_TEXT_SIZES = {
  s: { body: '9pt', cell: '8.5pt', description: '8pt', chapter: '11pt' },
  m: { body: '10pt', cell: '9.5pt', description: '9pt', chapter: '12pt' },
  l: { body: '11pt', cell: '10.5pt', description: '10pt', chapter: '13pt' },
} as const;
const SPACINGS = {
  compact: { line: 1.25, cellPad: '1.5pt 4pt', itemGap: '1.5pt' },
  normal: { line: 1.4, cellPad: '3pt 4pt', itemGap: '3pt' },
  aere: { line: 1.6, cellPad: '5pt 5pt', itemGap: '5pt' },
} as const;

export function printLayoutStyle(textSize: PrintPrefs['textSize'], lineSpacing: PrintPrefs['lineSpacing']): CSSProperties {
  const sizes = PRINT_TEXT_SIZES[textSize] ?? PRINT_TEXT_SIZES.m;
  const spacing = SPACINGS[lineSpacing] ?? SPACINGS.normal;
  return Object.fromEntries([
    ...Object.entries(sizes).map(([key, value]) => [`--print-size-${key}`, value]),
    ...Object.entries(spacing).map(([key, value]) => [`--print-spacing-${key}`, value]),
  ]) as CSSProperties;
}
