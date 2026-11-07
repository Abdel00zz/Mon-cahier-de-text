import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { pageCountFor, planPrintFill, PRINT_PAGE_HEIGHT_PX } from '@/infrastructure/printing/printBalance';

const MAX_FILL = 1.14;
const MIN_COMPACT = 0.82;

/**
 * Ajuste le rendu imprimé après mesure réelle du DOM :
 * - remplit la dernière page quand elle est suffisamment entamée ;
 * - compresse doucement pour supprimer une dernière page presque vide.
 *
 * Le facteur est appliqué via `--print-fill` : interlignes et padding vertical
 * des cellules suivent, sans toucher à la taille des caractères.
 */
export function usePrintFill(rootRef: RefObject<HTMLElement | null>, deps: DependencyList): void {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    let cancelled = false;

    const apply = (factor: number) => root.style.setProperty('--print-fill', factor.toFixed(4));

    const balance = () => {
      if (cancelled) return;
      apply(1);
      const baseHeight = root.scrollHeight;
      const plan = planPrintFill(baseHeight, PRINT_PAGE_HEIGHT_PX);
      if (plan.mode === 'none') return;

      const inCompactMode = plan.mode === 'compact';
      let low = inCompactMode ? MIN_COMPACT : 1;
      let high = inCompactMode ? 1 : MAX_FILL;
      let best = 1;

      for (let attempt = 0; attempt < 7; attempt += 1) {
        const factor = (low + high) / 2;
        apply(factor);
        const height = root.scrollHeight;
        const pages = pageCountFor(height, PRINT_PAGE_HEIGHT_PX);
        const fits = inCompactMode
          ? pages <= plan.targetPages
          : pages === plan.targetPages && height <= plan.targetHeight;
        if (fits) {
          best = factor;
          low = factor;
        } else {
          high = factor;
        }
      }

      apply(best);
      root.dataset.printFillMode = plan.mode;
      root.dataset.printFillFactor = best.toFixed(3);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(balance);
      });
    };

    if (document.fonts?.status === 'loading') void document.fonts.ready.then(schedule);
    else schedule();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      root.style.removeProperty('--print-fill');
      delete root.dataset.printFillMode;
      delete root.dataset.printFillFactor;
    };
  }, deps);
}
