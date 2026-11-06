// Arbre du cahier de textes.
export type TopLevelType =
    | 'chapter'
    | 'evaluation_diagnostic'
    | 'devoir_maison'
    | 'controle_continu'
    | 'controle_court'
    | 'controle_global'
    | 'oral'
    | 'correction_devoir_maison'
    | 'correction_controle_continu'
    | 'examen_blanc'
    | 'olympiade'
    | 'concours'
    /** La « colle » : interrogation orale hebdomadaire des classes préparatoires. */
    | 'colle';

type EmbeddableTopLevelType = Exclude<TopLevelType, 'chapter'>;

export type ElementType =
    | TopLevelType
    | 'section'
    | 'subsection'
    | 'subsubsection'
    | 'item';

export interface Indices {
    chapterIndex: number;
    sectionIndex?: number;
    subsectionIndex?: number;
    subsubsectionIndex?: number;
    itemIndex?: number;
}

export interface LessonItem {
    type: string;
    number?: string | number;
    title?: string;
    description?: string;
    page?: string | number;
    date?: string;
    remark?: string;
    _tempId?: string;
}

interface BaseTopLevelItem {
    title: string;
    date?: string;
    remark?: string;
    _tempId?: string;
}

export type EmbeddableTopLevelItem = BaseTopLevelItem & {
    type: EmbeddableTopLevelType;
};


export interface SubSubSection {
    name: string;
    items?: (LessonItem | EmbeddableTopLevelItem)[];
    date?: string;
    remark?: string;
    _tempId?: string;
}

export interface SubSection {
    name: string;
    subsubsections?: SubSubSection[];
    items?: (LessonItem | EmbeddableTopLevelItem)[];
    date?: string;
    remark?: string;
    _tempId?: string;
}

export interface Section {
    name: string;
    subsections?: SubSection[];
    items?: (LessonItem | EmbeddableTopLevelItem)[];
    date?: string;
    remark?: string;
    _tempId?: string;
}


export interface TopLevelItem extends BaseTopLevelItem {
    /**
     * `'free'` = ligne libre, **hors plan** : ni chapitre, ni section, ni élément
     * typé. Elle n’a donc ni niveau, ni numéro, ni progression.
     */
    type: 'chapter' | EmbeddableTopLevelType | 'free';
    /** Texte libre, conservé même si le titre est vide. */
    description?: string;
    sections?: Section[];
    /** items (types de contenu) directement sous le chapitre, sans section */
    items?: (LessonItem | EmbeddableTopLevelItem)[];
}

export type LessonsData = TopLevelItem[];
