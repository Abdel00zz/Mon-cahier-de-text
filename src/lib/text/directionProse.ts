import { splitMathText } from './math';

/** Analyse only readable prose, never formatting commands or formula variables.
 * This is a detection view: it never changes the saved source or rendered text. */
export function directionProse(input: unknown): string {
  return splitMathText(input).filter(part => !part.math).map(part => part.text).join(' ')
    .replace(/<\/?[a-z][a-z0-9]*(?=[\s/>])(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi, ' ')
    .replace(/\[\/?(?:color|highlight)(?::[^\]]*)?\]/gi, ' ')
    .replace(/\\(?:begin|end)\s*\{[^}]*\}/g, ' ')
    .replace(/\\(?:textcolor|color|colorbox)\s*\{[^}]*\}/g, ' ')
    .replace(/\\(?:vspace|hspace|bareme)\*?\s*\{[^}]*\}/g, ' ')
    .replace(/\\[a-zA-Z]+\*?/g, ' ')
    .replace(/\[\[[^\]]*\]\]/g, ' ');
}
