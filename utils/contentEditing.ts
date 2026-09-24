import type { Draft } from 'immer';
import type { Indices, LessonsData } from '../types';
import { findItem } from './dataUtils';
import { indicesKey, type LessonRow } from './lessonRows';
import { groupLessonRows } from './tableRows';
import { contentFields, type ContentDraft } from './contentDraft';
import { TOP_LEVEL_TYPE_CONFIG } from '../constants';

export type ContentEditTargets = ReadonlyMap<string, readonly Indices[]>;

/** Même moteur que le tableau. Une cellule de contenu fusionnée constitue
 * une seule cible d'édition ; une date partagée ne fusionne pas les contenus. */
export function buildContentEditTargets(rows: LessonRow[]): ContentEditTargets {
  const targets = new Map<string, readonly Indices[]>();
  for (const row of groupLessonRows(rows).renderRows) {
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
