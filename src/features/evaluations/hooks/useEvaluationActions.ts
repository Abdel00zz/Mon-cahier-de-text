import { uniq } from 'es-toolkit';
import type { AppConfig, HomeworkOutcome, ManualAssessment, NotebookCondition, OralOutcome, PedagogicalEvent } from '@/types';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { schoolYearLabelFromDate } from '@/domain/calendar/calendar';
import { withHomeworkSchedule, type HomeworkIdentity, type HomeworkSchedulePatch } from '@/domain/evaluations/homeworkCycle';
import { homeworkCorrectionDocumentId } from '@/domain/evaluations/homeworkIds';

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
                ...(current?.some(item => item.id === id || item.id === legacyId) ? { manualAssessments: { ...config.manualAssessments,
                    [classId]: current.map(item => item.id === id || item.id === legacyId ? { ...item, schoolYear: item.schoolYear ?? schoolYearLabelFromDate(item.dateISO), dateISO: date } : item) } } : {}) });
        },
        addEvent: (event: PedagogicalEvent) => { if (!events.some(item => item.id === event.id)) saveEvents([...events, event]); },
        updateEvent: (event: PedagogicalEvent) => saveEvents(events.map(item => item.id === event.id ? event : item)),
        toggleEvent: (id: string) => saveEvents(events.map(event => event.id === id ? { ...event, status: event.status === 'done' ? 'planned' : 'done' } : event)),
        deleteEvent: (id: string) => saveEvents(events.filter(event => event.id !== id)),
        saveEventDocument: (id: string, source: string) => saveEvents(events.map(event => event.id === id ? { ...event, document: source.trim() ? { source: source.trim(), updatedAt: new Date().toISOString() } : { source: '', updatedAt: new Date().toISOString() } } : event)),
        saveAssessmentDocument(id: string, source: string, legacyId?: string) {
            const documents = { ...config.assessmentDocuments?.[classId] };
            const updatedAt = new Date().toISOString();
            documents[id] = { source: source.trim() ? source : '', updatedAt };
            if (legacyId) documents[legacyId] = { source: '', updatedAt };
            onChange({ assessmentDocuments: { ...config.assessmentDocuments, [classId]: documents } });
        },
        /**
         * Élèves consignés sur une activité. `conditions` (cahiers) et `review` (niveau, note) valent
         * « non suivi » quand ils sont absents : ce qui existait déjà est alors conservé pour les
         * élèves restants, jamais effacé par un simple changement de réglage de la direction.
         */
        saveEventStudents(id: string, names: string[], conditions?: Record<string, NotebookCondition>,
            review?: { oralOutcomes?: Record<string, OralOutcome>; oralGrades?: Record<string, string> }) {
            saveEvents(events.map(event => {
                if (event.id !== id) return event;
                if (!names.length) return { ...event, students: undefined };
                const kept = <T,>(source?: Record<string, T>) => source
                    ? Object.fromEntries(Object.entries(source).filter(([name]) => names.includes(name))) as Record<string, T>
                    : undefined;
                const notebook = event.type === REMARK_EVENT_TYPE ? (conditions ?? kept(event.students?.notebookConditions)) : undefined;
                const outcomes = review?.oralOutcomes ?? kept(event.students?.oralOutcomes);
                const grades = review?.oralGrades ?? kept(event.students?.oralGrades);
                return { ...event, students: { names, updatedAt: new Date().toISOString(),
                    ...(notebook ? { notebookConditions: notebook } : {}),
                    ...(outcomes && Object.keys(outcomes).length ? { oralOutcomes: outcomes } : {}),
                    ...(grades && Object.keys(grades).length ? { oralGrades: grades } : {}) } };
            }));
        },
        saveOral(id: string, names: string[], oralOutcomes: Record<string, OralOutcome>, oralGrades?: Record<string, string>, legacyId?: string) {
            const records = { ...config.assessmentParticipants?.[classId] };
            const existing = records[id] ?? (legacyId ? records[legacyId] : undefined);
            if (legacyId && legacyId !== id) delete records[legacyId];
            // Même règle que la remise d'un devoir : une liste vidée efface le suivi.
            if (!names.length) delete records[id];
            else records[id] = { names, oralOutcomes, ...(oralGrades && Object.keys(oralGrades).length ? { oralGrades } : {}), ...(existing?.homeworkOutcomes ? { homeworkOutcomes: existing.homeworkOutcomes } : {}), updatedAt: new Date().toISOString() };
            onChange({ assessmentParticipants: { ...config.assessmentParticipants, [classId]: records } });
        },
        /** Remise d'un devoir maison : rendu ou non rendu, élève par élève. */
        saveHomework(id: string, names: string[], homeworkOutcomes: Record<string, HomeworkOutcome>, legacyId?: string) {
            const records = { ...config.assessmentParticipants?.[classId] };
            const existing = records[id] ?? (legacyId ? records[legacyId] : undefined);
            if (legacyId && legacyId !== id) delete records[legacyId];
            if (!names.length) delete records[id];
            else {
                records[id] = { names, ...(existing?.oralOutcomes ? { oralOutcomes: existing.oralOutcomes } : {}), homeworkOutcomes, updatedAt: new Date().toISOString() };
            }
            onChange({ assessmentParticipants: { ...config.assessmentParticipants, [classId]: records } });
        },
        /** Date limite de rendu et/ou date de correction d'un devoir maison (chaîne vide = effacer). */
        setHomeworkSchedule(homework: HomeworkIdentity, givenDateISO: string, patch: HomeworkSchedulePatch) {
            const current = config.manualAssessments?.[classId] ?? [];
            const next = withHomeworkSchedule(current, homework, givenDateISO, patch);
            if (next === current) return;
            const removed = config.removedAssessments?.[classId] ?? [];
            onChange({
                manualAssessments: { ...config.manualAssessments, [classId]: [...next] },
                // Un devoir supprimé qui retrouve une date redevient visible.
                ...(removed.includes(homework.id) ? { removedAssessments: { ...config.removedAssessments, [classId]: removed.filter(value => value !== homework.id) } } : {}),
            });
        },
        /**
         * Retire la date et le corrigé. Le suivi des remises appartient au devoir et reste conservé.
         */
        clearHomeworkCorrection(id: string, legacyId?: string) {
            const current = config.manualAssessments?.[classId] ?? [];
            const manualAssessments = current.map(item => {
                if (item.id !== id && item.id !== legacyId) return item;
                const { correctionDateISO: _cleared, ...rest } = item;
                return rest;
            });
            const documents = { ...config.assessmentDocuments?.[classId] };
            for (const key of [id, legacyId].filter((value): value is string => !!value)) {
                delete documents[homeworkCorrectionDocumentId(key)];
            }
            onChange({
                manualAssessments: { ...config.manualAssessments, [classId]: manualAssessments },
                assessmentDocuments: { ...config.assessmentDocuments, [classId]: documents },
            });
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
            const id = editingId ?? manual.id;
            // Modifier le numéro, le semestre ou la date d'un devoir ne doit jamais effacer ses deux autres moments :
            // la date limite de rendu et la séance de correction vivent sur le même enregistrement.
            const keepSchedule = (item: ManualAssessment): Pick<ManualAssessment, 'dueDateISO' | 'correctionDateISO'> => ({
                ...(manual.dueDateISO === undefined && item.dueDateISO ? { dueDateISO: item.dueDateISO } : {}),
                ...(manual.correctionDateISO === undefined && item.correctionDateISO ? { correctionDateISO: item.correctionDateISO } : {}),
            });
            const next = current.some(item => item.id === id)
                ? current.map(item => item.id === id ? { ...manual, ...keepSchedule(item), id } : item)
                : [...current, { ...manual, id }];
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
                // Le corrigé d'un devoir maison part avec lui.
                delete documents[homeworkCorrectionDocumentId(key)];
            }
            onChange({
                manualAssessments: { ...config.manualAssessments, [classId]: (config.manualAssessments?.[classId] ?? []).filter(item => item.id !== id && item.id !== legacyId) },
                removedAssessments: { ...config.removedAssessments, [classId]: uniq([...(config.removedAssessments?.[classId] ?? []), id]) },
                assessmentOrder: { ...config.assessmentOrder, [classId]: (config.assessmentOrder?.[classId] ?? []).filter(item => item !== id && item !== legacyId) },
                assessmentParticipants: { ...config.assessmentParticipants, [classId]: participants },
                assessmentDocuments: { ...config.assessmentDocuments, [classId]: documents },
                assessmentAbsences: { ...config.assessmentAbsences, [classId]: absences },
                assessmentDates: { ...config.assessmentDates, [classId]: dates },
            });
        },
    };
}
