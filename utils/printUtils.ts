import { Capacitor } from '@capacitor/core';
import { WebviewPrint } from 'capacitor-webview-print';
import { hasMathSyntax } from './math';

/**
 * Fonction utilitaire pour l'impression qui fonctionne sur toutes les plateformes
 * Utilise le plugin capacitor-webview-print sur iOS/Android
 * Utilise window.print() sur le web
 */
export const printDocument = async (fileName: string = 'cahier-de-textes'): Promise<boolean> => {
  const platform = Capacitor.getPlatform();
  try {
    if (platform !== 'web') {
      if (!WebviewPrint?.print) {
        throw new Error('Le plugin WebviewPrint n\'est pas correctement initialisé');
      }
      // The native implementations return status fields absent from the plugin's typings.
      const result = await WebviewPrint.print({ name: fileName }) as unknown as { printed?: boolean; isCancelled?: boolean; isFailed?: boolean } | undefined;
      return result?.printed !== false && !result?.isCancelled && !result?.isFailed;
    } else {
      if (typeof window.print !== 'function') throw new Error('La fonction d\'impression est indisponible.');
      window.print();
      return true;
    }
  } catch {
    // Les WebViews natives peuvent parfois ne pas avoir le plugin synchronisé.
    if (platform !== 'web') {
      try {
        if (typeof window.print !== 'function') return false;
        window.print();
        return true;
      } catch (fallbackError) {
        void fallbackError;
      }
    }
    return false;
  }
};

/** Prepare the measurable A4 document; never silently send raw TeX to paper. */
export const preparePrintContent = async (root: HTMLElement, timeoutMs = 12000): Promise<void> => {
  let timer: number | undefined;
  try {
    const runtime = window as unknown as {
      MathJax?: { startup?: { promise?: Promise<void> }; typesetPromise?: (elements: Element[]) => Promise<void> };
    };
    const prepare = (async () => {
      if (!root.isConnected || root.getBoundingClientRect().width === 0) throw new Error('Print surface is not measurable');
      // This also loads ordinary text fonts when the document contains no formula.
      await document.fonts?.ready;
      if (hasMathSyntax(root.textContent ?? '') || root.querySelector('mjx-container, .math-text')) {
        // The provider can still be downloading when the teacher opens Print.
        const deadline = Date.now() + timeoutMs;
        while (!runtime.MathJax?.typesetPromise && Date.now() < deadline) {
          if (!root.isConnected) throw new Error('Print surface detached');
          await new Promise(resolve => window.setTimeout(resolve, 50));
        }
        const math = runtime.MathJax;
        if (!math?.typesetPromise) throw new Error('MathJax unavailable');
        await math.startup?.promise;
        await math.typesetPromise([root]);
        if (root.querySelector('mjx-merror, [data-mjx-error]')) throw new Error('Invalid print formula');
      }
      await document.fonts?.ready;
      await Promise.all(Array.from(root.querySelectorAll('img')).map(img => img.decode()));
      if (!root.isConnected) throw new Error('Print surface detached');
      // A session taller than an A4 body must fragment; ordinary sessions stay together.
      const pageBodyHeight = 275 * 96 / 25.4;
      const headerHeight = root.querySelector('thead')?.getBoundingClientRect().height ?? 0;
      for (const row of root.querySelectorAll<HTMLElement>('.print-session-row')) {
        row.dataset.printOversized = String(row.getBoundingClientRect().height > pageBodyHeight - headerHeight - 2);
      }
    })();
    await Promise.race([
      prepare,
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('Print preparation timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};
