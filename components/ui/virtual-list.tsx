import * as React from 'react';
import { cn } from '@/lib/utils';
import { listViewport, visibleRange } from '@/utils/virtualGeometry';

export interface VirtualItem {
  index: number;
  key: string | number;
  start: number;
  size: number;
  end: number;
}

interface UseWindowVirtualizerOptions {
  count: number;
  itemKeys: readonly (string | number)[];
  enabled?: boolean;
  estimateSize?: number;
  estimateSizes?: readonly number[];
  overscan?: number;
  scrollMargin?: number;
  /** Indices toujours rendus même hors de la fenêtre visible (ex: ligne en cours d'édition). */
  keepIndices?: readonly number[];
}


export const useWindowVirtualizer = ({
  count,
  itemKeys,
  enabled = true,
  estimateSize = 72,
  estimateSizes,
  overscan = 12,
  scrollMargin = 0,
  keepIndices,
}: UseWindowVirtualizerOptions) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<number | null>(null);
  const sizesRef = React.useRef(new Map<string | number, number>());
  const measureFrameRef = React.useRef<number | null>(null);
  const keysRef = React.useRef(itemKeys);
  keysRef.current = itemKeys;
  const estimatesRef = React.useRef(estimateSizes);
  estimatesRef.current = estimateSizes;
  const pendingScrollAdjustment = React.useRef(0);
  const [measureVersion, setMeasureVersion] = React.useState(0);
  const [viewport, setViewport] = React.useState({ top: 0, height: 0 });

  const measureViewport = React.useCallback(() => {
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const element = scrollRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const { top: nextTop, height: nextHeight } = listViewport(rect.top, rect.height, window.innerHeight, scrollMargin);

      setViewport(current => (
        Math.abs(current.top - nextTop) < 1 && Math.abs(current.height - nextHeight) < 1
          ? current
          : { top: nextTop, height: nextHeight }
      ));
    });
  }, [scrollMargin]);

  React.useEffect(() => {
    if (!enabled) return;

    measureViewport();
    window.addEventListener('scroll', measureViewport, { passive: true });
    window.addEventListener('resize', measureViewport);
    // Layout changes above the list and async formulas can change its geometry.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureViewport);
    if (scrollRef.current) observer?.observe(scrollRef.current);
    if (document.body) observer?.observe(document.body);

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      window.removeEventListener('scroll', measureViewport);
      window.removeEventListener('resize', measureViewport);
      observer?.disconnect();
      if (measureFrameRef.current !== null) window.cancelAnimationFrame(measureFrameRef.current);
      measureFrameRef.current = null;
      pendingScrollAdjustment.current = 0;
    };
  }, [enabled, measureViewport]);

  React.useEffect(() => {
    const active = new Set(itemKeys);
    sizesRef.current.forEach((_, key) => {
      if (!active.has(key)) sizesRef.current.delete(key);
    });
    measureViewport();
  }, [itemKeys, measureViewport]);

  const offsets = React.useMemo(() => {
    const next = new Array<number>(count + 1);
    next[0] = 0;

    for (let index = 0; index < count; index += 1) {
      next[index + 1] = next[index] + (sizesRef.current.get(itemKeys[index]) ?? estimateSizes?.[index] ?? estimateSize);
    }

    return next;
  }, [count, itemKeys, estimateSize, estimateSizes, measureVersion]);

  const offsetsRef = React.useRef(offsets);
  offsetsRef.current = offsets;

  const totalSize = offsets[count] ?? 0;

  const virtualItems = React.useMemo<VirtualItem[]>(() => {
    if (!enabled || count === 0) {
      return Array.from({ length: count }, (_, index) => {
        const start = offsets[index] ?? 0;
        const end = offsets[index + 1] ?? start + estimateSize;
        return { index, key: itemKeys[index], start, size: end - start, end };
      });
    }

    const { start: startIndex, end: endIndex } = visibleRange(offsets, viewport.top, viewport.height, overscan);
    const items: VirtualItem[] = [];

    // Indices épinglés (ex: ligne en édition) rendus même hors fenêtre,
    // pour ne jamais démonter un formulaire actif pendant le défilement.
    const pinned = [...new Set(keepIndices ?? [])].filter(i => i >= 0 && i < count && (i < startIndex || i > endIndex)).sort((a, b) => a - b);
    const pushItem = (index: number) => {
      const start = offsets[index] ?? 0;
      const end = offsets[index + 1] ?? start + estimateSize;
      items.push({ index, key: itemKeys[index], start, size: end - start, end });
    };

    pinned.filter(i => i < startIndex).forEach(pushItem);
    for (let index = startIndex; index <= endIndex; index += 1) pushItem(index);
    pinned.filter(i => i > endIndex).forEach(pushItem);

    return items;
  }, [count, itemKeys, enabled, estimateSize, offsets, overscan, viewport.height, viewport.top, keepIndices]);

  const measureElement = React.useCallback((index: number, node: HTMLElement | null) => {
    if (!enabled || !node) return;

    const key = keysRef.current[index];
    if (key === undefined) return;
    let active = true;
    const commit = (height: number) => {
      if (!active || height <= 0 || keysRef.current[index] !== key) return;
      const rounded = Math.max(1, Math.ceil(height));
      if (sizesRef.current.get(key) === rounded) return;
      const oldHeight = sizesRef.current.get(key) ?? estimatesRef.current?.[index] ?? estimateSize;
      const tableTop = scrollRef.current?.getBoundingClientRect().top ?? 0;
      // Preserve the reading position when an overscanned row above it changes.
      if (tableTop + (offsetsRef.current[index + 1] ?? 0) < 0) {
        pendingScrollAdjustment.current += rounded - oldHeight;
      }
      sizesRef.current.set(key, rounded);
      // One React update per frame, even when many formulas finish together.
      if (measureFrameRef.current === null) {
        measureFrameRef.current = window.requestAnimationFrame(() => {
          measureFrameRef.current = null;
          setMeasureVersion(version => version + 1);
        });
      }
    };
    commit(node.getBoundingClientRect().height);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
      commit(entries[0]?.borderBoxSize?.[0]?.blockSize ?? node.getBoundingClientRect().height);
    });
    observer?.observe(node);
    return () => { active = false; observer?.disconnect(); };
  }, [enabled, estimateSize]);

  React.useLayoutEffect(() => {
    if (pendingScrollAdjustment.current) {
      window.scrollBy({ top: pendingScrollAdjustment.current, behavior: 'instant' });
      pendingScrollAdjustment.current = 0;
    }
  }, [measureVersion]);
  const scrollToIndex = React.useCallback((index: number) => {
    const table = scrollRef.current;
    if (!table) return;
    const top = table.getBoundingClientRect().top + window.scrollY + (offsetsRef.current[index] ?? 0);
    window.scrollTo({ top: Math.max(0, top - 150), behavior: 'instant' });
  }, []);

  return {
    scrollRef,
    scrollToIndex,
    totalSize,
    virtualItems,
    measureElement,
    renderedCount: enabled ? virtualItems.length : count,
  };
};

interface VirtualListRowProps {
  index: number;
  start?: number;
  measurementKey?: string | number;
  measureElement: (index: number, node: HTMLElement | null) => void | (() => void);
  className?: string;
  dataFocusKey?: string;
  children?: React.ReactNode;
}

export const VirtualListRow = React.memo(({ index, start, measurementKey, measureElement, className, dataFocusKey, children }: VirtualListRowProps) => {
  const cleanupRef = React.useRef<void | (() => void) | null>(null);
  const ref = React.useCallback((node: HTMLDivElement | null) => {
    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = measureElement(index, node);
  }, [index, measurementKey, measureElement]);

  return (
    <div
      ref={ref}
      data-focus-key={dataFocusKey}
      className={cn(start === undefined ? 'relative' : 'absolute left-0 w-full [contain:layout_style]', className)}
      style={start === undefined ? undefined : { top: Math.round(start) }}
    >
      {children}
    </div>
  );
});

VirtualListRow.displayName = 'VirtualListRow';
