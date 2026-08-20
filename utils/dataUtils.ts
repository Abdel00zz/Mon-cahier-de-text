import { produce, Draft } from 'immer';
import { LessonsData, Indices, TopLevelItem, LessonItem, Section, SubSection, SubSubSection, EmbeddableTopLevelItem } from '../types.js';
import { logger } from './logger.js';
import { memoize } from './performance.js';

type DataItem = TopLevelItem | Section | SubSection | SubSubSection | LessonItem;

/**
 * Nombre d'occurrences d'un type récurrent (devoir_maison, controle_continu…)
 * dans tout le cahier : blocs de premier niveau ET éléments imbriqués
 * (EmbeddableTopLevelItem dans les items d'une section). Sert à
 * l'auto-numérotation des titres (« Contrôle continu 2 »), comptage de
 * l'arbre réel plutôt qu'un compteur séparé à synchroniser.
 */
export const countOccurrencesOfType = (data: LessonsData, type: string): number => {
    let count = 0;
    const countItems = (items?: (LessonItem | EmbeddableTopLevelItem)[]): void => {
        for (const item of items ?? []) {
            if (item.type === type) count += 1;
        }
    };
    for (const block of data) {
        if (block.type === type) count += 1;
        countItems(block.items);
        for (const section of block.sections ?? []) {
            countItems(section.items);
            for (const subsection of section.subsections ?? []) {
                countItems(subsection.items);
                for (const subsubsection of subsection.subsubsections ?? []) {
                    countItems(subsubsection.items);
                }
            }
        }
    }
    return count;
};

export const findItem = (data: LessonsData | any, indices: Indices): { item: DataItem | null, parent: DataItem | any[] | null, targetIndex: number | string | null } => {
    if (indices.chapterIndex === undefined || !data[indices.chapterIndex]) {
        return { item: null, parent: null, targetIndex: null };
    }
    
    let parent: any = data;
    let item: any = data[indices.chapterIndex];
    let targetIndex: number | string = indices.chapterIndex;

    if (indices.sectionIndex !== undefined) {
        if (!item.sections?.[indices.sectionIndex]) return { item: null, parent: null, targetIndex: null };
        parent = item.sections;
        targetIndex = indices.sectionIndex;
        item = parent[targetIndex];
    }

    if (indices.subsectionIndex !== undefined) {
        if (!item.subsections?.[indices.subsectionIndex]) return { item: null, parent: null, targetIndex: null };
        parent = item.subsections;
        targetIndex = indices.subsectionIndex;
        item = parent[targetIndex];
    }
    
    if (indices.subsubsectionIndex !== undefined) {
        if (!item.subsubsections?.[indices.subsubsectionIndex]) return { item: null, parent: null, targetIndex: null };
        parent = item.subsubsections;
        targetIndex = indices.subsubsectionIndex;
        item = parent[targetIndex];
    }
    
    if (indices.itemIndex !== undefined) {
        if (!item.items?.[indices.itemIndex]) return { item: null, parent: null, targetIndex: null };
        parent = item.items;
        targetIndex = indices.itemIndex;
        item = parent[targetIndex];
    }

    if (indices.isSeparator) {
      const container = item;
      return { item: container?.separatorAfter ?? null, parent: container, targetIndex: 'separatorAfter' };
    }
    
    return { item, parent, targetIndex };
};


export const addTopLevelItem = (draft: Draft<LessonsData>, newItem: TopLevelItem, insertAfterIndex?: number): void => {
    // Initialiser les sections pour les chapitres et les évaluations
    if ((newItem.type === 'chapter' || newItem.type.startsWith('evaluation_') || newItem.type.startsWith('devoir_') || newItem.type.startsWith('controle_') || newItem.type.startsWith('correction_')) && !newItem.sections) {
        (newItem as any).sections = [];
    }
    // Un chapitre peut recevoir des items directement (sans section).
    if (newItem.type === 'chapter' && !newItem.items) {
        (newItem as any).items = [];
    }
    const index = insertAfterIndex !== undefined ? insertAfterIndex + 1 : draft.length;
    draft.splice(index, 0, newItem);
};

export const addSection = (draft: Draft<LessonsData>, chapterIndices: Indices, newSection: Section, insertAfterIndex?: number): void => {
    const { item: topLevelItem } = findItem(draft, { chapterIndex: chapterIndices.chapterIndex });
    if (topLevelItem && 'sections' in topLevelItem && 
        (topLevelItem.type === 'chapter' || 
         topLevelItem.type.startsWith('evaluation_') || 
         topLevelItem.type.startsWith('devoir_') || 
         topLevelItem.type.startsWith('controle_') || 
         topLevelItem.type.startsWith('correction_'))) {
        
        if (!topLevelItem.sections) {
            topLevelItem.sections = [];
        }
        if (!newSection.items) {
            newSection.items = [];
        }
        const index = insertAfterIndex !== undefined ? insertAfterIndex + 1 : topLevelItem.sections.length;
        topLevelItem.sections.splice(index, 0, newSection);
    }
};

