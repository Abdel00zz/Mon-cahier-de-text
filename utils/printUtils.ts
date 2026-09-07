import { Capacitor } from '@capacitor/core';
import { WebviewPrint } from 'capacitor-webview-print';

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
      await WebviewPrint.print({ name: fileName });
      return true;
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

/**
 * MathJax peut être chargé tardivement (ou ne pas être disponible hors ligne).
 * L'impression ne doit pas attendre indéfiniment : on laisse le moteur
 * continuer avec le texte source si le délai est dépassé.
 */
export const typesetBeforePrint = async (timeoutMs = 4000): Promise<boolean> => {
  let timer: number | undefined;
  try {
    const math = (window as unknown as {
      MathJax?: { startup?: { promise?: Promise<void> }; typesetPromise?: (elements: Element[]) => Promise<void> };
    }).MathJax;
    if (!math?.startup?.promise && !math?.typesetPromise) return false;
    const typesetPromise = (async () => {
      await math.startup?.promise;
      const roots = Array.from(document.querySelectorAll('.print-only'));
      if (!math.typesetPromise || roots.length === 0) throw new Error('Print runtime unavailable');
      await math.typesetPromise(roots);
      await document.fonts?.ready;
    })();

    await Promise.race([
      typesetPromise,
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('MathJax timeout')), timeoutMs);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};
