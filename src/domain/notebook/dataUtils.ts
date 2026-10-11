import { separateAbsenceContent } from './separateAbsenceContent.js';
import { produce, Draft } from 'immer';
import { buildLessonRows } from './lessonRows';
import { walkNotebook } from './notebookTraversal.js';
import { LessonsData, Indices, TopLevelItem, LessonItem, Section, SubSection, SubSubSection, EmbeddableTopLevelItem } from '../../types.js';
import { logger } from '../../lib/logger.js';
import { memoize } from '../../lib/memoize.js';

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
    // Un seul parcours, celui du moteur : les sections n'ont pas de `type`,
    // donc seuls les blocs et les items peuvent correspondre.
    walkNotebook(data, { onNode: ({ node }) => { if (node.type === type) count += 1; } });
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

/**
 * Pose un bloc d'épreuve (diagnostic, devoir surveillé, écrit court/global,
 * oral, correction) DIRECTEMENT APRÈS l'élément cliqué — jamais renvoyé en fin
 * de cahier :
 *  - ancre absente → fin du cahier (premier niveau) ;
 *  - ancre = chapitre → juste après ce chapitre (premier niveau) ;
 *  - ancre = ligne de contenu → juste après elle, dans la même liste ;
 *  - ancre = titre de section/sous-section → premier enfant, sous le titre.
 *
 * Le bloc reste « hors plan » : reconnu par son TYPE (`dev-block-<id>` /
 * `event-<id>`), jamais par sa position. Imbriqué, il n'entre pas dans la
 * numérotation du chapitre ; la feuille d'évaluations le reçoit quand même.
 * Le JSON reste souple : on insère dans la liste exacte de l'ancre, sans
 * réinventer la hiérarchie.
 */
export const insertAssessmentBlock = (
  draft: Draft<LessonsData>,
  anchor: Indices | undefined,
  block: TopLevelItem,
): void => {
  if (!anchor) { addTopLevelItem(draft, block); return; }
  const isChapterAnchor = anchor.sectionIndex === undefined && anchor.itemIndex === undefined;
  if (isChapterAnchor) { addTopLevelItem(draft, block, anchor.chapterIndex); return; }
  const located = findItem(draft, anchor);
  if (!located.item || !Array.isArray(located.parent) || typeof located.targetIndex !== 'number') {
    addTopLevelItem(draft, block, anchor.chapterIndex);
    return;
  }
  if (anchor.itemIndex !== undefined) {
    located.parent.splice(located.targetIndex + 1, 0, block as EmbeddableTopLevelItem);
    return;
  }
  const container = located.item as { items?: (LessonItem | EmbeddableTopLevelItem)[] };
  if (!Array.isArray(container.items)) container.items = [];
  container.items.unshift(block as EmbeddableTopLevelItem);
};

