import { hasOnlyPristineStarterDiagnostic } from '@/domain/notebook/starterDiagnostic';
import { buildAbsenceSessions, withAbsenceRows, absenceRemarkGroups, type AbsenceSession } from '@/domain/notebook/absenceSessions';
import React, { useMemo } from 'react';
import './print.css';
import { printLayoutStyle } from '@/infrastructure/printing/printLayout';
import { collectSessionDates } from '@/infrastructure/printing/printMeta';
import { MathText } from '@/components/ui/math-text';
import { buildLessonRows } from '@/domain/notebook/lessonRows';
import { ContentRenderer } from './ContentRenderer';
import { buildContentNumbers } from '@/domain/notebook/contentNumbering';
import { indicesKey } from '@/domain/notebook/lessonRows';
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
    AppConfig,
    ContentDirection
} from '@/types';
import { formatDateDDMMYYYY, addDaysIso } from '@/domain/notebook/dataUtils';
import { buildSessionActivityRemarks } from '@/domain/evaluations/sessionActivityRemarks';
import { translateLocaleMessage } from '@/i18n/messages';
import { schoolYearLabelFromDate } from '@/domain/calendar/calendar';
import { getAcademyById } from '@/domain/classes/moroccoEducation';
import { isArabicText } from '@/components/typography/textFormat';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import type { PrintHeaderMode } from './modals/PrintModal';

// Props interfaces
interface PrintViewProps {
    lessonsData: LessonsData;
    absenceSessions?: readonly AbsenceSession[];
    classInfo: ClassInfo;
    config: AppConfig;
    /** Même direction que le tableau d'édition, pour une impression fidèle. */
    contentDirection: ContentDirection;
    newlyAddedIds: string[];
    /** numéroter les pages en bas (moteurs compatibles avec les boîtes de marge CSS) */
    pageNumbers?: boolean;
    /** Development/preview surface using the exact same print composition. */
    preview?: boolean;
    /** en-tête administratif : première page (défaut), toutes les pages ou masqué */
    headerMode?: PrintHeaderMode;
    /** taille du texte imprimé (modale d'impression) */
    textSize?: 's' | 'm' | 'l';
    /** aération des lignes (modale d'impression) */
    lineSpacing?: 'compact' | 'normal' | 'aere';
}

const getSchoolYearLabel = (schoolYearStart: string | undefined, fallbackDate: string | undefined): string => {
    const source = schoolYearStart ?? fallbackDate ?? new Date().toISOString().slice(0, 10);
    return schoolYearLabelFromDate(source).replace('-', ' – ');
};

const formatPrintDate = (rawDate: string | undefined, isRtl: boolean): string => {
    if (!rawDate) return '';
    const trimmed = rawDate.trim();

    // 1. Plage "Du ... au ..." ou "من ... إلى ..."
    const rangeMatch = trimmed.match(
        /(?:Du|du|De|de|From|from|من)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:au|à|a|to|إلى)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)/i
    );
    if (rangeMatch) {
        const f1 = formatDateDDMMYYYY(rangeMatch[1]) || rangeMatch[1];
        const f2 = formatDateDDMMYYYY(rangeMatch[2]) || rangeMatch[2];
        return isRtl ? `من ${f1} إلى ${f2}` : `Du ${f1} au ${f2}`;
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

    return formatDateDDMMYYYY(trimmed) || trimmed;
};

interface FlatDataItem {
    data: TopLevelItem | Section | SubSection | SubSubSection | LessonItem;
    indices: Indices;
    elementType: ElementType;
}

type PrintRow =
    | { kind: 'single'; item: FlatDataItem }
    | { kind: 'session'; date: string; items: FlatDataItem[] };

