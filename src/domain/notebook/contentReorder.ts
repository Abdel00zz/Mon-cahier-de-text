import { isDraft, original, type Draft } from 'immer';
import type { Indices, LessonsData, TopLevelItem } from '../../types';
import { findItem } from './dataUtils';
import { buildLessonRows, indicesKey } from './lessonRows';
import { isFreeContent } from './freeLineType';
import type { ContentEditTargets } from './contentEditing';

export interface ContentMovePlan {
  anchor: Indices;
  parent: readonly unknown[];
  start: number;
  count: number;
  destination: number;
  selection: Indices[];
}

const getIndexField = (indices: Indices): keyof Indices => {
  const fields = ['itemIndex', 'subsubsectionIndex', 'subsectionIndex', 'sectionIndex', 'chapterIndex'] as const;
  return fields.find(field => indices[field] !== undefined)!;
};

/**
 * Valide et extrait un bloc contigu d'éléments situés strictement dans la même liste parente.
 */
function getContiguousSiblingBlock(data: LessonsData, indices: readonly Indices[]) {
  if (indices.length === 0) return null;

  // Localiser tous les éléments pointés par la sélection
  const located = indices.map(index => ({ index, ...findItem(data, index) }));
  
  // Vérifier qu'ils existent tous
  if (located.some(row => !row.item || typeof row.targetIndex !== 'number')) return null;

  const firstParent = located[0].parent;
  if (!Array.isArray(firstParent)) return null;

  // Règle d'or : On ne déplace pas simultanément des éléments issus de parents/branches différents.
  if (located.some(row => row.parent !== firstParent)) return null;

  // Trier par ordre d'apparition dans le parent
  const sorted = located.sort((a, b) => Number(a.targetIndex) - Number(b.targetIndex));
  const start = Number(sorted[0].targetIndex);
  const count = sorted.length;

  // Vérifier qu'il n'y a aucun trou dans la sélection (contiguïté stricte)
  const hasGaps = sorted.some((row, offset) => row.targetIndex !== start + offset);
  if (hasGaps) return null;

  return { 
    parent: firstParent, 
    start, 
    count, 
    anchor: sorted[0].index 
  };
}

/** 
 * Construit un plan de déplacement pour décaler un bloc d'un cran vers le haut ou le bas.
 * Intègre intelligemment les fusions : si une cellule sélectionnée appartient à un groupe,
 * tout le groupe est englobé dans le plan.
 */
export function planContentMove(
  data: LessonsData, 
  groups: ContentEditTargets, 
  selectedKeys: ReadonlySet<string>, 
  direction: 'up' | 'down'
): ContentMovePlan | null {
  // 1. Récupérer et dédupliquer les groupes d'indices correspondant à la sélection visuelle
  const selectedGroups = new Set<readonly Indices[]>();
  for (const key of selectedKeys) {
    const group = groups.get(key);
    if (!group) return null; // Clé orpheline, annule l'opération par sécurité
    selectedGroups.add(group);
  }

  // 2. Extraire le bloc contigu correspondant
  const block = getContiguousSiblingBlock(data, [...selectedGroups].flat());
  if (!block) return null; // Sélections non contiguës ou cross-parents impossibles à déplacer d'un bloc

  // 3. Identifier l'élément voisin (celui avec qui on va permuter)
  const field = getIndexField(block.anchor);
  const neighbourTargetIndex = direction === 'up' ? block.start - 1 : block.start + block.count;
  
  // Si on est aux extrémités du parent, on ne peut pas déborder dans le chapitre suivant (limite structurelle)
  if (neighbourTargetIndex < 0 || neighbourTargetIndex >= block.parent.length) return null;

  // 4. Cibler le voisin
  const neighbourIndices = { ...block.anchor, [field]: neighbourTargetIndex };
  const neighbourGroup = groups.get(indicesKey(neighbourIndices));
  if (!neighbourGroup) return null;

  const neighbourBlock = getContiguousSiblingBlock(data, neighbourGroup);
  if (!neighbourBlock || neighbourBlock.parent !== block.parent) return null;

  // 5. Vérifier la contiguïté avec le voisin
  const isValidNeighbor = direction === 'up' 
    ? neighbourBlock.start + neighbourBlock.count === block.start 
    : neighbourBlock.start === block.start + block.count;
    
  if (!isValidNeighbor) return null;

  // 6. Calcul de la destination finale
  const destination = direction === 'up' ? neighbourBlock.start : block.start + neighbourBlock.count;
  
  // Nouveaux indices pour que la sélection suive le déplacement
  const selectionAfterMove = Array.from(
    { length: block.count }, 
    (_, offset) => ({ ...block.anchor, [field]: destination + offset })
  );

  return {
    ...block,
    destination,
    selection: selectionAfterMove,
  };
}


