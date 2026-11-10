import type { AppLocale, AppTextSize, ContentNumbering, Cycle, ThemeMode } from './base';

export interface AppConfig {
  /** Mode d'affichage (Clair / Sombre / Système). */
  theme?: ThemeMode;
  /** Densité du texte de l'interface (petit, normal, grand, très grand). */
  appTextSize?: AppTextSize;
  /** Langue de l'interface, partagée avec le compte enseignant. */
  applicationLocale?: AppLocale;
  establishmentName: string;
  defaultTeacherName: string;
  /** Contact synchronisé ; une chaîne vide est un effacement explicite. Ne définit jamais le propriétaire du compte. */
  teacherPhone?: string;
  /** Référentiel administratif marocain utilisé dans l'en-tête imprimé. */
  academyRegion?: string;
  educationProvince?: string;
  printShowDescriptions: boolean;
    // New flexible description visibility controls
    screenDescriptionMode?: 'all' | 'none' | 'custom';
    screenDescriptionTypes?: string[];
    /** Numérotation des contenus : « définition 1 », « exemple 2 »… */
    contentNumbering?: ContentNumbering;
    printDescriptionMode?: 'all' | 'none' | 'custom';
    printDescriptionTypes?: string[];
    // User preferences for display filtering
    selectedCycles?: Cycle[];
    selectedSubjects?: string[];
    showAllCycles?: boolean;
    showAllSubjects?: boolean;
    // Welcome flow control
    hasCompletedWelcome?: boolean;
    showGettingStarted?: boolean;
    firstNotebookOpened?: boolean;
    // Emploi du temps hebdomadaire et alertes de retard
    schedules?: ClassSchedule[];        // dérivé de `timetable`, consommé par le moteur de retard
    timetable?: TimetableEntry[];       // grille complète saisie par l'enseignant
    /** Ordre personnalisé des cartes du Dashboard, synchronisé par compte. */
    dashboardClassOrder?: string[];
    /** Horloge globale publiée par la direction ; absente = grille historique sans décalage. */
    timetableClock?: TimetableClockPolicy;
    /** Politique du contrôle continu publiée par la direction ; absente = comportement historique. */
    evaluationPolicy?: EvaluationPolicy;
    notificationSettings?: NotificationSettings;
    /** signaux masqués par portée (`classId` ou `_global_`), synchronisés entre appareils */
    notificationDismissals?: Record<string, string[]>;
    absences?: AbsencePeriod[];         // certificats de maladie, congés, exclus du calcul de retard
    schoolYearStart?: string;
    /** dates de devoirs personnalisées par le prof : { [classId]: { [assessmentId]: 'YYYY-MM-DD' } } */
    assessmentDates?: Record<string, Record<string, string>>;
    /** élèves absents consignés par devoir : { [classId]: { [assessmentId]: StudentNamesRecord } } */
    assessmentAbsences?: Record<string, Record<string, StudentNamesRecord>>;
    /** Liste commune de la classe, partagée avec la direction et les suivis. */
    classRosters?: Record<string, ClassRoster>;
    /** Observations de l'oral, séparées des absences et du programme du cahier. */
    assessmentParticipants?: Record<string, Record<string, OralStudentsRecord>>;
    /** documents rédigés par devoir (sujet, corrigé) : { [classId]: { [assessmentId]: ContentDocument } } */
    assessmentDocuments?: Record<string, Record<string, ContentDocument>>;
    /** activités pédagogiques libres par classe (diagnostic, olympiade, soutien, examen blanc...) */
    pedagogicalEvents?: Record<string, PedagogicalEvent[]>;
    /** devoirs surveillés / maison saisis manuellement par le prof, par classe */
    manualAssessments?: Record<string, ManualAssessment[]>;
    /** devoirs (prédéfinis ou manuels) masqués par le prof, par classe */
    removedAssessments?: Record<string, string[]>;
    /** ordre personnalisé des devoirs (ids) par classe */
    assessmentOrder?: Record<string, string[]>;
    /** Editable presentation of an activity in the session remark, keyed by stable activity ID. */
    sessionRemarkOverrides?: Record<string, Record<string, { text?: string; hidden?: boolean }>>;
    /** Remarques pédagogiques saisies manuellement par l'enseignant pour les séances d'absence : { [classId]: { [dateISO]: string } } */
    absenceRemarks?: Record<string, Record<string, string>>;
}

