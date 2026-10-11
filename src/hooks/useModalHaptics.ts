import { useCallback } from 'react';
import { useHapticFeedback } from './useHapticFeedback';

/**
 * Hook spécialisé pour le retour haptique des fenêtres et modales.
 * Permet un retour sensoriel subtil et calibré selon l'action réalisée.
 */
export function useModalHaptics() {
  const { impact, notification, selection } = useHapticFeedback();

  return {
    /** Ouverture d'une modale (vibration douce et légère) */
    onOpen: useCallback(() => impact('soft'), [impact]),
    /** Fermeture ou rejet */
    onClose: useCallback(() => impact('light'), [impact]),
    /** Prise en main de la poignée de glissement (drag) */
    onDragStart: useCallback(() => selection(), [selection]),
    /** Fin de glissement ou verrouillage sur palier */
    onDragEnd: useCallback(() => impact('light'), [impact]),
    /** Confirmation d'action (sauvegarde, validation) */
    onConfirm: useCallback(() => notification('success'), [notification]),
    /** Annulation volontaire */
    onCancel: useCallback(() => impact('light'), [impact]),
    /** Action destructrice (suppression de classe ou de contenu) */
    onDelete: useCallback(() => notification('warning'), [notification]),
    /** Erreur de saisie ou blocage */
    onError: useCallback(() => notification('error'), [notification]),
    /** Extension de la feuille mobile vers le haut */
    onExpand: useCallback(() => impact('light'), [impact]),
    /** Repli de la feuille */
    onCollapse: useCallback(() => impact('soft'), [impact]),
    /** Sélection d'un élément ou bouton radio */
    onSelect: useCallback(() => selection(), [selection]),
  };
}
