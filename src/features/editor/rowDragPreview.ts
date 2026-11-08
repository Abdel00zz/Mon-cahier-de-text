/** A visual copy keeps the actual text, badges and formulas under the pointer.
 * It is inert, has no duplicate IDs, and never participates in table hit tests. */
export function createRowDragPreview(surface: HTMLElement, detail?: string) {
  const ghost = document.createElement('div');
  ghost.className = 'editor-row-drag-ghost editor-reading-table';
  ghost.style.visibility = 'hidden';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('inert', '');
  ghost.setAttribute('dir', surface.dataset.reorderDirection
    ?? surface.closest<HTMLElement>('[data-content-direction]')?.dataset.contentDirection ?? 'auto');
  const content = surface.cloneNode(true) as HTMLElement;
  // The copy lives outside the table's scoped typography. Preserve the few
  // text objects' computed fonts, without measuring every KaTeX descendant.
  // The copied set is what makes the ghost AS CRISP as the source row — never
  // blurrier: font shorthand + line-height, Arabic ligature features, and the
  // OS text smoothing, which do not inherit through document.body.
  const textSelector = '[class*="editor-type-"], .editor-kind-badge';
  const textCopies = content.querySelectorAll<HTMLElement>(textSelector);
  surface.querySelectorAll<HTMLElement>(textSelector).forEach((text, index) => {
    const style = window.getComputedStyle(text);
    const copy = textCopies[index];
    if (!copy) return;
    Object.assign(copy.style, {
      font: style.font,
      color: style.color,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      fontFeatureSettings: style.fontFeatureSettings,
    });
    const smoothing = style.getPropertyValue('-webkit-font-smoothing');
    if (smoothing) copy.style.setProperty('-webkit-font-smoothing', smoothing);
  });
  content.classList.remove('editor-row-content--sortable');
  content.querySelectorAll('[data-reorder-handle]').forEach(handle => handle.remove());
  for (const node of [content, ...content.querySelectorAll<HTMLElement>('*')]) {
    for (const attribute of ['id', 'tabindex', 'contenteditable', 'aria-labelledby', 'aria-describedby']) node.removeAttribute(attribute);
  }
  ghost.append(content);
  if (detail) {
    const date = document.createElement('span');
    date.className = 'editor-row-drag-ghost__detail';
    date.textContent = detail;
    date.setAttribute('dir', 'auto');
    ghost.append(date);
  }
  return ghost;
}
