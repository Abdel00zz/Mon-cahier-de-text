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

export const printContent = async (content: string): Promise<void> => {
  const platform = Capacitor.getPlatform();
  
  // Créer le contenu HTML complet
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Impression</title>
      </head>
      <body>${content}</body>
    </html>
  `;
  
  if (platform === 'android' && WebviewPrint) {
    try {
      // Utiliser le plugin WebviewPrint pour Android
      await WebviewPrint.print({
        name: 'Cahier de texte'
      });
    } catch (error) {
      // Fallback vers window.print()
      printWithWindowPrint(fullHtml);
    }
  } else {
    // Utiliser window.print() pour le web et autres plateformes
    printWithWindowPrint(fullHtml);
  }
};

const printWithWindowPrint = (content: string): void => {
  try {
    // Fallback pour Android si le plugin échoue
    if (Capacitor.getPlatform() === 'android') {
      // Ouvrir dans une nouvelle fenêtre pour Android
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(content);
      printWindow?.print();
      return;
    }
    
    // Pour le web, utiliser window.print() directement
    window.print();
  } catch (error) {
    // Fallback silencieux
  }
};