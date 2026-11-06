import type { AppConfig } from '@/types';

export type PrintMode = 'new' | 'all' | 'custom';
export type PrintHeaderMode = 'first' | 'all' | 'none';
export type PrintTextSize = 's' | 'm' | 'l';
export type PrintLineSpacing = 'compact' | 'normal' | 'aere';
export interface PrintOptions {
  pageNumbers: boolean;
  /** conserver les couleurs pédagogiques des badges et repères */
  colorContent?: boolean;
  /** affichage de l'en-tête administratif dans le document imprimé */
  headerMode: PrintHeaderMode;
  /** taille du texte du document imprimé */
  textSize: PrintTextSize;
  /** espacement entre les lignes (aération) */
  lineSpacing: PrintLineSpacing;
}

export interface PrintModalProps {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
  /** nombre total de séances datées du cahier */
  totalDates: number;
  /** dates jamais imprimées */
  newDates: string[];
  /** toutes les dates de séances datées (triées), pour la sélection à la séance */
  allDates: string[];
  /** dates déjà imprimées (pour marquer la liste) */
  printedDates: string[];
  /** dernière impression enregistrée (ISO) ou null */
  lastPrintedAt: string | null;
  /** dernières préférences de mise en page mémorisées pour cette classe */
  savedPrefs?: PrintOptions | null;
  /**
   * false lorsque l'historique d'impression n'est pas consultable (impression
   * depuis la direction : l'historique reste sur l'appareil de l'enseignant).
   * La modale masque alors l'état « déjà imprimé » au lieu d'annoncer un faux
   * zéro, et ne propose que les modes document complet / séances choisies.
   */
  historyKnown?: boolean;
  isPrinting?: boolean;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  onPrint: (mode: PrintMode, options: PrintOptions, selectedDates?: string[]) => void;
}

/**
 * Modale d'impression intelligente : montre CE qui a déjà été imprimé et
 * CE qui est nouveau, et recommande le mode le plus économique.
 */
