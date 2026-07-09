import { AppConfig, ClassInfo } from '../types.js';
import { HolidayCalendar, getSchoolYearFor } from './calendar.js';

/**
 * Moteur du planning OFFICIEL des devoirs (فروض محروسة/منزلية).
 *
 * Source : public/planning-devoirs.json (transcription des documents
 * ministériels). Les semaines sont RELATIVES au début de chaque semestre :
 *   • Semestre 1 : la rentrée (année scolaire du calendrier) ;
 *   • Semestre 2 : le lendemain des vacances de mi-année.
 * Les dates calculées sont INDICATIVES et modifiables par le professeur
 * (onglet Emploi du temps) — jamais imposées.
 */

export interface PlannedAssessment {
    /** identifiant stable : s{semestre}-{type}{num} */
    id: string;
    semestre: 1 | 2;
    type: 'controle' | 'maison';
    num: number;
    /** libellé français complet */
    label: string;
    /** date indicative calculée (lundi de la semaine cible), ISO */
    dateISO: string;
    duree?: string;
    fenetre?: string;
    semaine: number;
}

interface PlanDevoir {
    type: 'controle' | 'maison';
    num: number;
    semaine: number;
    duree?: string;
    fenetre?: string;
}

interface Plan {
    niveaux: string[];
    libelle: string;
    semestres: { n: 1 | 2; devoirs: PlanDevoir[] }[];
}

interface PlanningFile {
    version: number;
    matiere: string;
    plans: Plan[];
}

let planningCache: PlanningFile | null = null;

export const loadPlanning = async (): Promise<PlanningFile | null> => {
    if (planningCache) return planningCache;
    try {
        const response = await fetch('/planning-devoirs.json', { cache: 'no-cache' });
        if (!response.ok) return null;
        planningCache = (await response.json()) as PlanningFile;
        return planningCache;
    } catch {
        return null;
    }
};

const normalize = (value: string): string =>
    value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Plan officiel correspondant au niveau de la classe (préfixe du nom). */
export const findPlanFor = (planning: PlanningFile, classInfo: Pick<ClassInfo, 'name' | 'subject'>): Plan | null => {
    if (normalize(classInfo.subject) !== normalize(planning.matiere)) return null;
    const className = normalize(classInfo.name);
    return (
        planning.plans.find(plan => plan.niveaux.some(niveau => className.startsWith(normalize(niveau)))) ?? null
    );
};

/* ── Arithmétique de dates FIABLE : tout passe par UTC, zéro décalage DST ── */

const toUTC = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

const fromUTC = (ms: number): string => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const addDaysISO = (iso: string, days: number): string => fromUTC(toUTC(iso) + days * 86_400_000);

/** Écart en jours calendaires (b − a), négatif si b est passé. */
export const daysBetweenISO = (a: string, b: string): number => Math.round((toUTC(b) - toUTC(a)) / 86_400_000);

/** Lundi de la semaine contenant la date (getDay UTC : 1 = lundi). */
const mondayOf = (iso: string): string => {
    const weekday = new Date(toUTC(iso)).getUTCDay();
    const shift = weekday === 0 ? -6 : 1 - weekday;
    return addDaysISO(iso, shift);
};

/** Début du semestre 2 : lendemain de la fin des vacances de mi-année de l'année en cours. */
const semester2Start = (cal: HolidayCalendar, yearStart: string, yearEnd: string): string => {
    const midYear = cal.vacances.find(
        v => v.debut >= yearStart && v.fin <= yearEnd && normalize(v.nom).includes('mi-annee')
    );
    if (midYear) return addDaysISO(midYear.fin, 1);
    return addDaysISO(yearStart, 19 * 7); // repli raisonnable : ~19 semaines
};

const TYPE_LABEL: Record<PlanDevoir['type'], string> = {
    controle: 'Devoir surveillé (محروس)',
    maison: 'Devoir maison (منزلي)',
};

/**
 * Dates indicatives de tous les devoirs du plan pour l'année scolaire en
 * cours (celle contenant `today`). Chaque devoir tombe le LUNDI de sa
 * semaine cible — le prof ajuste ensuite librement.
 */
export const computeAssessmentDates = (
    plan: Plan,
    cal: HolidayCalendar,
    today: string
): PlannedAssessment[] => {
    const year = getSchoolYearFor(cal, today);
    const starts: Record<1 | 2, string> = {
        1: mondayOf(year.debut),
        2: mondayOf(semester2Start(cal, year.debut, year.fin)),
    };

    const result: PlannedAssessment[] = [];
    for (const semestre of plan.semestres) {
        for (const devoir of semestre.devoirs) {
            result.push({
                id: `s${semestre.n}-${devoir.type}${devoir.num}`,
                semestre: semestre.n,
                type: devoir.type,
                num: devoir.num,
                label: `${TYPE_LABEL[devoir.type]} n°${devoir.num} — Semestre ${semestre.n}`,
                dateISO: addDaysISO(starts[semestre.n], (devoir.semaine - 1) * 7),
                duree: devoir.duree,
                fenetre: devoir.fenetre,
                semaine: devoir.semaine,
            });
        }
    }
    return result.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
};

/** Applique les dates personnalisées du professeur (config.assessmentDates). */
export const applyOverrides = (
    assessments: PlannedAssessment[],
    overrides: Record<string, string> | undefined
): PlannedAssessment[] =>
    !overrides
        ? assessments
        : assessments
              .map(a => (overrides[a.id] ? { ...a, dateISO: overrides[a.id] } : a))
              .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

export interface UpcomingAssessment extends PlannedAssessment {
    classId: string;
    className: string;
    /** jours restants (0 = aujourd'hui) */
    inDays: number;
}

/**
 * Devoirs « proches » : dans la fenêtre [aujourd'hui, +horizon jours].
 * Détection fiable : comparaison de jours calendaires UTC, indépendante
 * de l'heure locale et des changements d'heure.
 */
export const getUpcomingAssessments = (
    classes: ClassInfo[],
    planning: PlanningFile,
    config: Pick<AppConfig, 'assessmentDates'>,
    cal: HolidayCalendar,
    today: string,
    horizonDays = 14
): UpcomingAssessment[] => {
    const upcoming: UpcomingAssessment[] = [];
    for (const classInfo of classes) {
        const plan = findPlanFor(planning, classInfo);
        if (!plan) continue;
        const dates = applyOverrides(
            computeAssessmentDates(plan, cal, today),
            config.assessmentDates?.[classInfo.id]
        );
        for (const assessment of dates) {
            const inDays = daysBetweenISO(today, assessment.dateISO);
            if (inDays >= 0 && inDays <= horizonDays) {
                upcoming.push({ ...assessment, classId: classInfo.id, className: classInfo.name, inDays });
            }
        }
    }
    return upcoming.sort((a, b) => a.inDays - b.inDays);
};
