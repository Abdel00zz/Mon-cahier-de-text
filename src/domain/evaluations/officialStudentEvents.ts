import { apiFetch } from '../../platform/nativeHttp.js';
// Attribut d'import obligatoire côté Node/ESM (fonctions Vercel), inline par
// Vite côté navigateur, voir utils/calendar.ts.
import officialEventsJson from '../../../public/official-student-events.json' with { type: 'json' };
import { ClassInfo } from '../../types.js';
import { lookupClassLevelIdentity, normalizeOfficialClassName } from '../../constants/class-levels.js';
import { getEffectiveSchoolYear, type HolidayCalendar } from '../calendar/calendar.js';

export type OfficialStudentEventCategory =
    | 'school'
    | 'assessment'
    | 'exam'
    | 'result'
    | 'support'
    | 'competition';

type OfficialDateKind = 'fixed' | 'window' | 'indicative';

export interface OfficialStudentEvent {
    id: string;
    category: OfficialStudentEventCategory;
    title: string;
    start: string;
    end?: string;
    levels: string[];
    dateKind: OfficialDateKind;
    studentAction: string;
    sourcePage: number;
    /** Matière concernée (optionnel) : absent = s'applique à toutes les matières. */
    matiere?: string;
}

export interface OfficialStudentEventsFile {
    version: number;
    schoolYear: string;
    source: {
        title: string;
        date: string;
        language: string;
        note: string;
    };
    events: OfficialStudentEvent[];
}

const bundled = officialEventsJson as OfficialStudentEventsFile;
let cached: OfficialStudentEventsFile = bundled;

export const OFFICIAL_EVENT_CATEGORIES: OfficialStudentEventCategory[] = [
    'school', 'assessment', 'exam', 'result', 'support', 'competition',
];

const OFFICIAL_DATE_KINDS: OfficialDateKind[] = ['fixed', 'window', 'indicative'];

export const OFFICIAL_LEVEL_TAGS = [
    'all-secondary', 'college', 'lycee', '1ac', '2ac', '3ac', 'tc', 'tc-scientific', '1bac', '2bac',
] as const;