/** Nœud de structure : il porte un titre et des enfants, on peut donc s'y poser. */
const hasChildren = (value: unknown): boolean =>
  typeof value === 'object' && value !== null
  && ('items' in value || 'sections' in value || 'subsections' in value || 'subsubsections' in value);

const STRUCTURE_KINDS = new Set<string>(['chapter', 'section', 'subsection', 'subsubsection']);

/** Un titre de structure accueille des éléments même sans clé items (section importée vide) :
 *  on se fie au type du nœud, jamais à la présence de ses listes. */
const isContainerRow = (row: { data: unknown; elementType: string }): boolean =>
  STRUCTURE_KINDS.has(row.elementType) || hasChildren(row.data);

/**
 * Plan de RELOCALISATION d'une ligne libre le long du plan.
 *
 * Contrairement à la permutation entre frères, la ligne libre suit l'ordre de
 * lecture du cahier : elle se pose avant/après une feuille, et **sous un titre**
 * (elle devient alors le premier enfant du bloc), même si cela change son
 * parent. C'est ce qui permet de la glisser juste en dessous d'un titre de
 * paragraphe, d'une proposition ou de n'importe quel type de contenu.
 *
 * Refusé si la sélection n'est pas composée UNIQUEMENT de lignes libres, ou si
 * le bloc source n'est pas un groupe de frères contigus (retrait atomique).
 */
export interface ContentRelocationPlan {
  source: { anchor: Indices; parent: unknown; start: number; count: number };
  /** Repère de lecture : la ligne voisine, et le côté où se poser. */
  neighbour: Indices;
  side: 'before' | 'after' | 'inside';
  /** Coordonnées de la sélection après déplacement. */
  selection: Indices[];
}

const withoutDeepestIndex = (indices: Indices): Indices => {
  const copy: Indices = { ...indices };
  delete copy[getIndexField(indices)];
  return copy;
};

export function planContentRelocation(
  data: LessonsData,
  groups: ContentEditTargets,
  selectedKeys: ReadonlySet<string>,
  direction: 'up' | 'down'
): ContentRelocationPlan | null {
  if (selectedKeys.size === 0) return null;

  const selectedGroups = new Set<readonly Indices[]>();
  for (const key of selectedKeys) {
    const group = groups.get(key);
    if (!group) return null;
    selectedGroups.add(group);
  }
  const indices = [...selectedGroups].flat();

  // Ordinary content uses sibling moves. Reject it before flattening the whole
  // notebook (this path runs twice for every selection, once per direction).
  if (indices.some(index => !isFreeContent(findItem(data, index).item))) return null;

  const rows = buildLessonRows(data);
  const byKey = new Map(rows.map(row => [row.key, row]));
  const selectedRows = indices.map(index => byKey.get(indicesKey(index)));
  // Réservé aux lignes libres : un contenu typé garde la permutation stricte.
  if (selectedRows.some(row => !row || !isFreeContent(row.data))) return null;

  const block = getContiguousSiblingBlock(data, indices);
  if (!block) return null;

  const positions = selectedRows.map(row => row!.position).sort((a, b) => a - b);
  const sourceParent = withoutDeepestIndex(block.anchor);
  let neighbour = rows[direction === 'up' ? positions[0] - 1 : positions[positions.length - 1] + 1];
  // Premier enfant qui monte : le repère de lecture est son propre titre. Se poser « dans » ce
  // titre ne changerait rien (le plan était un faux déplacement). La ligne franchit donc le
  // titre et rejoint la fin du bloc qui le précède.
  let leavesParent = false;
  if (direction === 'up' && neighbour && indicesKey(neighbour.indices) === indicesKey(sourceParent)) {
    neighbour = rows[positions[0] - 2];
    leavesParent = true;
  }
  if (!neighbour) return null;

  const side: ContentRelocationPlan['side'] = isContainerRow(neighbour)
    ? 'inside'
    : direction === 'up' && !leavesParent ? 'before' : 'after';

  const neighbourField = getIndexField(neighbour.indices);
  const neighbourParent = withoutDeepestIndex(neighbour.indices);
  const sameParent = indicesKey(sourceParent) === indicesKey(neighbourParent);

  // Position brute, puis correction si l'insertion visait la liste d'où l'on retire.
  const rawIndex = side === 'inside' ? 0 : Number(neighbour.indices[neighbourField]) + (side === 'after' ? 1 : 0);
  const base = sameParent && side !== 'inside' && rawIndex > block.start
    ? Math.max(block.start, rawIndex - block.count)
    : rawIndex;

  const destinationField: keyof Indices = side === 'inside' ? 'itemIndex' : neighbourField;
  const destinationParent = side === 'inside' ? neighbour.indices : neighbourParent;
  const selection = Array.from({ length: block.count }, (_, offset) => ({
    ...destinationParent,
    [destinationField]: base + offset,
  }));

  return {
    source: { anchor: block.anchor, parent: block.parent, start: block.start, count: block.count },
    neighbour: neighbour.indices,
    side,
    selection,
  };
}

