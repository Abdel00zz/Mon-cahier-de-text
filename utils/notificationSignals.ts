import { AppConfig, ClassInfo, Indices, LessonsData } from '../types';
import { formatClassDisplayName } from '../constants';
import { flattenLessons, migrateLessonsData } from './dataUtils';
import { DateWarning, validateSessionDate } from './dateValidation';
import { computeClassHoursInsight } from './scheduleInsights';
import { computeProgressionStats } from './progression';
import { readJournal } from './journal';
import {
    HolidayCalendar,
    getBundledCalendar,
    getSchoolYearFor,
    isHoliday,
    isVacation,
    todayInMorocco,
} from './calendar';

/*
 * Signaux PRATIQUES du centre de notifications — chaque signal répond à une
 * situation concrète du métier d'enseignant et mène à l'endroit où elle se
 * corrige. La mémoire « ignoré » est partagée avec la vérification de dates
 * de l'éditeur (mêmes identifiants, même clé de stockage).
 */

const ACTIONS_IGNORED_KEY_PREFIX = 'editor_actions_ignored_v1_';
/** classe virtuelle des signaux globaux (sauvegarde…) */
const GLOBAL_SCOPE = '_global_';

/** Signal de focus lu par l'éditeur à l'ouverture d'un cahier :
    sélectionne et surligne l'élément visé (deep-link de notification). */
export const SESSION_FOCUS_KEY = 'session_focus_v1';

/** Deep-link générique : ouvre une modale précise de l'éditeur au montage. */
export const EDITOR_MODAL_KEY = 'editor_modal_focus_v1';

export interface SessionFocusPayload {
    classId: string;
    targetIndices: Indices;
    expiresAt: number;
    message: string;
}

export interface EditorModalPayload {
    classId: string;
    modal: 'evaluations' | 'dataTransfer' | 'print';
    expiresAt: number;
}

export const requestSessionFocus = (payload: SessionFocusPayload): void => {
    try {
        sessionStorage.setItem(SESSION_FOCUS_KEY, JSON.stringify(payload));
    } catch { /* stockage indisponible : la navigation reste possible */ }
};

export const requestEditorModal = (payload: EditorModalPayload): void => {
    try {
        sessionStorage.setItem(EDITOR_MODAL_KEY, JSON.stringify(payload));
    } catch { /* stockage indisponible : la navigation reste possible */ }
};

