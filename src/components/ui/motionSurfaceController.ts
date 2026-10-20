const FRAME_MS = 1000 / 60;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Lerp à 0,1 par image à 60 Hz, corrigé du temps pour garder la même réponse à 120 Hz. */
export function motionLerp(current: number, target: number, elapsedMs: number): number {
  const alpha = 1 - Math.pow(0.9, Math.max(0, Math.min(elapsedMs, 64)) / FRAME_MS);
  return current + (target - current) * alpha;
}

/** Un contrôleur par surface : aucun état React ni mesure de layout dans les listeners. */
export function attachMotionSurface(root: HTMLElement | SVGElement, layer: HTMLElement | SVGElement, travelPx = 5): () => void {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!view) return () => {};
  const travel = Number.isFinite(travelPx) ? Math.max(0, Math.min(travelPx, 12)) : 5;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = view.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  let visible = false;
  let disposed = false;
  let frame: number | null = null;
  let previousTime: number | null = null;
  let rect: DOMRectReadOnly | null = null;
  let geometryDirty = true;
  let pointer: { x: number; y: number } | null = null;
  let x = 0;
  let y = 0;

  const enabled = () => !disposed && visible && !doc.hidden && !reduced.matches && travel > 0;
  const stop = () => {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
    pointer = null;
    x = y = 0;
    layer.style.removeProperty('transform');
    layer.style.removeProperty('will-change');
  };

  const step = (time: number) => {
    frame = null;
    if (!enabled()) return;
    // Toutes les lectures précèdent les écritures. La boîte mesurée ne bouge pas :
    // seule sa couche enfant est transformée, donc aucun effet de poursuite instable.
    if (geometryDirty || !rect) {
      rect = root.getBoundingClientRect();
      geometryDirty = false;
    }
    const targetX = pointer && rect.width > 0
      ? clamp((pointer.x - rect.left) / rect.width * 2 - 1, 1) * travel : 0;
    const targetY = pointer && rect.height > 0
      ? clamp((pointer.y - rect.top) / rect.height * 2 - 1, 1) * travel
      : clamp((view.innerHeight / 2 - rect.top - rect.height / 2) / Math.max(1, view.innerHeight / 2 + rect.height / 2), 1) * travel * 0.65;
    const elapsed = previousTime === null ? FRAME_MS : time - previousTime;
    previousTime = time;
    x = motionLerp(x, targetX, elapsed);
    y = motionLerp(y, targetY, elapsed);
    const settled = Math.abs(targetX - x) < 0.01 && Math.abs(targetY - y) < 0.01;
    if (settled) { x = targetX; y = targetY; }
    layer.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) rotate(${(x * 0.12).toFixed(3)}deg)`;
    if (settled) {
      previousTime = null;
      layer.style.removeProperty('will-change');
    } else frame = view.requestAnimationFrame(step);
  };

  const request = () => {
    if (!enabled() || frame !== null) return;
    layer.style.willChange = 'transform';
    frame = view.requestAnimationFrame(step);
  };
  const sync = () => {
    root.dataset.motion = enabled() ? 'on' : 'off';
    if (!enabled()) stop();
    else { geometryDirty = true; request(); }
  };
  const move = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent;
    if (!enabled() || !fine.matches || event.pointerType === 'touch') return;
    if (!pointer) geometryDirty = true;
    pointer = { x: event.clientX, y: event.clientY };
    request();
  };
  const leave = () => { pointer = null; request(); };
  const scroll = () => { geometryDirty = true; request(); };
  const resize = () => { geometryDirty = true; request(); };
  const inputChanged = () => { pointer = null; sync(); };

  const intersection = typeof view.IntersectionObserver === 'undefined' ? null : new view.IntersectionObserver(entries => {
    if (disposed) return;
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  });
  const sizeObserver = typeof view.ResizeObserver === 'undefined' ? null : new view.ResizeObserver(resize);
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerleave', leave, { passive: true });
  root.addEventListener('pointercancel', leave, { passive: true });
  // Le mode capture couvre aussi les zones défilantes des modales, sans bloquer le toucher.
  view.addEventListener('scroll', scroll, { passive: true, capture: true });
  view.addEventListener('resize', resize, { passive: true });
  doc.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  fine.addEventListener('change', inputChanged);
  sizeObserver?.observe(root);
  if (intersection) intersection.observe(root);
  else visible = true;
  sync();

  return () => {
    disposed = true;
    stop();
    root.dataset.motion = 'off';
    intersection?.disconnect();
    sizeObserver?.disconnect();
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('pointercancel', leave);
    view.removeEventListener('scroll', scroll, true);
    view.removeEventListener('resize', resize);
    doc.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    fine.removeEventListener('change', inputChanged);
  };
}
