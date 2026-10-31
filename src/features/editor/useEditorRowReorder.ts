import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent, MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { clamp } from 'es-toolkit';

type Side = 'before' | 'after';
type Reorder = (sourceKey: string, targetKey: string, side: Side) => boolean;
type CanReorder = (sourceKey: string, targetKey: string, side: Side) => boolean;
interface ReorderMessages {
  started: string; moved: string; cancelled: string;
  before?: string; after?: string; inside?: string; choose?: string; unavailable?: string; cancel?: string;
}
interface DragState {
  source: HTMLElement;
  sourceKey: string;
  ghost: HTMLElement | null;
  target?: HTMLElement;
  targetKey?: string;
  side?: Side;
}

const rows = (root: HTMLElement | null) =>
  Array.from(root?.querySelectorAll<HTMLElement>('[data-editor-sort-row]') ?? []);

/** One animation frame owns pointer feedback and edge scrolling. React only
 * renders when the gesture starts/ends or the notebook order changes. */
export function useEditorRowReorder(
  rootRef: React.RefObject<HTMLDivElement | null>,
  itemKeys: readonly (string | number)[],
  messages: ReorderMessages,
  onReorder?: Reorder,
  canReorder?: CanReorder,
) {
  const drag = useRef<DragState | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const beforeRects = useRef<Map<string, DOMRect> | null>(null);
  const focusId = useRef<string | null>(null);
  const keyboardMove = useRef(false);
  const ignoreClickUntil = useRef(0);
  const placePicked = useRef<((x: number, y: number) => void) | null>(null);
  const callbacks = useRef({ onReorder, canReorder, messages });
  callbacks.current = { onReorder, canReorder, messages };
  const [announcement, setAnnouncement] = useState({ text: '', sequence: 0 });
  const announce = useCallback((text: string) => setAnnouncement(previous => ({ text, sequence: previous.sequence + 1 })), []);

  const captureRects = useCallback(() => {
    beforeRects.current = new Map(rows(rootRef.current).map(row => [row.dataset.editorSortId ?? '', row.getBoundingClientRect()]));
  }, [rootRef]);

  useEffect(() => () => { cleanup.current?.(); }, []);
  // Search/document replacement cancels a gesture whose source disappears.
  const orderVersion = itemKeys.join('|');
  useEffect(() => { cleanup.current?.(); }, [orderVersion, Boolean(onReorder)]);

  useLayoutEffect(() => {
    const old = beforeRects.current;
    if (!old) return;
    beforeRects.current = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const row of rows(rootRef.current)) {
      const id = row.dataset.editorSortId ?? '';
      const previous = old.get(id);
      if (previous && !reduce) {
        const delta = previous.top - row.getBoundingClientRect().top;
        if (Math.abs(delta) > 1) row.animate([
          { transform: `translate3d(0, ${delta}px, 0)` },
          { transform: 'translate3d(0, 0, 0)' },
        ], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      if (id === focusId.current) {
        row.querySelector<HTMLElement>('[data-reorder-handle]')?.focus({ preventScroll: true });
        if (keyboardMove.current) row.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        focusId.current = null;
      }
    }
  }, [itemKeys, rootRef]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement> | ReactTouchEvent<HTMLElement>) => {
    ignoreClickUntil.current = 0;
    const touchEvent = 'touches' in event ? event : null;
    // Touch events provide a cancellable drag sensor on the handle only.
    if ('pointerType' in event && event.pointerType === 'touch') return;
    if (!callbacks.current.onReorder || !callbacks.current.canReorder || drag.current
      || ('button' in event && (event.button !== 0 || !event.isPrimary))
      || (touchEvent && touchEvent.touches.length !== 1)) return;
    const target = event.target as Element;
    const handle = target.closest<HTMLElement>('[data-reorder-handle]');
    if (!handle) return;
    const surface = handle.closest<HTMLElement>('.editor-row-content--sortable');
    const source = surface?.closest<HTMLElement>('[data-editor-sort-row]');
    const sourceKey = source?.dataset.editorSortKey;
    if (!source || !surface || !sourceKey || !rootRef.current?.contains(source)) return;
    const touchPoint = touchEvent?.touches[0];
    const pointer = 'pointerId' in event ? event : null;
    const pointerId = touchPoint?.identifier ?? pointer!.pointerId;
    const startX = touchPoint?.clientX ?? pointer!.clientX;
    const startY = touchPoint?.clientY ?? pointer!.clientY;
    const touch = Boolean(touchPoint);
    if (!touch) { event.preventDefault(); handle.focus({ preventScroll: true }); }
    // The table stays mounted while a virtualized source row scrolls away.
    const captureElement = rootRef.current;
    keyboardMove.current = false;
    let x = startX;
    let y = startY;
    let frame = 0;
    let previousTime = 0;
    let ended = false;
    let picked = false;
    const current: DragState = { source, sourceKey, ghost: null };
    drag.current = current;
    source.setAttribute('data-editor-pressing', 'true');

    const clearTarget = () => {
      current.target?.removeAttribute('data-editor-drop-side');
      current.target?.removeAttribute('data-editor-drop-inside');
      current.target = undefined;
      current.targetKey = undefined;
      current.side = undefined;
    };
    const viewport = () => {
      const vv = window.visualViewport;
      return { left: vv?.offsetLeft ?? 0, top: vv?.offsetTop ?? 0,
        width: vv?.width ?? window.innerWidth, height: vv?.height ?? window.innerHeight };
    };
    const updateTarget = () => {
      const table = rootRef.current?.getBoundingClientRect();
      // Small gaps between rows and a drifting finger should not lose the drop.
      // Stay inside the table: never snap through a toolbar or outside the notebook.
      let candidate = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-editor-sort-row]');
      if (!candidate && table && x >= table.left && x <= table.right && y >= table.top - 12 && y <= table.bottom + 12) {
        let nearest = 13;
        for (const row of rows(rootRef.current)) {
          const rect = row.getBoundingClientRect();
          const distance = Math.max(rect.top - y, y - rect.bottom, 0);
          if (distance < nearest) { candidate = row; nearest = distance; }
        }
      }
      const rect = candidate?.getBoundingClientRect();
      const canDropBeforeChapter = source.dataset.editorSortRoot === 'true' && candidate?.dataset.editorSortChapter === 'true';
      let inside = source.dataset.editorSortTransfer === 'true' && candidate?.dataset.editorSortContainer === 'true'
        && !(canDropBeforeChapter && rect && y < rect.top + rect.height * 0.35);
      let side: Side = !inside && rect && y < rect.top + rect.height / 2 ? 'before' : 'after';
      let key = side === 'after' ? candidate?.dataset.editorSortLastKey ?? candidate?.dataset.editorSortKey : candidate?.dataset.editorSortKey;
      if (canDropBeforeChapter && candidate && key && key !== sourceKey && !callbacks.current.canReorder?.(sourceKey, key, side)) {
        const alternateSide: Side = side === 'after' ? 'before' : 'after';
        const alternateKey = alternateSide === 'after' ? candidate.dataset.editorSortLastKey ?? candidate.dataset.editorSortKey : candidate.dataset.editorSortKey;
        if (alternateKey && callbacks.current.canReorder?.(sourceKey, alternateKey, alternateSide)) {
          side = alternateSide;
          key = alternateKey;
          inside = alternateSide === 'after';
        }
      }
      if (candidate === current.target && side === current.side) return;
      clearTarget();
      const allowed = candidate && key && key !== sourceKey && rootRef.current?.contains(candidate)
        && callbacks.current.canReorder?.(sourceKey, key, side);
      if (allowed && candidate) {
        candidate.setAttribute('data-editor-drop-side', side);
        if (inside) candidate.setAttribute('data-editor-drop-inside', 'true');
        current.target = candidate;
        current.targetKey = key;
        current.side = side;
      }
      if (current.ghost) current.ghost.dataset.valid = allowed ? 'true' : 'false';
    };
    const schedule = () => {
      if (!ended && current.ghost && !frame) frame = window.requestAnimationFrame(tick);
    };
    const tick = (time: number) => {
      frame = 0;
      if (ended || !current.ghost) return;
      const vp = viewport();
      // Keep the preview inside the visual viewport and above the finger.
      const previewWidth = clamp(vp.width - 24, 0, 260);
      const previewX = clamp(x + 16, vp.left + 12, Math.max(vp.left + 12, vp.left + vp.width - previewWidth - 12));
      const previewY = clamp(y - (touch ? 84 : 30), vp.top + 12, Math.max(vp.top + 12, vp.top + vp.height - 72));
      const toolbar = document.querySelector<HTMLElement>('.editor-toolbar-row')?.getBoundingClientRect();
      const selection = document.querySelector<HTMLElement>('.selection-bar')?.getBoundingClientRect();
      const upper = Math.max(vp.top + 12, toolbar && toolbar.bottom > vp.top && toolbar.top < vp.top + 120 ? toolbar.bottom + 8 : vp.top + 12);
      const lower = Math.min(vp.top + vp.height - 16, selection && selection.top > upper ? selection.top - 8 : vp.top + vp.height - 16);
      const edge = clamp((lower - upper) / 4, 24, 72);
      // Ease into the edge zone instead of jumping to full speed on a phone.
      const intensity = y < upper + edge ? -clamp((upper + edge - y) / edge, 0, 1)
        : y > lower - edge ? clamp((y - lower + edge) / edge, 0, 1) : 0;
      const table = rootRef.current?.getBoundingClientRect();
      const insideHorizontalBounds = table && x >= Math.max(vp.left, table.left) && x <= Math.min(vp.left + vp.width, table.right);
      const canScroll = insideHorizontalBounds && (intensity < 0 ? table.top < upper : table.bottom > lower);
      const speed = canScroll && !picked ? Math.sign(intensity) * intensity ** 2 * (touch ? 10 : 16) : 0;
      const elapsed = previousTime ? Math.min(time - previousTime, 32) : 16.7;
      previousTime = time;
      // Measure the viewport and sticky controls before changing preview styles.
      // Rewriting width before those reads forced layout on every pointer frame.
      updateTarget();
      const width = `${previewWidth}px`;
      if (current.ghost.style.width !== width) current.ghost.style.width = width;
      current.ghost.style.transform = `translate3d(${previewX}px, ${previewY}px, 0)`;
      current.ghost.style.visibility = 'visible';
      if (speed) {
        const previousScroll = window.scrollY;
        window.scrollBy({ top: speed * elapsed / 16.7, behavior: 'instant' });
        if (window.scrollY !== previousScroll) schedule();
      } else previousTime = 0;
    };
    const dispose = () => {
      if (ended) return;
      ended = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancelPointer);
      window.removeEventListener('touchmove', moveTouch);
      window.removeEventListener('touchend', endTouch);
      window.removeEventListener('touchcancel', cancel);
      window.removeEventListener('touchstart', multipleTouches);
      window.removeEventListener('keydown', cancelKey, true);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('pointerdown', outsidePick, true);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      captureElement.removeEventListener('lostpointercapture', cancelPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTarget();
      source.removeAttribute('data-editor-dragging');
      source.removeAttribute('data-editor-pressing');
      rootRef.current?.removeAttribute('data-editor-sorting');
      current.ghost?.remove();
      if (!touch && captureElement.hasPointerCapture(pointerId)) captureElement.releasePointerCapture(pointerId);
      if (current.ghost) ignoreClickUntil.current = Date.now() + 700;
      drag.current = null;
      placePicked.current = null;
      cleanup.current = null;
    };
    const cancel = () => {
      if (ended) return;
      const wasDragging = Boolean(current.ghost);
      dispose();
      if (wasDragging) announce(callbacks.current.messages.cancelled);
    };
    const cancelPointer = (pointer: Event) => { if ((pointer as PointerEvent).pointerId === pointerId) cancel(); };
    const outsidePick = (event: Event) => {
      if (picked && !rootRef.current?.contains(event.target as Node)) cancel();
    };
    const cancelKey = (key: KeyboardEvent) => {
      if (key.key === 'Escape') { key.preventDefault(); key.stopPropagation(); cancel(); }
    };
    const onVisibility = () => { if (document.hidden) cancel(); };
    const activate = () => {
      if (ended || current.ghost) return;
      // Only the handle starts a gesture, so capture does not affect row selection.
      if (!touch) captureElement.setPointerCapture(pointerId);
      handle.focus({ preventScroll: true });
      const ghost = document.createElement('div');
      ghost.className = 'editor-row-drag-ghost';
      ghost.style.visibility = 'hidden';
      ghost.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'editor-row-drag-ghost__label';
      label.textContent = source.dataset.editorSortLabel?.trim() || callbacks.current.messages.started;
      label.setAttribute('dir', 'auto');
      ghost.append(label);
      if (source.dataset.editorSortDetail) {
        const detail = document.createElement('span');
        detail.className = 'editor-row-drag-ghost__detail';
        detail.textContent = source.dataset.editorSortDetail;
        detail.setAttribute('dir', 'auto');
        ghost.append(detail);
      }
      document.body.append(ghost);
      current.ghost = ghost;
      source.setAttribute('data-editor-dragging', 'true');
      source.removeAttribute('data-editor-pressing');
      rootRef.current?.setAttribute('data-editor-sorting', 'true');
      announce(callbacks.current.messages.started);
      schedule();
    };
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId || ended) return;
      pointer.preventDefault();
      x = pointer.clientX;
      y = pointer.clientY;
      if (!current.ghost && Math.hypot(x - startX, y - startY) >= 5) activate();
      if (current.ghost) schedule();
    };
    const moveTouch = (event: TouchEvent) => {
      const point = Array.from(event.touches).find(point => point.identifier === pointerId);
      if (!point || event.touches.length !== 1) { cancel(); return; }
      x = point.clientX; y = point.clientY;
      if (!current.ghost) {
        if (Math.hypot(x - startX, y - startY) > 8) cancel();
        return;
      }
      if (!event.cancelable) { cancel(); return; }
      event.preventDefault();
      schedule();
    };
    const multipleTouches = (event: TouchEvent) => { if (event.touches.length > 1) cancel(); };
    const end = (pointer: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) => {
      if (pointer.pointerId !== pointerId || ended) return;
      x = pointer.clientX;
      y = pointer.clientY;
      // Tap the handle and then choose a destination, with either mouse or touch.
      if (current.ghost && !picked && Math.hypot(x - startX, y - startY) <= 8) {
        picked = true;
        current.ghost.dataset.picked = 'true';
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', cancelPointer);
        captureElement.removeEventListener('lostpointercapture', cancelPointer);
        if (!touch && captureElement.hasPointerCapture(pointerId)) captureElement.releasePointerCapture(pointerId);
        window.removeEventListener('touchmove', moveTouch);
        window.removeEventListener('touchend', endTouch);
        window.removeEventListener('touchcancel', cancel);
        window.removeEventListener('touchstart', multipleTouches);
        ignoreClickUntil.current = Date.now() + 700;
        placePicked.current = (nextX, nextY) => {
          x = nextX; y = nextY; updateTarget();
          if (current.targetKey) end({ pointerId, clientX: x, clientY: y });
          else schedule();
        };
        announce(callbacks.current.messages.choose ?? callbacks.current.messages.started);
        return;
      }
      let moved = false;
      try {
        if (current.ghost) {
          updateTarget();
          const { targetKey, side } = current;
          if (targetKey && side && callbacks.current.canReorder?.(sourceKey, targetKey, side)) {
            captureRects();
            focusId.current = source.dataset.editorSortId ?? null;
            moved = callbacks.current.onReorder?.(sourceKey, targetKey, side) ?? false;
          }
          if (!moved) { beforeRects.current = null; focusId.current = null; }
          announce(moved ? callbacks.current.messages.moved : callbacks.current.messages.cancelled);
        }
      } finally { dispose(); }
    };
    const endTouch = (event: TouchEvent) => {
      const point = Array.from(event.changedTouches).find(point => point.identifier === pointerId);
      if (!point) return;
      end({ pointerId, clientX: point.clientX, clientY: point.clientY });
    };
    cleanup.current = dispose;
    activate();
    if (touch) {
      window.addEventListener('touchmove', moveTouch, { passive: false });
      window.addEventListener('touchend', endTouch);
      window.addEventListener('touchcancel', cancel);
      window.addEventListener('touchstart', multipleTouches, { passive: true });
    } else {
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', cancelPointer);
      captureElement.addEventListener('lostpointercapture', cancelPointer);
    }
    window.addEventListener('keydown', cancelKey, true);
    window.addEventListener('blur', cancel);
    window.addEventListener('pointerdown', outsidePick, true);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
  }, [announce, captureRects, rootRef]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    const surface = event.target as HTMLElement;
    const rowSurface = surface.closest<HTMLElement>('.editor-row-content--sortable');
    if (!rowSurface) return;
    const handle = surface.closest<HTMLElement>('[data-reorder-handle]');
    if (!handle && surface === rowSurface && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); ignoreClickUntil.current = 0; surface.click(); return;
    }
    if (!handle) return;
    if (drag.current || !callbacks.current.onReorder || !callbacks.current.canReorder || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    event.stopPropagation();
    const source = rowSurface.closest<HTMLElement>('[data-editor-sort-row]');
    const sourceKey = source?.dataset.editorSortKey;
    if (!sourceKey) return;
    const visible = rows(rootRef.current);
    const index = source ? visible.indexOf(source) : -1;
    if (index < 0) return;
    const step = event.key === 'ArrowUp' ? -1 : 1;
    for (let i = index + step; i >= 0 && i < visible.length; i += step) {
      const targetKey = visible[i].dataset.editorSortKey;
      const side: Side = step < 0 ? 'before' : 'after';
      if (!targetKey || !callbacks.current.canReorder(sourceKey, targetKey, side)) continue;
      captureRects();
      focusId.current = source?.dataset.editorSortId ?? null;
      keyboardMove.current = true;
      if (callbacks.current.onReorder(sourceKey, targetKey, side)) announce(callbacks.current.messages.moved);
      else { beforeRects.current = null; focusId.current = null; }
      break;
    }
  }, [announce, captureRects, rootRef]);

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (placePicked.current && !(event.target as Element).closest('button,input,textarea,select,a')) {
      event.preventDefault(); event.stopPropagation();
      if (Date.now() >= ignoreClickUntil.current) placePicked.current(event.clientX, event.clientY);
      return;
    }
    if (Date.now() < ignoreClickUntil.current && !(event.target as Element).closest('button,input,textarea,select,a')) {
      event.preventDefault(); event.stopPropagation();
    }
  }, []);
  const onContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (drag.current) event.preventDefault();
  }, []);
  const cancelReorder = useCallback(() => {
    if (!drag.current) return;
    cleanup.current?.();
    announce(callbacks.current.messages.cancelled);
  }, [announce]);
  return { onPointerDown, onTouchStart: onPointerDown, onKeyDown, onClickCapture, onContextMenu, cancelReorder, announcement };
}
