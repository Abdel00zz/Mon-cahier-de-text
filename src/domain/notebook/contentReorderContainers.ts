import type { Draft } from 'immer';
import type { Indices, LessonsData, TopLevelItem } from '../../types';

type ItemHolder = { items?: unknown[]; sections?: unknown[]; subsections?: unknown[]; subsubsections?: unknown[] };

/** Chemins des nœuds qui portent une liste `items`, dans l'ordre de lecture du tableau :
 *  les éléments d'un nœud précèdent ses sous-titres (voir `buildLessonRows`). */
export function collectItemContainers(chapter: TopLevelItem, chapterIndex: number): Indices[] {
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

export function resolveContainer(data: LessonsData | Draft<LessonsData>, path: Indices): ItemHolder | null {
  let node = (data as unknown as ItemHolder[])[path.chapterIndex] as ItemHolder | undefined;
  if (node && path.sectionIndex !== undefined) node = node.sections?.[path.sectionIndex] as ItemHolder | undefined;
  if (node && path.subsectionIndex !== undefined) node = node.subsections?.[path.subsectionIndex] as ItemHolder | undefined;
  if (node && path.subsubsectionIndex !== undefined) node = node.subsubsections?.[path.subsubsectionIndex] as ItemHolder | undefined;
  return node ?? null;
}

