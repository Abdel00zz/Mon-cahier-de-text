import { clamp } from 'es-toolkit';
import { rows, type CanReorder, type Side } from './rowReorderTypes';

export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DropTargetResolution {
  candidate?: HTMLElement;
  key?: string;
  side: Side;
  inside: boolean;
  allowed: boolean;
}

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
  const textSelector = '[class*="editor-type-"], .editor-kind-badge';
  const textCopies = content.querySelectorAll<HTMLElement>(textSelector);
  surface.querySelectorAll<HTMLElement>(textSelector).forEach((text, index) => {
    const style = window.getComputedStyle(text);
    Object.assign(textCopies[index].style, { font: style.font, color: style.color, letterSpacing: style.letterSpacing });
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

export function readVisualViewport(): ViewportRect {
  const vv = window.visualViewport;
  return {
    left: vv?.offsetLeft ?? 0,
    top: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };
}

export function updateGhostPreview(
  ghost: HTMLElement,
  sourceRect: DOMRect,
  y: number,
  gripOffsetY: number,
  vp: ViewportRect,
) {
  const previewWidth = Math.min(sourceRect.width, Math.max(0, vp.width - 24));
  const previewX = clamp(sourceRect.left, vp.left + 12, Math.max(vp.left + 12, vp.left + vp.width - previewWidth - 12));
  const previewY = clamp(y - gripOffsetY, vp.top + 12, Math.max(vp.top + 12, vp.top + vp.height - Math.min(sourceRect.height, vp.height * 0.6) - 12));
  const width = `${previewWidth}px`;
  if (ghost.style.width !== width) ghost.style.width = width;
  ghost.style.transform = `translate3d(${previewX}px, ${previewY}px, 0)`;
  ghost.style.visibility = 'visible';
}

export function computeEdgeScrollSpeed(
  x: number,
  y: number,
  vp: ViewportRect,
  table: DOMRect | undefined,
  touch: boolean,
  picked: boolean,
): number {
  if (picked || !table) return 0;
  const toolbar = document.querySelector<HTMLElement>('.editor-toolbar-row')?.getBoundingClientRect();
  const selection = document.querySelector<HTMLElement>('.selection-bar')?.getBoundingClientRect();
  const upper = Math.max(vp.top + 12, toolbar && toolbar.bottom > vp.top && toolbar.top < vp.top + 120 ? toolbar.bottom + 8 : vp.top + 12);
  const lower = Math.min(vp.top + vp.height - 16, selection && selection.top > upper ? selection.top - 8 : vp.top + vp.height - 16);
  const edge = clamp((lower - upper) / 4, 24, 72);
  const intensity = y < upper + edge ? -clamp((upper + edge - y) / edge, 0, 1)
    : y > lower - edge ? clamp((y - lower + edge) / edge, 0, 1) : 0;
  const inside = x >= Math.max(vp.left, table.left) && x <= Math.min(vp.left + vp.width, table.right);
  const canScroll = inside && (intensity < 0 ? table.top < upper : table.bottom > lower);
  return canScroll ? Math.sign(intensity) * intensity ** 2 * (touch ? 10 : 16) : 0;
}

export function resolveDropTarget(
  tableElement: HTMLElement | null,
  source: HTMLElement,
  sourceKey: string,
  x: number,
  y: number,
  canReorder?: CanReorder,
): DropTargetResolution {
  const table = tableElement?.getBoundingClientRect();
  let candidate = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-editor-sort-row]');
  if (!candidate && table && x >= table.left && x <= table.right && y >= table.top - 12 && y <= table.bottom + 12) {
    let nearest = 13;
    for (const row of rows(tableElement)) {
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
  if (canDropBeforeChapter && candidate && key && key !== sourceKey && !canReorder?.(sourceKey, key, side)) {
    const alternateSide: Side = side === 'after' ? 'before' : 'after';
    const alternateKey = alternateSide === 'after' ? candidate.dataset.editorSortLastKey ?? candidate.dataset.editorSortKey : candidate.dataset.editorSortKey;
    if (alternateKey && canReorder?.(sourceKey, alternateKey, alternateSide)) {
      side = alternateSide;
      key = alternateKey;
      inside = alternateSide === 'after';
    }
  }
  const allowed = Boolean(candidate && key && key !== sourceKey && tableElement?.contains(candidate) && canReorder?.(sourceKey, key, side));
  return { candidate: candidate ?? undefined, key: key ?? undefined, side, inside, allowed };
}
