import React, { useMemo } from 'react';
import { MathJax } from 'better-react-mathjax';
import { ContentRenderer } from './ContentRenderer';
import { 
    LessonsData, 
    ClassInfo,
    TopLevelItem, 
    Section, 
    SubSection, 
    SubSubSection, 
    LessonItem, 
    Indices, 
    ElementType,
    Separator,
    AppConfig
} from '@/types';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { formatDateDDMMYYYY } from '@/utils/dataUtils';
import { getAcademyById } from '@/utils/moroccoEducation';
import type { PrintHeaderMode } from './modals/PrintModal';

// Props interfaces
interface PrintViewProps {
    lessonsData: LessonsData;
    classInfo: ClassInfo;
    config: AppConfig;
    newlyAddedIds: string[];
    /** numéroter les pages en bas (Chrome : nécessite « En-têtes et pieds de page » dans le dialogue d'impression) */
    pageNumbers?: boolean;
    /** en-tête administratif : première page (défaut), toutes les pages ou masqué */
    headerMode?: PrintHeaderMode;
    /** taille du texte imprimé (modale d'impression) */
    textSize?: 's' | 'm' | 'l';
    /** aération des lignes (modale d'impression) */
    lineSpacing?: 'compact' | 'normal' | 'aere';
}

/** Réglages typographiques du document imprimé, pilotés par la modale. */
const TEXT_SIZES: Record<'s' | 'm' | 'l', { body: string; cell: string; description: string; chapter: string }> = {
    s: { body: '9pt', cell: '7.8pt', description: '7.3pt', chapter: '11.5pt' },
    m: { body: '10pt', cell: '8.5pt', description: '8pt', chapter: '13pt' },
    l: { body: '11pt', cell: '9.6pt', description: '9pt', chapter: '14.5pt' },
};

const LINE_SPACINGS: Record<'compact' | 'normal' | 'aere', { line: number; cellPad: string; itemGap: string }> = {
    compact: { line: 1.12, cellPad: '1px 5px', itemGap: '1px' },
    normal: { line: 1.22, cellPad: '2px 5px', itemGap: '2px' },
    aere: { line: 1.45, cellPad: '5px 6px', itemGap: '5px' },
};

const getSchoolYearLabel = (schoolYearStart: string | undefined, fallbackDate: string | undefined): string => {
    const configuredYear = Number.parseInt(schoolYearStart?.match(/\d{4}/)?.[0] ?? '', 10);
    const fallbackYear = Number.parseInt(fallbackDate?.match(/\d{4}/)?.[0] ?? '', 10);
    const startYear = Number.isFinite(configuredYear) ? configuredYear : (Number.isFinite(fallbackYear) ? fallbackYear : new Date().getFullYear());
    return `${startYear} – ${startYear + 1}`;
};

interface FlatDataItem {
    data: TopLevelItem | Section | SubSection | SubSubSection | LessonItem | Separator;
    indices: Indices;
    elementType: ElementType;
}

type PrintRow =
    | { kind: 'separator'; item: FlatDataItem }
    | { kind: 'single'; item: FlatDataItem }
    | { kind: 'session'; date: string; items: FlatDataItem[] };

