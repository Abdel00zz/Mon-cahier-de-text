import { clamp } from 'es-toolkit';

interface Box { left: number; top: number; width: number; height: number }

/** The flow host stays untransformed, so repeated measurements never accumulate offsets. */
export const assistantPushOffset = (panelBottom: number, flowTop: number, side: string): number =>
  side === 'below' ? Math.max(0, Math.ceil(panelBottom - flowTop + 12)) : 0;

/** Physical coordinates also cover RTL, pinch zoom and the Android visual viewport. */
export function assistantPlacement(anchor: Box, panel: Pick<Box, 'width' | 'height'>, viewport: Box, rtl: boolean) {
  const margin = 12;
  const gap = 8;
  const width = Math.min(panel.width, Math.max(0, viewport.width - margin * 2));
  const minX = viewport.left + margin;
  const maxX = Math.max(minX, viewport.left + viewport.width - margin - width);
  const desiredX = rtl ? anchor.left : anchor.left + anchor.width - width;
  const below = viewport.top + viewport.height - margin - (anchor.top + anchor.height + gap);
  const above = anchor.top - gap - viewport.top - margin;
  const side = below < Math.min(panel.height, 200) && above > below ? 'above' : 'below';
  const maxHeight = Math.max(0, Math.min(400, viewport.height - margin * 2, side === 'above' ? above : below));
  const height = Math.min(panel.height, maxHeight);
  const desiredY = side === 'above' ? anchor.top - gap - height : anchor.top + anchor.height + gap;
  const y = clamp(desiredY, viewport.top + margin, Math.max(viewport.top + margin, viewport.top + viewport.height - margin - height));
  return { left: clamp(desiredX, minX, maxX) - anchor.left, top: y - anchor.top, maxHeight, maxWidth: Math.max(0, viewport.width - margin * 2), side };
}

/** Observes only while open; event bursts share one frame, without React renders. */
export function attachAssistantPlacement(anchor: HTMLElement, panel: HTMLElement): () => void {
  const view = anchor.ownerDocument.defaultView;
  if (!view) return () => {};
  const flow = anchor.closest?.('[data-dashboard-main]')?.querySelector<HTMLElement>('[data-assistant-flow]');
  let frame: number | undefined;
  const update = () => {
    frame = undefined;
    const viewport = view.visualViewport;
    const style = view.getComputedStyle?.(anchor);
    const inset = (edge: string) => Math.max(0, Number.parseFloat(style?.getPropertyValue(`--assistant-safe-${edge}`) ?? '') || 0);
    const left = inset('left'), right = inset('right'), top = inset('top'), bottom = inset('bottom');
    // Layout dimensions ignore the short reveal transform and avoid placement jitter.
    const anchorBox = anchor.getBoundingClientRect();
    const position = assistantPlacement(anchorBox, { width: panel.offsetWidth, height: panel.offsetHeight }, {
      left: (viewport?.offsetLeft ?? 0) + left, top: (viewport?.offsetTop ?? 0) + top,
      width: Math.max(0, (viewport?.width ?? view.innerWidth) - left - right),
      height: Math.max(0, (viewport?.height ?? view.innerHeight) - top - bottom),
    }, anchor.dir === 'rtl');
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
    panel.style.maxHeight = `${position.maxHeight}px`;
    panel.style.maxWidth = `${position.maxWidth}px`;
    panel.dataset.placement = position.side;
    if (flow) {
      const bottom = anchorBox.top + position.top + Math.min(panel.offsetHeight, position.maxHeight);
      flow.style.setProperty('--assistant-push-offset', `${assistantPushOffset(bottom, flow.getBoundingClientRect().top, position.side)}px`);
    }
  };
  const schedule = () => { frame ??= view.requestAnimationFrame(update); };
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : undefined;
  observer?.observe(panel);
  observer?.observe(anchor);
  if (flow) observer?.observe(flow);
  const options = { passive: true, capture: true };
  view.addEventListener('scroll', schedule, options);
  view.addEventListener('resize', schedule, options);
  view.visualViewport?.addEventListener('resize', schedule, options);
  view.visualViewport?.addEventListener('scroll', schedule, options);
  update();
  return () => {
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    observer?.disconnect();
    view.removeEventListener('scroll', schedule, options);
    view.removeEventListener('resize', schedule, options);
    view.visualViewport?.removeEventListener('resize', schedule, options);
    view.visualViewport?.removeEventListener('scroll', schedule, options);
    panel.style.removeProperty('left');
    panel.style.removeProperty('top');
    panel.style.removeProperty('max-height');
    panel.style.removeProperty('max-width');
    flow?.style.removeProperty('--assistant-push-offset');
    delete panel.dataset.placement;
  };
}
