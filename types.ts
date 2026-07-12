export type Cycle = 'college' | 'lycee' | 'prepa';

export interface ClassInfo {
  id: string;
  name: string; // Formerly className
  teacherName: string;
  subject: string;
  createdAt: string;
  color: string;
    cycle?: Cycle; // optional for backward compatibility
}

export interface AppSettings {
    // This can be used for future class-specific settings, like curriculum, etc.
}

export interface AppConfig {
  establishmentName: string;
  defaultTeacherName: string;
  printShowDescriptions: boolean;
    // New flexible description visibility controls
    screenDescriptionMode?: 'all' | 'none' | 'custom';
    screenDescriptionTypes?: string[];
    printDescriptionMode?: 'all' | 'none' | 'custom';
    printDescriptionTypes?: string[];
    // User preferences for display filtering
    selectedCycles?: Cycle[];
    selectedSubjects?: string[];
    showAllCycles?: boolean;
    showAllSubjects?: boolean;
    // Welcome flow control
    hasCompletedWelcome?: boolean;
    // Emploi du temps hebdomadaire et alertes de retard
    schedules?: ClassSchedule[];        // dérivé de `timetable`, consommé par le moteur de retard
    timetable?: TimetableEntry[];       // grille complète saisie par l'enseignant
    notificationSettings?: NotificationSettings;
    absences?: AbsencePeriod[];         // certificats de maladie, congés — exclus du calcul de retard
    schoolYearStart?: string;
    /** dates de devoirs personnalisées par le prof : { [classId]: { [assessmentId]: 'YYYY-MM-DD' } } */
    assessmentDates?: Record<string, Record<string, string>>;
    /** élèves absents consignés par devoir : { [classId]: { [assessmentId]: AssessmentAbsenceRecord } } */
    assessmentAbsences?: Record<string, Record<string, AssessmentAbsenceRecord>>;
}

/** Absents d'un devoir surveillé : consignés au moment du devoir, synchronisés avec le compte. */
export interface AssessmentAbsenceRecord {
    /** noms des élèves absents (un nom par entrée) */
    names: string[];
    updatedAt: string;
}

// ── Emploi du temps & notifications ─────────────────────────────────────────

/** weekday en convention JS getDay() : 0=dimanche … 6=samedi */
export interface ScheduleSlot {
    weekday: number;
    /** nombre de séances ce jour-là (défaut 1, 2 = séance double) */
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

export interface NotificationSettings {
    enabled: boolean;
    pushEnabled: boolean;
    /** séances de retard avant alerte */
    gapThreshold: number;
    /** jours DE CLASSE sans saisie avant alerte */
    inactivityThresholdDays: number;
    quietDuringVacations: boolean;
    /**
     * rappels locaux de fin de séance (vibration + toast) — spécifique à
     * l'appareil, comme `pushEnabled` : exclu de la synchronisation cloud
     */
    sessionVibration?: boolean;
    sessionEndReminderEnabled?: boolean;
    sessionEndReminderTime?: string;
}

/** Période d'absence justifiée (certificat de maladie, congé...) : exclue du calcul de retard. */
export interface AbsencePeriod {
    debut: string;
    fin: string;
    motif?: string;
}

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
    sessionsPerWeek: number;
    updatedAt: string;
}

export interface TeacherSnapshot {
    phone: string;
    nom: string;
    prenom: string;
    lastSyncAt: string | null;
    notifyPrefs?: Pick<NotificationSettings, 'gapThreshold' | 'inactivityThresholdDays' | 'quietDuringVacations'> & { pushEnabled?: boolean };
    /** absences justifiées (certificats) — le cron n'alerte pas pendant, et les exclut du retard */
    absences?: AbsencePeriod[];
    classes: ClassSnapshot[];
}

export type TopLevelType = 
    | 'chapter' 
    | 'evaluation_diagnostic'
    | 'devoir_maison'
    | 'controle_continu'
    | 'correction_devoir_maison'
    | 'correction_controle_continu';

export type EmbeddableTopLevelType = Exclude<TopLevelType, 'chapter'>;

export type ElementType = 
    | TopLevelType
    | 'section' 
    | 'subsection' 
    | 'subsubsection' 
    | 'item'
    | 'separator';

export interface Indices {
    chapterIndex: number;
    sectionIndex?: number;
    subsectionIndex?: number;
    subsubsectionIndex?: number;
    itemIndex?: number;
    isSeparator?: boolean;
}

export interface Separator {
    content: string;
    date: string;
    manual?: boolean;
    remark?: string;
    _tempId?: string;
}

export interface LessonItem {
    type: string;
    number?: string | number;
    title?: string;
    description?: string;
    page?: string | number;
    date?: string;
    remark?: string;
    separatorAfter?: Separator;
    _tempId?: string;
}

interface BaseTopLevelItem {
    title: string;
    date?: string;
    remark?: string;
    separatorAfter?: Separator;
    _tempId?: string;
}

export type EmbeddableTopLevelItem = BaseTopLevelItem & {
    type: EmbeddableTopLevelType;
};


export interface SubSubSection {
    name: string;
    items?: (LessonItem | EmbeddableTopLevelItem)[];
    date?: string;
    remark?: string;
    separatorAfter?: Separator;
    _tempId?: string;
}

export interface SubSection {
    name: string;
    subsubsections?: SubSubSection[];
    items?: (LessonItem | EmbeddableTopLevelItem)[];
    date?: string;
    remark?: string;
    separatorAfter?: Separator;
    _tempId?: string;
}

export interface Section {
    name: string;
    subsections?: SubSection[];
    items?: (LessonItem | EmbeddableTopLevelItem)[];
    date?: string;
    remark?: string;
    separatorAfter?: Separator;
    _tempId?: string;
}


export interface TopLevelItem extends BaseTopLevelItem {
    type: 'chapter' | EmbeddableTopLevelType;
    sections?: Section[];
}

export type LessonsData = TopLevelItem[];
