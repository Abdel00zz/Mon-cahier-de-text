/** The print surface has its physical paper width before opening the dialog.
 * Scale only display formulae that exceed it; surrounding text keeps its size. */
export function fitDocumentMath(root: HTMLElement): void {
  for (const display of root.querySelectorAll<HTMLElement>('.katex-display')) {
    const formula = display.querySelector<HTMLElement>('.katex');
    if (!formula) continue;
    const available = display.clientWidth;
    const width = Math.max(formula.scrollWidth, formula.getBoundingClientRect().width);
    // Un rapport en em, pas des pixels : la feuille est agrandie à la largeur du papier, la formule suit.
    if (available > 0 && width > available) display.style.fontSize = `${Number((available / width * 0.99).toFixed(4))}em`;
  }
}
