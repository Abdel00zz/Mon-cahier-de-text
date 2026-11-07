import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { balancePrintLayout, clearPrintBalance } from '@/infrastructure/printing/pagination';

/**
 * Ajuste et justifie verticalement le rendu A4 dès le montage et à chaque
 * chargement de police ou d'image (mode aperçu et préparation d'impression).
 */
export function usePrintFill(rootRef: RefObject<HTMLElement | null>, deps: DependencyList): void {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    let cancelled = false;

    const run = () => {
      if (cancelled || !root.isConnected) return;
      balancePrintLayout(root);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(run);
      });
    };

    // Exécution synchrone initiale puis rafraîchissement après polices/images.
    run();
    const images = Array.from(root.querySelectorAll('img'));
    const pendingImages = images.filter(image => !image.complete);
    pendingImages.forEach(image => image.addEventListener('load', schedule, { once: true }));
    const fontsReady = document.fonts?.status === 'loading' ? document.fonts.ready : Promise.resolve();
    void Promise.all([fontsReady, ...images.map(image => image.decode?.().catch(() => undefined))]).then(schedule);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      pendingImages.forEach(image => image.removeEventListener('load', schedule));
      clearPrintBalance(root);
      root.style.removeProperty('--print-fill');
      delete root.dataset.printFillMode;
      delete root.dataset.printFillFactor;
      delete root.dataset.printPages;
    };
  }, deps);
}
