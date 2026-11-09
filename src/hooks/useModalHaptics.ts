import { hapticFeedback } from './useHapticFeedback';

export interface ModalHaptics {
  onOpen: () => void;
  onClose: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onError: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onSelect: () => void;
}

/**
 * Singleton de callbacks pour le retour haptique des fenêtres et modales.
 * Référence 100% stable à travers les rendus (aucun nouvel objet généré).
 */
export const modalHaptics: ModalHaptics = {
  /** Ouverture d'une modale (vibration douce) */
  onOpen: () => hapticFeedback.impact('soft'),
  /** Fermeture ou rejet (vibration légère) */
  onClose: () => hapticFeedback.impact('light'),
  /** Prise en main de la poignée de glissement (drag) */
  onDragStart: () => hapticFeedback.selection(),
  /** Fin de glissement ou verrouillage sur palier */
  onDragEnd: () => hapticFeedback.impact('light'),
  /** Confirmation d'action (sauvegarde, validation) */
  onConfirm: () => hapticFeedback.notification('success'),
  /** Annulation volontaire */
  onCancel: () => hapticFeedback.impact('light'),
  /** Action destructrice (suppression de classe ou de contenu) */
  onDelete: () => hapticFeedback.notification('warning'),
  /** Erreur de saisie ou blocage */
  onError: () => hapticFeedback.notification('error'),
  /** Extension de la feuille mobile vers le haut */
  onExpand: () => hapticFeedback.impact('light'),
  /** Repli de la feuille */
  onCollapse: () => hapticFeedback.impact('soft'),
  /** Sélection d'un élément ou bouton radio */
  onSelect: () => hapticFeedback.selection(),
};

/**
 * Hook spécialisé pour le retour haptique des fenêtres et modales.
 * Renvoie une référence singleton stable.
 */
export function useModalHaptics(): ModalHaptics {
  return modalHaptics;
}
