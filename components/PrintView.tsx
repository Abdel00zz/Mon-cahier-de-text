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
} from '../types';
import { TOP_LEVEL_TYPE_CONFIG } from '../constants';
import { formatDateDDMMYYYY } from '../utils/dataUtils';

// Props interfaces
interface PrintViewProps {
    lessonsData: LessonsData;
    classInfo: ClassInfo;
    config: AppConfig;
    newlyAddedIds: string[];
    /** numéroter les pages en bas (Chrome : nécessite « En-têtes et pieds de page » dans le dialogue d'impression) */
    pageNumbers?: boolean;
}

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
export const PrintView: React.FC<PrintViewProps> = React.memo(({ lessonsData, classInfo, config, newlyAddedIds, pageNumbers = true }) => {
    const containsArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text || '');
    const isArabicClassName = containsArabic(classInfo.name);
    
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
    
    const formatSeparatorDate = (dateString: string): string => {
        const ddmmyyyy = formatDateDDMMYYYY(dateString);
        return ddmmyyyy || '';
    };

    const isNewItem = (item: FlatDataItem): boolean =>
        !!(item.data._tempId && newlyAddedIds.includes(item.data._tempId));

    const renderPrintContent = (item: FlatDataItem) => (
        <MathJax hideUntilTypeset="first">
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
                    body { 
                        font-size: 10pt;
                        margin: 0;
                        padding: 0;
                        background: white !important;
                        line-height: 1.22;
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
                    .print-table th,
                    .print-table td {
                        border: none !important;
                        padding: 2px 5px;
                        vertical-align: top;
                        text-align: left;
                        font-size: 8.5pt;
                        line-height: 1.22;
                        border-right: 1px solid #e0e0e0 !important;
                    }
                    .print-table th:last-child, 
                    .print-table td:last-child {
                        border-right: none !important;
                    }

                    .print-table th {
                        font-family: 'Public Sans', Arial, sans-serif;
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
                        width: 11%;
                        text-align: center !important;
                        vertical-align: top;
                        color: #4b5563;
                        white-space: nowrap;
                        font-variant-numeric: tabular-nums;
                    }
                    .print-col-content { width: 72%; }
                    .print-col-remark {
                        width: 17%;
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
                        margin-top: 2px;
                    }
                    .print-session-chapter-item {
                        padding-top: 4px;
                        text-align: center;
                    }
                    .print-session-chapter-item .font-slab {
                        font-size: 12.5pt !important;
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
                        font-size: 13pt !important;
                        font-weight: bold !important;
                        color: var(--print-ink) !important;
                        letter-spacing: 0.01em;
                    }

                    /* Header styling */
                    .print-header {
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) auto;
                        align-items: end;
                        gap: 12px;
                        text-align: left;
                        width: 100%;
                        margin: 0 0 8px;
                        padding: 3px 0 6px;
                        color: var(--print-ink);
                        border-top: 2pt solid #0f62fe;
                        border-bottom: 1px solid #d0d0d0;
                    }
                    .print-header::after {
                        display: none;
                    }
                    .print-header-left {
                        min-width: 0;
                    }
                    .print-header-right {
                        min-width: 4.8cm;
                        text-align: right;
                    }
                    .print-header-establishment {
                        font-family: 'Public Sans', Arial, sans-serif;
                        font-size: 8.4pt;
                        font-weight: 700;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        line-height: 1.15;
                        color: #525252;
                    }
                    .print-header-title {
                        font-family: 'Fraunces', Georgia, serif;
                        font-size: 18pt;
                        font-weight: 800;
                        line-height: 1.1;
                        letter-spacing: 0.01em;
                        margin-top: 1px;
                    }
                    .print-header-meta {
                        display: grid;
                        gap: 2px;
                        font-family: 'Public Sans', Arial, sans-serif;
                        font-size: 8.6pt;
                        font-weight: 600;
                        margin: 0;
                        color: #262626;
                    }
                    .print-header-meta span {
                        white-space: nowrap;
                    }
                    .print-header-label {
                        font-family: 'Public Sans', Arial, sans-serif;
                        font-size: 7.2pt;
                        font-weight: 700;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        color: #6f6f6f;
                        margin-bottom: 2px;
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
                        font-size: 8pt;
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
                        font-family: 'Public Sans', Arial, sans-serif;
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
            
            {/* Header Section */}
            <div className="print-header">
                <div className="print-header-left">
                    {config.establishmentName && (
                        <div className="print-header-establishment">{config.establishmentName}</div>
                    )}
                    <div className="print-header-title">Cahier de Textes</div>
                </div>
                <div className="print-header-right">
                    <div className="print-header-label">Professeur</div>
                    <div className="print-header-meta">
                        <span>{classInfo.teacherName || 'Non spécifié'}</span>
                        <span>Classe : <span className={isArabicClassName ? 'font-ar' : undefined}>{classInfo.name || 'Non spécifiée'}</span></span>
                        <span>Imprimé le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>
            </div>
            
            {/* Table */}
            <table className="print-table">
                <thead>
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
