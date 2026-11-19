import { localizedActivityTitle } from './activityTitle';
import type { AppConfig, LessonsData } from '../../types';
import { buildLessonRows, type LessonRow } from '../notebook/lessonRows';
import { coveredDates } from './notebookCheckRemarks';
import { parseTrailingNumber, type AssessmentLink, type NotebookDocumentPreview } from './assessmentSync';
import { homeworkSessionResolver, sessionDateKeys } from './homeworkPlacement';
import { homeworkCorrectionDocumentId } from './homeworkIds';
import { correctionBlockId, correctionOwner } from './homeworkCorrectionContent';
import { rowMatchesEventId } from './evaluationIdentity';

export const documentsForSessionDates = (documents: ReadonlyMap<string, readonly NotebookDocumentPreview[]>, raw: string) =>
    [...new Map(sessionDateKeys(raw).flatMap(date => documents.get(date) ?? []).map(document => [document.assessmentId, document])).values()];

/** Documents remain in class settings. Dates connect activities to the notebook
 * without inserting chapters or copying their source into a lesson. */
export function activityDocumentPreviews(config: AppConfig, classId: string, lessons: LessonsData,
    links: readonly AssessmentLink[], translate: (key: string) => string) {
    const rows = new Map<string, NotebookDocumentPreview>();
    const sessions = new Map<string, NotebookDocumentPreview[]>();
    const addSession = (date: string, preview: NotebookDocumentPreview) => {
        if (date) sessions.set(date, [...(sessions.get(date) ?? []), preview]);
    };
    const notebook = buildLessonRows(lessons);
    const byTempId = new Map<string, LessonRow>();
    const byKey = new Map<string, LessonRow>();
    const byType = new Map<string, LessonRow[]>();
    for (const row of notebook) {
        if (row.data._tempId && !byTempId.has(row.data._tempId)) byTempId.set(row.data._tempId, row);
        byKey.set(row.key, row);
        const list = byType.get(row.elementType);
        if (list) list.push(row);
        else byType.set(row.elementType, [row]);
    }
    const findExactEventRow = (eventId: string): LessonRow | undefined => {
        const prefixed = byTempId.get(`event-${eventId}`);
        if (prefixed) return prefixed;
        if (eventId.startsWith('notebook-')) {
            const token = eventId.slice(9);
            const fromTemp = byTempId.get(token);
            if (fromTemp) return fromTemp;
            const fromKey = byKey.get(token);
            if (fromKey && !fromKey.data._tempId) return fromKey;
        }
        return notebook.find(row => rowMatchesEventId(row, eventId));
    };
    for (const event of config.pedagogicalEvents?.[classId] ?? []) {
        if (config.sessionRemarkOverrides?.[classId]?.[`event:${event.id}`]?.hidden) continue;
        if (!event.document?.source.trim()) continue;
        const preview = { document: event.document, title: localizedActivityTitle(event.title, event.type, translate), assessmentId: `event:${event.id}` };
        const exactId = findExactEventRow(event.id);
        const typeCandidates = (byType.get(event.type) ?? []).filter(row => !row.data._tempId?.startsWith('event-'));
        const candidates = exactId ? [] : typeCandidates.filter(row =>
            !!event.date && (row.data.date === event.date || row.data.date?.includes(event.date)));
        const eventNum = exactId ? null : parseTrailingNumber(event.title);
        const numCandidates = eventNum !== null
            ? typeCandidates.filter(row => parseTrailingNumber('title' in row.data ? row.data.title : undefined) === eventNum)
            : [];
        const fallback = (numCandidates.length === 1 ? numCandidates[0] : undefined)
            ?? (typeCandidates.length === 1 ? typeCandidates[0] : undefined);
        const target = exactId ?? (candidates.length === 1 ? candidates[0] : undefined) ?? fallback;
        if (target && !rows.has(target.key)) rows.set(target.key, preview);
        else coveredDates(event).forEach(date => addSession(date, preview));
    }
    const dates = config.assessmentDates?.[classId] ?? {};
    const manual = new Map(config.manualAssessments?.[classId]?.map(item => [item.id, item]));
    const removed = new Set(config.removedAssessments?.[classId] ?? []);
    const documents = config.assessmentDocuments?.[classId];
    const homeworkSession = homeworkSessionResolver(lessons);
    const correctionRows = byType.get('correction_devoir_maison') ?? [];
    for (const { planned, entry } of links) {
        if ((entry && planned.type !== 'maison') || removed.has(planned.id) || (planned.legacyId && removed.has(planned.legacyId))) continue;
        // Le corrigé d'un devoir maison s'ouvre depuis SA séance : celle où le devoir est corrigé.
        if (planned.type === 'maison') {
            const correction = documents?.[homeworkCorrectionDocumentId(planned.id)]
                ?? (planned.legacyId ? documents?.[homeworkCorrectionDocumentId(planned.legacyId)] : undefined);
            const owner = manual.get(planned.id) ?? (planned.legacyId ? manual.get(planned.legacyId) : undefined);
            const exactTarget = byTempId.get(correctionBlockId(planned.id))
                ?? (planned.legacyId ? byTempId.get(correctionBlockId(planned.legacyId)) : undefined);
            const ownerTarget = owner ? correctionRows.find(row => correctionOwner(row, [owner])) : undefined;
            const candidates = correctionRows.filter(row =>
                parseTrailingNumber('title' in row.data ? row.data.title : undefined) === planned.num);
            const fallbackTarget = candidates.length === 1 ? candidates[0] : undefined;
            const target = exactTarget ?? ownerTarget ?? fallbackTarget;
            if (correction?.source.trim() && target) {
                rows.set(target.key, {
                    document: correction,
                    title: `${translate('manageLessons.type.correction_devoir_maison')} ${planned.num}`,
                    assessmentId: homeworkCorrectionDocumentId(planned.id),
                });
            }
        }
        // Colles belong to their content row; never fall back to a course remark.
        if (planned.type === 'colle') continue;
        if ((config.sessionRemarkOverrides?.[classId]?.[`assessment:${planned.id}`]
          ?? (planned.legacyId ? config.sessionRemarkOverrides?.[classId]?.[`assessment:${planned.legacyId}`] : undefined))?.hidden) continue;
        const document = documents?.[planned.id] ?? (planned.legacyId ? documents?.[planned.legacyId] : undefined);
        if (!document?.source.trim()) continue;
        const manualAssessment = manual.get(planned.id) ?? (planned.legacyId ? manual.get(planned.legacyId) : undefined);
        // A forecast alone must not announce that an oral or homework activity took place.
        const enteredDate = dates[planned.id] || (planned.legacyId ? dates[planned.legacyId] : undefined) || manualAssessment?.dateISO || entry?.date;
        if ((planned.type === 'oral' || planned.type === 'maison') && !manualAssessment && !enteredDate) continue;
        const date = enteredDate || planned.dateISO;
        addSession(planned.type === 'maison' ? homeworkSession(date, !!(manualAssessment || dates[planned.id] || (planned.legacyId && dates[planned.legacyId]))) : date, { document, title: `${translate(`evaluations.type.${planned.type}`)} ${planned.num}`, assessmentId: planned.id });
    }
    return { rows, sessions };
}