export const addSubSection = (draft: Draft<LessonsData>, sectionIndices: Indices, newSubSection: SubSection, insertAfterIndex?: number): void => {
    const { item: section } = findItem(draft, {
        chapterIndex: sectionIndices.chapterIndex,
        sectionIndex: sectionIndices.sectionIndex,
    });
    if (section && sectionIndices.sectionIndex !== undefined) {
        const target = section as Section;
        if (!target.subsections) target.subsections = [];
        if (!newSubSection.items) newSubSection.items = [];
        const index = insertAfterIndex !== undefined ? insertAfterIndex + 1 : target.subsections.length;
        target.subsections.splice(index, 0, newSubSection);
    }
};

export const addSubSubSection = (draft: Draft<LessonsData>, subSectionIndices: Indices, newSubSubSection: SubSubSection, insertAfterIndex?: number): void => {
    const { item: subSection } = findItem(draft, {
        chapterIndex: subSectionIndices.chapterIndex,
        sectionIndex: subSectionIndices.sectionIndex,
        subsectionIndex: subSectionIndices.subsectionIndex,
    });
    if (subSection && subSectionIndices.subsectionIndex !== undefined) {
        const target = subSection as SubSection;
        if (!target.subsubsections) target.subsubsections = [];
        if (!newSubSubSection.items) newSubSubSection.items = [];
        const index = insertAfterIndex !== undefined ? insertAfterIndex + 1 : target.subsubsections.length;
        target.subsubsections.splice(index, 0, newSubSubSection);
    }
};

export const addItem = (draft: Draft<LessonsData>, parentIndices: Indices, newItem: LessonItem | EmbeddableTopLevelItem, insertAfterIndex?: number): void => {
    const { item: container } = findItem(draft, parentIndices);
    // Un conteneur peut recevoir des items : chapitre (type 'chapter'), section,
    // sous-section ou sous-sous-section. Les items sont initialisés à la volée.
    const isItemsContainer = !!container && (
        'items' in container || (container as any).type === 'chapter'
    );
    if (!isItemsContainer || !container) return;

    const target = container as unknown as { items?: (LessonItem | EmbeddableTopLevelItem)[] };
    if (!target.items) target.items = [];
    // If inserting into a section without a specific item reference, add to the top.
    // Otherwise, insert after the specified item.
    const index = insertAfterIndex !== undefined ? insertAfterIndex + 1 : 0;
    target.items.splice(index, 0, newItem);
};

/** Champ d'index le plus profond défini pour un jeu d'indices donné. */
const deepestIndexKey = (indices: Indices): keyof Indices => {
    if (indices.itemIndex !== undefined) return 'itemIndex';
    if (indices.subsubsectionIndex !== undefined) return 'subsubsectionIndex';
    if (indices.subsectionIndex !== undefined) return 'subsectionIndex';
    if (indices.sectionIndex !== undefined) return 'sectionIndex';
    return 'chapterIndex';
};

/**
 * Déplace un élément d'un cran vers le haut ou le bas PARMI SES FRÈRES
 * (même parent). Renvoie les nouveaux indices pour préserver la sélection,
 * ou null si le déplacement est impossible (bord, séparateur, introuvable).
 */
export const moveWithinParent = (
    draft: Draft<LessonsData>,
    indices: Indices,
    direction: 'up' | 'down'
): Indices | null => {
    if (indices.isSeparator) return null;
    const { parent, targetIndex } = findItem(draft, indices);
    if (!Array.isArray(parent) || typeof targetIndex !== 'number') return null;

    const newIndex = direction === 'up' ? targetIndex - 1 : targetIndex + 1;
    if (newIndex < 0 || newIndex >= parent.length) return null;

    const [moved] = parent.splice(targetIndex, 1);
    parent.splice(newIndex, 0, moved);

    return { ...indices, [deepestIndexKey(indices)]: newIndex };
};

/** Indique si un élément peut se déplacer dans la direction donnée (bord de liste ?). */
export const canMoveWithinParent = (
    data: LessonsData,
    indices: Indices,
    direction: 'up' | 'down'
): boolean => {
    if (indices.isSeparator) return false;
    const { parent, targetIndex } = findItem(data, indices);
    if (!Array.isArray(parent) || typeof targetIndex !== 'number') return false;
    return direction === 'up' ? targetIndex > 0 : targetIndex < parent.length - 1;
};

export const deleteSeparator = (draft: Draft<LessonsData>, itemIndices: Indices): void => {
    const { item } = findItem(draft, itemIndices);
    if (item && 'separatorAfter' in item) {
        delete item.separatorAfter;
    }
};

/**
 * Supprime un titre structurel (section, sous-section ou sous-sous-section) en
 * remontant son contenu au niveau supérieur : ses éléments sont rattachés au
 * parent et ses sous-titres montent d'un cran, sans perdre aucune donnée.
 * Renvoie `true` quand la suppression a été réalisée par remontée ; `false`
 * pour une feuille (item), un séparateur ou un chapitre (suppression complète).
 */
