import type { AppConfig, ManualAssessment, NotebookCondition, OralOutcome, PedagogicalEvent } from '@/types';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { schoolYearLabelFromDate } from '@/domain/calendar/calendar';

/** Every write is scoped to the active class and uses the normal config/sync bus. */
export function useEvaluationActions(classId: string, config: AppConfig, onChange: (patch: Partial<AppConfig>) => void) {
    const events = config.pedagogicalEvents?.[classId] ?? [];
    const saveEvents = (next: PedagogicalEvent[]) => onChange({ pedagogicalEvents: { ...config.pedagogicalEvents, [classId]: next } });
    return {
        saveEvents,
        setAssessmentDate(id: string, date: string, legacyId?: string) {
            const dates = { ...config.assessmentDates?.[classId] };
            if (date) dates[id] = date;
            else { delete dates[id]; if (legacyId) delete dates[legacyId]; }
            const current = config.manualAssessments?.[classId];
            onChange({ assessmentDates: { ...config.assessmentDates, [classId]: dates },
                ...(current?.some(item => item.id === id) ? { manualAssessments: { ...config.manualAssessments,
                    [classId]: current.map(item => item.id === id ? { ...item, schoolYear: item.schoolYear ?? schoolYearLabelFromDate(item.dateISO), dateISO: date } : item) } } : {}) });
        },
        addEvent: (event: PedagogicalEvent) => saveEvents([...events, event]),
        updateEvent: (event: PedagogicalEvent) => saveEvents(events.map(item => item.id === event.id ? event : item)),
        toggleEvent: (id: string) => saveEvents(events.map(event => event.id === id ? { ...event, status: event.status === 'done' ? 'planned' : 'done' } : event)),
        deleteEvent: (id: string) => saveEvents(events.filter(event => event.id !== id)),
        saveEventDocument: (id: string, source: string) => saveEvents(events.map(event => event.id === id ? { ...event, document: source.trim() ? { source, updatedAt: new Date().toISOString() } : undefined } : event)),
        saveAssessmentDocument(id: string, source: string, legacyId?: string) {
            const documents = { ...config.assessmentDocuments?.[classId] };
            if (source.trim()) documents[id] = { source, updatedAt: new Date().toISOString() };
            else delete documents[id];
            if (legacyId) delete documents[legacyId];
            onChange({ assessmentDocuments: { ...config.assessmentDocuments, [classId]: documents } });
        },
        saveEventStudents(id: string, names: string[], conditions?: Record<string, NotebookCondition>) {
            saveEvents(events.map(event => event.id === id ? { ...event, students: names.length ? { names, updatedAt: new Date().toISOString(),
                ...(event.type === REMARK_EVENT_TYPE && conditions ? { notebookConditions: conditions } : {}) } : undefined } : event));
        },
        saveOral(id: string, names: string[], oralOutcomes: Record<string, OralOutcome>) {
            onChange({ assessmentParticipants: { ...config.assessmentParticipants, [classId]: { ...config.assessmentParticipants?.[classId],
                [id]: { names, oralOutcomes, updatedAt: new Date().toISOString() } } } });
        },
        saveAbsences(id: string, names: string[], legacyId?: string) {
            const records = { ...config.assessmentAbsences?.[classId] };
            if (names.length) records[id] = { names, updatedAt: new Date().toISOString() };
            else delete records[id];
            if (legacyId) delete records[legacyId];
            onChange({ assessmentAbsences: { ...config.assessmentAbsences, [classId]: records } });
        },
        saveAssessment(manual: ManualAssessment, editingId?: string) {
            const current = config.manualAssessments?.[classId] ?? [];
            const next = editingId && current.some(item => item.id === editingId)
                ? current.map(item => item.id === editingId ? { ...manual, id: editingId } : item)
                : [...current, editingId ? { ...manual, id: editingId } : manual];
            const id = editingId ?? manual.id;
            onChange({ manualAssessments: { ...config.manualAssessments, [classId]: next },
                assessmentDates: { ...config.assessmentDates, [classId]: { ...config.assessmentDates?.[classId], [id]: manual.dateISO } },
                removedAssessments: { ...config.removedAssessments, [classId]: (config.removedAssessments?.[classId] ?? []).filter(value => value !== id) } });
        },
        deleteAssessment(id: string, legacyId?: string) {
            const participants = { ...config.assessmentParticipants?.[classId] };
            const documents = { ...config.assessmentDocuments?.[classId] };
            const absences = { ...config.assessmentAbsences?.[classId] };
            const dates = { ...config.assessmentDates?.[classId] };
            for (const key of [id, legacyId].filter((key): key is string => !!key)) {
                delete participants[key]; delete documents[key]; delete absences[key]; delete dates[key];
            }
            onChange({
                manualAssessments: { ...config.manualAssessments, [classId]: (config.manualAssessments?.[classId] ?? []).filter(item => item.id !== id) },
                removedAssessments: { ...config.removedAssessments, [classId]: [...new Set([...(config.removedAssessments?.[classId] ?? []), id])] },
                assessmentOrder: { ...config.assessmentOrder, [classId]: (config.assessmentOrder?.[classId] ?? []).filter(item => item !== id) },
                assessmentParticipants: { ...config.assessmentParticipants, [classId]: participants },
                assessmentDocuments: { ...config.assessmentDocuments, [classId]: documents },
                assessmentAbsences: { ...config.assessmentAbsences, [classId]: absences },
                assessmentDates: { ...config.assessmentDates, [classId]: dates },
            });
        },
    };
}
