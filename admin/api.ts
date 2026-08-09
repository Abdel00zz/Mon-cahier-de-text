import type { AdminMessage, ClassInfo, ClassSchedule, Cycle, LessonsData, TeacherSnapshot } from '../types';
import type { HolidayCalendar } from '../utils/calendar';
import type { OfficialStudentEventsFile } from '../utils/officialStudentEvents';

export interface TeacherDetail {
    user: { phone: string; nom: string; prenom: string; createdAt: string; lastSyncAt: string | null; blocked?: boolean } | null;
    classes: ClassInfo[];
    schedules: ClassSchedule[];
    classMeta: Record<string, { updatedAt: string }>;
    snapshot: TeacherSnapshot | null;
    assessmentDates: Record<string, Record<string, string>>;
    adminMessages: AdminMessage[];
}

/** Données de pilotage réservées à la vue d'ensemble administrative. */
export type AdminTeacherSummary = TeacherSnapshot & {
    blocked: boolean;
    pendingMessages: number;
    lastMessageAt: string | null;
};

const request = async (input: string, init?: RequestInit) => {
    const response = await fetch(input, { credentials: 'same-origin', ...init });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Une erreur est survenue.');
    }
    return data;
};

export const adminLogin = (code: string): Promise<void> =>
    request('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', code }),
    }).then(() => undefined);

export const adminLogout = (): Promise<void> =>
    request('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
    }).then(() => undefined);

export const fetchOverview = async (): Promise<{ teachers: AdminTeacherSummary[] }> => {
    const data = await request('/api/admin?action=overview');
    // validation de frontière : une réponse inattendue (proxy, dev sans API,
    // hash corrompu) ne doit jamais propager `undefined` dans l'interface
    if (!Array.isArray(data?.teachers)) {
        throw new Error('Réponse du serveur invalide (vue d\'ensemble indisponible).');
    }
    return { teachers: data.teachers as AdminTeacherSummary[] };
};

export const fetchTeacher = (phone: string): Promise<TeacherDetail> =>
    request(`/api/admin?action=teacher&phone=${encodeURIComponent(phone)}`);

/** Accusés de réception, chargé séparément de la fiche complète du professeur. */
export const fetchTeacherMessages = async (phone: string): Promise<AdminMessage[]> => {
    const data = await request(`/api/admin?action=messages&phone=${encodeURIComponent(phone)}`);
    return Array.isArray(data?.adminMessages) ? data.adminMessages as AdminMessage[] : [];
};

/** Cahier complet d'une classe (lecture seule), inspection des chapitres. */
export const fetchClassLessons = (
    phone: string,
    classId: string,
): Promise<{ lessonsData: LessonsData; updatedAt: string }> =>
    request(`/api/admin?action=lessons&phone=${encodeURIComponent(phone)}&classId=${encodeURIComponent(classId)}`);

const postAdmin = (payload: Record<string, unknown>) =>
    request('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

/** Bloque/débloque le compte : la connexion est refusée tant que bloqué. */
export const blockTeacher = (phone: string, blocked: boolean): Promise<{ ok: boolean; blocked: boolean }> =>
    postAdmin({ action: 'blockTeacher', phone, blocked });

/** Suppression définitive du compte et de toutes ses données cloud. */
export const deleteTeacher = (phone: string): Promise<{ ok: boolean; deletedClasses: number }> =>
    postAdmin({ action: 'deleteTeacher', phone });

export type ManagedClassInput = {
    id?: string;
    name: string;
    subject: string;
    cycle: Cycle;
};

/** Crée ou met à jour une classe, attribuée uniquement au professeur sélectionné. */
export const upsertTeacherClass = (
    phone: string,
    classInfo: ManagedClassInput,
): Promise<{ ok: boolean; classInfo: ClassInfo; created: boolean }> =>
    postAdmin({ action: 'upsertTeacherClass', phone, classInfo });

/** Supprime la classe et son cahier cloud, y compris sur les appareils hors ligne. */
export const deleteTeacherClass = (phone: string, classId: string): Promise<{ ok: boolean; classId: string }> =>
    postAdmin({ action: 'deleteTeacherClass', phone, classId });

/** Notification push directe vers le(s) téléphone(s) de l'enseignant. */
export const notifyTeacher = (phone: string, message: string, title?: string): Promise<{ ok: boolean; sent: number; message: AdminMessage }> =>
    postAdmin({ action: 'notifyTeacher', phone, message, title });

export const fetchAdminCalendar = (): Promise<{ calendar: HolidayCalendar }> =>
    request('/api/admin?action=calendar');

export const saveAdminCalendar = (calendar: HolidayCalendar): Promise<{ ok: boolean; calendar: HolidayCalendar }> =>
    postAdmin({ action: 'saveCalendar', calendar });

export const fetchAdminOfficialEvents = (): Promise<{ officialEvents: OfficialStudentEventsFile }> =>
    request('/api/admin?action=officialEvents');

export const saveAdminOfficialEvents = (
    officialEvents: OfficialStudentEventsFile,
): Promise<{ ok: boolean; officialEvents: OfficialStudentEventsFile }> =>
    postAdmin({ action: 'saveOfficialEvents', officialEvents });

export const saveAssessmentDate = (
    phone: string,
    classId: string,
    assessmentId: string,
    date: string,
): Promise<{ ok: boolean; assessmentDates: Record<string, Record<string, string>> }> =>
    postAdmin({ action: 'saveAssessmentDate', phone, classId, assessmentId, date });