/** Exécute la relocalisation en une seule transaction, avec retour arrière si
 *  la cible a disparu entre-temps (aucune donnée ne doit bouger à moitié).
 *
 *  Le repère de destination est résolu AVANT le retrait : les coordonnées sont
 *  exprimées dans l'arbre d'origine, et c'est le calcul d'insertion qui tient
 *  compte du décalage lorsque les deux listes sont identiques. */
export function applyContentRelocation(draft: Draft<LessonsData>, plan: ContentRelocationPlan): boolean {
  const source = findItem(draft, plan.source.anchor);
  const sourceParent = source.parent;
  const resolvedSource = isDraft(sourceParent) ? original(sourceParent) : sourceParent;
  if (!Array.isArray(sourceParent) || resolvedSource !== plan.source.parent) return false;

  const destination = findItem(draft, plan.neighbour);
  const container = plan.side === 'inside' ? destination.item as { items?: unknown[] } | undefined : undefined;
  const targetParent = plan.side === 'inside' ? null : destination.parent;
  if (plan.side === 'inside') {
    if (!container || typeof container !== 'object') return false;
  } else if (!Array.isArray(targetParent) || typeof destination.targetIndex !== 'number') {
    return false;
  }

  const rawIndex = plan.side === 'inside'
    ? 0
    : Number(destination.targetIndex) + (plan.side === 'after' ? 1 : 0);
  const index = targetParent === sourceParent && rawIndex > plan.source.start
    ? Math.max(plan.source.start, rawIndex - plan.source.count)
    : rawIndex;

  const removed = sourceParent.splice(plan.source.start, plan.source.count);
  if (removed.length !== plan.source.count) return false;

  const restore = () => { sourceParent.splice(plan.source.start, 0, ...removed); return false; };

  try {
    if (container) {
      const items = (container.items ??= []);
      items.unshift(...removed);
      return true;
    }
    (targetParent as unknown[]).splice(index, 0, ...removed);
    return true;
  } catch {
    return restore();
  }
}

/** 
 * Exécute de manière atomique la permutation dans l'état Immer.
 */
export function applyContentMove(draft: Draft<LessonsData>, plan: ContentMovePlan): boolean {
  const { parent } = findItem(draft, plan.anchor);
  
  // Vérification de sécurité : on s'assure qu'on manipule le bon parent
  const resolvedParent = isDraft(parent) ? original(parent) : parent;
  if (!Array.isArray(parent) || resolvedParent !== plan.parent) return false;
  
  // Transaction atomique : Extraction puis réinsertion
  const movedElements = parent.splice(plan.start, plan.count);
  parent.splice(plan.destination, 0, ...movedElements);
  
  return true;
}

/* ── Transfert entre conteneurs ───────────────────────────────────────────────
 * Un contenu typé (exercice, définition…) se permute d'abord avec ses frères. Au bord de sa liste
 * (premier ou dernier élément), il passe au conteneur voisin dans l'ordre de lecture du
 * chapitre : la fin du paragraphe précédent en montant, le début du paragraphe suivant en
 * descendant. Un paragraphe vide, même sans liste `items`, accueille le contenu.
 * Le chapitre reste la limite : changer de chapitre bouscule numérotation et progression. */

/** Types qui ne quittent jamais leur bloc : évaluations, devoirs, corrections et titres. */
const PINNED_TYPES = new Set<string>([
  'chapter', 'evaluation_diagnostic', 'devoir_maison', 'controle_continu',
  'correction_devoir_maison', 'correction_controle_continu',
]);

const isTransferable = (item: unknown): boolean =>
  typeof item === 'object' && item !== null && !PINNED_TYPES.has(String((item as { type?: unknown }).type ?? ''));

export interface ContentTransferPlan {
  source: { anchor: Indices; parent: unknown; start: number; count: number };
  /** Conteneur d'arrivée (chemin sans itemIndex) et position d'insertion dans sa liste `items`. */
  container: Indices;
  index: number;
  /** Coordonnées de la sélection après le transfert. */
  selection: Indices[];
}

