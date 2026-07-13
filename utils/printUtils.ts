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