const validISO = (value: unknown): value is string =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const requiredText = (value: unknown, label: string, maxLength = 500): string => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} est obligatoire.`);
    if (value.length > maxLength) throw new Error(`${label} est trop long.`);
    return value.trim();
};

/** Frontière commune à l'import admin et à l'API : aucune donnée non validée n'atteint l'application. */
export const validateOfficialStudentEventsFile = (value: unknown): OfficialStudentEventsFile => {
    if (!value || typeof value !== 'object') throw new Error('Le bulletin JSON doit être un objet.');
    const file = value as Partial<OfficialStudentEventsFile>;
    if (typeof file.schoolYear !== 'string' || !/^\d{4}-\d{4}$/.test(file.schoolYear)) {
        throw new Error('schoolYear doit suivre le format 2026-2027.');
    }
    if (!file.source || typeof file.source !== 'object') throw new Error('La source officielle est obligatoire.');
    if (!validISO(file.source.date)) throw new Error('source.date doit être une date ISO YYYY-MM-DD.');
    const source = {
        title: requiredText(file.source.title, 'source.title', 300),
        date: file.source.date,
        language: requiredText(file.source.language, 'source.language', 10),
        note: requiredText(file.source.note, 'source.note', 1000),
    };
    if (!Array.isArray(file.events) || file.events.length === 0) throw new Error('events doit contenir au moins un événement.');
    if (file.events.length > 500) throw new Error('Le bulletin dépasse la limite de 500 événements.');

    const ids = new Set<string>();
    const events = file.events.map((raw, index): OfficialStudentEvent => {
        if (!raw || typeof raw !== 'object') throw new Error(`Événement ${index + 1} invalide.`);
        const event = raw as Partial<OfficialStudentEvent>;
        const id = requiredText(event.id, `events[${index}].id`, 100);
        if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`${id} : identifiant invalide (minuscules, chiffres et tirets).`);
        if (ids.has(id)) throw new Error(`${id} : identifiant dupliqué.`);
        ids.add(id);
        if (!OFFICIAL_EVENT_CATEGORIES.includes(event.category as OfficialStudentEventCategory)) {
            throw new Error(`${id} : catégorie inconnue.`);
        }
        if (!validISO(event.start)) throw new Error(`${id} : date de début invalide.`);
        if (event.end !== undefined && !validISO(event.end)) throw new Error(`${id} : date de fin invalide.`);
        if (event.end && event.end < event.start) throw new Error(`${id} : la fin précède le début.`);
        if (!Array.isArray(event.levels) || event.levels.length === 0) throw new Error(`${id} : levels est obligatoire.`);
        const levels = [...new Set(event.levels.map(level => requiredText(level, `${id}.levels`, 30)))];
        const unknownLevel = levels.find(level => !OFFICIAL_LEVEL_TAGS.includes(level as typeof OFFICIAL_LEVEL_TAGS[number]));
        if (unknownLevel) throw new Error(`${id} : niveau inconnu « ${unknownLevel} ».`);
        if (!OFFICIAL_DATE_KINDS.includes(event.dateKind as OfficialDateKind)) throw new Error(`${id} : dateKind inconnu.`);
        if (!Number.isInteger(event.sourcePage) || Number(event.sourcePage) < 1 || Number(event.sourcePage) > 999) {
            throw new Error(`${id} : sourcePage invalide.`);
        }
        return {
            id,
            category: event.category as OfficialStudentEventCategory,
            title: requiredText(event.title, `${id}.title`, 200),
            start: event.start,
            end: event.end,
            levels,
            dateKind: event.dateKind as OfficialDateKind,
            studentAction: requiredText(event.studentAction, `${id}.studentAction`, 500),
            sourcePage: Number(event.sourcePage),
            matiere: typeof event.matiere === 'string' && event.matiere.trim()
                ? requiredText(event.matiere, `${id}.matiere`, 120)
                : undefined,
        };
    }).sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));

    return {
        version: Math.max(1, Number(file.version) || 1),
        schoolYear: file.schoolYear,
        source,
        events,
    };
};

const normalize = (value: string): string =>
    value
        .toLocaleLowerCase('fr')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

/**
 * Traduit les noms de classes existants (1AC 2, TC Sciences, 1BAC SM...) en
 * balises d'éligibilité. Les balises larges permettent de rester utile pour
 * les anciennes classes qui ne possèdent que le champ `cycle`.
 */
const getClassStudentTags = (classInfo: Pick<ClassInfo, 'name' | 'cycle'>): Set<string> => {
    const raw = classInfo.name || '';
    const normalized = normalizeOfficialClassName(raw);
    const name = normalize(normalized);
    // Le bulletin ministériel organise le secondaire : les classes préparatoires (CPGE) ont leur propre calendrier.
    const isPrepa = classInfo.cycle === 'prepa' || !!lookupClassLevelIdentity(raw)?.identity.tier.startsWith('prepa');
    const tags = new Set<string>(isPrepa ? [] : ['all-secondary']);

    const is1ac = /(^| )1 ?(ac|apic|asc)( |$)/.test(name) || name.includes('1ere annee college') || name.includes('1ere annee collegiale');
    const is2ac = /(^| )2 ?(ac|apic|asc)( |$)/.test(name) || name.includes('2eme annee college') || name.includes('2eme annee collegiale');
    const is3ac = /(^| )3 ?(ac|apic|asc)( |$)/.test(name) || name.includes('3eme annee college') || name.includes('3eme annee collegiale');
    const isTc = /(^| )tc( |$)/.test(name) || name.includes('tronc commun') || /(^| )tcs( |$)/.test(name) || /(^| )tcl( |$)/.test(name) || /(^| )tct( |$)/.test(name);
    const is1bac = /(^| )1 ?bac( |$)/.test(name) || name.includes('premiere bac') || name.includes('1er bac') || name.includes('1ere bac');
    const is2bac = /(^| )2 ?bac( |$)/.test(name) || name.includes('deuxieme bac') || name.includes('2eme bac') || name.includes('2e bac');
    const explicitCollege = is1ac || is2ac || is3ac;
    const explicitLycee = isTc || is1bac || is2bac;

    if (is1ac) tags.add('1ac');
    if (is2ac) tags.add('2ac');
    if (is3ac) tags.add('3ac');
    if (explicitCollege || (!explicitLycee && classInfo.cycle === 'college')) tags.add('college');

    if (isTc) tags.add('tc');
    if (is1bac) tags.add('1bac');
    if (is2bac) tags.add('2bac');
    if (explicitLycee || (!explicitCollege && classInfo.cycle === 'lycee')) tags.add('lycee');

    if (isTc && /(science|scientifique|sc math|sm|tcs)/.test(name)) tags.add('tc-scientific');

    return tags;
};

export const getOfficialStudentEventsFile = (): OfficialStudentEventsFile => cached;

/** Charge la version publiée par l'administration, avec repli immédiat sur le bulletin embarqué hors ligne. */
export const loadOfficialStudentEvents = async (force = false): Promise<OfficialStudentEventsFile> => {
    if (!force && cached !== bundled) return cached;
    try {
        const response = await apiFetch('/api/official-events', { cache: 'no-cache' });
        if (!response.ok) return cached;
        cached = validateOfficialStudentEventsFile(await response.json());
    } catch {
        // Hors ligne ou bulletin invalide : le dernier bulletin sain reste actif.
    }
    return cached;
};

export const getOfficialStudentEventsForClass = (
    classInfo: Pick<ClassInfo, 'name' | 'cycle' | 'subject'>,
    category?: OfficialStudentEventCategory,
    file: OfficialStudentEventsFile = cached,
): OfficialStudentEvent[] => {
    const tags = getClassStudentTags(classInfo);
    const subject = normalize(classInfo.subject ?? '');
    return file.events
        .filter(event => {
            if (category && event.category !== category) return false;
            if (!event.levels.some(level => tags.has(level))) return false;
            // Un événement marqué d'une matière n'apparaît que pour cette matière.
            if (event.matiere && normalize(event.matiere) !== subject) return false;
            return true;
        })
        .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
};

export const getOfficialEventEffectiveEnd = (event: OfficialStudentEvent): string => event.end ?? event.start;

/**
 * Les événements « école » sont de deux sortes : la rentrée, puis la fin des
 * cours. Un événement tombant plus de 90 jours après la rentrée ne peut être
 * que la fin des cours, quel que soit l'identifiant choisi à la publication.
 */
const TEACHING_END_MIN_DAYS_AFTER_START = 90;

const shiftISO = (iso: string, days: number): string => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

/**
 * Dernier jour de cours d'une classe d'après le bulletin officiel (« Fin des
 * cours »), ou null quand le bulletin ne couvre pas l'année suivie ou ne dit
 * rien de ce niveau. Au-delà, plus aucune séance n'est attendue : ni retard,
 * ni séance manquée, ni projection du programme.
 */
export const getClassTeachingEnd = (
    classInfo: Pick<ClassInfo, 'name' | 'cycle' | 'subject'>,
    year: { libelle: string; debut: string },
    file: OfficialStudentEventsFile = cached,
): string | null => {
    if (file.schoolYear !== year.libelle) return null;
    const threshold = shiftISO(year.debut, TEACHING_END_MIN_DAYS_AFTER_START);
    const ends = getOfficialStudentEventsForClass(classInfo, 'school', file)
        .filter(event => event.dateKind === 'fixed' && event.start > threshold)
        .map(event => event.start)
        .sort();
    return ends[0] ?? null;
};

/** Variante des vues qui ne connaissent que le calendrier et la rentrée choisie par l'enseignant. */
export const getClassTeachingEndForYear = (
    classInfo: Pick<ClassInfo, 'name' | 'cycle' | 'subject'>,
    calendar: HolidayCalendar,
    schoolYearStart?: string,
    file: OfficialStudentEventsFile = cached,
): string | null => getClassTeachingEnd(classInfo, getEffectiveSchoolYear(calendar, schoolYearStart), file);

/**
 * Épreuves officielles fixes (examens locaux, régionaux, nationaux) tombant
 * le jour donné pour cette classe. Les fenêtres indicatives sont ignorées :
 * elles n'interdisent aucun jour précis.
 */
export const getClassExamsOn = (
    classInfo: Pick<ClassInfo, 'name' | 'cycle' | 'subject'>,
    iso: string,
    file: OfficialStudentEventsFile = cached,
): OfficialStudentEvent[] =>
    getOfficialStudentEventsForClass(classInfo, 'exam', file)
        .filter(event => event.dateKind === 'fixed' && iso >= event.start && iso <= getOfficialEventEffectiveEnd(event));