export const readIgnoredActionIds = (classId: string): Set<string> => {
    try {
        const raw = localStorage.getItem(`${ACTIONS_IGNORED_KEY_PREFIX}${classId || GLOBAL_SCOPE}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string') : []);
    } catch {
        return new Set();
    }
};

export const writeIgnoredActionIds = (classId: string, ids: Set<string>): void => {
    try {
        localStorage.setItem(`${ACTIONS_IGNORED_KEY_PREFIX}${classId || GLOBAL_SCOPE}`, JSON.stringify(Array.from(ids).slice(-100)));
    } catch { /* stockage indisponible : l'état reste valable pour la session */ }
};

export const dateActionId = (classId: string, date: string, warnings: DateWarning[]): string =>
    `date:${classId}:${date}:${warnings.map(warning => warning.type).sort().join('+')}`;

/** Situations concrètes couvertes par le centre. */
type SignalKind =
    | 'date'            // date saisie en conflit avec le calendrier/l'emploi du temps
    | 'missed-session'  // séance prévue passée sans aucune entrée datée ce jour-là
    | 'assessment-week' // semaine de devoir surveillé imminente
    | 'absences'        // devoir du jour/passé sans liste d'absents consignée
    | 'never-started'   // cahier jamais démarré alors que l'année a commencé
    | 'schedule'        // emploi du temps manquant (préalable aux contrôles)
    | 'progress-gap'    // écart de progression entre classes du même niveau
    | 'backup';         // aucune sauvegarde exportée récemment (global)

/** Destination de l'action principale du signal. */
type SignalAction = 'class' | 'timetable' | 'evaluations' | 'export';

/** ordre d'affichage : du plus urgent au plus périphérique */
const KIND_PRIORITY: Record<SignalKind, number> = {
    'missed-session': 0,
    'date': 1,
    'assessment-week': 2,
    'absences': 3,
    'never-started': 4,
    'schedule': 5,
    'progress-gap': 6,
    'backup': 7,
};

export interface ClassSignal {
    id: string;
    kind: SignalKind;
    action: SignalAction;
    classId: string;
    /** nom complet affichable de la classe (vide pour un signal global) */
    className: string;
    title: string;
    detail: string;
    date?: string;
    /** premier élément concerné — cible du focus à l'ouverture du cahier */
    targetIndices?: Indices;
    ignored: boolean;
}

export const sortSignals = (signals: ClassSignal[]): ClassSignal[] =>
    [...signals].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || a.className.localeCompare(b.className));

export const readClassLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return migrateLessonsData(Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []));
    } catch {
        return [];
    }
};

export const formatDateFR = (iso: string): string => iso.split('-').reverse().join('/');

const DAY_MS = 86_400_000;
const toUTC = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const addDaysISO = (iso: string, days: number): string => fromUTC(toUTC(iso) + days * DAY_MS);

const WEEKDAY_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const weekdayFr = (iso: string): string => WEEKDAY_FR[new Date(toUTC(iso)).getUTCDay()];

/** jours d'école réels de la classe : jour d'emploi du temps, hors férié/vacances/absence prof. */
const isClassSchoolDay = (
    iso: string,
    weekdays: Set<number>,
    calendar: HolidayCalendar,
    absences: AppConfig['absences'],
): boolean => {
    if (!weekdays.has(new Date(toUTC(iso)).getUTCDay())) return false;
    if (isHoliday(iso, calendar) || isVacation(iso, calendar)) return false;
    if (absences?.some(period => iso >= period.debut && iso <= period.fin)) return false;
    return true;
};

/**
 * Séances passées non consignées : jours de classe (emploi du temps) des
 * `lookbackDays` derniers jours sans AUCUNE entrée datée ce jour-là.
 */
const findMissedSessions = (
    classInfo: ClassInfo,
    config: AppConfig,
    datedSet: Set<string>,
    today: string,
    calendar: HolidayCalendar,
    lookbackDays = 14,
): string[] => {
    const weekdays = new Set((config.timetable ?? []).filter(e => e.classId === classInfo.id).map(e => e.day));
    if (weekdays.size === 0) return [];

    const year = getSchoolYearFor(calendar, today);
    const missed: string[] = [];
    for (let back = 1; back <= lookbackDays; back += 1) {
        const iso = addDaysISO(today, -back);
        if (iso < year.debut || iso > year.fin) continue;
        if (!isClassSchoolDay(iso, weekdays, calendar, config.absences)) continue;
        if (!datedSet.has(iso)) missed.push(iso);
    }
    return missed; // du plus récent au plus ancien
};

/**
 * Signaux par classe, lus depuis le stockage local. Chaque situation est
 * concrète : une date à corriger, une séance non consignée, un cahier jamais
 * démarré, des impressions en attente, l'emploi du temps absent.
 */
export const collectClassSignals = (classInfo: ClassInfo, config: AppConfig): ClassSignal[] => {
    const signals: ClassSignal[] = [];
    const ignored = readIgnoredActionIds(classInfo.id);
    const className = formatClassDisplayName(classInfo.name);
    const lessons = readClassLessons(classInfo.id);
    const calendar = getBundledCalendar();
    const today = todayInMorocco(new Date(), calendar);

    const entriesByDate = new Map<string, Indices[]>();
    for (const entry of flattenLessons(lessons)) {
        const date = typeof entry.data?.date === 'string' ? entry.data.date.trim() : '';
        if (!date) continue;
        const list = entriesByDate.get(date) ?? [];
        list.push(entry.indices);
        entriesByDate.set(date, list);
    }
    const datedSet = new Set(entriesByDate.keys());

    // 1 · Dates saisies en conflit avec le calendrier ou l'emploi du temps
    for (const [date, indicesList] of entriesByDate) {
        const warnings = validateSessionDate(date, classInfo, config);
        if (warnings.length === 0) continue;
        const id = dateActionId(classInfo.id, date, warnings);
        signals.push({
            id,
            kind: 'date',
            action: 'class',
            classId: classInfo.id,
            className,
            title: `Date du ${formatDateFR(date)} à vérifier`,
            detail: warnings.map(warning => warning.message).join(' '),
            date,
            targetIndices: indicesList[0],
            ignored: ignored.has(id),
        });
    }

    // 2 · Séance prévue passée sans aucune entrée datée (les 14 derniers jours)
    const missed = findMissedSessions(classInfo, config, datedSet, today, calendar);
    if (missed.length > 0) {
        const last = missed[0];
        const id = `missed:${classInfo.id}:${last}`;
        signals.push({
            id,
            kind: 'missed-session',
            action: 'class',
            classId: classInfo.id,
            className,
            title: `Séance du ${weekdayFr(last)} ${formatDateFR(last)} non consignée`,
            detail: missed.length > 1
                ? `${missed.length} séances prévues à l'emploi du temps sont passées sans entrée datée ces 14 derniers jours.`
                : `Cette séance figurait à l'emploi du temps mais aucun contenu ne porte sa date.`,
            date: last,
            ignored: ignored.has(id),
        });
    }

    const stats = computeProgressionStats(lessons);
    const hours = computeClassHoursInsight(classInfo, config.timetable);
    const hasTimetable = hours.deviation !== 'empty';
    const year = getSchoolYearFor(calendar, today);
    const yearStartedSince = Math.floor((toUTC(today) - toUTC(year.debut)) / DAY_MS);

    // 3 · Cahier jamais démarré alors que l'année a commencé (≥ 7 jours)
    if (hasTimetable && stats.sessionsCount === 0 && yearStartedSince >= 7 && today <= year.fin) {
        const id = `start:${classInfo.id}:${year.debut}`;
        signals.push({
            id,
            kind: 'never-started',
            action: 'class',
            classId: classInfo.id,
            className,
            title: 'Cahier non démarré',
            detail: `L'année a commencé le ${formatDateFR(year.debut)} et aucune séance n'est encore datée dans ce cahier.`,
            ignored: ignored.has(id),
        });
    }

    // 4 · Emploi du temps manquant — préalable à tous les contrôles
    if (!hasTimetable) {
        const id = `schedule:${classInfo.id}:missing`;
        signals.push({
            id,
            kind: 'schedule',
            action: 'timetable',
            classId: classInfo.id,
            className,
            title: 'Emploi du temps à compléter',
            detail: 'Sans créneaux, ni le contrôle des dates ni le suivi des séances ne peuvent fonctionner pour cette classe.',
            ignored: ignored.has(id),
        });
    }

    // L'impression est libre : aucun rappel « à imprimer » — le prof décide
    // seul de quand et de quoi tirer depuis la modale d'impression.

    return signals;
};

