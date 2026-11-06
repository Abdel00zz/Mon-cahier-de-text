import type { AppConfig, ClassInfo, ContentDirection, ElementType, Indices, LessonItem, LessonsData, Section, SubSection, SubSubSection, TopLevelItem } from '@/types';
import type { AbsenceSession } from '@/domain/notebook/absenceSessions';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { schoolYearLabelFromDate } from '@/domain/calendar/calendar';
import type { PrintHeaderMode } from './modals/PrintModal';

export interface PrintViewProps {
    lessonsData: LessonsData;
    annotationLessons?: LessonsData;
    sessionAnnotations?: ReadonlyMap<string, string>;
    absenceSessions?: readonly AbsenceSession[];
    classInfo: ClassInfo;
    config: AppConfig;
    /** Même direction que le tableau d'édition, pour une impression fidèle. */
    contentDirection: ContentDirection;
    newlyAddedIds: string[];
    /** numéroter les pages en bas (moteurs compatibles avec les boîtes de marge CSS) */
    pageNumbers?: boolean;
    colorContent?: boolean;
    /** Development/preview surface using the exact same print composition. */
    preview?: boolean;
    /** en-tête administratif : première page (défaut), toutes les pages ou masqué */
    headerMode?: PrintHeaderMode;
    /** taille du texte imprimé (modale d'impression) */
    textSize?: 's' | 'm' | 'l';
    /** aération des lignes (modale d'impression) */
    lineSpacing?: 'compact' | 'normal' | 'aere';
}

export const getSchoolYearLabel = (schoolYearStart: string | undefined, fallbackDate: string | undefined): string => {
    const source = schoolYearStart ?? fallbackDate ?? new Date().toISOString().slice(0, 10);
    return schoolYearLabelFromDate(source).replace('-', ' – ');
};

export const formatPrintDate = (rawDate: string | undefined, isRtl: boolean): string => {
    if (!rawDate) return '';
    const trimmed = rawDate.trim();

    // 1. Plage "Du ... au ..." ou "من ... إلى ..."
    const rangeMatch = trimmed.match(
        /(?:Du|du|De|de|From|from|من)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:au|à|a|to|إلى)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)/i
    );
    if (rangeMatch) {
        const f1 = formatDateDDMMYYYY(rangeMatch[1]) || rangeMatch[1];
        const f2 = formatDateDDMMYYYY(rangeMatch[2]) || rangeMatch[2];
        return isRtl ? `${f1} و ${f2}` : `${f1} et ${f2}`;
    }

    // 2. Deux jours avec connecteur 'et' / 'و'
    const pairMatch = trimmed.match(
        /(?:^|\s)(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:et|and|و)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)(?:\s|$)/i
    );
    if (pairMatch) {
        const f1 = formatDateDDMMYYYY(pairMatch[1]) || pairMatch[1];
        const f2 = formatDateDDMMYYYY(pairMatch[2]) || pairMatch[2];
        return isRtl ? `${f1} و ${f2}` : `${f1} et ${f2}`;
    }

    // 3. Plusieurs dates dans la cellule (ex: 3 dates et plus)
    const allMatches = trimmed.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g);
    if (allMatches && allMatches.length > 2) {
        const formatted = allMatches.map(d => formatDateDDMMYYYY(d) || d);
        if (isRtl) {
            return formatted.join(' و ');
        }
        return `${formatted.slice(0, -1).join(', ')} et ${formatted[formatted.length - 1]}`;
    }

    return formatDateDDMMYYYY(trimmed) || trimmed;
};

export interface FlatDataItem {
    data: TopLevelItem | Section | SubSection | SubSubSection | LessonItem;
    indices: Indices;
    elementType: ElementType;
}

export type PrintRow =
    | { kind: 'single'; item: FlatDataItem }
    | { kind: 'session'; date: string; items: FlatDataItem[] };