export const addSection = (draft: Draft<LessonsData>, chapterIndices: Indices, newSection: Section, insertAfterIndex?: number): void => {
    const { item: topLevelItem } = findItem(draft, { chapterIndex: chapterIndices.chapterIndex });
    if (topLevelItem && 'type' in topLevelItem && 
        (topLevelItem.type === 'chapter' || 
         topLevelItem.type.startsWith('evaluation_') || 
         topLevelItem.type.startsWith('devoir_') || 
         topLevelItem.type.startsWith('controle_') || 
         topLevelItem.type.startsWith('correction_'))) {
        
        const target = topLevelItem as TopLevelItem;
        if (!target.sections) {
            target.sections = [];
        }
        if (!newSection.items) {
            newSection.items = [];
        }
        const index = insertAfterIndex !== undefined ? insertAfterIndex + 1 : target.sections.length;
        target.sections.splice(index, 0, newSection);
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
    const isItemsContainer = !!container && parentIndices.itemIndex === undefined && (
        'name' in container || (container as any).type === 'chapter' || 'sections' in container
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
 * ou null si le déplacement est impossible (bord, introuvable).
 */
export const moveWithinParent = (
    draft: Draft<LessonsData>,
    indices: Indices,
    direction: 'up' | 'down'
): Indices | null => {
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
    const { parent, targetIndex } = findItem(data, indices);
    if (!Array.isArray(parent) || typeof targetIndex !== 'number') return false;
    return direction === 'up' ? targetIndex > 0 : targetIndex < parent.length - 1;
};

/** `descendant` prolonge-t-il `ancestor` dans la hiérarchie des indices ? */
const extendsIndices = (ancestor: Indices, descendant: Indices): boolean => {
    if (descendant.chapterIndex !== ancestor.chapterIndex) return false;
    if (ancestor.sectionIndex === undefined) return true; // le chapitre contient tout ce qui suit
    if (descendant.sectionIndex !== ancestor.sectionIndex) return false;
    if (ancestor.itemIndex !== undefined) return descendant.itemIndex === ancestor.itemIndex; // une feuille n'a pas de descendants
    if (ancestor.subsectionIndex === undefined) return true; // la section contient tout ce qui suit
    if (descendant.subsectionIndex !== ancestor.subsectionIndex) return false;
    if (ancestor.subsubsectionIndex === undefined) return true; // la sous-section contient tout ce qui suit
    if (descendant.subsubsectionIndex !== ancestor.subsubsectionIndex) return false;
    return true; // la sous-sous-section contient ses items
};

/** Indices d'un élément devenu FRÈRE de `to`, inséré à `insertAt`. */
const siblingIndices = (to: Indices, insertAt: number): Indices => {
    if (to.itemIndex !== undefined) return { ...to, itemIndex: insertAt };
    if (to.subsubsectionIndex !== undefined) return { ...to, subsubsectionIndex: insertAt };
    if (to.subsectionIndex !== undefined) return { ...to, subsectionIndex: insertAt };
    if (to.sectionIndex !== undefined) return { ...to, sectionIndex: insertAt };
    return { ...to, chapterIndex: insertAt };
};

/**
 * CAPTEUR DE DÉPLACEMENT — retire un élément de sa liste puis l'insère juste
 * APRÈS l'élément `to`, dans le conteneur de `to`. C'est le cœur du
 * glisser-déposer entre sections et chapitres : la CIBLE décide du parent, la
 * position suit la cible PAR IDENTITÉ (jamais par indice, qui se décale si la
 * source et la cible partagent la même liste). Interdit de déposer dans sa
 * propre descendance (boucle). Renvoie les indices à la nouvelle place, ou
 * `null` quand le déplacement est impossible.
 */
export const moveItemAfter = (
    draft: Draft<LessonsData>,
    from: Indices,
    to: Indices,
): Indices | null => {
    const src = findItem(draft, from);
    if (!src.item || !Array.isArray(src.parent) || typeof src.targetIndex !== 'number') return null;
    if (extendsIndices(from, to)) return null; // jamais dans sa propre descendance

    // La cible est capturée par RÉFÉRENCE avant la suppression : les indices
    // changent, l'objet, lui, reste le même.
    const dst = findItem(draft, to);
    if (!dst.item || !Array.isArray(dst.parent) || typeof dst.targetIndex !== 'number') return null;
    const targetItem = dst.item;
    const targetParent = dst.parent;

    const [moved] = src.parent.splice(src.targetIndex as number, 1);
    const insertAt = targetParent.indexOf(targetItem) + 1;
    targetParent.splice(insertAt, 0, moved);
    return siblingIndices(to, insertAt);
};

/**
 * Dépose un élément À L'INTÉRIEUR d'un conteneur (chapitre, section,
 * sous-section ou sous-sous-section), en dernière position. Interdit de
 * déposer dans sa propre descendance.
 */
export const moveItemInto = (
    draft: Draft<LessonsData>,
    from: Indices,
    container: Indices,
): Indices | null => {
    const src = findItem(draft, from);
    if (!src.item || !Array.isArray(src.parent) || typeof src.targetIndex !== 'number') return null;
    if (extendsIndices(from, container)) return null;

    const target = findItem(draft, container);
    if (!target.item) return null;
    const isItemsContainer = container.itemIndex === undefined && (
        'name' in target.item || (target.item as { type?: unknown }).type === 'chapter' || 'sections' in target.item
    );
    if (!isItemsContainer) return null;
    const holder = target.item as unknown as { items?: (LessonItem | EmbeddableTopLevelItem)[] };
    if (!Array.isArray(holder.items)) holder.items = [];

    const [moved] = src.parent.splice(src.targetIndex as number, 1);
    holder.items.push(moved as LessonItem | EmbeddableTopLevelItem);
    return { ...container, itemIndex: holder.items.length - 1 };
};

/**
 * Supprime un titre structurel (section, sous-section ou sous-sous-section) en
 * remontant son contenu au niveau supérieur : ses éléments sont rattachés au
 * parent et ses sous-titres montent d'un cran, sans perdre aucune donnée.
 * Renvoie `true` quand la suppression a été réalisée par remontée ; `false`
 * pour une feuille (item) ou un chapitre (suppression complète).
 */
export const deleteStructuralNodePromotingChildren = (
    draft: Draft<LessonsData>,
    indices: Indices,
): boolean => {
    // Feuille (contenu typé, ligne libre posée où que ce soit) : simple retrait
    // de sa liste parente. Sans ce cas, supprimer un contenu ou une ligne libre
    // ne faisait RIEN.
    if (indices.itemIndex !== undefined) {
        const leaf = findItem(draft, indices);
        if (!Array.isArray(leaf.parent) || typeof leaf.targetIndex !== 'number') return false;
        leaf.parent.splice(leaf.targetIndex, 1);
        return true;
    }

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

    // Entrée de premier niveau (chapitre, évaluation, ligne libre à la racine) :
    // suppression complète, enfants compris — l'avertissement du lot affiche
    // déjà le nombre de lignes concernées.
    const root = findItem(draft, indices);
    if (!Array.isArray(root.parent) || typeof root.targetIndex !== 'number') return false;
    root.parent.splice(root.targetIndex, 1);
    return true;
};

/** Date lue telle quelle : ISO (yyyy-mm-dd, éventuellement horodatée),
 *  française (jj/mm/aaaa) ou date reconnue par le moteur. Aucune exception et
 *  aucune dérive de fuseau : les composantes sont lues directement. */
export const parseDateInput = (value: unknown): Date | null => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    if (!text) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text);
    const parts = iso ?? /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    if (parts) {
        const [year, month, day] = iso
            ? [Number(parts[1]), Number(parts[2]), Number(parts[3])]
            : [Number(parts[3]), Number(parts[2]), Number(parts[1])];
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Ajout (ou retrait) de jours sur une date, sans dépendre du fuseau local. */
export const addDaysIso = (value: unknown, offset: number): string => {
    const date = parseDateInput(value);
    if (!date) return typeof value === 'string' ? value : '';
    const shifted = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + offset));
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
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

    return produce(separateAbsenceContent(data), draft => {
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

export const flattenLessons = (data: LessonsData) => buildLessonRows(data)
    .map(({ data, indices, elementType }) => ({
        data: data as DataItem, indices,
        // Progression historically treats embedded assessments as lesson items.
        elementType: indices.itemIndex !== undefined && elementType !== 'chapter' ? 'item' : elementType,
    }));