export const deleteStructuralNodePromotingChildren = (
    draft: Draft<LessonsData>,
    indices: Indices,
): boolean => {
    if (indices.isSeparator || indices.itemIndex !== undefined) return false;

    // Sous-sous-section : ses items remontent dans la sous-section parente.
    if (indices.subsubsectionIndex !== undefined) {
        const subsection = draft[indices.chapterIndex]?.sections?.[indices.sectionIndex!]
            ?.subsections?.[indices.subsectionIndex!];
        const node = subsection?.subsubsections?.[indices.subsubsectionIndex];
        if (!subsection?.subsubsections || !node) return false;
        const items = node.items ?? [];
        subsection.subsubsections.splice(indices.subsubsectionIndex, 1);
        if (items.length > 0) {
            subsection.items ??= [];
            subsection.items.push(...items);
        }
        return true;
    }

    // Sous-section : ses sous-sous-sections deviennent des sous-sections et
    // ses items remontent dans la section parente.
    if (indices.subsectionIndex !== undefined) {
        const section = draft[indices.chapterIndex]?.sections?.[indices.sectionIndex!];
        const node = section?.subsections?.[indices.subsectionIndex];
        if (!section?.subsections || !node) return false;
        const promoted = node.subsubsections ?? [];
        const items = node.items ?? [];
        section.subsections.splice(indices.subsectionIndex, 1, ...promoted);
        if (items.length > 0) {
            section.items ??= [];
            section.items.push(...items);
        }
        return true;
    }

    // Section : ses sous-sections deviennent des sections (le champ
    // `subsubsections` devient `subsections`) et ses items remontent.
    if (indices.sectionIndex !== undefined) {
        const chapter = draft[indices.chapterIndex];
        const node = chapter?.sections?.[indices.sectionIndex];
        if (!chapter?.sections || !node) return false;
        const promoted: Section[] = (node.subsections ?? []).map((sub) => {
            const { subsubsections, ...rest } = sub;
            return { ...rest, subsections: subsubsections ?? [] };
        });
        const items = node.items ?? [];
        chapter.sections.splice(indices.sectionIndex, 1, ...promoted);
        if (items.length > 0) {
            chapter.items ??= [];
            chapter.items.push(...items);
        }
        return true;
    }

    // Chapitre : suppression complète gérée par l'appelant.
    return false;
};

// Compact date formatter: returns dd/mm/yyyy from ISO (yyyy-mm-dd) without timezone shifts
export const formatDateDDMMYYYY = memoize((dateString: string): string | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    // Prefer strict ISO split to avoid local timezone issues
    const m = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        const [, y, mo, d] = m;
        return `${d}/${mo}/${y}`;
    }
    // Fallback: try to parse a general date string
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = String(date.getFullYear());
        return `${dd}/${mm}/${yyyy}`;
    } catch {
        return null;
    }
});

export const migrateLessonsData = (data: any): LessonsData => {
    if (!Array.isArray(data)) {
        logger.warn("Migration attempted on non-array data. Returning empty array.", data);
        return [];
    }

    return produce(data, draft => {
        draft.forEach((item: any, index: number) => {
            if (typeof item !== 'object' || item === null) {
                logger.error(`Invalid data at index ${index}, skipping.`, item);
                return;
            }

            // Case 1: Oldest format with 'chapter' property (string) instead of 'title'
            if (typeof item.chapter === 'string' && item.title === undefined) {
                item.title = item.chapter;
                delete item.chapter;
            }

            // Case 2: Missing 'type' property. Default to 'chapter'.
            if (item.type === undefined) {
                item.type = 'chapter';
            }

            // Ensure title is a string. If it's missing or not a string, set to empty string.
            if (typeof item.title !== 'string') {
                item.title = '';
            }
        });
    }) as LessonsData;
};

export const flattenLessons = (data: LessonsData) => {
    const flat: { data: any, indices: Indices, elementType: string }[] = [];
    
    const processElement = (element: any, indices: Indices, elementType: string) => {
        flat.push({ data: element, indices, elementType });

        // Items directement sous un nœud AVANT les sous-niveaux (ordre pédagogique).
        if (element.items?.length > 0) {
            element.items.forEach((item: any, i: number) => processElement(item, { ...indices, itemIndex: i }, item.type === 'chapter' ? 'chapter' : 'item'));
        }
        if (element.sections?.length > 0) {
            element.sections.forEach((sec: any, i: number) => processElement(sec, { ...indices, sectionIndex: i }, 'section'));
        }
        if (element.subsections?.length > 0) {
            element.subsections.forEach((sub: any, i: number) => processElement(sub, { ...indices, subsectionIndex: i }, 'subsection'));
        }
        if (element.subsubsections?.length > 0) {
            element.subsubsections.forEach((ssub: any, i: number) => processElement(ssub, { ...indices, subsubsectionIndex: i }, 'subsubsection'));
        }
    };

    data.forEach((topLevelItem, chapterIndex) => {
        processElement(topLevelItem, { chapterIndex }, topLevelItem.type || 'chapter');
    });
    
    return flat;
};
