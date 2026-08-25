import { AppLocale, ScheduleSlot } from '../types.js';
// Attribut d'import obligatoire côté Node/ESM (fonctions Vercel) : sans lui,
// le runtime lève ERR_IMPORT_ATTRIBUTE_MISSING et la fonction plante au
// chargement. Vite inline le JSON côté navigateur en le respectant aussi.
import calendarJson from '../public/vacances-jourferie.json' with { type: 'json' };

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

const CALENDAR_NAMES_AR: Record<string, string> = {
    "Aïd al-Mawlid (1er jour)": 'عيد المولد النبوي (اليوم الأول)',
    "Aïd al-Mawlid (2e jour)": 'عيد المولد النبوي (اليوم الثاني)',
    'Anniversaire de la Marche Verte': 'ذكرى المسيرة الخضراء',
    "Fête de l'Indépendance": 'عيد الاستقلال',
    'Nouvel An': 'رأس السنة الميلادية',
    "Manifeste de l'Indépendance": 'ذكرى تقديم وثيقة الاستقلال',
    'Nouvel An Amazigh (Yennayer)': 'رأس السنة الأمازيغية (إيض يناير)',
    "Aïd al-Fitr (1er jour)": 'عيد الفطر (اليوم الأول)',
    "Aïd al-Fitr (2e jour)": 'عيد الفطر (اليوم الثاني)',
    'Fête du Travail': 'عيد الشغل',
    "Aïd al-Adha (1er jour)": 'عيد الأضحى (اليوم الأول)',
    "Aïd al-Adha (2e jour)": 'عيد الأضحى (اليوم الثاني)',
    "Nouvel An de l'Hégire (1er Moharram 1448)": 'رأس السنة الهجرية (فاتح محرم 1448)',
    "Nouvel An de l'Hégire (1er Moharram 1449)": 'رأس السنة الهجرية (فاتح محرم 1449)',
    "Aïd Al Wahda (Fête de l'Unité)": 'عيد الوحدة',
    "Vacances d'automne": 'العطلة البينية الأولى',
    'Vacances de fin de 1re période': 'العطلة البينية الثانية',
    'Vacances de mi-année': 'عطلة منتصف السنة الدراسية',
    'Vacances de printemps': 'العطلة الربيعية',
    'Vacances de mai': 'عطلة شهر ماي',
    '1re pause interstitielle (الفترة البينية الأولى)': 'العطلة البينية الأولى',
    '2e pause interstitielle (الفترة البينية الثانية)': 'العطلة البينية الثانية',
    '3e pause interstitielle (الفترة البينية الثالثة)': 'العطلة البينية الثالثة',
    '4e pause interstitielle (الفترة البينية الرابعة)': 'العطلة البينية الرابعة',
    'Vacances de mi-année scolaire': 'عطلة منتصف السنة الدراسية',
    'Aïd al-Fitr, 29 Ramadan → 2 Chawwal 1448 (estimé)': 'عطلة عيد الفطر، من 29 رمضان إلى 2 شوال 1448 (تقديري)',
    'Aïd al-Adha, 9 → 11 Dhou al-Hijja 1448 (estimé)': 'عطلة عيد الأضحى، من 9 إلى 11 ذي الحجة 1448 (تقديري)',
};

