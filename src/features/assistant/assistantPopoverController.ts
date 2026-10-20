/** Fermeture sans piéger le focus ni le défilement : les clics extérieurs gardent leur action normale. */
export function attachAssistantDismiss(root: HTMLElement, panel: HTMLElement | null, close: (restoreFocus?: boolean) => void): () => void {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const capture = { capture: true };
  const outside = (event: Event) => {
    if (event.target && !root.contains(event.target as Node)) close();
  };
  const back = (event: Event) => {
    if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close(true);
  };
  panel?.focus({ preventScroll: true });
  doc.addEventListener('pointerdown', outside, capture);
  doc.addEventListener('focusin', outside);
  doc.addEventListener('keydown', back, capture);
  view?.addEventListener('native-back', back, capture);
  return () => {
    doc.removeEventListener('pointerdown', outside, capture);
    doc.removeEventListener('focusin', outside);
    doc.removeEventListener('keydown', back, capture);
    view?.removeEventListener('native-back', back, capture);
  };
}