// Main component
export const PrintView: React.FC<PrintViewProps> = React.memo(({ lessonsData, classInfo, config, newlyAddedIds, pageNumbers = true, headerMode = 'first', textSize = 'm', lineSpacing = 'normal' }) => {
    const containsArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text || '');
    const isArabicClassName = containsArabic(classInfo.name);
    const sizes = TEXT_SIZES[textSize];
    const spacing = LINE_SPACINGS[lineSpacing];
    
    const flatData = useMemo(() => {
        const result: FlatDataItem[] = [];
        
        const processElement = (
            element: any,
            indices: Indices,
            elementType: ElementType
        ): void => {
            // Add the current element to results (skip separators)
            if (elementType !== 'separator') {
                result.push({ data: element, indices, elementType });
            }

            // Process all child collections independently
            if (element.sections?.length > 0) {
                element.sections.forEach((sec: Section, i: number) => 
                    processElement(sec, { ...indices, sectionIndex: i }, 'section')
                );
            }
            
            if (element.subsections?.length > 0) {
                element.subsections.forEach((sub: SubSection, i: number) => 
                    processElement(sub, { ...indices, subsectionIndex: i }, 'subsection')
                );
            }
            
            if (element.subsubsections?.length > 0) {
                element.subsubsections.forEach((ssub: SubSubSection, i: number) => 
                    processElement(ssub, { ...indices, subsubsectionIndex: i }, 'subsubsection')
                );
            }
            
            if (element.items?.length > 0) {
                element.items.forEach((item: any, i: number) => {
                // Traiter les chapitres et évaluations de la même manière
                if (item.type === 'chapter' || TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.type)) {
                    processElement(
                        item,
                        { ...indices, itemIndex: i },
                        item.type as ElementType
                    );
                } else {
                    // Traiter les éléments standards
                    processElement(
                        item,
                        { ...indices, itemIndex: i },
                        'item'
                    );
                }
            });
            }

            // Process separator if it exists
            if (element.separatorAfter) {
                result.push({ 
                    data: element.separatorAfter, 
                    indices: { ...indices, isSeparator: true }, 
                    elementType: 'separator' 
                });
            }
        };

        // Process all top-level items
        lessonsData.forEach((topLevelItem, index) => {
            processElement(
                topLevelItem,
                { chapterIndex: index },
                topLevelItem.type
            );
        });

        return result;
    }, [lessonsData]);

    const printRows = useMemo<PrintRow[]>(() => {
        const rows: PrintRow[] = [];
        let sessionDate: string | null = null;
        let sessionItems: FlatDataItem[] = [];

        const flushSession = () => {
            if (sessionDate && sessionItems.length > 0) {
                rows.push({ kind: 'session', date: sessionDate, items: sessionItems });
            }
            sessionDate = null;
            sessionItems = [];
        };

        flatData.forEach((item) => {
            if (item.elementType === 'separator') {
                flushSession();
                rows.push({ kind: 'separator', item });
                return;
            }

            const itemDate = item.data.date;
            if (!itemDate) {
                flushSession();
                rows.push({ kind: 'single', item });
                return;
            }

            if (sessionDate && sessionDate !== itemDate) {
                flushSession();
            }

            sessionDate = itemDate;
            sessionItems.push(item);
        });

        flushSession();
        return rows;
    }, [flatData]);

    const printDates = useMemo(() => printRows
        .filter((row): row is Extract<PrintRow, { kind: 'session' }> => row.kind === 'session')
        .map(row => row.date)
        .filter(Boolean)
        .sort(), [printRows]);
    const firstPrintDate = printDates[0];
    const lastPrintDate = printDates[printDates.length - 1];
    const academy = getAcademyById(config.academyRegion);
    const province = academy?.provinces.find(item => item.id === config.educationProvince);
    const academyLine = academy
        ? `Académie Régionale d’Éducation et de Formation · ${academy.label}`
        : 'Académie Régionale d’Éducation et de Formation';
    const provinceLine = province ? `Direction provinciale de ${province.label}` : 'Direction provinciale';
    const periodLabel = firstPrintDate && lastPrintDate
        ? `${formatDateDDMMYYYY(firstPrintDate)} – ${formatDateDDMMYYYY(lastPrintDate)}`
        : 'Aucune séance datée';
    const schoolYearLabel = getSchoolYearLabel(config.schoolYearStart, firstPrintDate);
    
    const formatSeparatorDate = (dateString: string): string => {
        const ddmmyyyy = formatDateDDMMYYYY(dateString);
        return ddmmyyyy || '';
    };

    const isNewItem = (item: FlatDataItem): boolean =>
        !!(item.data._tempId && newlyAddedIds.includes(item.data._tempId));

    const renderPrintContent = (item: FlatDataItem) => (
        // Pas de hideUntilTypeset ici : la vue n'est jamais visible à l'écran
        // (display:none hors @media print), et si MathJax ne charge pas
        // (hors ligne), le texte source doit rester imprimable au lieu de
        // sortir des cellules vides (visibility:hidden).
        <MathJax>
            <ContentRenderer
                data={item.data} 
                indices={item.indices} 
                elementType={item.elementType} 
                isPrint={true} 
                showDescriptions={config.printDescriptionMode === 'all' ? true : config.printDescriptionMode === 'none' ? false : undefined}
                descriptionTypes={config.printDescriptionTypes}
                onCellUpdate={() => {}}
            />
        </MathJax>
    );

    const collectSessionRemarks = (items: FlatDataItem[]): string[] => {
        const seen = new Set<string>();
        const remarks: string[] = [];

        items.forEach((item) => {
            const remark = typeof item.data.remark === 'string' ? item.data.remark.trim() : '';
            if (remark && !seen.has(remark)) {
                seen.add(remark);
                remarks.push(remark);
            }
        });

        return remarks;
    };

    const administrativeHeader = (
        <div className="print-header">
            <div className="print-government">Royaume du Maroc — Ministère de l’Éducation nationale, du Préscolaire et des Sports</div>
            <div className="print-academy">{academyLine}</div>
            <div className="print-province">{provinceLine}</div>
            <div className="print-header-title">Cahier de textes — Extrait imprimé</div>
            <div className="print-institution-grid">
                <div className="print-institution-field"><span className="print-field-label">Établissement</span><strong className="print-field-value">{config.establishmentName || 'Non renseigné'}</strong></div>
                <div className="print-institution-field"><span className="print-field-label">Enseignant</span><strong className="print-field-value">{classInfo.teacherName || config.defaultTeacherName || 'Non renseigné'}</strong></div>
                <div className="print-institution-field"><span className="print-field-label">Classe</span><strong className={`print-field-value ${isArabicClassName ? 'font-ar' : ''}`}>{classInfo.name || 'Non spécifiée'}</strong></div>
                <div className="print-institution-field"><span className="print-field-label">Matière</span><strong className="print-field-value">{classInfo.subject || 'Non renseignée'}</strong></div>
                <div className="print-institution-field"><span className="print-field-label">Année scolaire</span><strong className="print-field-value">{schoolYearLabel}</strong></div>
                <div className="print-institution-field"><span className="print-field-label">Période imprimée</span><strong className="print-field-value">{periodLabel}</strong></div>
            </div>
        </div>
    );


    return (
        <div className="print-only" style={{ display: 'none' }}>
            <style>{`
                /* Accent signature partagé avec l'écran : or mat sur base graphite/champagne */
                :root {
                    --print-gold: #B8935A;
                    --print-ink: #1F2430;
                    --print-rule: #D8CFBE;
                }

                @media print {
                    @page {
                        size: A4;
                        margin: 0.72cm 0.9cm 1.05cm;
                        ${pageNumbers ? `@bottom-center {
                            content: "Page " counter(page) " / " counter(pages);
                            font-size: 8pt;
                            color: #6b7280;
                        }` : ''}
                    }

                    .print-hidden { display: none !important; }
                    .print-only { display: block !important; }
                    /* aucune notification (toast) ne doit apparaître sur le papier */
                    [data-sonner-toaster] { display: none !important; }
                    body {
                        font-size: ${sizes.body};
                        margin: 0;
                        padding: 0;
                        background: white !important;
                        line-height: ${spacing.line};
                    }
                    .print-only,
                    .print-only * {
                        box-sizing: border-box;
                    }
                    .print-only div,
                    .print-only p,
                    .print-only h1,
                    .print-only h2,
                    .print-only h3,
                    .print-only h4,
                    .print-only h5,
                    .print-only h6 {
                        margin-bottom: 0 !important;
                        padding-bottom: 0 !important;
                    }
                    p {
                        orphans: 3;
                        widows: 3;
                    }
                    .print-table tr {
                        break-inside: auto;
                        page-break-inside: auto;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                        margin: 0;
                        padding: 0;
                        border: 1pt solid #161616;
                    }
                    .print-table thead {
                        display: table-header-group;
                    }
                    /* En-tête administratif répété uniquement lorsque l'utilisateur
                       choisit « Toutes » dans la modale d'impression. */
                    .print-admin-header-row {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .print-admin-header-cell {
                        padding: 0 !important;
                        border: none !important;
                        background: white !important;
                        text-align: left !important;
                    }
                    .print-admin-header-cell .print-header {
                        margin-bottom: 10px;
                    }
                    .print-table th,
                    .print-table td {
                        border: none !important;
                        padding: ${spacing.cellPad};
                        vertical-align: top;
                        text-align: left;
                        font-size: ${sizes.cell};
                        line-height: ${spacing.line};
                        border-right: 1px solid #e0e0e0 !important;
                    }
                    .print-table th:last-child, 
                    .print-table td:last-child {
                        border-right: none !important;
                    }

                    .print-table th {
                        font-family: 'Fira Sans', Arial, sans-serif;
                        font-weight: 700;
                        font-size: 8.5pt;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #161616;
                        background: #f4f4f4 !important;
                        border-bottom: 1.2pt solid #161616 !important;
                        text-align: center !important;
                        /* garantit l'impression du fond gris de l'en-tête */
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-col-date {
                        width: 15%;
                        text-align: center !important;
                        vertical-align: top;
                        color: #4b5563;
                        white-space: nowrap;
                        font-variant-numeric: tabular-nums;
                    }
                    .print-col-content { width: 65%; }
                    .print-col-remark {
                        width: 20%;
                        font-size: 7.8pt;
                        color: #4b5563;
                        overflow-wrap: anywhere;
                    }

                    /* Style for rows that start a new date (use cell borders with border-collapse) */
                    .print-table .new-date-row > td {
                        border-top: 1pt solid #8d8d8d !important;
                        padding-top: 5px !important;
                    }

                    /* une séance ne se coupe jamais entre deux pages */
                    .print-session-row {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .print-session-row .print-col-date {
                        text-align: center !important;
                        vertical-align: middle !important;
                        font-weight: 700;
                        color: var(--print-ink);
                        padding: 4px 5px !important;
                    }
                    .print-session-row > td {
                        padding-bottom: 5px !important;
                        /* Un seul cadre par séance datée : haut au début,
                           bas à la fin, sans tracer chaque élément interne. */
                        border-bottom: 1pt solid #8d8d8d !important;
                    }
                    .print-date-text {
                        display: inline-flex;
                        min-height: 100%;
                        width: 100%;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        line-height: 1.15;
                    }
                    .print-session-content {
                        display: block;
                    }
                    .print-session-item {
                        padding: 1px 0;
                    }
                    .print-session-item + .print-session-item {
                        margin-top: ${spacing.itemGap};
                    }
                    .print-session-chapter-item {
                        padding-top: 4px;
                        text-align: center;
                    }
                    .print-session-chapter-item .font-slab {
                        font-size: ${sizes.chapter} !important;
                        font-weight: bold !important;
                        color: var(--print-ink) !important;
                    }
                    .print-session-remarks {
                        display: grid;
                        gap: 2px;
                    }
                    .print-session-remark {
                        white-space: pre-wrap;
                    }
                    
                    /* Modern, fluid style for manual separators — même signature que l'écran */
                    .print-separator-row {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .print-separator-cell {
                        padding: 8px 0 !important;
                    }
                    .separator-content {
                        display: flex;
                        align-items: center;
                        width: 100%;
                        color: var(--print-gold);
                    }
                    .separator-line {
                        flex-grow: 1;
                        height: 1px;
                        background-color: var(--print-rule);
                    }
                    .separator-text {
                        flex-shrink: 0;
                        padding: 0 1.5em;
                        font-size: 8pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        border: 1px solid var(--print-rule);
                        border-radius: 999px;
                        padding: 3px 12px;
                    }
                    
                    /* New Chapter styling */
                    .print-chapter-row {
                        page-break-before: auto;
                        page-break-after: avoid;
                        page-break-inside: avoid !important;
                        break-inside: avoid;
                    }
                    .print-chapter-row > td {
                        padding: 5px 5px 2px 5px !important;
                        border-bottom: none !important;
                        border-top: none !important;
                        text-align: center !important;
                    }
                    .print-chapter-row .print-col-content {
                        text-align: center !important;
                    }
                    .print-chapter-row .font-slab {
                        font-size: ${sizes.chapter} !important;
                        font-weight: bold !important;
                        color: var(--print-ink) !important;
                        letter-spacing: 0.01em;
                    }

                    /* En-tête administratif fidèle au document marocain :
                       institution → académie → direction → cahier → infos. */
                    .print-header {
                        display: block;
                        margin: 0 0 15px;
                        padding: 0 0 9px;
                        border-top: 0;
                        border-bottom: 1.25pt solid #162033;
                        text-align: center;
                    }
                    .print-government {
                        color: #526a8c;
                        font-family: 'Fira Sans', Arial, sans-serif;
                        font-size: 8.2pt;
                        font-weight: 800;
                        letter-spacing: 0.07em;
                        text-transform: uppercase;
                    }
                    .print-academy {
                        margin-top: 2px;
                        color: #162033;
                        font-family: 'Fira Sans', Arial, sans-serif;
                        font-size: 10.2pt;
                        font-weight: 800;
                    }
                    .print-province {
                        margin-top: 1px;
                        color: #405579;
                        font-family: 'Fira Sans', Arial, sans-serif;
                        font-size: 8.8pt;
                        font-weight: 700;
                    }
                    .print-header .print-header-title {
                        margin-top: 5px;
                        color: #101b32;
                        font-family: 'Roboto Slab', Georgia, serif;
                        font-size: 18pt;
                        font-weight: 800;
                        line-height: 1.12;
                    }
                    .print-institution-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0 1.05cm;
                        margin-top: 8px;
                        text-align: left;
                    }
                    .print-institution-field {
                        display: grid;
                        grid-template-columns: auto minmax(0, 1fr);
                        align-items: baseline;
                        gap: 6px;
                        min-width: 0;
                        padding: 3px 0;
                        border-bottom: 0.6pt dotted #b8c2d0;
                        font-family: 'Fira Sans', Arial, sans-serif;
                        font-size: 8.5pt;
                    }
                    .print-institution-field .print-field-label {
                        color: #607795;
                        font-weight: 700;
                    }
                    .print-institution-field .print-field-value {
                        min-width: 0;
                        overflow-wrap: anywhere;
                        color: #101b32;
                        font-weight: 800;
                        text-align: right;
                    }
                    /* Tighten content spacing inside content column */
                    .print-col-content p { margin: 0 0 2px 0; line-height: 1.18; }
                    .print-col-content h1,
                    .print-col-content h2,
                    .print-col-content h3 { margin: 4px 0 2px 0; line-height: 1.18; }
                    .print-col-content ul,
                    .print-col-content ol { margin: 0 0 3px 1.05em; padding-left: 1.05em; }
                    .print-col-content li { margin: 0 0 1px 0; line-height: 1.18; }

                    .print-lesson-item {
                        display: block;
                        padding: 0;
                        color: var(--print-ink);
                    }
                    .print-item-kind {
                        display: inline-block;
                        min-width: 3.9em;
                        margin-right: 0.45em;
                        color: #7a5e35;
                        font-size: 7.2pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.02em;
                    }
                    .print-item-title {
                        font-weight: 600;
                    }
                    .print-item-page {
                        color: #6b7280;
                        font-style: italic;
                    }
                    .print-item-description {
                        margin-top: 1px !important;
                        padding-left: 4.35em;
                        color: #374151;
                        font-size: ${sizes.description};
                        line-height: 1.2;
                        white-space: pre-wrap;
                    }

                    /* Éléments nouvellement ajoutés : discret liseré or plutôt qu'un aplat criard */
                    .new-item-print-highlight > td:first-child {
                        box-shadow: inset 3px 0 0 var(--print-gold);
                    }

                    /* Zone de signatures — finition de document administratif */
                    .print-signatures {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 24px;
                        margin-top: 18px;
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .print-signature-box {
                        padding-top: 4px;
                    }
                    .print-signature-label {
                        font-family: 'Fira Sans', Arial, sans-serif;
                        font-size: 7.2pt;
                        font-weight: 700;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        color: #6f6f6f;
                    }
                    .print-signature-line {
                        margin-top: 34px;
                        border-bottom: 1px solid var(--print-rule);
                    }
                }
            `}</style>
            
            {/* En-tête administratif : les champs choisis dans Paramètres sont
                repris sans écraser le nom réel de la classe ou de la matière. */}
            {headerMode === 'first' && administrativeHeader}

            {/* Table */}
            <table className="print-table">
                <thead>
                    {headerMode === 'all' && (
                        <tr className="print-admin-header-row">
                            <td colSpan={3} className="print-admin-header-cell">{administrativeHeader}</td>
                        </tr>
                    )}
                    <tr>
                        <th className="print-col-date">Date</th>
                        <th className="print-col-content">Contenu</th>
                        <th className="print-col-remark">Remarque</th>
                    </tr>
                </thead>
                <tbody>
                    {printRows.length > 0 ? (
                        printRows.map((row, index) => {
                            if (row.kind === 'separator') {
                                const separatorData = row.item.data as Separator;
                                const formattedDate = formatSeparatorDate(separatorData.date);
                                const rowClassName = ['print-separator-row', isNewItem(row.item) ? 'new-item-print-highlight' : ''].filter(Boolean).join(' ');

                                return (
                                    <tr key={`separator-${index}`} className={rowClassName}>
                                        <td colSpan={3} className="print-separator-cell">
                                            <div className="separator-content">
                                                <span className="separator-line"></span>
                                                <span className="separator-text">
                                                    {separatorData.content || '---'}
                                                    {formattedDate && ` | ${formattedDate}`}
                                                </span>
                                                <span className="separator-line"></span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            if (row.kind === 'session') {
                                const remarks = collectSessionRemarks(row.items);
                                const rowClassName = [
                                    'print-session-row',
                                    'new-date-row',
                                    row.items.some(isNewItem) ? 'new-item-print-highlight' : ''
                                ].filter(Boolean).join(' ');

                                return (
                                    <tr key={`session-${row.date}-${index}`} className={rowClassName}>
                                        <td className="print-col-date">
                                            <span className="print-date-text">{formatDateDDMMYYYY(row.date)}</span>
                                        </td>
                                        <td className="print-col-content">
                                            <div className="print-session-content">
                                                {row.items.map((sessionItem, itemIndex) => {
                                                    const className = [
                                                        'print-session-item',
                                                        sessionItem.elementType === 'chapter' ? 'print-session-chapter-item' : ''
                                                    ].filter(Boolean).join(' ');

                                                    return (
                                                        <div key={`session-item-${JSON.stringify(sessionItem.indices)}-${itemIndex}`} className={className}>
                                                            {renderPrintContent(sessionItem)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="print-col-remark">
                                            {remarks.length > 0 && (
                                                <div className="print-session-remarks">
                                                    {remarks.map((remark, remarkIndex) => (
                                                        <div key={`remark-${remarkIndex}`} className="print-session-remark">
                                                            {remark}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }

                            // row.kind === 'single' : élément sans date (les
                            // séparateurs et les séances datées sont traités plus haut)
                            const item = row.item;
                            const isNew = isNewItem(item);
                            const isChapter = item.elementType === 'chapter';
                            const rowClassName = [
                                isChapter ? 'print-chapter-row' : '',
                                isNew ? 'new-item-print-highlight' : '',
                            ].filter(Boolean).join(' ');

                            return (
                                <tr key={`content-${JSON.stringify(item.indices)}-${index}`} className={rowClassName}>
                                    <td className="print-col-date"></td>
                                    <td className="print-col-content">
                                        {renderPrintContent(item)}
                                    </td>
                                    <td className="print-col-remark">
                                        {isChapter ? '' : (item.data.remark || '')}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
                                Aucun contenu à afficher
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Signatures — le cahier de textes est un document de contrôle pédagogique */}
            <div className="print-signatures">
                <div className="print-signature-box">
                    <div className="print-signature-label">Signature du professeur</div>
                    <div className="print-signature-line" />
                </div>
                <div className="print-signature-box">
                    <div className="print-signature-label">Visa de la direction</div>
                    <div className="print-signature-line" />
                </div>
            </div>
        </div>
    );
});
PrintView.displayName = 'PrintView';