type ItemHolder = { items?: unknown[]; sections?: unknown[]; subsections?: unknown[]; subsubsections?: unknown[] };

/** Chemins des nœuds qui portent une liste `items`, dans l'ordre de lecture du tableau :
 *  les éléments d'un nœud précèdent ses sous-titres (voir `buildLessonRows`). */
function collectItemContainers(chapter: TopLevelItem, chapterIndex: number): Indices[] {
  const paths: Indices[] = [];
  const visit = (node: ItemHolder, path: Indices) => {
    paths.push(path);
    node.sections?.forEach((child, sectionIndex) => visit(child as ItemHolder, { ...path, sectionIndex }));
    node.subsections?.forEach((child, subsectionIndex) => visit(child as ItemHolder, { ...path, subsectionIndex }));
    node.subsubsections?.forEach((child, subsubsectionIndex) => visit(child as ItemHolder, { ...path, subsubsectionIndex }));
  };
  visit(chapter as unknown as ItemHolder, { chapterIndex });
  return paths;
}

function resolveContainer(data: LessonsData | Draft<LessonsData>, path: Indices): ItemHolder | null {
  let node = (data as unknown as ItemHolder[])[path.chapterIndex] as ItemHolder | undefined;
  if (node && path.sectionIndex !== undefined) node = node.sections?.[path.sectionIndex] as ItemHolder | undefined;
  if (node && path.subsectionIndex !== undefined) node = node.subsections?.[path.subsectionIndex] as ItemHolder | undefined;
  if (node && path.subsubsectionIndex !== undefined) node = node.subsubsections?.[path.subsubsectionIndex] as ItemHolder | undefined;
  return node ?? null;
}

export function planContentTransfer(
  data: LessonsData,
  groups: ContentEditTargets,
  selectedKeys: ReadonlySet<string>,
  direction: 'up' | 'down'
): ContentTransferPlan | null {
  if (selectedKeys.size === 0) return null;
  const selectedGroups = new Set<readonly Indices[]>();
  for (const key of selectedKeys) {
    const group = groups.get(key);
    if (!group) return null;
    selectedGroups.add(group);
  }
  const indices = [...selectedGroups].flat();
  // Seuls des éléments de contenu changent de conteneur : jamais une section ni un chapitre.
  if (indices.some(index => index.itemIndex === undefined)) return null;

  const block = getContiguousSiblingBlock(data, indices);
  if (!block) return null;
  // Seul le bord de la liste déclenche un transfert : ailleurs, la permutation suffit.
  const atEdge = direction === 'up' ? block.start === 0 : block.start + block.count === block.parent.length;
  if (!atEdge) return null;

  const chapter = data[block.anchor.chapterIndex];
  if (!chapter || chapter.type !== 'chapter') return null;
  if (!block.parent.slice(block.start, block.start + block.count).every(isTransferable)) return null;

  const containers = collectItemContainers(chapter, block.anchor.chapterIndex);
  const sourceKey = indicesKey(withoutDeepestIndex(block.anchor));
  const at = containers.findIndex(path => indicesKey(path) === sourceKey);
  if (at < 0) return null;
  const target = containers[direction === 'up' ? at - 1 : at + 1];
  if (!target) return null;

  const holder = resolveContainer(data, target);
  if (!holder) return null;
  const index = direction === 'up' ? (holder.items?.length ?? 0) : 0;
  return {
    source: { anchor: block.anchor, parent: block.parent, start: block.start, count: block.count },
    container: target,
    index,
    selection: Array.from({ length: block.count }, (_, offset) => ({ ...target, itemIndex: index + offset })),
  };
}

/** Retire le bloc de sa liste et l'insère dans le conteneur d'arrivée, en une seule transaction.
 *  La cible est résolue AVANT le retrait, et le bloc revient à sa place au moindre incident. */
export function applyContentTransfer(draft: Draft<LessonsData>, plan: ContentTransferPlan): boolean {
  const sourceParent = findItem(draft, plan.source.anchor).parent;
  const resolvedSource = isDraft(sourceParent) ? original(sourceParent) : sourceParent;
  if (!Array.isArray(sourceParent) || resolvedSource !== plan.source.parent) return false;
  const holder = resolveContainer(draft, plan.container);
  if (!holder) return false;

  const removed = sourceParent.splice(plan.source.start, plan.source.count);
  const restore = () => { sourceParent.splice(plan.source.start, 0, ...removed); return false; };
  if (removed.length !== plan.source.count) return restore();
  try {
    const list = (holder.items ??= []);
    list.splice(Math.min(plan.index, list.length), 0, ...removed);
    return true;
  } catch {
    return restore();
  }
}