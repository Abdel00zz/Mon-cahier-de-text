/**
 * Détection de syntaxe mathématique (LaTeX) dans une saisie : $…$, $$…$$,
 * \(…\), \[…\] et environnements \begin{…}.
 */
export const hasMathSyntax = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  return /\$\$?[^$]+\$\$?|\\\(|\\\[|\\begin\{/.test(value);
};
