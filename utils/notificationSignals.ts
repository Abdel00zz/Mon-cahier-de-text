import { AppConfig, AppLocale, ClassInfo, Indices, LessonsData } from '../types';
import { formatClassDisplayName } from '../constants';
import { translateLocaleMessage } from '../i18n/LocaleProvider';
import { flattenLessons } from './dataUtils';
import { readCachedLessons } from './notebookStorage';
import { DateWarning, validateSessionDate } from './dateValidation';
import { computeClassHoursInsight } from './scheduleInsights';
import { computeProgressionStats } from './progression';
import { readJournal } from './journal';
import {
    markClassesListDirty,
    notifyConfigChanged,
    notifyNotificationsChanged,
    touchSettingsSyncMeta,
} from './syncBus';
import {
    HolidayCalendar,
    getBundledCalendar,
    getEffectiveSchoolYear,
    isHoliday,
    isVacation,
    todayInMorocco,
} from './calendar';

/*
 * Signaux pratiques du moteur de suivi, chaque signal répond à une
 * situation concrète du métier d'enseignant et mène à l'endroit où elle se
 * corrige. La mémoire « ignoré » est partagée avec la vérification de dates
 * de l'éditeur (mêmes identifiants, même clé de stockage).
 */

const ACTIONS_IGNORED_KEY_PREFIX = 'editor_actions_ignored_v1_';
/** classe virtuelle des signaux globaux (sauvegarde…) */
const GLOBAL_SCOPE = '_global_';

/**
 * Les alertes structurelles d'emploi du temps ne sont pas des rappels : elles
 * conditionnent le calcul des prochaines séances, le contrôle des dates et la
 * progression. Elles restent donc actives jusqu'à correction de la grille.
 */
const isDismissibleActionId = (id: string): boolean => !id.startsWith('schedule:');

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
        const scope = classId || GLOBAL_SCOPE;
        const raw = localStorage.getItem(`${ACTIONS_IGNORED_KEY_PREFIX}${scope}`);
        const parsed = raw ? JSON.parse(raw) : [];
        const config = JSON.parse(localStorage.getItem('appConfig_v1') || '{}') as Pick<AppConfig, 'notificationDismissals'>;
        const synced = config.notificationDismissals?.[scope] ?? [];
        return new Set([
            ...(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []),
            ...(Array.isArray(synced) ? synced.filter((value): value is string => typeof value === 'string') : []),
        ].filter(isDismissibleActionId));
    } catch {
        return new Set();
    }
};

export const writeIgnoredActionIds = (classId: string, ids: Set<string>): void => {
    const scope = classId || GLOBAL_SCOPE;
    // Invariant métier : même une ancienne version de l'application ne peut
    // réinjecter une alerte d'emploi du temps dans les éléments masqués.
    const values = Array.from(ids).filter(isDismissibleActionId).slice(-100);
    try {
        // Clé historique conservée pour compatibilité hors connexion/import.
        localStorage.setItem(`${ACTIONS_IGNORED_KEY_PREFIX}${scope}`, JSON.stringify(values));
        const config = JSON.parse(localStorage.getItem('appConfig_v1') || '{}') as AppConfig;
        localStorage.setItem('appConfig_v1', JSON.stringify({
            ...config,
            notificationDismissals: {
                ...(config.notificationDismissals ?? {}),
                [scope]: values,
            },
        }));
        touchSettingsSyncMeta();
        markClassesListDirty();
        notifyConfigChanged();
    } catch { /* stockage indisponible : l'état reste valable pour la session */ }
    notifyNotificationsChanged();
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
    /** propriétaire canonique : une alerte de classe n'apparaît que dans son modal i ;
     *  un insight global appartient uniquement au centre de pilotage. */
    scope: 'class' | 'global';
    classId: string;
    /** nom complet affichable de la classe (vide pour un signal global) */
    className: string;
    title: string;
    detail: string;
    date?: string;
    /** premier élément concerné, cible du focus à l'ouverture du cahier */
    targetIndices?: Indices;
    /** false pour un prérequis structurel qui doit rester visible jusqu'à résolution */
    dismissible: boolean;
    ignored: boolean;
}