// Main component
export const PrintView: React.FC<PrintViewProps> = React.memo(({ lessonsData: sourceLessons, absenceSessions: suppliedAbsences, classInfo, config, contentDirection, newlyAddedIds, pageNumbers = true, headerMode = 'first', textSize = 'm', lineSpacing = 'normal', preview = false }) => {
    const lessonsData = useMemo(() => hasOnlyPristineStarterDiagnostic(sourceLessons) ? [] : sourceLessons, [sourceLessons]);
    const containsArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text || '');
    const isArabicClassName = containsArabic(classInfo.name);

    const flatData = useMemo(() => buildLessonRows(lessonsData), [lessonsData]);

    const absenceSessions = useMemo(() => suppliedAbsences ?? buildAbsenceSessions(config, classInfo.id, lessonsData),
        [suppliedAbsences, config.absences, config.timetable, config.timetableClock, classInfo.id, lessonsData]);
    const coursePrintRows = useMemo<PrintRow[]>(() => {
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

    const printRows = useMemo(() => withAbsenceRows(coursePrintRows, absenceSessions,
        row => row.kind === 'session' ? [row.date] : row.item.data.date ? [row.item.data.date] : []), [coursePrintRows, absenceSessions]);
    const printDates = useMemo(() => collectSessionDates(lessonsData, absenceSessions), [lessonsData, absenceSessions]);
    const firstPrintDate = printDates[0];
    const lastPrintDate = printDates[printDates.length - 1];
    const isRtlPrint = contentDirection === 'rtl' || isArabicClassName;
    const academy = getAcademyById(config.academyRegion);
    const province = academy?.provinces.find(item => item.id === config.educationProvince);

    const academyLine = isRtlPrint
        ? (academy ? `الأكاديمية الجهوية للتربية والتكوين · ${academy.arabicLabel}` : 'الأكاديمية الجهوية للتربية والتكوين')
        : (academy ? `Académie Régionale d’Éducation et de Formation · ${academy.label}` : 'Académie Régionale d’Éducation et de Formation');

    const provinceLine = isRtlPrint
        ? (province ? `المديرية الإقليمية: ${province.arabicLabel}` : 'المديرية الإقليمية')
        : (province ? `Direction provinciale de ${province.label}` : 'Direction provinciale');

    const periodLabel = firstPrintDate && lastPrintDate
        ? `${formatDateDDMMYYYY(firstPrintDate)} – ${formatDateDDMMYYYY(lastPrintDate)}`
        : (isRtlPrint ? 'لا توجد حصص مؤرخة' : 'Aucune séance datée');
    const schoolYearLabel = getSchoolYearLabel(config.schoolYearStart, firstPrintDate);

    const isNewItem = (item: FlatDataItem): boolean =>
        !!(item.data._tempId && newlyAddedIds.includes(item.data._tempId));

    // Le papier porte la même numérotation que l'écran.
    const contentNumbers = React.useMemo(
        () => buildContentNumbers(lessonsData, config.contentNumbering?.enabled !== false),
        [lessonsData, config.contentNumbering?.enabled],
    );

    const renderPrintContent = (item: FlatDataItem) => (

            <ContentRenderer
                data={item.data}
                indices={item.indices}
                elementType={item.elementType}
                isPrint={true}
                showDescriptions={config.printDescriptionMode === 'all' ? true : config.printDescriptionMode === 'none' ? false : undefined}
                descriptionTypes={config.printDescriptionTypes}
                contentNumber={contentNumbers.get(indicesKey(item.indices))}
            />

    );

    // Table de correspondance pour le report du غياب المتعلمين في الفروض المحروسة بدفتر النصوص (المذكرة 255)
    const absencesLookup = useMemo(() => {
        const dateMap = new Map<string, string[]>();
        const classAbsences = config.assessmentAbsences?.[classInfo.id];
        if (!classAbsences || Object.keys(classAbsences).length === 0) return dateMap;

        // 1. Dates explicites enregistrées
        for (const [assessmentId, record] of Object.entries(classAbsences)) {
            if (!record?.names || record.names.length === 0) continue;
            const customDate = config.assessmentDates?.[classInfo.id]?.[assessmentId];
            if (customDate) {
                dateMap.set(customDate, record.names);
            }
            const manual = config.manualAssessments?.[classInfo.id]?.find((m) => m.id === assessmentId);
            if (manual?.dateISO) {
                dateMap.set(manual.dateISO, record.names);
            }
        }

        // 2. Recherche dans les devoirs du cahier
        try {
            const visitItemForDate = (type: string, title: string | undefined, date?: string) => {
                if (!date || dateMap.has(date)) return;
                const isAssessment = ['controle_continu', 'controle_court', 'controle_global', 'devoir_maison'].includes(type);
                if (!isAssessment) return;

                for (const [assessmentId, record] of Object.entries(classAbsences)) {
                    if (!record?.names || record.names.length === 0) continue;
                    const matchNum = title?.match(/(\d+)/);
                    if (matchNum && assessmentId.includes(matchNum[1])) {
                        dateMap.set(date, record.names);
                        break;
                    }
                }
            };

            for (const top of lessonsData) {
                visitItemForDate(top.type, top.title, top.date);
                for (const s of top.sections ?? []) {
                    for (const item of s.items ?? []) visitItemForDate(item.type, item.title, item.date);
                    for (const ss of s.subsections ?? []) {
                        for (const item of ss.items ?? []) visitItemForDate(item.type, item.title, item.date);
                        for (const sss of ss.subsubsections ?? []) {
                            for (const item of sss.items ?? []) visitItemForDate(item.type, item.title, item.date);
                        }
                    }
                }
            }
        } catch {
            // Silently continue if lessonsData format is unexpected
        }

        return dateMap;
    }, [config.assessmentAbsences, config.assessmentDates, config.manualAssessments, classInfo.id, lessonsData]);

    /*
     * Contrôle des cahiers, remédiation et oral : les activités se lisent dans la REMARQUE de la
     * séance du même jour, jamais comme un contenu ajouté au cahier. Même règle
     * que sur l'écran (module de domaine partagé), et la langue du papier suit la
     * direction du contenu imprimé — comme les autres libellés de cette feuille.
     */
    const sessionActivities = useMemo(() => {
        const printLocale = isRtlPrint ? 'ar' : 'fr';
        const separator = isRtlPrint ? '، ' : ', ';
        return buildSessionActivityRemarks(config, classInfo.id,
            (key, values) => translateLocaleMessage(printLocale, key, values), separator);
    }, [config, classInfo.id, isRtlPrint]);

    const collectSessionRemarks = (items: FlatDataItem[], sessionDate?: string): string[] => {        const seen = new Set<string>();
        const remarks: string[] = [];

        items.forEach((item) => {
            const remark = typeof item.data.remark === 'string' ? item.data.remark.trim() : '';
            if (remark && !seen.has(remark)) {
                seen.add(remark);
                remarks.push(remark);
            }
        });

        // Report automatique des absents selon la Note 255
        if (sessionDate && absencesLookup.has(sessionDate)) {
            const names = absencesLookup.get(sessionDate)!;
            if (names.length > 0) {
                const prefix = isRtlPrint ? 'الغياب: ' : 'Absents : ';
                const sep = isRtlPrint ? '، ' : ', ';
                const absenceRemark = `${prefix}${names.join(sep)}`;
                const alreadyIncluded = remarks.some((r) => r.includes('الغياب') || r.toLowerCase().includes('absent'));
                if (!alreadyIncluded && !seen.has(absenceRemark)) {
                    seen.add(absenceRemark);
                    remarks.push(absenceRemark);
                }
            }
        }

        // Les activités partagent la remarque de leur séance, sans toucher
        // au contenu du cours ni répéter une note déjà saisie par l'enseignant.
        const activityRemark = sessionActivities.get(sessionDate ? addDaysIso(sessionDate, 0) : '');
        for (const annotation of activityRemark?.split('\n') ?? []) {
            if (!remarks.some(remark => remark.includes(annotation))) remarks.push(annotation);
        }

        return remarks;
    };

    const administrativeHeader = (
        <div className={`print-header ${isRtlPrint ? 'direction-rtl' : ''}`}>
            <div className="print-government">
                {isRtlPrint
                    ? 'المملكة المغربية · وزارة التربية الوطنية والتعليم الأولي والرياضة'
                    : 'Royaume du Maroc · Ministère de l’Éducation Nationale, du Préscolaire et des Sports'}
            </div>
            <div className="print-academy">{academyLine}</div>
            <div className="print-province">{provinceLine}</div>
            <div className="print-header-title">
                {isRtlPrint ? 'دفتر النصوص · مستخرج رسمي' : 'Cahier de textes · Extrait imprimé'}
            </div>
            <div className="print-institution-grid">
                <div className="print-institution-field">
                    <span className="print-field-label">{isRtlPrint ? 'المؤسسة التعليمية' : 'Établissement'}</span>
                    <strong className="print-field-value">{config.establishmentName || (isRtlPrint ? 'غير محددة' : 'Non renseigné')}</strong>
                </div>
                <div className="print-institution-field">
                    <span className="print-field-label">{isRtlPrint ? 'الأستاذ(ة)' : 'Enseignant'}</span>
                    <strong className={`print-field-value text-[#0056D2] font-bold ${
                        isArabicText(config.defaultTeacherName || classInfo.teacherName)
                            ? 'print-field-value-ar text-[1.15em]'
                            : 'print-field-value-la'
                    }`}>
                        {config.defaultTeacherName || classInfo.teacherName || (isRtlPrint ? 'غير محدد' : 'Non renseigné')}
                    </strong>
                </div>
                <div className="print-institution-field">
                    <span className="print-field-label">{isRtlPrint ? 'القسم / الفوج' : 'Classe'}</span>
                    <strong className={`print-field-value ${isArabicClassName ? 'font-ar' : ''}`}>{classInfo.name || (isRtlPrint ? 'غير محدد' : 'Non spécifiée')}</strong>
                </div>
                <div className="print-institution-field">
                    <span className="print-field-label">{isRtlPrint ? 'المادة الدراسية' : 'Matière'}</span>
                    <strong className="print-field-value">{classInfo.subject || (isRtlPrint ? 'غير محددة' : 'Non renseignée')}</strong>
                </div>
                <div className="print-institution-field">
                    <span className="print-field-label">{isRtlPrint ? 'السنة الدراسية' : 'Année scolaire'}</span>
                    <strong className="print-field-value"><bdi dir="ltr">{schoolYearLabel}</bdi></strong>
                </div>
                <div className="print-institution-field">
                    <span className="print-field-label">{isRtlPrint ? 'الفترة المطبوعة' : 'Période imprimée'}</span>
                    <strong className="print-field-value">{periodLabel}</strong>
                </div>
            </div>
        </div>
    );


    return (
        <div className={`print-document ${preview ? 'print-preview' : 'print-only'}`} dir={isRtlPrint ? 'rtl' : 'ltr'} aria-hidden={preview ? undefined : true} style={printLayoutStyle(textSize, lineSpacing)}>
            <style>{`@media print { @page cahier { @bottom-center {
                content: ${pageNumbers ? (isRtlPrint ? '\"الصفحة \" counter(page) \" / \" counter(pages)' : '\"Page \" counter(page) \" / \" counter(pages)') : 'none'};
                font-family: Arial, sans-serif; font-size: 8pt; color: #515a63;
            } } }`}</style>

            {/* En-tête administratif : les champs choisis dans Paramètres sont
                repris sans écraser le nom réel de la classe ou de la matière. */}
            {headerMode === 'first' && administrativeHeader}

            {/* Table */}
            <table className="print-table" dir={contentDirection} data-content-direction={contentDirection}>
                <thead>
                    {headerMode === 'all' && (
                        <tr className="print-admin-header-row">
                            <td colSpan={3} className="print-admin-header-cell">{administrativeHeader}</td>
                        </tr>
                    )}
                    <tr>
                        <th className="print-col-date">{isRtlPrint ? 'التاريخ' : 'Date'}</th>
                        <th className="print-col-content">{isRtlPrint ? 'عناصر الدرس والمحتوى البيداغوجي' : 'Contenu'}</th>
                        <th className="print-col-remark">{isRtlPrint ? 'ملاحظات وإنجازات' : 'Remarque'}</th>
                    </tr>
                </thead>
                <tbody>
                    {printRows.length > 0 ? (
                        printRows.map((row, index) => {
                            if (row.kind === 'absence') {
                              const dates = row.sessions.map(session => session.date);
                              const remarks = absenceRemarkGroups(row.sessions);
                              return (
                                <tr key={row.key} data-absence-session={row.session.date} data-absence-dates={dates.join(',')} className="print-absence-row">
                                    <td className="print-col-date"><div className="print-absence-dates">{dates.map(date => <bdi key={date} dir="ltr" className="print-date-text">{formatDateDDMMYYYY(date)}</bdi>)}</div></td>
                                    <td className="print-col-content">{translateLocaleMessage(isRtlPrint ? 'ar' : 'fr', 'notifications.absenceCertificate')}</td>
                                    <td className="print-col-remark">{remarks.map(remark => <div key={remark.dates[0]} className="print-absence-reason" dir={textDirectionAttribute(remark.reasons.join(' · '))}>
                                        {remarks.length > 1 && <div className="print-absence-reason-dates">{remark.dates.map(date => <bdi key={date} dir="ltr">{formatDateDDMMYYYY(date)}</bdi>)}</div>}
                                        {remark.reasons.join(' · ')}
                                    </div>)}</td>
                                </tr>
                              );
                            }
                            if (row.kind === 'session') {
                                const remarks = collectSessionRemarks(row.items, row.date);
                                const rowClassName = [
                                    'print-session-row',
                                    'new-date-row',
                                    row.items.some(isNewItem) ? 'new-item-print-highlight' : ''
                                ].filter(Boolean).join(' ');

                                return (
                                    <tr key={`session-${row.date}-${index}`} className={rowClassName}>
                                        <td className="print-col-date">
                                            <span className="print-date-text">{formatPrintDate(row.date, isRtlPrint)}</span>
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
                                                        <div key={`remark-${remarkIndex}`} dir={textDirectionAttribute(remark)} className="print-session-remark"><MathText source={remark}>{remark}</MathText></div>
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

                            const itemAbsences = item.data.date ? absencesLookup.get(item.data.date) : undefined;
                            let displayRemark = isChapter ? '' : (item.data.remark || '');
                            if (itemAbsences && itemAbsences.length > 0) {
                                const prefix = isRtlPrint ? 'الغياب: ' : 'Absents : ';
                                const sep = isRtlPrint ? '، ' : ', ';
                                const absenceStr = `${prefix}${itemAbsences.join(sep)}`;
                                if (!displayRemark.includes('الغياب') && !displayRemark.toLowerCase().includes('absent')) {
                                    // Texte pur : la composition se fait par le <MathText> du rendu.
                                    displayRemark = displayRemark ? `${displayRemark}\n${absenceStr}` : absenceStr;
                                }
                            }

                            return (
                                <tr key={`content-${JSON.stringify(item.indices)}-${index}`} className={rowClassName}>
                                    <td className="print-col-date"></td>
                                    <td className="print-col-content">
                                        {renderPrintContent(item)}
                                    </td>
                                    <td className="print-col-remark" dir={textDirectionAttribute(displayRemark)}>
                                        <MathText source={displayRemark}>{displayRemark}</MathText>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
                                {isRtlPrint ? 'لا يوجد محتوى للعرض' : 'Aucun contenu à afficher'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Signatures, le cahier de textes est un document de contrôle pédagogique */}
            <div className="print-signatures">
                <div className="print-signature-box">
                    <div className="print-signature-label">{isRtlPrint ? 'توقيع الأستاذ(ة)' : 'Signature du professeur'}</div>
                    <div className="print-signature-line" />
                </div>
                <div className="print-signature-box">
                    <div className="print-signature-label">{isRtlPrint ? 'تأشيرة الإدارة التربوية' : 'Visa de la direction'}</div>
                    <div className="print-signature-line" />
                </div>
            </div>
        </div>
    );
});
PrintView.displayName = 'PrintView';
