import { apiFetch } from '../../platform/nativeHttp.js';
import type { AppLocale } from '../../types.js';
// Attribut d'import obligatoire côté Node/ESM (fonctions Vercel) : sans lui,
// le runtime lève ERR_IMPORT_ATTRIBUTE_MISSING et la fonction plante au
// chargement. Vite inline le JSON côté navigateur en le respectant aussi.
import calendarJson from '../../../public/vacances-jourferie.json' with { type: 'json' };

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

export const isValidISODate = (value: unknown): value is string => {
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

/** Une requête lente ne doit jamais retarder l'affichage de la séance en cours. */
const CALENDAR_TIMEOUT_MS = 4_000;
/** Après un échec, on reste sur le bundle puis on retente : un démarrage hors ligne ne fige rien. */
const CALENDAR_RETRY_MS = 5 * 60_000;
let calendarInflight: Promise<HolidayCalendar> | null = null;
let calendarFailedAt = Number.NEGATIVE_INFINITY;

/**
 * Client uniquement : privilégie le JSON servi (corrigeable sans rebuild), avec repli sur le bundle.
 * Ne rejette jamais. Les appels simultanés partagent une seule requête ; une réponse tardive
 * (après le délai) est quand même retenue pour les appels suivants.
 */
export const loadHolidayCalendar = (): Promise<HolidayCalendar> => {
    if (cachedCalendar) return Promise.resolve(cachedCalendar);
    if (calendarInflight) return calendarInflight;
    if (Date.now() - calendarFailedAt < CALENDAR_RETRY_MS) return Promise.resolve(bundled);

    const request = (async () => {
        const response = await apiFetch('/api/calendar', { cache: 'no-cache' });
        if (!response.ok) throw new Error('calendar-unavailable');
        cachedCalendar = validateHolidayCalendar(await response.json());
        return cachedCalendar;
    })();
    // La requête peut échouer après l'expiration du délai : son rejet tardif est déjà traité.
    request.catch(() => undefined);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('calendar-timeout')), CALENDAR_TIMEOUT_MS);
    });
    calendarInflight = Promise.race([request, timeout])
        .catch(() => {
            calendarFailedAt = Date.now();
            return cachedCalendar ?? bundled;
        })
        .finally(() => {
            if (timer !== undefined) clearTimeout(timer);
            calendarInflight = null;
        });
    return calendarInflight;
};

/** Réservé aux tests : remet à zéro la mémoire du calendrier chargé. */
export const resetHolidayCalendarCacheForTests = (): void => {
    cachedCalendar = null;
    calendarInflight = null;
    calendarFailedAt = Number.NEGATIVE_INFINITY;
};

