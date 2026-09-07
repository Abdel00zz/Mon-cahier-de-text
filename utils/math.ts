/**
 * Détection de syntaxe mathématique (LaTeX) dans une saisie : $…$, $$…$$,
 * \(…\), \[…\] et environnements \begin{…}.
 */
export const hasMathSyntax = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  return splitMathText(value).some(part => part.math);
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