/** clé de niveau pour comparer des classes parallèles : nom sans numéro de groupe */
const levelKey = (name: string): string =>
    name.trim().toLowerCase().replace(/[\s·–—-]*(?:gr\.?|groupe)?\s*\d+\s*$/i, '').trim();

/**
 * Signaux transversaux (toutes classes) : écart de progression entre classes
 * parallèles et rappel de sauvegarde exportée.
 */
export const collectCrossClassSignals = (classes: ClassInfo[]): ClassSignal[] => {
    const signals: ClassSignal[] = [];

    // Écart de progression entre classes du même niveau (≥ 25 points)
    const byLevel = new Map<string, { classInfo: ClassInfo; completion: number; totalItems: number }[]>();
    for (const classInfo of classes) {
        const stats = computeProgressionStats(readClassLessons(classInfo.id));
        if (stats.totalItems < 5) continue; // trop peu de contenu pour comparer
        const key = levelKey(classInfo.name);
        const group = byLevel.get(key) ?? [];
        group.push({ classInfo, completion: stats.completionRate, totalItems: stats.totalItems });
        byLevel.set(key, group);
    }
    for (const group of byLevel.values()) {
        if (group.length < 2) continue;
        const sorted = [...group].sort((a, b) => b.completion - a.completion);
        const leader = sorted[0];
        const lagger = sorted[sorted.length - 1];
        const gap = leader.completion - lagger.completion;
        if (gap < 25) continue;
        const ignored = readIgnoredActionIds(lagger.classInfo.id);
        const id = `gap:${lagger.classInfo.id}:${Math.round(gap / 10)}`;
        signals.push({
            id,
            kind: 'progress-gap',
            action: 'class',
            classId: lagger.classInfo.id,
            className: formatClassDisplayName(lagger.classInfo.name),
            title: 'Progression en retrait sur ce niveau',
            detail: `${formatClassDisplayName(lagger.classInfo.name)} est à ${lagger.completion}% contre ${leader.completion}% pour ${formatClassDisplayName(leader.classInfo.name)} — un écart de ${gap} points entre groupes parallèles.`,
            ignored: ignored.has(id),
        });
    }

    // Sauvegarde : aucune exportation récente alors que les cahiers vivent
    let hasContent = false;
    let lastExport: string | null = null;
    let recentActivity = 0;
    const now = Date.now();
    for (const classInfo of classes) {
        const journal = readJournal(classInfo.id);
        for (const entry of journal) {
            if (entry.op === 'export-data' && (!lastExport || entry.at > lastExport)) lastExport = entry.at;
            if (now - new Date(entry.at).getTime() <= 14 * DAY_MS) recentActivity += 1;
        }
        if (!hasContent && readClassLessons(classInfo.id).length > 0) hasContent = true;
    }
    const daysSinceExport = lastExport ? Math.floor((now - new Date(lastExport).getTime()) / DAY_MS) : null;
    const needsBackup = hasContent && recentActivity >= 5 && (daysSinceExport === null || daysSinceExport > 30);
    if (needsBackup) {
        const monthKey = new Date().toISOString().slice(0, 7);
        const ignored = readIgnoredActionIds(GLOBAL_SCOPE);
        const id = `backup:${monthKey}`;
        signals.push({
            id,
            kind: 'backup',
            action: 'export',
            classId: '',
            className: '',
            title: daysSinceExport === null ? 'Aucune sauvegarde exportée' : `Dernière sauvegarde il y a ${daysSinceExport} jours`,
            detail: 'Vos cahiers évoluent : exportez une copie JSON depuis « Importer / exporter » (rappel mensuel).',
            ignored: ignored.has(id),
        });
    }

    return signals;
};
