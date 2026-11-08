import type { ScheduleSlot } from '../../types.js';
import { getBundledCalendar, isValidISODate, type AnneeScolaire, type HolidayCalendar } from './calendarData';

const toISODate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const asISO = (date: string | Date): string => (typeof date === 'string' ? date.slice(0, 10) : toISODate(date));

/*
 * Construire un Intl.DateTimeFormat coûte plus cher que le formatage lui-même,
 * et cette fonction est appelée une fois par classe à chaque recalcul des
 * signaux. Un formateur par fuseau suffit : il est immuable et réutilisable.
 */
const isoFormatters = new Map<string, Intl.DateTimeFormat>();

/** Date du jour sur l'horloge locale du téléphone ou de l'ordinateur. */
export const deviceTodayISO = (now: Date = new Date()): string => toISODate(now);

/** Heure locale de l'appareil en minutes depuis minuit (avec précision à la milliseconde). */
export const deviceClockMinutes = (now: Date = new Date()): number =>
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60_000;

/** Date du jour dans le fuseau demandé (ou l'horloge locale si `fuseau` est vide). */
export const todayInMorocco = (now: Date = new Date(), cal?: HolidayCalendar): string => {
    const zone = cal !== undefined ? cal.fuseau : getBundledCalendar().fuseau;
    if (!zone || zone === 'local') return toISODate(now);
    try {
        // 'en-CA' produit le format YYYY-MM-DD
        let formatter = isoFormatters.get(zone);
        if (!formatter) {
            formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone });
            isoFormatters.set(zone, formatter);
        }
        return formatter.format(now);
    } catch {
        return toISODate(now);
    }
};

export const isHoliday = (date: string | Date, cal: HolidayCalendar): boolean => {
    const iso = asISO(date);
    return cal.joursFeries.some(f => f.date === iso);
};

export const isVacation = (date: string | Date, cal: HolidayCalendar): boolean => {
    const iso = asISO(date);
    return cal.vacances.some(v => iso >= v.debut && iso <= v.fin);
};

const getWeekday = (iso: string): number => {
    // parse en UTC pour éviter tout décalage de fuseau
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** Repos hebdomadaire du cahier : le samedi reste un jour d'enseignement. */
export const isWeeklyRestDay = (iso: string): boolean =>
    isValidISODate(iso) && getWeekday(iso) === 0;

const INSTRUCTION_WEEKDAYS = [1, 2, 3, 4, 5, 6];

const isSchoolDay = (date: string | Date, weekdays: number[], cal: HolidayCalendar): boolean => {
    const iso = asISO(date);
    if (isWeeklyRestDay(iso) || !weekdays.includes(getWeekday(iso))) return false;
    return !isHoliday(iso, cal) && !isVacation(iso, cal);
};

/** Liste ordonnée des années scolaires connues (multi-années ou rétro-compat). */
const getYears = (cal: HolidayCalendar): AnneeScolaire[] => {
    const years = cal.anneesScolaires?.length ? cal.anneesScolaires : [cal.anneeScolaire];
    return [...years].sort((a, b) => a.debut.localeCompare(b.debut));
};

/**
 * Année scolaire contenant la date donnée, ou, hors périodes connues
 * (été, dates hors calendrier), l'année la plus proche.
 */
const getSchoolYearFor = (cal: HolidayCalendar, dateISO: string): AnneeScolaire => {
    const years = getYears(cal);
    const containing = years.find(y => dateISO >= y.debut && dateISO <= y.fin);
    if (containing) return containing;
    // été entre deux années → prochaine rentrée ; sinon la plus proche
    const upcoming = years.find(y => dateISO < y.debut);
    const past = [...years].reverse().find(y => dateISO > y.fin);
    return upcoming ?? past ?? years[0];
};

/**
 * Déduit le millésime scolaire d'une date : septembre déclenche la nouvelle
 * année scolaire (2026-09-07 → 2026-2027), janvier à août appartiennent à
 * l'année commencée l'année précédente.
 */
export const schoolYearLabelFromDate = (dateISO: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateISO);
    if (!match) return '';
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || month < 1 || month > 12) return '';
    const startYear = month >= 9 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

/**
 * Source unique de l'année scolaire réellement suivie par le professeur.
 * Une rentrée personnalisée prime sur le calendrier embarqué ; l'échéance
 * officielle reste utilisée lorsqu'elle est connue.
 */
export const getEffectiveSchoolYear = (
    cal: HolidayCalendar,
    selectedStart?: string,
    today: string = todayInMorocco(new Date(), cal),
): AnneeScolaire => {
    const start = selectedStart?.slice(0, 10) ?? '';
    const label = schoolYearLabelFromDate(start);
    if (!label) return getSchoolYearFor(cal, today);

    const known = getYears(cal).find(year => year.libelle === label);
    const endYear = Number(label.slice(-4));
    const fallbackEnd = `${endYear}-08-31`;

    return {
        libelle: label,
        debut: start,
        // Une rentrée saisie après la fin officielle ne doit jamais produire
        // une période inversée.
        fin: known && known.fin >= start ? known.fin : fallbackEnd,
    };
};

/** La date appartient-elle à une année scolaire connue (hors été) ? */
export const isWithinKnownSchoolYear = (cal: HolidayCalendar, dateISO: string): boolean =>
    getYears(cal).some(y => dateISO >= y.debut && dateISO <= y.fin);

