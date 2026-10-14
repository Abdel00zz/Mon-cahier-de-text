import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

type Side = 'before' | 'after';
type Reorder = (sourceKey: string, targetKey: string, side: Side) => boolean;
type CanReorder = (sourceKey: string, targetKey: string, side: Side) => boolean;
interface ReorderMessages { started: string; moved: string; cancelled: string }
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
  const callbacks = useRef({ onReorder, canReorder, messages });
  callbacks.current = { onReorder, canReorder, messages };
  const [announcement, setAnnouncement] = useState({ text: '', sequence: 0 });
  const announce = useCallback((text: string) => setAnnouncement(previous => ({ text, sequence: previous.sequence + 1 })), []);

  const captureRects = useCallback(() => {
    beforeRects.current = new Map(rows(rootRef.current).map(row => [row.dataset.editorSortId ?? '', row.getBoundingClientRect()]));
  }, [rootRef]);

  useEffect(() => () => { cleanup.current?.(); }, []);
  // Search/document replacement cancels a gesture whose source disappears.
  useEffect(() => { cleanup.current?.(); }, [itemKeys, Boolean(onReorder)]);

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
        row.querySelector<HTMLButtonElement>('[data-editor-sort-handle]')?.focus({ preventScroll: true });
        if (keyboardMove.current) row.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        focusId.current = null;
      }
    }
  }, [itemKeys, rootRef]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, sourceKey: string) => {
    if (!callbacks.current.onReorder || !callbacks.current.canReorder || event.button !== 0 || !event.isPrimary || drag.current) return;
    const handle = event.currentTarget;
    const source = handle.closest<HTMLElement>('[data-editor-sort-row]');
    if (!source) return;
    event.preventDefault();
    event.stopPropagation();
    handle.focus({ preventScroll: true });
    // The table stays mounted while a virtualized source row scrolls away.
    const captureElement = rootRef.current ?? handle;
    captureElement.setPointerCapture(event.pointerId);
    keyboardMove.current = false;
    const { pointerId, pointerType, clientX: startX, clientY: startY } = event;
    const touch = pointerType !== 'mouse';
    let x = startX;
    let y = startY;
    let frame = 0;
    let previousTime = 0;
    let ended = false;
    const current: DragState = { source, sourceKey, ghost: null };
    drag.current = current;

    const clearTarget = () => {
      current.target?.removeAttribute('data-editor-drop-side');
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
      const candidate = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-editor-sort-row]');
      const key = candidate?.dataset.editorSortKey;
      const rect = candidate?.getBoundingClientRect();
      const side: Side = rect && y < rect.top + rect.height / 2 ? 'before' : 'after';
      if (candidate === current.target && side === current.side) return;
      clearTarget();
      const allowed = candidate && key && candidate !== source && rootRef.current?.contains(candidate)
        && callbacks.current.canReorder?.(sourceKey, key, side);
      if (allowed) {
        candidate.setAttribute('data-editor-drop-side', side);
        current.target = candidate;
        current.targetKey = key;
        current.side = side;
      }
      if (current.ghost) current.ghost.dataset.valid = allowed ? 'true' : 'false';
    };
    const tick = (time: number) => {
      if (ended || !current.ghost) return;
      const vp = viewport();
      const maxWidth = Math.max(80, Math.min(330, vp.width - 16)) + 'px';
      if (current.ghost.style.maxWidth !== maxWidth) current.ghost.style.maxWidth = maxWidth;
      const ghostWidth = current.ghost.offsetWidth;
      const ghostHeight = current.ghost.offsetHeight;
      const left = Math.max(vp.left + 8, Math.min(x + (touch ? -ghostWidth / 2 : 14), vp.left + vp.width - ghostWidth - 8));
      const desiredTop = touch || y + ghostHeight + 20 > vp.top + vp.height ? y - ghostHeight - 32 : y + 16;
      const top = Math.max(vp.top + 8, Math.min(desiredTop, vp.top + vp.height - ghostHeight - 8));
      current.ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      current.ghost.style.visibility = 'visible';
      updateTarget();
      const toolbar = document.querySelector<HTMLElement>('.editor-toolbar-row')?.getBoundingClientRect();
      const selection = document.querySelector<HTMLElement>('.selection-bar')?.getBoundingClientRect();
      const upper = Math.max(vp.top + 12, toolbar && toolbar.bottom > vp.top && toolbar.top < vp.top + 120 ? toolbar.bottom + 8 : vp.top + 12);
      const lower = Math.min(vp.top + vp.height - 16, selection && selection.top > upper ? selection.top - 8 : vp.top + vp.height - 16);
      const edge = Math.max(24, Math.min(72, (lower - upper) / 4));
      const speed = y < upper + edge ? -18 * Math.min(1, Math.max(0, (upper + edge - y) / edge))
        : y > lower - edge ? 18 * Math.min(1, Math.max(0, (y - lower + edge) / edge)) : 0;
      const elapsed = previousTime ? Math.min(time - previousTime, 32) : 16.7;
      previousTime = time;
      if (speed) window.scrollBy({ top: speed * elapsed / 16.7, behavior: 'instant' });
      frame = window.requestAnimationFrame(tick);
    };
    const dispose = () => {
      if (ended) return;
      ended = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancelPointer);
      window.removeEventListener('keydown', cancelKey, true);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTarget();
      source.removeAttribute('data-editor-dragging');
      rootRef.current?.removeAttribute('data-editor-sorting');
      current.ghost?.remove();
      if (captureElement.hasPointerCapture(pointerId)) captureElement.releasePointerCapture(pointerId);
      drag.current = null;
      cleanup.current = null;
    };
    const cancel = () => {
      const wasDragging = Boolean(current.ghost);
      dispose();
      if (wasDragging) announce(callbacks.current.messages.cancelled);
    };
    const cancelPointer = (pointer: PointerEvent) => { if (pointer.pointerId === pointerId) cancel(); };
    const cancelKey = (key: KeyboardEvent) => {
      if (key.key === 'Escape') { key.preventDefault(); key.stopPropagation(); cancel(); }
    };
    const onVisibility = () => { if (document.hidden) cancel(); };
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId || ended) return;
      pointer.preventDefault();
      x = pointer.clientX;
      y = pointer.clientY;
      if (current.ghost || Math.hypot(x - startX, y - startY) < (touch ? 8 : 5)) return;
      const ghost = document.createElement('div');
      ghost.className = 'editor-row-drag-ghost';
      ghost.style.visibility = 'hidden';
      ghost.dir = source.closest('[dir]')?.getAttribute('dir') ?? 'auto';
      ghost.textContent = source.dataset.editorSortLabel || source.querySelector('[data-row-content]')?.textContent?.trim().slice(0, 110) || '';
      ghost.setAttribute('aria-hidden', 'true');
      document.body.append(ghost);
      current.ghost = ghost;
      source.setAttribute('data-editor-dragging', 'true');
      rootRef.current?.setAttribute('data-editor-sorting', 'true');
      announce(callbacks.current.messages.started);
      frame = window.requestAnimationFrame(tick);
    };
    const end = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId || ended) return;
      x = pointer.clientX;
      y = pointer.clientY;
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
    cleanup.current = dispose;
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancelPointer);
    window.addEventListener('keydown', cancelKey, true);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
  }, [announce, captureRects, rootRef]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, sourceKey: string) => {
    if (drag.current || !callbacks.current.onReorder || !callbacks.current.canReorder || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    event.stopPropagation();
    const source = event.currentTarget.closest<HTMLElement>('[data-editor-sort-row]');
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

  return { onPointerDown, onKeyDown, announcement };
}
