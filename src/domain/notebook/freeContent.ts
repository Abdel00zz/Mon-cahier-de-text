import type { Draft } from 'immer';
import type { Indices, LessonItem, LessonsData, TopLevelItem } from '../../types';
import { addTopLevelItem, findItem } from './dataUtils';
import { FREE_TYPE } from './freeLineType';

/**
 * Création CONTEXTUELLE d'une ligne libre : elle naît à l'endroit exact de
 * l'élément visé, plus jamais renvoyée à la racine du cahier.
 *
 *  - ancre = ligne de contenu → posée juste après elle, dans sa propre liste ;
 *  - ancre = titre (chapitre, section, sous-section) → premier enfant, donc
 *    directement sous le titre, avant le reste de son contenu ;
 *  - ancre absente → après le dernier chapitre, comme auparavant.
 *
 * Elle reste « hors plan » : `isFreeContent` la reconnaît par son TYPE, jamais
 * par sa position, donc le fait d'avoir un parent ne la fait pas entrer dans la
 * hiérarchie (aucun numéro, aucune progression, aucun effet sur les chapitres).
 */
export function insertFreeContent(
  draft: Draft<LessonsData>,
  anchor: Indices | undefined,
  content: { title?: string; description?: string },
  id: string
) {
  // Annotation explicite : sans elle, le type littéral s'élargirait en `string`.
  const row: LessonItem = { type: FREE_TYPE, title: content.title ?? '', description: content.description ?? '', _tempId: id };
  // Même ligne, mais à la racine : c'est alors une entrée de premier niveau.
  const topRow: TopLevelItem = { type: FREE_TYPE, title: content.title ?? '', description: content.description ?? '', _tempId: id };

  if (!anchor) {
    addTopLevelItem(draft, topRow);
    return;
  }

  const located = findItem(draft, anchor);
  if (!located.item || !Array.isArray(located.parent) || typeof located.targetIndex !== 'number') {
    addTopLevelItem(draft, topRow, anchor.chapterIndex);
    return;
  }

  // Ancre = TITRE de structure (chapitre, section, évaluation…) : la ligne se
  // lit juste sous ce titre. Une autre ligne libre n'est jamais un parent.
  const anchorIsStructure = anchor.itemIndex === undefined
    && ('name' in located.item || (located.item as { type?: unknown }).type !== FREE_TYPE);
  if (anchorIsStructure) {
    const container = located.item as { items?: LessonItem[] };
    if (!Array.isArray(container.items)) container.items = [];
    container.items.unshift(row);
    return;
  }

  // Ancre = ligne de contenu : insertion juste après, dans le même parent.
  located.parent.splice(located.targetIndex + 1, 0, row);
}
