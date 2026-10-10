import type { AppConfig, LessonsData } from '../../types';
import { buildLessonRows } from '../notebook/lessonRows';
import { coveredDates } from './notebookCheckRemarks';
import type { AssessmentLink, NotebookDocumentPreview } from './assessmentSync';
import { homeworkSessionResolver, sessionDateKeys } from './homeworkPlacement';

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
    for (const event of config.pedagogicalEvents?.[classId] ?? []) {
        if (config.sessionRemarkOverrides?.[classId]?.[`event:${event.id}`]?.hidden) continue;
        if (!event.document?.source.trim()) continue;
        const preview = { document: event.document, title: event.title.trim() || translate(`evaluations.event.${event.type}`), assessmentId: `event:${event.id}` };
        const exactId = notebook.find(row => row.data._tempId === 'event-' + event.id);
        const candidates = notebook.filter(row => row.elementType === event.type && !row.data._tempId?.startsWith('event-')
            && !!event.date && (row.data.date === event.date || row.data.date?.includes(event.date)));
        const target = exactId ?? (candidates.length === 1 ? candidates[0] : undefined);
        if (target && !rows.has(target.key)) rows.set(target.key, preview);
        else coveredDates(event).forEach(date => addSession(date, preview));
    }
    const dates = config.assessmentDates?.[classId] ?? {};
    const manual = new Map(config.manualAssessments?.[classId]?.map(item => [item.id, item]));
    const removed = new Set(config.removedAssessments?.[classId] ?? []);
    const documents = config.assessmentDocuments?.[classId];
    const homeworkSession = homeworkSessionResolver(lessons);
    for (const { planned, entry } of links) {
        if ((config.sessionRemarkOverrides?.[classId]?.[`assessment:${planned.id}`]
          ?? (planned.legacyId ? config.sessionRemarkOverrides?.[classId]?.[`assessment:${planned.legacyId}`] : undefined))?.hidden) continue;
        if ((entry && planned.type !== 'maison') || removed.has(planned.id) || (planned.legacyId && removed.has(planned.legacyId))) continue;
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