/** Traduit les intitulés officiels du calendrier sans modifier les données source. */
export const localizeCalendarName = (name: string, locale: AppLocale): string => {
    if (locale === 'ar') {
        const summer = name.match(/^Vacances d'été (\d{4})$/);
        if (summer) return `العطلة الصيفية ${summer[1]}`;
        return CALENDAR_NAMES_AR[name] ?? name;
    }
    if (locale === 'en') {
        const summer = name.match(/^Vacances d'été (\d{4})$/);
        if (summer) return `Summer break ${summer[1]}`;
    }
    return name;
};

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

const isValidISODate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const validateYear = (value: unknown, path: string): AnneeScolaire => {
    if (!value || typeof value !== 'object') throw new Error(`${path} est invalide.`);
    const year = value as Partial<AnneeScolaire>;
    if (typeof year.libelle !== 'string' || !/^\d{4}-\d{4}$/.test(year.libelle)) throw new Error(`${path}.libelle est invalide.`);
    if (!isValidISODate(year.debut) || !isValidISODate(year.fin) || year.fin < year.debut) throw new Error(`${path} contient des bornes invalides.`);
    return { libelle: year.libelle, debut: year.debut, fin: year.fin };
};

/** Validation commune au bundle, à l'API d'administration et au chargement client. */
export const validateHolidayCalendar = (value: unknown): HolidayCalendar => {
    if (!value || typeof value !== 'object') throw new Error('Calendrier invalide.');
    const raw = value as Partial<HolidayCalendar>;
    if (!Number.isInteger(raw.version) || Number(raw.version) < 1) throw new Error('calendar.version est invalide.');
    if (typeof raw.pays !== 'string' || !raw.pays.trim()) throw new Error('calendar.pays est invalide.');
    if (typeof raw.fuseau !== 'string' || !raw.fuseau.trim()) throw new Error('calendar.fuseau est invalide.');
    const anneeScolaire = validateYear(raw.anneeScolaire, 'calendar.anneeScolaire');
    const anneesScolaires = raw.anneesScolaires?.map((year, index) => validateYear(year, `calendar.anneesScolaires[${index}]`));
    const years = [...(anneesScolaires?.length ? anneesScolaires : [anneeScolaire])].sort((a, b) => a.debut.localeCompare(b.debut));
    if (new Set(years.map(year => year.libelle)).size !== years.length) throw new Error('Années scolaires dupliquées.');
    if (years.some((year, index) => index > 0 && year.debut <= years[index - 1].fin)) throw new Error('Années scolaires qui se chevauchent.');
    if (!Array.isArray(raw.joursFeries) || !Array.isArray(raw.vacances)) throw new Error('Listes du calendrier absentes.');
    const joursFeries = raw.joursFeries.map((item, index): FerieEntry => {
        if (!item || !isValidISODate(item.date) || typeof item.nom !== 'string' || !item.nom.trim()) throw new Error(`calendar.joursFeries[${index}] est invalide.`);
        if (item.type !== 'national' && item.type !== 'religieux') throw new Error(`calendar.joursFeries[${index}].type est invalide.`);
        if (item.approximatif !== undefined && typeof item.approximatif !== 'boolean') throw new Error(`calendar.joursFeries[${index}].approximatif est invalide.`);
        return { date: item.date, nom: item.nom.trim(), type: item.type, ...(item.approximatif !== undefined ? { approximatif: item.approximatif } : {}) };
    }).sort((a, b) => a.date.localeCompare(b.date));
    const vacances = raw.vacances.map((item, index): VacancePeriode => {
        if (!item || !isValidISODate(item.debut) || !isValidISODate(item.fin) || item.fin < item.debut || typeof item.nom !== 'string' || !item.nom.trim()) {
            throw new Error(`calendar.vacances[${index}] est invalide.`);
        }
        return { nom: item.nom.trim(), debut: item.debut, fin: item.fin };
    }).sort((a, b) => a.debut.localeCompare(b.debut));
    return {
        version: Number(raw.version),
        pays: raw.pays.trim(),
        fuseau: raw.fuseau.trim(),
        anneeScolaire,
        ...(anneesScolaires?.length ? { anneesScolaires: years } : {}),
        joursFeries,
        vacances,
    };
};

const bundled = validateHolidayCalendar(calendarJson);

export const getBundledCalendar = (): HolidayCalendar => cachedCalendar ?? bundled;

let cachedCalendar: HolidayCalendar | null = null;

/** Client uniquement : privilégie le JSON servi (corrigeable sans rebuild), avec repli sur le bundle. */
export const loadHolidayCalendar = async (): Promise<HolidayCalendar> => {
    if (cachedCalendar) return cachedCalendar;
    try {
        const response = await fetch('/api/calendar', { cache: 'no-cache' });
        if (response.ok) {
            cachedCalendar = validateHolidayCalendar(await response.json());
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

/*
 * Construire un Intl.DateTimeFormat coûte plus cher que le formatage lui-même,
 * et cette fonction est appelée une fois par classe à chaque recalcul des
 * signaux. Un formateur par fuseau suffit : il est immuable et réutilisable.
 */
const isoFormatters = new Map<string, Intl.DateTimeFormat>();

/** Date du jour dans le fuseau marocain, critique côté serveur (fonctions Vercel en UTC). */
export const todayInMorocco = (now: Date = new Date(), cal: HolidayCalendar = bundled): string => {
    try {
        // 'en-CA' produit le format YYYY-MM-DD
        let formatter = isoFormatters.get(cal.fuseau);
        if (!formatter) {
            formatter = new Intl.DateTimeFormat('en-CA', { timeZone: cal.fuseau });
            isoFormatters.set(cal.fuseau, formatter);
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

const INSTRUCTION_WEEKDAYS = [1, 2, 3, 4, 5, 6];

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
    cal: HolidayCalendar,
    until?: string,
): string | null => {
    if (!weekdays.length) return null;
    const lastKnownEnd = until ?? getYears(cal)[getYears(cal).length - 1].fin;
    let cursor = addDaysISO(asISO(afterDate), 1);
    let guard = 0;
    while (cursor <= lastKnownEnd && guard < 800) {
        if (isSchoolDay(cursor, weekdays, cal)) return cursor;
        cursor = addDaysISO(cursor, 1);
        guard += 1;
    }
    return null;
};