export const getSchoolYearStart = (cal: HolidayCalendar, today?: string): string => {
    if (!today) return getYears(cal)[0].debut;
    const year = getSchoolYearFor(cal, today);
    // pendant l'été précédant une rentrée, l'« attendu » démarre à cette rentrée
    return year.debut;
};

const addDaysISO = (iso: string, days: number): string => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return toISODate(new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
};

const mondayOf = (iso: string): string => {
    const weekday = getWeekday(iso);
    return addDaysISO(iso, weekday === 0 ? -6 : 1 - weekday);
};

export interface PedagogicalWeek {
    /** Numéro relatif au semestre, hors semaines entièrement fermées. */
    number: number;
    /** Bornes civiles de la semaine d'enseignement (lundi à samedi). */
    start: string;
    end: string;
    /** Premier jour où un devoir peut réellement être programmé. */
    firstSchoolDay: string;
    /** Dernier jour où un devoir peut réellement être programmé. */
    lastSchoolDay: string;
}

/**
 * Convertit une semaine officielle relative au semestre en semaine civile.
 * Une semaine lundi-samedi entièrement couverte par des vacances/jours fériés
 * ne consomme aucun numéro pédagogique. Une fermeture partielle conserve la
 * semaine, mais `firstSchoolDay` évite de proposer un devoir un jour fermé.
 */
export const getPedagogicalWeek = (
    semesterStart: string,
    weekNumber: number,
    cal: HolidayCalendar,
    until: string,
): PedagogicalWeek | null => {
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || semesterStart > until) return null;

    let monday = mondayOf(asISO(semesterStart));
    let pedagogicalNumber = 0;
    let guard = 0;
    while (monday <= until && guard < 80) {
        const schoolDays: string[] = [];
        for (let offset = 0; offset < 6; offset += 1) {
            const date = addDaysISO(monday, offset);
            if (date >= semesterStart && date <= until && isSchoolDay(date, INSTRUCTION_WEEKDAYS, cal)) {
                schoolDays.push(date);
            }
        }
        if (schoolDays.length > 0) {
            pedagogicalNumber += 1;
            if (pedagogicalNumber === weekNumber) {
                return {
                    number: weekNumber,
                    start: monday,
                    end: addDaysISO(monday, 5),
                    firstSchoolDay: schoolDays[0],
                    lastSchoolDay: schoolDays[schoolDays.length - 1],
                };
            }
        }
        monday = addDaysISO(monday, 7);
        guard += 1;
    }
    return null;
};

/** Nombre de jours de classe (weekdays hors fériés/vacances) dans [from, to] inclus. */
export const countSchoolDaysBetween = (
    from: string,
    to: string,
    weekdays: number[],
    cal: HolidayCalendar
): number => {
    if (!weekdays.length || from > to) return 0;
    let count = 0;
    let cursor = asISO(from);
    const end = asISO(to);
    let guard = 0;
    while (cursor <= end && guard < 1000) {
        if (isSchoolDay(cursor, weekdays, cal)) count += 1;
        cursor = addDaysISO(cursor, 1);
        guard += 1;
    }
    return count;
};

/** Nombre de séances attendues dans [from, to] inclus, en tenant compte des séances doubles. */
export const countExpectedSessions = (
    from: string,
    to: string,
    slots: ScheduleSlot[],
    cal: HolidayCalendar
): number => {
    if (!slots.length || from > to) return 0;
    const sessionsByWeekday = new Map<number, number>();
    for (const slot of slots) {
        sessionsByWeekday.set(slot.weekday, (sessionsByWeekday.get(slot.weekday) ?? 0) + (slot.sessions ?? 1));
    }
    let total = 0;
    let cursor = asISO(from);
    const end = asISO(to);
    let guard = 0;
    while (cursor <= end && guard < 1000) {
        const weekday = getWeekday(cursor);
        if (!isWeeklyRestDay(cursor) && sessionsByWeekday.has(weekday) && !isHoliday(cursor, cal) && !isVacation(cursor, cal)) {
            total += sessionsByWeekday.get(weekday)!;
        }
        cursor = addDaysISO(cursor, 1);
        guard += 1;
    }
    return total;
};

/**
 * Dates (ISO, triées) où au moins une séance était attendue dans [from, to].
 * Une seule entrée par date, même en cas de séances doubles : sert à repérer
 * les journées de classe sans aucune trace de séance dans le cahier.
 */
export const listExpectedSessionDates = (
    from: string,
    to: string,
    slots: ScheduleSlot[],
    cal: HolidayCalendar
): string[] => {
    if (!slots.length || from > to) return [];
    const weekdaysWithSessions = new Set(slots.map(slot => slot.weekday));
    const dates: string[] = [];
    let cursor = asISO(from);
    const end = asISO(to);
    let guard = 0;
    while (cursor <= end && guard < 1000) {
        if (!isWeeklyRestDay(cursor) && weekdaysWithSessions.has(getWeekday(cursor)) && !isHoliday(cursor, cal) && !isVacation(cursor, cal)) {
            dates.push(cursor);
        }
        cursor = addDaysISO(cursor, 1);
        guard += 1;
    }
    return dates;
};

