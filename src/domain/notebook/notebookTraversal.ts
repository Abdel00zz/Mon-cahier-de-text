import { IMPORT_LIMITS } from './importLimits.js';
import {
  NOTEBOOK_CONTAINERS,
  NOTEBOOK_TEXT_FIELDS,
  elementTypeFor,
  isRecord,
  isStructural,
  type NotebookContainerKey,
  type NotebookTextField,
} from './notebookSchema.js';

/*
 * MOTEUR DE PARCOURS — un seul chemin pour lire l'arbre du cahier.
 *
 * Cinq modules parcouraient l'arbre avec chacun sa propre récursion (comptage de
 * types, validation de synchro, diagnostic de contenu, résumé de progression,
 * export par chapitre). Cinq occasions de diverger, cinq fois le même `isRecord`,
 * cinq définitions de « conteneur ».
 *
 * `walkNotebook` est ce parcours, une fois pour toutes : il visite les nœuds en
 * préordre, fournit un contexte complet (chemin technique, profondeur,
 * conteneur, type effectif) et applique les budgets partagés. Les appelants
 * branchent des hooks et ne réimplémentent plus la marche.
 */

interface NotebookNodeContext {
  /** Le nœud brut (jamais recopié : la lecture ne mute pas). */
  readonly node: Record<string, unknown>;
  /** Chemin technique : « lessons[0] › sections[2] › items[1] ». */
  readonly path: string;
  readonly depth: number;
  /** Chemin du parent (celui du conteneur) : sert d'ancrage d'unicité. */
  readonly parentPath: string;
  /** Conteneur qui porte ce nœud, ou `null` à la racine du cahier. */
  readonly container: NotebookContainerKey | null;
  /** Index dans la liste de frères. */
  readonly index: number;
  /** Type effectif déduit du conteneur (chapitre, section, item, ligne libre…). */
  readonly elementType: string;
  /** Vrai pour un nœud de structure : il organise le plan, ce n'est pas un contenu. */
  readonly structural: boolean;
}

interface NotebookTraversalHooks {
  /** Visite d'un nœud. Retourner `false` saute tout son sous-arbre (élagage). */
  onNode?: (context: NotebookNodeContext) => void | false;
  /** Champ texte présent sur un nœud. `value` peut être de tout type. */
  onText?: (context: NotebookNodeContext, field: NotebookTextField, value: unknown) => void;
  /** Liste d'enfants rencontrée. `isArray` faux = conteneur malformé. */
  onContainer?: (context: NotebookNodeContext, key: NotebookContainerKey, value: unknown, isArray: boolean) => void;
  /** Enfant (ou racine) qui n'est pas un objet : la décision appartient à l'appelant. */
  onInvalidNode?: (parent: NotebookNodeContext | null, value: unknown, index: number, container: NotebookContainerKey | null) => void;
  /** Budget dépassé : l'appelant lève une erreur ; la marche s'arrête de toute façon. */
  onBudgetExceeded?: (reason: 'depth' | 'nodes', context: NotebookNodeContext) => void;
}

export interface NotebookTraversalOptions extends NotebookTraversalHooks {
  /** Profondeur maximale (défaut : {@link IMPORT_LIMITS.depth}). */
  maxDepth?: number;
  /** Nombre maximal de nœuds (défaut : {@link IMPORT_LIMITS.nodes}). */
  maxNodes?: number;
}

export interface NotebookStats {
  /** Objets simples visités. */
  nodes: number;
  /** Profondeur maximale atteinte. */
  depth: number;
  /** Nombre de blocs de premier niveau. */
  topLevel: number;
  /** Nœuds qui ne sont pas de la structure : les contenus réels. */
  contents: number;
  /** Nœuds portant au moins une liste d'enfants. */
  containers: number;
}

/**
 * Parcourt un cahier (ou un fragment) en préordre.
 * Ne jette jamais de lui-même : les hooks décident. Les budgets arrêtent la
 * marche dès qu'ils sont franchis, pour qu'un JSON volontairement récursif ne
 * puisse ni épuiser la pile ni saturer la mémoire.
 */
export function walkNotebook(nodes: unknown, options: NotebookTraversalOptions = {}): NotebookStats {
  const stats: NotebookStats = {
    nodes: 0,
    depth: 0,
    topLevel: Array.isArray(nodes) ? nodes.length : 0,
    contents: 0,
    containers: 0,
  };
  if (!Array.isArray(nodes)) return stats;

  const maxDepth = options.maxDepth ?? IMPORT_LIMITS.depth;
  const maxNodes = options.maxNodes ?? IMPORT_LIMITS.nodes;
  let stopped = false;

  const visit = (
    node: Record<string, unknown>,
    path: string,
    depth: number,
    container: NotebookContainerKey | null,
    index: number,
    parentPath: string,
  ): void => {
    const elementType = elementTypeFor(container, node);
    const structural = isStructural(elementType, node.type);
    const context: NotebookNodeContext = { node, path, depth, parentPath, container, index, elementType, structural };

    stats.nodes += 1;
    if (stats.nodes > maxNodes) {
      stopped = true;
      options.onBudgetExceeded?.('nodes', context);
      return;
    }
    if (depth > maxDepth) {
      stopped = true;
      options.onBudgetExceeded?.('depth', context);
      return;
    }
    if (depth > stats.depth) stats.depth = depth;
    if (!structural) stats.contents += 1;

    if (options.onText) {
      for (const field of NOTEBOOK_TEXT_FIELDS) {
        if (Object.hasOwn(node, field)) options.onText(context, field, node[field]);
      }
    }
    if (options.onNode && options.onNode(context) === false) return;

    let hasContainerList = false;
    for (const key of NOTEBOOK_CONTAINERS) {
      if (!Object.hasOwn(node, key)) continue;
      const list = node[key];
      const isArray = Array.isArray(list);
      options.onContainer?.(context, key, list, isArray);
      if (!isArray) continue;
      hasContainerList = true;
      const childPath = path ? `${path} › ${key}` : key;
      for (let i = 0; i < list.length && !stopped; i++) {
        const child = list[i];
        if (!isRecord(child)) {
          options.onInvalidNode?.(context, child, i, key);
          continue;
        }
        visit(child, `${childPath}[${i}]`, depth + 1, key, i, childPath);
      }
    }
    if (hasContainerList) stats.containers += 1;
  };

  for (let i = 0; i < nodes.length && !stopped; i++) {
    const node = nodes[i];
    if (!isRecord(node)) {
      options.onInvalidNode?.(null, node, i, null);
      continue;
    }
    visit(node, `lessons[${i}]`, 0, null, i, 'lessons');
  }

  return stats;
}
