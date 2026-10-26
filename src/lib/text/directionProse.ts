import { splitMathText } from './math.js';

/** Analyse only readable prose, never formatting commands, list markers or formula variables.
 * This is a detection view: it never changes the saved source or rendered text. */
export function directionProse(input: unknown): string {
  return splitMathText(input).filter(part => !part.math).map(part => part.text).join(' ')
    .replace(/<\/?[a-z][a-z0-9]*(?=[\s/>])(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi, ' ')
    .replace(/\[\/?(?:color|highlight)(?::[^\]]*)?\]/gi, ' ')
    .replace(/\\(?:begin|end)\s*\{[^}]*\}/g, ' ')
    .replace(/\\(?:textcolor|color|colorbox)\s*\{[^}]*\}/g, ' ')
    .replace(/\\(?:vspace|hspace|bareme)\*?\s*\{[^}]*\}/g, ' ')
    .replace(/\\item\b[ \t]*(?:\[[^\]]*\])?/g, ' ')
    .replace(/\\[a-zA-Z]+\*?/g, ' ')
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/(?:^|\n)[ \t]*(?:#{1,3}[ \t]+)?(?:(?:\([a-zA-Z0-9\u0660-\u0669\u06F0-\u06F9]{1,4}\)|(?:[a-zA-Z]{1,2}|[ivxlcdmIVXLCDM]{1,4}|[0-9\u0660-\u0669\u06F0-\u06F9]+)[.):\-])[ \t]+)+/gm, '\n');
}
