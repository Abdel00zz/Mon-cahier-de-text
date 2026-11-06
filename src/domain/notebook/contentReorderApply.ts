import { isDraft, original, type Draft } from 'immer';
import type { LessonsData } from '../../types';
import { findItem } from './dataUtils';
import type { ContentMovePlan, ContentRelocationPlan, ContentTransferPlan } from './contentReorderModel';
import { resolveContainer } from './contentReorderContainers';

/** Both kinds of drop use one atomic undoable editor mutation. */
export function applyContentDrop(draft: Draft<LessonsData>, plan: ContentMovePlan | ContentTransferPlan): boolean {
  return 'source' in plan ? applyContentTransfer(draft, plan) : applyContentMove(draft, plan);
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

/** Retire le bloc de sa liste et l'insère dans le conteneur d'arrivée (ou à la racine), en une seule transaction.
 *  La cible est résolue AVANT le retrait, et le bloc revient à sa place au moindre incident. */
export function applyContentTransfer(draft: Draft<LessonsData>, plan: ContentTransferPlan): boolean {
  const sourceParent = findItem(draft, plan.source.anchor).parent;
  const resolvedSource = isDraft(sourceParent) ? original(sourceParent) : sourceParent;
  if (!Array.isArray(sourceParent) || resolvedSource !== plan.source.parent) return false;
  const holder = plan.container ? resolveContainer(draft, plan.container) : null;
  if (plan.container && !holder) return false;

  const removed = sourceParent.splice(plan.source.start, plan.source.count);
  const restore = () => { sourceParent.splice(plan.source.start, 0, ...removed); return false; };
  if (removed.length !== plan.source.count) return restore();
  try {
    const list = holder ? (holder.items ??= []) : (draft as unknown[]);
    list.splice(Math.min(plan.index, list.length), 0, ...removed);
    return true;
  } catch {
    return restore();
  }
}