/** Devoir surveillé ou maison ajouté manuellement, sans planning officiel imposé. */
export interface ManualAssessment {
    id: string;
    /** Millésime explicite pour empêcher un devoir manuel de réapparaître l'année suivante. */
    schoolYear?: string;
    type: DevoirType;
    num: number;
    dateISO: string;
    duree?: string;
    semestre: 1 | 2;
    /** Séance de CORRECTION du devoir (second temps, distinct de l'attribution `dateISO`). */
    correctionDateISO?: string;
    /** Devoir maison : DATE LIMITE à laquelle les élèves doivent rendre le devoir. */
    dueDateISO?: string;
    /** compte dans la note officielle */
    note?: boolean;
    /** document pédagogique rédigé par le professeur (hors cahier) */
    document?: ContentDocument;
}

/** Types officiels d'évaluation (nomenclature ministérielle AR/FR). */
export type DevoirType = 'controle' | 'controle_court' | 'controle_global' | 'oral' | 'maison' | 'colle';

/** Élèves consignés sur un devoir ou une activité : absents, cahiers contrôlés, participants. */
export type NotebookCondition = 'good' | 'average' | 'needs_work' | 'missing';

export interface ClassRoster {
    names: string[];
    updatedAt: string;
    version: number;
    /** Modification locale en attente : base stable pour fusionner sans écraser la direction. */
    edit?: { id: string; baseNames: string[]; addedNames?: string[]; removedNames?: string[] };
    /** Reçus de synchronisation ; une relance réseau ne rejoue pas une modification. */
    appliedEdits?: string[];
}

export type OralOutcome = 'mastered' | 'developing' | 'needs_support';
/** Remise d'un devoir maison : rendu, ou non rendu (l'absence se consigne à part). */
export type HomeworkOutcome = 'given' | 'missing';
export type ClassEvaluationEntry = 'all' | 'oral' | 'controle_cahiers';
export interface OralStudentsRecord {
    names: string[];
    updatedAt: string;
    oralOutcomes?: Record<string, OralOutcome>;
    /** Note chiffrée (/20) par élève, saisie librement (« 15.5 », « 12/20 »). */
    oralGrades?: Record<string, string>;
    /** Remise d'un devoir : un état par élève. Un élève sans état reste à vérifier. */
    homeworkOutcomes?: Record<string, HomeworkOutcome>;
}

interface StudentNamesRecord {
    /** noms des élèves (un nom par entrée) */
    names: string[];
    updatedAt: string;
    /** Suivi des cahiers : un état choisi par nom. Un nom sans état reste à contrôler. */
    notebookConditions?: Record<string, NotebookCondition>;
    /** Retour par élève sur une activité (niveau atteint), quand la direction l'active. */
    oralOutcomes?: Record<string, OralOutcome>;
    /** Note chiffrée (/20) par élève, saisie librement. */
    oralGrades?: Record<string, string>;
}

/**
 * Document pédagogique rédigé par le professeur (devoir surveillé, devoir maison,
 * olympiade, corrigé...) : une SOURCE unique, mise en page par le moteur du
 * carnet — Markdown simplifié, formules LaTeX entre dollars et un jeu de
 * balises HTML de mise en forme. Rendu identique à l'écran, en aperçu et à
 * l'impression, puisque c'est le même moteur que les descriptions de séances.
 */
export interface ContentDocument {
    /** source rédigée (jamais du HTML exécuté : le moteur rend des nœuds React) */
    source: string;
    updatedAt: string;
}

/** Une nature d'élément du contrôle continu : un devoir (bulletin) ou une activité. */
export type EvaluationKindKey = DevoirType | PedagogicalEventType;

/** Contenu rédigé (sujet, corrigé) : absent, facultatif ou obligatoire. */
export type EvaluationDocumentMode = 'off' | 'optional' | 'required';

/**
 * Ce qu'une nature d'élément propose à l'enseignant, décidé par la direction.
 * Les valeurs par défaut reproduisent le comportement historique.
 */
