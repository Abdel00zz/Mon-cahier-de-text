/**
 * Détection de syntaxe mathématique (LaTeX) dans une saisie : $…$, $$…$$,
 * \(…\), \[…\] et environnements \begin{…}.
 */
export const hasMathSyntax = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  return splitMathText(value).some(part => part.math);
};

const MATH_CONTENT_FIELDS = ['title', 'name', 'description', 'content', 'remark'] as const;
const MATH_CHILD_FIELDS = ['lessonsData', 'items', 'sections', 'subsections', 'subsubsections', 'separatorAfter'] as const;

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

/** One tokenizer for detection, formatting and search highlighting. */
export function splitMathText(text: string): { text: string; math: boolean }[] {
  const pattern = /(?<!\\)(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\\n])*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\\begin\{([^}]+)\}[\s\S]*?\\end\{\2\})/g;
  const parts: { text: string; math: boolean }[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index!;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), math: false });
    parts.push({ text: match[0], math: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), math: false });
  return parts;
}
