import { Capacitor } from '@capacitor/core';
import { WebviewPrint } from 'capacitor-webview-print';

/**
 * Fonction utilitaire pour l'impression qui fonctionne sur toutes les plateformes
 * Utilise le plugin capacitor-webview-print sur Android
 * Utilise window.print() sur le web
 */
export const printDocument = async (fileName: string = 'cahier-de-textes'): Promise<void> => {
  try {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'android') {
      if (!WebviewPrint || !WebviewPrint.print) {
        throw new Error('Le plugin WebviewPrint n\'est pas correctement initialisé');
      }
      
      await WebviewPrint.print({ name: fileName });
    } else {
      window.print();
    }
  } catch (error) {
    // Essayer window.print() comme fallback en cas d'erreur sur Android
    if (Capacitor.getPlatform() === 'android') {
      try {
        window.print();
      } catch (fallbackError) {
        // Fallback silencieux
      }
    }
  }
};

