import { HttpError } from '../_lib/http.js';
import type { AppConfig, ClassInfo, ClassSchedule, ClassSnapshot, Cycle, TimetableEntry, TeacherSnapshot } from '../../src/types.js';
import type { HolidayCalendar } from '../../src/domain/calendar/calendar.js';
import type { OfficialStudentEventsFile } from '../../src/domain/evaluations/officialStudentEvents.js';

/** Types et helpers partagés par les modules de la console d'administration. */

export interface AdminBody {
    action?: string;
    code?: string;
    phone?: string;
    blocked?: boolean;
    title?: string;
    message?: string;
    replyTo?: string;
    calendar?: HolidayCalendar;
    officialEvents?: OfficialStudentEventsFile;
    classId?: string;
    assessmentId?: string;
    date?: string;
    classInfo?: Partial<ClassInfo>;
    lessonsPayload?: unknown;
    importMode?: 'replace' | 'append';
    expectedUpdatedAt?: string | null;
    studentNames?: unknown;
    expectedRosterVersion?: number;
    timetableClockOffsetMinutes?: number;
    expectedTimetableClockVersion?: number;
    inheritGlobalTimetableClock?: boolean;
    /** Écarts à la politique par défaut (général) ou à la politique générale (compte). */
    evaluationPolicyKinds?: unknown;
    expectedEvaluationPolicyVersion?: number;
}

export interface ClassesBlob {
    classes: ClassInfo[];
    schedules: ClassSchedule[];
    timetable?: TimetableEntry[];
    classMeta: Record<string, { updatedAt: string }>;
    /** Champs de classe imposés par la direction, conservés face à un appareil périmé. */
    adminClassOverrides?: Record<string, ClassInfo>;
    /** Suppressions durables, appliquées au prochain pull de l'enseignant. */
    deletedClasses?: Record<string, { deletedAt: string }>;
    /** Import admin autoritaire jusqu'à une édition plus récente du professeur. */
    adminLessonsUpdatedAt?: Record<string, string>;
    /** Dates de devoirs imposées par la direction, protégées jusqu'à un réglage plus récent du professeur. */
    adminAssessmentDatesUpdatedAt?: Record<string, string>;
    updatedAt: string;
    settings?: Partial<AppConfig>;
    settingsUpdatedAt?: string;
}

export interface StoredUser {
    id?: string;
    firebaseUid?: string;
    email?: string;
    phone: string;
    nom: string;
    prenom: string;
    createdAt: string;
    blocked?: boolean;
}

export interface LessonsBlob {
    lessonsData: unknown;
    contentDirection?: 'ltr' | 'rtl';
    updatedAt: string;
}

export const VALID_CYCLES = new Set<Cycle>(['college', 'lycee', 'prepa']);

export const requiredText = (value: unknown, label: string, maxLength = 120): string => {
    if (typeof value !== 'string') throw new HttpError(400, `${label} manquant.`);
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength) throw new HttpError(400, `${label} invalide.`);
    return trimmed;
};

export const cleanClassSettings = (settings: Partial<AppConfig> | undefined, classId: string): Partial<AppConfig> => {
    const next = { ...(settings ?? {}) };
    next.schedules = next.schedules?.filter(entry => entry.classId !== classId);
    next.timetable = next.timetable?.filter(entry => entry.classId !== classId);
    next.dashboardClassOrder = next.dashboardClassOrder?.filter(id => id !== classId);
    for (const key of ['sessionRemarkOverrides', 'assessmentDates', 'assessmentAbsences', 'assessmentDocuments', 'assessmentParticipants', 'classRosters', 'pedagogicalEvents', 'manualAssessments', 'removedAssessments', 'assessmentOrder'] as const) {
        if (!next[key]) continue;
        const records = { ...next[key] };
        delete records[classId];
        next[key] = records as never;
    }
    return next;
};

export const updateSnapshotClass = (
    snapshot: TeacherSnapshot | null,
    classInfo: ClassInfo,
    now: string,
): TeacherSnapshot | null => {
    if (!snapshot) return null;
    const existing = snapshot.classes.find(item => item.id === classInfo.id);
    const nextClass: ClassSnapshot = existing
        ? { ...existing, name: classInfo.name, subject: classInfo.subject, cycle: classInfo.cycle, updatedAt: now }
        : {
            id: classInfo.id,
            name: classInfo.name,
            subject: classInfo.subject,
            cycle: classInfo.cycle,
            totalItems: 0,
            plannedCount: 0,
            completionRate: 0,
            sessionsCount: 0,
            lastDate: null,
            weekdays: [],
            sessionsPerWeek: 0,
            updatedAt: now,
        };
    return {
        ...snapshot,
        classes: existing
            ? snapshot.classes.map(item => item.id === classInfo.id ? nextClass : item)
            : [...snapshot.classes, nextClass],
    };
};
export const validISO = (value: unknown): value is string =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));

/** Téléphone obligatoire pour toute action ciblant un enseignant. */
export const requirePhone = (body: AdminBody): string => {
    if (typeof body.phone !== 'string' || !body.phone) throw new HttpError(400, 'Téléphone manquant.');
    return body.phone;
};
