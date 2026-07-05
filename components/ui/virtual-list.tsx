import * as React from 'react';
import { cn } from '@/lib/utils';

export interface VirtualItem {
  index: number;
  key: number;
  start: number;
  size: number;
  end: number;
}

interface UseWindowVirtualizerOptions {
  count: number;
  enabled?: boolean;
  estimateSize?: number;
  overscan?: number;
  scrollMargin?: number;
  /** Indices toujours rendus même hors de la fenêtre visible (ex: ligne en cours d'édition). */
  keepIndices?: readonly number[];
}

const findNearestIndex = (offsets: number[], value: number) => {
  let low = 0;
  let high = Math.max(0, offsets.length - 1);

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (offsets[mid] <= value) low = mid + 1;
    else high = mid;
  }

  return Math.max(0, low - 1);
};

export const useWindowVirtualizer = ({
  count,
  enabled = true,
  estimateSize = 72,
  overscan = 12,
  scrollMargin = 0,
  keepIndices,
}: UseWindowVirtualizerOptions) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<number | null>(null);
  const sizesRef = React.useRef(new Map<number, number>());
  const [measureVersion, setMeasureVersion] = React.useState(0);
  const [viewport, setViewport] = React.useState({ top: 0, height: 0 });

  const measureViewport = React.useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const element = scrollRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const nextTop = Math.max(0, -rect.top + scrollMargin);
      const nextHeight = window.innerHeight + Math.max(0, -rect.top) + 256;

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

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      window.removeEventListener('scroll', measureViewport);
      window.removeEventListener('resize', measureViewport);
    };
  }, [enabled, measureViewport]);

  React.useEffect(() => {
    sizesRef.current.forEach((_, index) => {
      if (index >= count) sizesRef.current.delete(index);
    });
    setMeasureVersion(version => version + 1);
  }, [count]);

  const offsets = React.useMemo(() => {
    const next = new Array<number>(count + 1);
    next[0] = 0;

    for (let index = 0; index < count; index += 1) {
      next[index + 1] = next[index] + (sizesRef.current.get(index) ?? estimateSize);
    }

    return next;
  }, [count, estimateSize, measureVersion]);

  const totalSize = offsets[count] ?? 0;

  const virtualItems = React.useMemo<VirtualItem[]>(() => {
    if (!enabled || count === 0) {
      return Array.from({ length: count }, (_, index) => {
        const start = offsets[index] ?? 0;
        const end = offsets[index + 1] ?? start + estimateSize;
        return { index, key: index, start, size: end - start, end };
      });
    }

    const startIndex = Math.max(0, findNearestIndex(offsets, viewport.top) - overscan);
    const endIndex = Math.min(count - 1, findNearestIndex(offsets, viewport.top + viewport.height) + overscan);
    const items: VirtualItem[] = [];

    // Indices épinglés (ex: ligne en édition) rendus même hors fenêtre,
    // pour ne jamais démonter un formulaire actif pendant le défilement.
    const pinned = (keepIndices ?? []).filter(i => i >= 0 && i < count && (i < startIndex || i > endIndex)).sort((a, b) => a - b);
    const pushItem = (index: number) => {
      const start = offsets[index] ?? 0;
      const end = offsets[index + 1] ?? start + estimateSize;
      items.push({ index, key: index, start, size: end - start, end });
    };

    pinned.filter(i => i < startIndex).forEach(pushItem);
    for (let index = startIndex; index <= endIndex; index += 1) pushItem(index);
    pinned.filter(i => i > endIndex).forEach(pushItem);

    return items;
  }, [count, enabled, estimateSize, offsets, overscan, viewport.height, viewport.top, keepIndices]);

  const measureElement = React.useCallback((index: number, node: HTMLElement | null) => {
    if (!enabled || !node) return;

    const commit = (height: number) => {
      const rounded = Math.max(1, Math.ceil(height));
      if (sizesRef.current.get(index) === rounded) return;
      sizesRef.current.set(index, rounded);
      setMeasureVersion(version => version + 1);
    };

    commit(node.getBoundingClientRect().height);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect.height;
      if (typeof height === 'number') commit(height);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return {
    scrollRef,
    totalSize,
    virtualItems,
    measureElement,
    renderedCount: enabled ? virtualItems.length : count,
  };
};

interface VirtualListRowProps {
  index: number;
  start?: number;
  measureElement: (index: number, node: HTMLElement | null) => void | (() => void);
  className?: string;
  children?: React.ReactNode;
}

export const VirtualListRow = React.memo(({ index, start, measureElement, className, children }: VirtualListRowProps) => {
  const cleanupRef = React.useRef<void | (() => void)>();
  const ref = React.useCallback((node: HTMLDivElement | null) => {
    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = measureElement(index, node);
  }, [index, measureElement]);

  React.useEffect(() => () => {
    if (cleanupRef.current) cleanupRef.current();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(start === undefined ? 'relative' : 'absolute left-0 top-0 w-full [contain:layout_style_paint]', className)}
      style={start === undefined ? undefined : { transform: `translateY(${start}px)` }}
    >
      {children}
    </div>
  );
});

VirtualListRow.displayName = 'VirtualListRow';