export const sortSignals = (signals: ClassSignal[]): ClassSignal[] =>
    [...signals].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || a.className.localeCompare(b.className));

export const readClassLessons = (classId: string): LessonsData => {
    return readCachedLessons(classId);
};

export const formatDateFR = (iso: string): string => iso.split('-').reverse().join('/');

const DAY_MS = 86_400_000;
const toUTC = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const addDaysISO = (iso: string, days: number): string => fromUTC(toUTC(iso) + days * DAY_MS);

const weekdayLabel = (iso: string, locale: AppLocale): string => {
    const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR';
    return new Intl.DateTimeFormat(localeCode, { weekday: 'long' }).format(new Date(toUTC(iso)));
};

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

    const year = getEffectiveSchoolYear(calendar, config.schoolYearStart, today);
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
export const collectClassSignals = (classInfo: ClassInfo, config: AppConfig, locale: AppLocale = 'fr'): ClassSignal[] => {
    const signals: ClassSignal[] = [];
    const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);
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
        const warnings = validateSessionDate(date, classInfo, config, locale);
        if (warnings.length === 0) continue;
        const id = dateActionId(classInfo.id, date, warnings);
        signals.push({
            id,
            kind: 'date',
            action: 'class',
            scope: 'class',
            classId: classInfo.id,
            className,
            title: t('notifications.signal.dateTitle', { date: formatDateFR(date) }),
            detail: warnings.map(warning => warning.message).join(' '),
            date,
            targetIndices: indicesList[0],
            dismissible: true,
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
            scope: 'class',
            classId: classInfo.id,
            className,
            title: t('notifications.signal.missedTitle', { weekday: weekdayLabel(last, locale), date: formatDateFR(last) }),
            detail: missed.length > 1
                ? t('notifications.signal.missedMany', { count: missed.length })
                : t('notifications.signal.missedOne'),
            date: last,
            dismissible: true,
            ignored: ignored.has(id),
        });
    }

    const stats = computeProgressionStats(lessons);
    const hours = computeClassHoursInsight(classInfo, config.timetable);
    const hasTimetable = hours.deviation !== 'empty';
    const year = getEffectiveSchoolYear(calendar, config.schoolYearStart, today);
    const yearStartedSince = Math.floor((toUTC(today) - toUTC(year.debut)) / DAY_MS);

    // 3 · Cahier jamais démarré alors que l'année a commencé (≥ 7 jours)
    if (hasTimetable && stats.sessionsCount === 0 && yearStartedSince >= 7 && today <= year.fin) {
        const id = `start:${classInfo.id}:${year.debut}`;
        signals.push({
            id,
            kind: 'never-started',
            action: 'class',
            scope: 'class',
            classId: classInfo.id,
            className,
            title: t('notifications.signal.neverStartedTitle'),
            detail: t('notifications.signal.neverStartedDetail', { date: formatDateFR(year.debut) }),
            dismissible: true,
            ignored: ignored.has(id),
        });
    }

    // 4 · Emploi du temps incomplet : alerte propre au suivi de cette classe,
    // avec le volume exact à ajouter ou à retirer.
    const scheduleNeedsAttention = hours.deviation === 'empty' || hours.deviation === 'under' || hours.deviation === 'over';
    if (scheduleNeedsAttention) {
        const id = `schedule:${classInfo.id}:${hours.deviation}:${hours.scheduledHours}:${hours.officialHours ?? 'unknown'}`;
        const adjustment = Math.abs(hours.delta);
        const detail = hours.deviation === 'empty'
            ? hours.officialHours !== null
                ? t('notifications.signal.scheduleEmptyDetail', { missing: hours.officialHours })
                : t('notifications.signal.scheduleDetail')
            : hours.deviation === 'under'
                ? t('notifications.signal.scheduleUnderDetail', {
                    scheduled: hours.scheduledHours,
                    expected: hours.officialHours ?? 0,
                    missing: adjustment,
                })
                : t('notifications.signal.scheduleOverDetail', {
                    scheduled: hours.scheduledHours,
                    expected: hours.officialHours ?? 0,
                    excess: adjustment,
                });
        signals.push({
            id,
            kind: 'schedule',
            action: 'timetable',
            scope: 'class',
            classId: classInfo.id,
            className,
            title: hours.deviation === 'over'
                ? t('notifications.signal.scheduleAdjustTitle')
                : t('notifications.signal.scheduleTitle'),
            detail,
            dismissible: false,
            // Ne jamais dériver cet état de la mémoire « ignoré » : le signal
            // disparaît uniquement lorsque computeClassHoursInsight est conforme.
            ignored: false,
        });
    }

    // L'impression est libre : aucun rappel « à imprimer », le prof décide
    // seul de quand et de quoi tirer depuis la modale d'impression.

    return signals;
};

