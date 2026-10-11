import { IMPORT_LIMITS } from './importLimits.js';

/*
 * SCHÉMA DU CAHIER — SOURCE UNIQUE.
 *
 * Un cahier est un arbre récursif de listes hétérogènes. Jusqu'ici, la liste des
 * champs texte, celle des conteneurs d'enfants et les budgets d'import étaient
 * recopiés dans quatre fichiers (pipeline d'import, validation de synchro,
 * diagnostic de contenu, export). Ajouter un champ obligeait à en modifier
 * quatre, et un oubli créait une divergence silencieuse entre l'import et la
 * synchronisation.
 *
 * Tout vit désormais ici : un seul endroit à faire évoluer, une seule vérité à
 * tester. Les modules qui parcourent l'arbre consomment ces constantes.
 */

/** Les quatre listes d'enfants d'un nœud, dans l'ordre canonique de visite. */
export const NOTEBOOK_CONTAINERS = ['sections', 'subsections', 'subsubsections', 'items'] as const;
export type NotebookContainerKey = (typeof NOTEBOOK_CONTAINERS)[number];

/**
 * Champs texte normalisés à l'import ET validés à la synchronisation.
 * L'ordre n'a pas d'importance sémantique ; il est stable pour la reproductibilité.
 */
export const NOTEBOOK_TEXT_FIELDS = ['title', 'name', 'type', 'number', 'page', 'description', 'remark', 'content'] as const;
export type NotebookTextField = (typeof NOTEBOOK_TEXT_FIELDS)[number];

/**
 * Un nœud de STRUCTURE organise le plan (chapitre, section, sous-section) :
 * il n'est ni un contenu numérable, ni une ligne du tableau.
 */
export const STRUCTURAL_TYPES: ReadonlySet<string> = new Set(['chapter', 'section', 'subsection', 'subsubsection']);

/** Textes longs : budget plus large que celui des étiquettes. */
const LONG_TEXT_FIELDS: ReadonlySet<string> = new Set(['description', 'remark', 'content']);

/** Budget d'un champ texte, partagé par le moteur d'import et la synchro. */
export const textFieldLimit = (field: string): number =>
  LONG_TEXT_FIELDS.has(field) ? IMPORT_LIMITS.text : IMPORT_LIMITS.label;

/** Type d'élément déduit du conteneur qui porte le nœud (jamais deviné). */
const CONTAINER_ELEMENT_TYPE: Record<NotebookContainerKey, string> = {
  sections: 'section',
  subsections: 'subsection',
  subsubsections: 'subsubsection',
  items: 'item',
};

/** Garde universelle : un nœud est un objet simple, jamais un tableau ni `null`. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Type effectif d'un nœud, lu dans le conteneur qui le porte.
 * - racine : le `type` du bloc (défaut « chapter ») ;
 * - `items` : « chapter » quand un bloc entier y est embarqué, sinon « item » ;
 * - listes de structure : le singulier du conteneur.
 *
 * Le niveau se lit dans la LISTE qui porte le nœud, pas dans son `type` : dans
 * un cahier réel, une section n'a pas de `type` — elle n'est reconnaissable que
 * par la clé `sections` de son parent. Se fier au `type` gonflerait les comptes.
 */
export const elementTypeFor = (container: NotebookContainerKey | null, node: Record<string, unknown>): string => {
  if (container === null) return String(node.type ?? 'chapter');
  if (container === 'items') return node.type === 'chapter' ? 'chapter' : 'item';
  return CONTAINER_ELEMENT_TYPE[container];
};

/** Un nœud est structurel si son type effectif OU son `type` déclaré l'est. */
export const isStructural = (elementType: string, declaredType: unknown): boolean =>
  STRUCTURAL_TYPES.has(elementType) || STRUCTURAL_TYPES.has(String(declaredType ?? ''));
