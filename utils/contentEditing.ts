import type { Draft } from 'immer';
import type { Indices, LessonsData } from '../types';
import { findItem } from './dataUtils';
import { indicesKey, type LessonRow } from './lessonRows';
import { groupLessonRows, type RenderRow } from './tableRows';
import { contentFields, type ContentDraft } from './contentDraft';
import { TOP_LEVEL_TYPE_CONFIG } from '../constants';

export type ContentEditTargets = ReadonlyMap<string, readonly Indices[]>;

/** Même moteur que le tableau. Une cellule de contenu fusionnée constitue
 * une seule cible d'édition ; une date partagée ne fusionne pas les contenus. */

/** Variante acceptant les `RenderRow[]` déjà calculés — permet de factoriser
 *  un seul appel à `groupLessonRows` entre cibles de contenu et de séance. */
export function buildContentEditTargetsGrouped(renderRows: readonly RenderRow[]): ContentEditTargets {
  const targets = new Map<string, readonly Indices[]>();
  for (const row of renderRows) {
    if (row.kind === 'session' && row.items[0].dateMerge?.mergeType === 'content') {
      const group = row.items.map(item => item.indices);
      for (const item of row.items) targets.set(item.key, group);
    } else {
      const items = row.kind === 'session' ? row.items : [row.item];
      for (const item of items) targets.set(item.key, [item.indices]);
    }
  }
  return targets;
}

/** Une sélection partielle d'un même contenu cible aussi ses occurrences
 * masquées par la recherche. Des contenus distincts ne sont jamais écrasés. */
export function resolveContentEditSelection(targets: ContentEditTargets, keys: ReadonlySet<string>): readonly Indices[] | null {
  let group: readonly Indices[] | null = null;
  for (const key of keys) {
    const candidate = targets.get(key);
    if (!candidate || (group && candidate !== group)) return null;
    group = candidate;
  }
  return group;
}

/** L'ajout après une cellule reste après son groupe complet, même si une
 * recherche par date n'en laisse apparaître qu'une occurrence. */
export function expandContentSelection(targets: ContentEditTargets, keys: ReadonlySet<string>): ReadonlySet<string> {
  const expanded = new Set<string>();
  for (const key of keys) {
    const group = targets.get(key);
    if (group) for (const indices of group) expanded.add(indicesKey(indices));
    else expanded.add(key); // Une coordonnée invalide reste détectable par l'appelant.
  }
  return expanded;
}

/** Une seule mutation Immer pour tout le groupe, annulable en une action.
 * Valide toutes les coordonnées avant d'écrire et exclut les métadonnées. */
export function applyContentEdit(draft: Draft<LessonsData>, targets: readonly Indices[], patch: ContentDraft): boolean {
  const keys = new Set<string>();
  const items = targets.map(indices => {
    keys.add(indicesKey(indices));
    return findItem(draft, indices).item;
  });
  if (items.length === 0 || keys.size !== items.length || items.some(item => !item)) return false;
  for (const item of items) {
    if (!item) continue;
    const type = 'type' in item ? String(item.type) : '';
    const titleOnly = 'name' in item || Object.hasOwn(TOP_LEVEL_TYPE_CONFIG, type);
    const fields = contentFields(type, titleOnly, 'name' in item ? 'name' : 'title');
    for (const field of fields) {
      if (Object.hasOwn(patch, field)) Object.assign(item, { [field]: patch[field] });
    }
  }
  return true;
}


/**
 * Cible « UNE SEULE LIGNE » du tableau : toutes les lignes d'une séance
 * fusionnée — même date, ou même contenu répété — forment un seul bloc.
 *
 * C'est la cible de la REMARQUE et du DÉPLACEMENT : tant qu'elles sont
 * combinées, elles s'annotent et bougent ensemble. L'édition de contenu garde
 * sa propre cible (`buildContentEditTargets`) : une date partagée ne doit
 * jamais écraser des contenus distincts.
 */
/** Même carte de cibles, à partir d'un groupement DÉJÀ calculé : l'éditeur
 *  ne refait pas `groupLessonRows` une seconde fois pour rien. */
export function buildSessionTargetsGrouped(renderRows: readonly RenderRow[]): ContentEditTargets {
  const targets = new Map<string, readonly Indices[]>();
  for (const row of renderRows) {
    const items = row.kind === 'session' ? row.items : [row.item];
    const group = items.map(item => item.indices);
    for (const item of items) targets.set(item.key, group);
  }
  return targets;
}

/** Entrée publique : un groupement est calculé à la demande. */
export const buildSessionTargets = (rows: LessonRow[]): ContentEditTargets =>
  buildSessionTargetsGrouped(groupLessonRows(rows).renderRows);

/**
 * Écrit la remarque de la cible en UNE seule mutation Immer (donc une seule
 * annulation) : la séance fusionnée reste une seule ligne, même si elle
 * contient plusieurs contenus. Une remarque vide supprime le champ, ce qui
 * garde le JSON du cahier propre.
 */
export function applyRemarkEdit(draft: Draft<LessonsData>, targets: readonly Indices[], remark: string): boolean {
  const keys = new Set<string>();
  const items = targets.map(indices => {
    keys.add(indicesKey(indices));
    return findItem(draft, indices).item;
  });
  if (items.length === 0 || keys.size !== items.length || items.some(item => !item)) return false;
  for (const item of items) {
    const holder = item as { remark?: string };
    if (remark.trim()) holder.remark = remark;
    else delete holder.remark;
  }
  return true;
}

/** Profondeur d'une coordonnée : plus le chiffre est grand, plus la ligne est
 *  loin de la racine. Sert à retirer les descendants avant leurs ancêtres. */
const depthOf = (indices: Indices): number =>
  indices.itemIndex !== undefined ? 4
    : indices.subsubsectionIndex !== undefined ? 3
      : indices.subsectionIndex !== undefined ? 2
        : indices.sectionIndex !== undefined ? 1
          : 0;

/**
 * Ordre de suppression : **le plus profond d'abord**, puis de la fin vers le
 * début. Sans cela, supprimer un parent décale les coordonnées de ses
 * descendants et le lot suivant retire une autre ligne que celle visée.
 */
export function orderDeletionsDeepestFirst(indices: readonly Indices[]): Indices[] {
  return [...indices].sort((a, b) => {
    const byDepth = depthOf(b) - depthOf(a);
    if (byDepth !== 0) return byDepth;
    if (a.chapterIndex !== b.chapterIndex) return b.chapterIndex - a.chapterIndex;
    if ((a.sectionIndex ?? -1) !== (b.sectionIndex ?? -1)) return (b.sectionIndex ?? -1) - (a.sectionIndex ?? -1);
    if ((a.subsectionIndex ?? -1) !== (b.subsectionIndex ?? -1)) return (b.subsectionIndex ?? -1) - (a.subsectionIndex ?? -1);
    if ((a.subsubsectionIndex ?? -1) !== (b.subsubsectionIndex ?? -1)) return (b.subsubsectionIndex ?? -1) - (a.subsubsectionIndex ?? -1);
    return (b.itemIndex ?? -1) - (a.itemIndex ?? -1);
  });
}
