/** The print surface has its physical paper width before opening the dialog.
 * Scale only display formulae that exceed it; surrounding text keeps its size. */
export function fitDocumentMath(root: HTMLElement): void {
  for (const display of root.querySelectorAll<HTMLElement>('.katex-display')) {
    const formula = display.querySelector<HTMLElement>('.katex');
    if (!formula) continue;
    const available = display.clientWidth;
    const width = Math.max(formula.scrollWidth, formula.getBoundingClientRect().width);
    const fontSize = Number.parseFloat(window.getComputedStyle(display).fontSize);
    if (available > 0 && width > available && Number.isFinite(fontSize)) {
      display.style.fontSize = `${fontSize * available / width * 0.99}px`;
    }
  }
}
