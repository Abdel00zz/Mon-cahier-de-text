import { useCallback, useEffect, useRef, type PointerEvent, type MouseEvent } from 'react';
import { sheetReleaseAction, sheetReleaseVelocity, type SheetPointerSample } from '@/utils/sheetGesture';

interface SwipeToDismissOptions {
  onDismiss: () => void;
  enabled?: boolean;
  allowFromBody?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  canExpand?: boolean;
  canCollapse?: boolean;
}
interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  height: number;
  captured: boolean;
  fromHandle: boolean;
  samples: SheetPointerSample[];
}

/** Only the sheet's transform is written during a drag, at most once per frame. */
export const useSwipeToDismiss = (options: SwipeToDismissOptions) => {
  const latest = useRef(options);
  latest.current = options;
  const drag = useRef<DragState | null>(null);
  const surface = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const offset = useRef(0);
  const suppressClick = useRef(false);

  const clearWork = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) window.clearTimeout(timer.current);
    frame.current = null;
    timer.current = null;
  }, []);

  const clearVisuals = useCallback(() => {
    const node = surface.current;
    if (!node) return;
    delete node.dataset.dragState;
    node.style.removeProperty('--sheet-drag-y');
    node.style.removeProperty('--sheet-release-y');
  }, []);

  const releasePointer = useCallback(() => {
    const pointerId = drag.current?.pointerId;
    drag.current = null;
    if (pointerId !== undefined && surface.current?.hasPointerCapture(pointerId)) surface.current.releasePointerCapture(pointerId);
  }, []);

  const reset = useCallback(() => {
    clearWork();
    releasePointer();
    clearVisuals();
    offset.current = 0;
  }, [clearWork, clearVisuals, releasePointer]);

  useEffect(() => {
    if (!options.enabled) reset();
    return reset;
  }, [options.enabled, reset]);

  const settle = useCallback(() => {
    clearWork();
    releasePointer();
    const node = surface.current;
    if (!node) return;
    node.dataset.dragState = 'settling';
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      node.style.setProperty('--sheet-drag-y', '0px');
      offset.current = 0;
      timer.current = window.setTimeout(() => { clearVisuals(); timer.current = null; }, 240);
    });
  }, [clearWork, clearVisuals, releasePointer]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const { enabled = true, allowFromBody = false } = latest.current;
    if (!enabled || !event.isPrimary || event.button !== 0) return;
    // A new tap must never inherit suppression from a previous dismissed sheet.
    suppressClick.current = false;
    const target = event.target instanceof Element ? event.target : null;
    const handle = target?.closest('[data-swipe-dismiss-handle]');
    if (!handle && target?.closest('button, input, textarea, select, a, [role="button"], [contenteditable="true"], [data-swipe-dismiss-ignore]')) return;
    const fromHandle = Boolean(handle || target?.closest('.modal-header'));
    if ((!fromHandle && !allowFromBody) || (event.pointerType === 'mouse' && !handle)) return;
    // A scrollable child owns its gesture as soon as it has been scrolled.
    for (let ancestor = target; !fromHandle && ancestor && ancestor !== event.currentTarget; ancestor = ancestor.parentElement) {
      if (ancestor.scrollTop > 0) return;
    }
    clearWork();
    clearVisuals();
    surface.current = event.currentTarget;
    offset.current = 0;
    drag.current = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      height: event.currentTarget.getBoundingClientRect().height,
      captured: false, fromHandle,
      samples: [{ y: event.clientY, time: performance.now() }],
    };
  }, [clearWork, clearVisuals]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaY = event.clientY - current.startY;
    const deltaX = event.clientX - current.startX;
    if (!current.captured) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
      if (Math.abs(deltaX) > Math.abs(deltaY) || (!current.fromHandle && deltaY < 0)) { reset(); return; }
      event.currentTarget.setPointerCapture(event.pointerId);
      current.captured = true;
      suppressClick.current = true;
      event.currentTarget.dataset.dragState = 'dragging';
    }
    event.preventDefault();
    const now = performance.now();
    current.samples = current.samples.filter(sample => now - sample.time <= 100);
    current.samples.push({ y: event.clientY, time: now });
    offset.current = deltaY < 0
      ? -Math.min(Math.abs(deltaY) * .24, 48)
      : Math.min(deltaY, current.height * .8);
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      surface.current?.style.setProperty('--sheet-drag-y', `${offset.current}px`);
    });
  }, [reset]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.captured) { reset(); return; }
    const { canExpand = false, canCollapse = false, onExpand, onCollapse, onDismiss } = latest.current;
    const action = sheetReleaseAction({
      distance: event.clientY - current.startY,
      velocity: sheetReleaseVelocity(current.samples, { y: event.clientY, time: performance.now() }),
      height: current.height, fromHandle: current.fromHandle, canExpand, canCollapse,
    });
    // Keep the live offset for the CSS exit animation; a guarded dismissal
    // still returns smoothly to its resting position if the owner stays open.
    surface.current?.style.setProperty('--sheet-release-y', `${offset.current}px`);
    settle();
    if (action === 'expand') onExpand?.();
    else if (action === 'collapse') onCollapse?.();
    else if (action === 'dismiss') onDismiss();
  }, [reset, settle]);

  const onPointerCancel = useCallback((event: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId === event.pointerId) settle();
  }, [settle]);

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current || event.detail === 0) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture };
};
