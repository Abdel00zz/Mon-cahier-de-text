import type { AppLocale, Cycle } from './base';
import type { AbsencePeriod, NotificationSettings, ScheduleSlot } from './config';

// ── Instantanés de progression synchronisés (lus par le dashboard admin) ────

export interface ClassSnapshot {
    id: string;
    name: string;
    subject: string;
    cycle?: Cycle;
    totalItems: number;
    plannedCount: number;
    completionRate: number;
    sessionsCount: number;
    lastDate: string | null;
    weekdays: number[];
    /**
     * Projection fidèle de l'emploi du temps. `weekdays` reste présent pour
     * lire les anciens snapshots, mais ne permettait pas de distinguer une
     * journée à une séance d’une journée à plusieurs séances distinctes.
     */
    scheduleSlots?: ScheduleSlot[];
    sessionsPerWeek: number;
    updatedAt: string;
}

export interface TeacherSnapshot {
    phone: string;
    establishmentName?: string;
    /** Champs dénormalisés pour la vue d'ensemble administrative en O(1) collection read sans jointures N+1. */
    contactPhone?: string;
    email?: string;
    blocked?: boolean;
    pendingMessages?: number;
    pendingRequests?: number;
    lastMessageAt?: string | null;
    nom: string;
    prenom: string;
    /**
     * Nom d'usage choisi dans le profil. La direction l'affiche à la place de
     * l'identité du compte : c'est le nom que l'enseignant utilise en classe,
     * et il doit rester le même partout (app, documents, fiche direction).
     */
    displayName?: string;
    /** Matières déclarées dans le profil, même sans classe encore rattachée. */
    subjects?: string[];
    /** Langue de l'interface utilisée aussi pour les notifications système. */
    applicationLocale?: AppLocale;
    lastSyncAt: string | null;
    notifyPrefs?: Pick<NotificationSettings, 'gapThreshold' | 'inactivityThresholdDays' | 'quietDuringVacations'> & {
        /** Absent sur les anciens snapshots : traité comme activé pour rétro-compatibilité. */
        enabled?: boolean;
        /**
         * État Push de l'appareil, remonté EN LECTURE SEULE vers l'admin dans le
         * snapshot. Il reste hors du blob de réglages synchronisé : l'admin
         * l'observe, il ne le pilote pas.
         */
        pushEnabled?: boolean;
    };
    /** absences justifiées (certificats), le cron n'alerte pas pendant, et les exclut du retard */
    absences?: AbsencePeriod[];
    /** rentrée choisie par l'enseignant, référence commune des calculs annuels */
    schoolYearStart?: string;
    classes: ClassSnapshot[];
}

/** Conversation privée entre un compte enseignant et la direction. */
export interface TeacherRequestDraft {
    requestId: string;
    body: string;
    kind: 'help';
    classId?: string;
    replyTo?: string;
}

export interface AdminMessage {
    /** A link click, never proof of a WhatsApp message being sent or delivered. */
    event?: 'whatsapp-contact';
    /** Absent sur les messages historiques de la direction. */
    sender?: 'admin' | 'teacher';
    requestKind?: TeacherRequestDraft['kind'] | 'custom-content'; // Legacy internal requests remain readable.
    classId?: string;
    className?: string;
    replyTo?: string;
    answeredAt?: string;
    id: string;
    title: string;
    body: string;
    createdAt: string;
    /** Accusé explicite de l'enseignant via le bouton « J'ai compris ». */
    acknowledgedAt?: string;
}
