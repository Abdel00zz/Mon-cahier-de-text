import { toDisplayText } from './textValue';

/**
 * Détection de syntaxe mathématique (LaTeX) dans une saisie : $…$, $$…$$,
 * \(…\), \[…\] et environnements \begin{…}.
 */

/** Vrai dès qu'un segment mathématique est présent (voir splitMathText). */
export const hasMathSyntax = (value: unknown): boolean =>
  splitMathText(value).some(part => part.math);

const MATH_CONTENT_FIELDS = ['title', 'name', 'description', 'content', 'remark'] as const;
const MATH_CHILD_FIELDS = ['lessonsData', 'items', 'sections', 'subsections', 'subsubsections'] as const;

/** Détecte tôt une formule dans un cahier sans sérialiser tout son contenu. */
export const hasMathContent = (value: unknown): boolean => {
  const pending: unknown[] = [value];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== 'object') continue;
    if (visited.has(current)) continue;
    visited.add(current);
    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }
    const record = current as Record<string, unknown>;
    if (MATH_CONTENT_FIELDS.some(field => hasMathSyntax(record[field]))) return true;
    MATH_CHILD_FIELDS.forEach(field => {
      if (record[field] !== undefined) pending.push(record[field]);
    });
  }
  return false;
};

/**
 * Environnements LaTeX de *document* : listes, centrage, citations, tableaux de
 * mise en page. Ce ne sont pas des formules — MathJax ne les connaît pas et
 * répondait « Unknown environment », en laissant le texte brut à l'écran comme
 * sur le papier. Ils restent donc du texte, mis en page par utils/textFormat.
 */
const DOCUMENT_ENVIRONMENTS = new Set([
  'enumerate', 'itemize', 'description', 'list', 'trivlist',
  'center', 'flushleft', 'flushright', 'quote', 'quotation', 'verse',
  'verbatim', 'document', 'figure', 'table', 'tabular',
]);

/** One tokenizer for detection, formatting and search highlighting. */
export function splitMathText(input: unknown): { text: string; math: boolean }[] {
  // Une donnée abîmée (JSON importé, synchro) devient un texte affichable :
  // plus jamais de `matchAll` sur `undefined`.
  const text = toDisplayText(input);
  const pattern = /(?<!\\)(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\\n])*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\\begin\{([^}]+)\}[\s\S]*?\\end\{\2\})/g;
  const parts: { text: string; math: boolean }[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index!;
    const environment = match[2]?.trim().toLowerCase();
    if (start > cursor) parts.push({ text: text.slice(cursor, start), math: false });
    if (environment !== undefined && DOCUMENT_ENVIRONMENTS.has(environment)) {
      // Environnement de document : l'enveloppe n'est pas une formule, mais son
      // corps peut en contenir une ($…$). On le réanalyse au lieu de l'avaler,
      // sinon une liste serait plus jamais typographiée.
      const opening = match[0].slice(0, match[0].indexOf('}') + 1);
      const closing = match[0].slice(match[0].length - environment.length - 6);
      parts.push({ text: opening, math: false });
      parts.push(...splitMathText(match[0].slice(opening.length, match[0].length - closing.length)));
      parts.push({ text: closing, math: false });
    } else {
      parts.push({ text: match[0], math: true });
    }
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), math: false });
  return parts;
}
