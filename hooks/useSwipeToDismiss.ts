import { useCallback, useEffect, useRef, useState } from 'react';

interface SwipeToDismissOptions {
  onDismiss: () => void;
  enabled?: boolean;
  allowFromBody?: boolean;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  lastY: number;
  lastTime: number;
  height: number;
  captured: boolean;
}

const HANDLE_HEIGHT = 88;
const MIN_DISTANCE = 112;
const VELOCITY_TO_DISMISS = 0.75;

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, input, textarea, select, a, [role="button"], [contenteditable="true"], [data-swipe-dismiss-ignore]'));
};

/**
 * Makes a bottom sheet feel native without stealing the scroll gesture. The
 * optional body gesture activates only at the top of the scroll region and
 * only once a downward intent is detected.
 */
export const useSwipeToDismiss = ({ onDismiss, enabled = true, allowFromBody = false }: SwipeToDismissOptions) => {
  const drag = useRef<DragState | null>(null);
  const dismissRef = useRef(onDismiss);
  const settleTimer = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  dismissRef.current = onDismiss;

  useEffect(() => () => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
  }, []);

  const finishSettling = useCallback(() => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      setIsSettling(false);
      settleTimer.current = null;
    }, 180);
  }, []);

  const reset = useCallback(() => {
    drag.current = null;
    setIsDragging(false);
    setIsSettling(true);
    window.requestAnimationFrame(() => setOffset(0));
    finishSettling();
  }, [finishSettling]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType !== 'touch' || !event.isPrimary || isInteractiveTarget(event.target)) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const target = event.target instanceof Element ? event.target : null;
    const startsFromHandle = event.clientY - bounds.top <= HANDLE_HEIGHT
      || Boolean(target?.closest('[data-swipe-dismiss-handle], .modal-header'));
    if (!startsFromHandle && !allowFromBody) return;

    const scrollRegion = target?.closest<HTMLElement>('[data-swipe-scroll-region]');
    if (!startsFromHandle && scrollRegion && scrollRegion.scrollTop > 0) return;

    // La poignée est capturée immédiatement. Depuis le contenu, on attend de
    // connaître la direction afin de laisser intact le défilement vers le haut.
    if (startsFromHandle) {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      height: bounds.height,
      captured: startsFromHandle,
    };
  }, [allowFromBody, enabled]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - current.startY;
    const deltaX = event.clientX - current.startX;
    if (deltaY <= 0 || deltaY < Math.abs(deltaX)) return;

    event.preventDefault();
    if (!current.captured) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      current.captured = true;
    }
    setIsSettling(false);
    setIsDragging(true);
    setOffset(Math.min(deltaY, current.height * 0.75));
    current.lastY = event.clientY;
    current.lastTime = performance.now();
  }, []);

  const onPointerEnd = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;

    const distance = Math.max(0, event.clientY - current.startY);
    const elapsed = Math.max(1, performance.now() - current.lastTime);
    const velocity = Math.max(0, event.clientY - current.lastY) / elapsed;
    const shouldDismiss = distance >= Math.min(MIN_DISTANCE, current.height * 0.24)
      || (distance >= 28 && velocity >= VELOCITY_TO_DISMISS);

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    if (shouldDismiss) {
      drag.current = null;
      setOffset(0);
      setIsDragging(false);
      dismissRef.current();
      return;
    }

    reset();
  }, [reset]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    isDragging: isDragging || isSettling,
    dragStyle: isDragging || isSettling
      ? {
          transform: `translate3d(0, ${offset}px, 0)`,
          transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        }
      : undefined,
  };
};
