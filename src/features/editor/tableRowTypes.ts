import type { DateMergeMeta } from '@/domain/notebook/tableRows';
import type { ContentDateOrder } from '@/domain/calendar/dateOrder';
import type { Indices, ElementType } from '@/types';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';

export interface TableRowProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  dateMerge?: DateMergeMeta;
  layout?: 'full' | 'content-only';
  lineClassOverride?: string;
  onToggleSelect: (indices: Indices) => void;
  onDoubleClickEdit?: (indices: Indices) => void;
  onOpenDateModal?: (indices: Indices, currentDate?: string) => void;
  /** saisie de la remarque : la cible (ligne ou séance fusionnée) vient du moteur */
  onOpenRemark?: (indices: Indices) => void;
  isSelected: boolean;
  isNew?: boolean;
  /** contenu ouvert dans l’éditeur : la ligne doit rester identifiable
   *  même au milieu d’une séance fusionnée (plusieurs contenus, même date) */
  isEditing?: boolean;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  /** terme de recherche actif, surligné dans les titres/remarques */
  searchQuery?: string;
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** ordre chronologique : voisins datés du contenu (alerte de recul de date) */
  getDateOrder?: (indices: Indices) => ContentDateOrder | undefined;
  /** numéro de série du contenu, calculé par chapitre */
  getContentNumber?: (indices: Indices) => string | undefined;
  /**
   * Sujet écrit par le professeur, lu PAR LIGNE du cahier : la pastille
   * « Document » n'apparaît que si un sujet existe pour cette ligne
   * (voir `notebookDocumentPreviews`).
   */
  getDocumentPreview?: (rowKey: string) => NotebookDocumentPreview | undefined;
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
  sessionAnnotation?: string;
  sessionDocuments?: readonly NotebookDocumentPreview[];
  sortable?: boolean;
}