/** clé de niveau pour comparer des classes parallèles : nom sans numéro de groupe */
const levelKey = (name: string): string =>
    name.trim().toLowerCase().replace(/[-\s·–]*(?:gr\.?|groupe)?\s*\d+\s*$/i, '').trim();

/**
 * Signaux transversaux (toutes classes) : écart de progression entre classes
 * parallèles et rappel de sauvegarde exportée.
 */
export const collectCrossClassSignals = (classes: ClassInfo[], locale: AppLocale = 'fr'): ClassSignal[] => {
    const signals: ClassSignal[] = [];
    const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);

    // Écart de progression entre classes du même niveau (≥ 25 points)
    const byLevel = new Map<string, { classInfo: ClassInfo; completion: number; totalItems: number }[]>();
    for (const classInfo of classes) {
        const stats = computeProgressionStats(readClassLessons(classInfo.id));
        if (stats.totalItems < 5) continue; // trop peu de contenu pour comparer
        // Ne jamais comparer deux matières/cycles différents qui portent un
        // libellé de niveau similaire.
        const key = `${classInfo.cycle ?? ''}|${classInfo.subject.trim().toLowerCase()}|${levelKey(classInfo.name)}`;
        const group = byLevel.get(key) ?? [];
        group.push({ classInfo, completion: stats.completionRate, totalItems: stats.totalItems });
        byLevel.set(key, group);
    }
    for (const group of byLevel.values()) {
        if (group.length < 2) continue;
        const sorted = [...group].sort((a, b) => b.completion - a.completion);
        const leader = sorted[0];
        const lagger = sorted[sorted.length - 1];
        // Un pourcentage n'est comparable que si les deux cahiers reposent sur
        // des volumes de programme proches. Sinon le centre montre les données
        // brutes sans produire un faux signal de retard.
        const comparableVolume = Math.min(leader.totalItems, lagger.totalItems) / Math.max(leader.totalItems, lagger.totalItems);
        if (comparableVolume < 0.8) continue;
        const gap = leader.completion - lagger.completion;
        if (gap < 25) continue;
        const ignored = readIgnoredActionIds(GLOBAL_SCOPE);
        // Identifiant stable : l'insight ne réapparaît pas seulement parce que
        // le pourcentage varie de quelques points.
        const id = `gap:${leader.classInfo.id}:${lagger.classInfo.id}`;
        signals.push({
            id,
            kind: 'progress-gap',
            action: 'class',
            scope: 'global',
            classId: lagger.classInfo.id,
            className: formatClassDisplayName(lagger.classInfo.name),
            title: t('notifications.signal.progressTitle'),
            detail: t('notifications.signal.progressDetail', {
                className: formatClassDisplayName(lagger.classInfo.name),
                completion: lagger.completion,
                leaderCompletion: leader.completion,
                leaderName: formatClassDisplayName(leader.classInfo.name),
                gap,
            }),
            dismissible: true,
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
            scope: 'global',
            classId: '',
            className: '',
            title: daysSinceExport === null
                ? t('notifications.signal.backupNone')
                : t('notifications.signal.backupLast', { count: daysSinceExport }),
            detail: t('notifications.signal.backupDetail'),
            dismissible: true,
            ignored: ignored.has(id),
        });
    }

    return signals;
};
