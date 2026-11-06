import React from 'react';

/*
 * Une ponctuation ne se détache jamais de la formule qui la précède : « …= +∞ ⏎ . » n'existe pas.
 * Une formule en ligne est un bloc insécable que le navigateur peut séparer du caractère suivant (même avec
 * un joint-mot) : le bloc et sa ponctuation sont donc enveloppés ensemble (.doc-nowrap). Les formules
 * affichées n'en reçoivent pas.
 */
const GLUE_AFTER_FORMULA = /^[.,;:!?)\]»…]+/u;
function endsWithFormula(node: React.ReactNode): boolean {
  if (!React.isValidElement<{ children?: React.ReactNode; className?: string; dangerouslySetInnerHTML?: { __html: string } }>(node)) return false;
  const { className, dangerouslySetInnerHTML, children } = node.props;
  if (typeof className === 'string' && className.split(' ').includes('math-text')) return !dangerouslySetInnerHTML?.__html.includes('katex-display');
  const kids = React.Children.toArray(children);
  return kids.length > 0 && endsWithFormula(kids[kids.length - 1]);
}
/**
 * Place la ponctuation DANS le dernier bloc de la formule (dernière boîte `.base` de KaTeX) : le texte reste
 * dans le DOM (copie, lecteurs d'écran) et aucune règle d'enrobage ne peut plus la séparer de la formule.
 * Renvoie null si le dernier élément n'est pas une formule en ligne reconnaissable.
 */
function appendTail(node: React.ReactNode, tail: string): React.ReactNode | null {
  if (!React.isValidElement<{ children?: React.ReactNode; className?: string; dangerouslySetInnerHTML?: { __html: string } }>(node)) return null;
  const { className, dangerouslySetInnerHTML, children } = node.props;
  if (typeof className === 'string' && className.split(' ').includes('math-text')) {
    const html = dangerouslySetInnerHTML?.__html ?? '';
    // Fin d'une sortie KaTeX en ligne : …</span> (base) </span> (katex-html) </span> (katex).
    if (html.includes('katex-display') || !html.endsWith('</span></span></span>')) return null;
    const escaped = tail.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return React.cloneElement(node, { dangerouslySetInnerHTML: { __html: `${html.slice(0, -21)}<span class="katex-tail">${escaped}</span></span></span></span>` } });
  }
  const kids = React.Children.toArray(children);
  if (kids.length === 0) return null;
  const last = appendTail(kids[kids.length - 1], tail);
  return last ? React.cloneElement(node, {}, ...kids.slice(0, -1), last) : null;
}

export function glueAfterFormulas(list: React.ReactNode[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  list.forEach((child, index) => {
    const punctuation = typeof child === 'string' && out.length > 0 ? GLUE_AFTER_FORMULA.exec(child) : null;
    if (typeof child === 'string' && punctuation && endsWithFormula(out[out.length - 1])) {
      const rest = child.slice(punctuation[0].length);
      const tailed = appendTail(out[out.length - 1], punctuation[0]);
      if (tailed) out[out.length - 1] = tailed;
      else out.push(React.createElement('span', { key: `glue-${index}`, className: 'doc-nowrap' }, out.pop(), punctuation[0]));
      if (rest) out.push(rest);
      return;
    }
    out.push(child);
  });
  return out;
}

/** Une formule display occupe sa propre ligne : `$$…$$` ou `\[…\]`. */
export function isDisplayMath(formula: string): boolean {
  return formula.startsWith('$$') || formula.startsWith('\\[');
}

/** Marque portée par un jeton de formule : en ligne ou display. */
export const INLINE_MARK = '\uE001';
export const DISPLAY_MARK = '\uE002';

/**
 * Vrai si la ligne porte une formule display : elle crée déjà sa propre ligne,
 * un saut de ligne de plus ne ferait qu'ajouter une ligne vide (et décalerait
 * le marqueur de l'item au-dessus de la formule).
 */
export function hasDisplayMath(line: string | undefined): boolean {
  return line !== undefined && line.includes(DISPLAY_MARK);
}