export interface EvaluationKindPolicy {
    /** Le cahier transmet cet élément à la feuille « Contrôle continu et activités ». */
    transmit: boolean;
    /** Traité comme contrôle continu (« Devoirs et évaluations »), sinon « Activités pédagogiques ». */
    continuous: boolean;
    document: EvaluationDocumentMode;
    /** Liste des élèves concernés. */
    students: boolean;
    /** Retour par élève (niveau, remise, état du cahier). Suppose la liste d'élèves. */
    feedback: boolean;
    /** Note /20 par élève. Suppose le retour par élève. */
    grades: boolean;
    /** Liste des absents. */
    absences: boolean;
    /** Devoir maison seulement : la séance de correction est datée sur la feuille (« Corrigé le … »). */
    correction: boolean;
}

/** Écarts à la valeur par défaut, par nature : seuls les champs modifiés sont stockés. */
export type EvaluationKindOverrides = Partial<Record<EvaluationKindKey, Partial<EvaluationKindPolicy>>>;

/** Politique publiée par la direction (générale, ou propre à un compte). */
export interface EvaluationPolicy {
    kinds: EvaluationKindOverrides;
    version: number;
    updatedAt: string | null;
}

/** Choix administratif par compte ; `kinds` vide = suivre la politique générale. */
export type EvaluationPolicyAssignment = EvaluationPolicy;

export type PedagogicalEventType =
    | 'evaluation_diagnostic'
    | 'olympiade'
    | 'concours'
    | 'soutien'
    | 'remediation'
    | 'examen_blanc'
    | 'rattrapage'
    /** مراقبة دفاتر التلاميذ — contrôle des cahiers des élèves. */
    | 'controle_cahiers'
    | 'correction_controle_continu'
    | 'autre';

/** Activité créée par le professeur et reliée à une classe, sans la confondre avec une date ministérielle. */
export interface PedagogicalEvent {
    id: string;
    type: PedagogicalEventType;
    title: string;
    date: string;
    endDate?: string;
    note?: string;
    status: 'planned' | 'done';
    createdAt: string;
    /** élèves consignés sur l'activité (cahiers contrôlés, participants…) */
    students?: StudentNamesRecord;
    /** document pédagogique rédigé par le professeur (sujet, corrigé, fiche) */
    document?: ContentDocument;
}

// ── Emploi du temps & notifications ─────────────────────────────────────────

/** weekday en convention JS getDay() : 0=dimanche … 6=samedi */
export interface ScheduleSlot {
    weekday: number;
    /** Nombre de séances distinctes ce jour-là. Deux créneaux consécutifs comptent pour une séance. */
    sessions?: number;
}

export interface ClassSchedule {
    classId: string;
    slots: ScheduleSlot[];
}

/** Une case de la grille emploi du temps : un jour (getDay 0-6) × un créneau horaire × une classe. */
export interface TimetableEntry {
    day: number;
    slot: number;
    classId: string;
    room?: string;
}

/** Translation globale des créneaux, sans modifier les affectations des classes. */
export interface TimetableClockPolicy {
    offsetMinutes: number;
    version: number;
    updatedAt: string | null;
}

/** Choix administratif par compte ; `null` signifie suivre l'horaire global. */
export interface TimetableClockAssignment {
    offsetMinutes: number | null;
    version: number;
    updatedAt: string | null;
}

export interface NotificationSettings {
    enabled: boolean;
    pushEnabled: boolean;
    /** séances de retard avant alerte */
    gapThreshold: number;
    /** jours DE CLASSE sans saisie avant alerte */
    inactivityThresholdDays: number;
    quietDuringVacations: boolean;
    /**
     * Rappels locaux de fin de séance (vibration + toast). Préférence propre à
     * l'appareil : exclue du blob de réglages synchronisé (voir
     * `utils/syncSettings.ts`). Elle ne gouverne PAS les retours haptiques des
     * boutons (`useHapticFeedback`) : ceux-ci relèvent du confort d'interface,
     * pas de la notification de séance.
     */
    sessionVibration?: boolean;
    sessionEndReminderEnabled?: boolean;
    sessionEndReminderTime?: string;
    sessionReminderMinutes?: number;
    /** Marks the five-minute default migration; preserves later explicit one-minute choices. */
    sessionReminderTimingVersion?: 1;
    missingDateReminderEnabled?: boolean;
    missingDateReminderMinutes?: number;
}

/** Période d'absence justifiée (certificat de maladie, congé...) : exclue du calcul de retard. */
export interface AbsencePeriod {
    debut: string;
    fin: string;
    motif?: string;
}

// ── Instantanés de progression synchronisés (lus par le dashboard admin) ────
