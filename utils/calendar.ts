import { ScheduleSlot } from '../types.js';
import calendarJson from '../public/vacances-jourferie.json';

export interface FerieEntry {
    date: string;
    nom: string;
    type: 'national' | 'religieux';
    approximatif?: boolean;
}

export interface VacancePeriode {
    nom: string;
    debut: string;
    fin: string;
}

export interface AnneeScolaire {
    libelle: string;
    debut: string;
    fin: string;
}

export interface HolidayCalendar {
    version: number;
    pays: string;
    fuseau: string;
    /** rétro-compatibilité : première année connue */
    anneeScolaire: AnneeScolaire;
    /** support multi-années (2025-2026, 2026-2027, ...) */
    anneesScolaires?: AnneeScolaire[];
    joursFeries: FerieEntry[];
    vacances: VacancePeriode[];
}

const bundled = calendarJson as HolidayCalendar;

export const getBundledCalendar = (): HolidayCalendar => bundled;

let cachedCalendar: HolidayCalendar | null = null;

/** Client uniquement : privilégie le JSON servi (corrigeable sans rebuild), avec repli sur le bundle. */
export const loadHolidayCalendar = async (): Promise<HolidayCalendar> => {
    if (cachedCalendar) return cachedCalendar;
    try {
        const response = await fetch('/vacances-jourferie.json', { cache: 'no-cache' });
        if (response.ok) {
            cachedCalendar = (await response.json()) as HolidayCalendar;
            return cachedCalendar;
        }
    } catch {
        // hors ligne : repli sur le calendrier embarqué
    }
    cachedCalendar = bundled;
    return cachedCalendar;
};

export const toISODate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const asISO = (date: string | Date): string => (typeof date === 'string' ? date.slice(0, 10) : toISODate(date));

/** Date du jour dans le fuseau marocain — critique côté serveur (fonctions Vercel en UTC). */
export const todayInMorocco = (now: Date = new Date(), cal: HolidayCalendar = bundled): string => {
    try {
        // 'en-CA' produit le format YYYY-MM-DD
        return new Intl.DateTimeFormat('en-CA', { timeZone: cal.fuseau }).format(now);
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

export const isSchoolDay = (date: string | Date, weekdays: number[], cal: HolidayCalendar): boolean => {
    const iso = asISO(date);
    if (!weekdays.includes(getWeekday(iso))) return false;
    return !isHoliday(iso, cal) && !isVacation(iso, cal);
};

/** Liste ordonnée des années scolaires connues (multi-années ou rétro-compat). */
const getYears = (cal: HolidayCalendar): AnneeScolaire[] => {
    const years = cal.anneesScolaires?.length ? cal.anneesScolaires : [cal.anneeScolaire];
    return [...years].sort((a, b) => a.debut.localeCompare(b.debut));
};

/**
 * Année scolaire contenant la date donnée — ou, hors périodes connues
 * (été, dates hors calendrier), l'année la plus proche.
 */
export const getSchoolYearFor = (cal: HolidayCalendar, dateISO: string): AnneeScolaire => {
    const years = getYears(cal);
    const containing = years.find(y => dateISO >= y.debut && dateISO <= y.fin);
    if (containing) return containing;
    // été entre deux années → prochaine rentrée ; sinon la plus proche
    const upcoming = years.find(y => dateISO < y.debut);
    const past = [...years].reverse().find(y => dateISO > y.fin);
    return upcoming ?? past ?? years[0];
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
        if (sessionsByWeekday.has(weekday) && !isHoliday(cursor, cal) && !isVacation(cursor, cal)) {
            total += sessionsByWeekday.get(weekday)!;
        }
        cursor = addDaysISO(cursor, 1);
        guard += 1;
    }
    return total;
};

/** Prochain jour de classe strictement après `afterDate` (ou null si hors année scolaire). */
export const nextSchoolDay = (
    afterDate: string,
    weekdays: number[],
    cal: HolidayCalendar
): string | null => {
    if (!weekdays.length) return null;
    const lastKnownEnd = getYears(cal)[getYears(cal).length - 1].fin;
    let cursor = addDaysISO(asISO(afterDate), 1);
    let guard = 0;
    while (cursor <= lastKnownEnd && guard < 800) {
        if (isSchoolDay(cursor, weekdays, cal)) return cursor;
        cursor = addDaysISO(cursor, 1);
        guard += 1;
    }
    return null;
};

const WEEKDAY_LABELS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const weekdayLabel = (weekday: number): string => WEEKDAY_LABELS[weekday] ?? '';

export const formatSchoolDayLabel = (iso: string): string => {
    const weekday = getWeekday(iso);
    const [, , d] = iso.split('-');
    return `${WEEKDAY_LABELS[weekday]} ${Number(d)}`;
};
