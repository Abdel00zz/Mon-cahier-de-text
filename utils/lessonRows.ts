import type { ElementType, Indices, LessonsData, LessonItem, Section, Separator, SubSection, SubSubSection, TopLevelItem } from '../types';

type LessonNode = TopLevelItem | Section | SubSection | SubSubSection | LessonItem;
export interface LessonRow {
  data: LessonNode | Separator;
  indices: Indices;
  elementType: ElementType;
  key: string;
  /** Original preorder position: filtering must not join unrelated sessions. */
  position: number;
  ancestorKeys: string[];
}

export const indicesKey = (idx: Indices): string =>
  `${idx.chapterIndex}|${idx.sectionIndex ?? ''}|${idx.subsectionIndex ?? ''}|${idx.subsubsectionIndex ?? ''}|${idx.itemIndex ?? ''}|${idx.isSeparator ? 1 : 0}`;

const blockTypes = new Set<string>(['chapter', 'evaluation_diagnostic', 'devoir_maison', 'controle_continu', 'correction_devoir_maison', 'correction_controle_continu']);

/** Shared screen/print traversal. Coordinates always address the source tree. */
export function buildLessonRows(data: LessonsData): LessonRow[] {
  const rows: LessonRow[] = [];
  const visit = (node: LessonNode, indices: Indices, elementType: ElementType, ancestorKeys: string[]) => {
    const key = indicesKey(indices);
    rows.push({ data: node, indices, elementType, key, position: rows.length, ancestorKeys });
    const ancestors = [...ancestorKeys, key];
    if ('items' in node) node.items?.forEach((item, itemIndex) =>
      visit(item, { ...indices, itemIndex }, blockTypes.has(item.type) ? item.type as ElementType : 'item', ancestors));
    if ('sections' in node) node.sections?.forEach((section, sectionIndex) =>
      visit(section, { ...indices, sectionIndex }, 'section', ancestors));
    if ('subsections' in node) node.subsections?.forEach((section, subsectionIndex) =>
      visit(section, { ...indices, subsectionIndex }, 'subsection', ancestors));
    if ('subsubsections' in node) node.subsubsections?.forEach((section, subsubsectionIndex) =>
      visit(section, { ...indices, subsubsectionIndex }, 'subsubsection', ancestors));
    if (node.separatorAfter) {
      const separatorIndices = { ...indices, isSeparator: true };
      rows.push({ data: node.separatorAfter, indices: separatorIndices, elementType: 'separator', key: indicesKey(separatorIndices), position: rows.length, ancestorKeys: ancestors });
    }
  };
  data.forEach((node, chapterIndex) => visit(node, { chapterIndex }, node.type, []));
  return rows;
}

const searchFields = ['title', 'description', 'remark', 'number', 'page', 'name', 'content', 'date'] as const;

export function filterLessonRows(rows: LessonRow[], searchQuery: string): LessonRow[] {
  const query = searchQuery.trim().toLocaleLowerCase();
  if (!query) return rows;
  const visible = new Set<string>();
  for (const row of rows) {
    const record = row.data as unknown as Record<string, unknown>;
    if (searchFields.some(field => {
      const value = record[field];
      return (typeof value === 'string' || typeof value === 'number') && String(value).toLocaleLowerCase().includes(query);
    })) {
      visible.add(row.key);
      row.ancestorKeys.forEach(key => visible.add(key));
    }
  }
  return rows.filter(row => visible.has(row.key));
}
