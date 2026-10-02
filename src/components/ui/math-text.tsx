import React from 'react';
import { renderKatexHtml } from '@/config/katex';
import { hasMathSyntax, splitMathText } from '@/lib/text/math';

interface MathTextProps {
  children?: React.ReactNode;
  source?: unknown;
  /** Ignoré : conservé le temps que tous les appels historiques disparaissent. */
  cacheKey?: string;
  /** Ignoré : c'est le délimiteur (`$…$` / `$$…$$`) qui décide de l'affichage. */
  inline?: boolean;
}

/** Enfants « simples » : une chaîne peut être recomposée depuis `source`, une
 *  arborescence riche (gras, listes) doit être rendue telle quelle. */
const plainChildren = (children: React.ReactNode): string | null => {
  const nodes = React.Children.toArray(children);
  if (nodes.length === 0) return '';
  let text = '';
  for (const node of nodes) {
    if (typeof node === 'string' || typeof node === 'number') {
      text += String(node);
      continue;
    }
    return null;
  }
  return text;
};

const isDisplay = (formula: string): boolean =>
  formula.startsWith('$$') || formula.startsWith('\\[');

/**
 * Formules rendues par KaTeX : le HTML est produit PENDANT le rendu React
 * (aucune mutation du DOM après coup, aucun typeset en attente). Le texte des
 * descriptions riches passe par `renderDescriptionWithBold`, qui rend lui aussi
 * ses formules en KaTeX.
 */
export const MathText: React.FC<MathTextProps> = React.memo(({ children, source }) => {
  const text = typeof source === 'string' ? source : '';
  if (!text || !hasMathSyntax(text) || plainChildren(children) === null) return <>{children}</>;

  return (
    <>
      {splitMathText(text).map((part, index) => (part.math ? (
        <span
          key={`math-${index}`}
          className="math-text"
          dangerouslySetInnerHTML={{ __html: renderKatexHtml(part.text, isDisplay(part.text)) }}
        />
      ) : (
        <React.Fragment key={`text-${index}`}>{part.text}</React.Fragment>
      )))}
    </>
  );
});

MathText.displayName = 'MathText';
