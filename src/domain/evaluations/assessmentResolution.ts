import type { AppConfig, ClassInfo, DevoirType, ManualAssessment } from '../../types.js';
import { getEffectiveSchoolYear, getPedagogicalWeek, schoolYearLabelFromDate, type HolidayCalendar } from '../calendar/calendar.js';
import { findPlanFor, normalize, type Plan, type PlannedAssessment, type PlanningFile } from './assessmentPlanning';

/* ── Arithmétique de dates FIABLE : tout passe par UTC, zéro décalage DST ── */

const toUTC = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

const fromUTC = (ms: number): string => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const addDaysISO = (iso: string, days: number): string => fromUTC(toUTC(iso) + days * 86_400_000);


/** Début du semestre 2 : lendemain de la fin des vacances de mi-année de l'année en cours. */
const semester2Start = (cal: HolidayCalendar, yearStart: string, yearEnd: string): string => {
    const midYear = cal.vacances.find(
        v => v.debut >= yearStart && v.fin <= yearEnd && normalize(v.nom).includes('mi-annee')
    );
    if (midYear) return addDaysISO(midYear.fin, 1);
    return addDaysISO(yearStart, 19 * 7); // repli raisonnable : ~19 semaines
};

const TYPE_LABEL: Record<DevoirType, string> = {
    controle: 'Devoir surveillé',
    controle_court: 'Devoir écrit court surveillé',
    controle_global: 'Devoir écrit global surveillé',
    oral: 'Compétences orales',
    maison: 'Devoir maison',
    colle: 'Colle (interrogation orale)',
};

/** Vaut par défaut dans la note officielle (le professeur peut l'ajuster). */
const DEVOIR_NOTE_DEFAULT: Record<DevoirType, boolean> = {
    controle: true,
    controle_court: true,
    controle_global: true,
    oral: true,
    maison: false,
    colle: true,
};

/** Convertit un devoir saisi manuellement en évaluation planifiée (sans planning officiel). */
const manualToPlanned = (m: ManualAssessment): PlannedAssessment => ({
    id: m.id,
    schoolYear: m.schoolYear ?? schoolYearLabelFromDate(m.dateISO),
    semestre: m.semestre,
    type: m.type,
    num: m.num,
    label: `${TYPE_LABEL[m.type]} n°${m.num}, Semestre ${m.semestre}`,
    dateISO: m.dateISO,
    duree: m.duree,
    semaine: 0,
    manual: true,
    note: m.note ?? DEVOIR_NOTE_DEFAULT[m.type],
    predictionStatus: 'manual',
    confidence: 'high',
    predictedStart: m.dateISO,
    predictedEnd: m.dateISO,
    predictionReason: 'Date choisie manuellement par le professeur.',
});

/**
 * Dates indicatives de tous les devoirs du plan pour l'année scolaire en
 * cours (celle contenant `today`). Les semaines entièrement fermées sont
 * ignorées. La date proposée est le premier jour scolaire de la semaine
 * pédagogique cible, puis le professeur peut l'ajuster librement.
 */
const computeAssessmentDates = (
    plan: Plan,
    cal: HolidayCalendar,
    today: string,
    schoolYearStart?: string,
): PlannedAssessment[] => {
    const year = getEffectiveSchoolYear(cal, schoolYearStart, today);
    const starts: Record<1 | 2, string> = {
        1: year.debut,
        2: semester2Start(cal, year.debut, year.fin),
    };

    const result: PlannedAssessment[] = [];
    for (const semestre of plan.semestres) {
        for (const devoir of semestre.devoirs) {
            const legacyId = `s${semestre.n}-${devoir.type}${devoir.num}`;
            const targetWeek = getPedagogicalWeek(starts[semestre.n], devoir.semaine, cal, year.fin);
            const fallbackDate = addDaysISO(starts[semestre.n], (devoir.semaine - 1) * 7);
            result.push({
                id: `${year.libelle}:${legacyId}`,
                legacyId,
                schoolYear: year.libelle,
                semestre: semestre.n,
                type: devoir.type,
                num: devoir.num,
                label: `${TYPE_LABEL[devoir.type]} n°${devoir.num}, Semestre ${semestre.n}`,
                dateISO: targetWeek?.firstSchoolDay ?? fallbackDate,
                duree: devoir.duree,
                fenetre: devoir.fenetre,
                semaine: devoir.semaine,
                predictionStatus: targetWeek ? 'derived' : 'unresolved',
                confidence: targetWeek ? 'high' : 'low',
                predictedStart: targetWeek?.start,
                predictedEnd: targetWeek?.end,
                predictionReason: targetWeek
                    ? `Semaine pédagogique ${devoir.semaine}, hors semaines entièrement fermées.`
                    : `Semaine pédagogique ${devoir.semaine} introuvable dans l'année scolaire.`,
            });
        }
    }
    return result.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
};

/** Applique les dates personnalisées du professeur (config.assessmentDates). */
const applyOverrides = (
    assessments: PlannedAssessment[],
    overrides: Record<string, string> | undefined
): PlannedAssessment[] =>
    !overrides
        ? assessments
        : assessments
              .map(a => {
                  const dateISO = overrides[a.id] ?? (a.legacyId ? overrides[a.legacyId] : undefined);
                  return dateISO
                      ? {
                            ...a,
                            dateISO,
                            predictionStatus: 'adjusted' as const,
                            confidence: 'high' as const,
                            predictionReason: 'Date pédagogique ajustée par le professeur.',
                        }
                      : a;
              })
              .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

type AssessmentConfig = Pick<
    AppConfig,
    'assessmentDates' | 'schoolYearStart' | 'manualAssessments' | 'removedAssessments' | 'assessmentOrder'
>;

/**
 * Numéro SUIVANT d'une famille de devoirs : le PLUS GRAND existant + 1.
 *
 * Compter les existants (`length + 1`) paraît équivalent et ne l'est pas :
 * après une suppression (DM1 et DM3 restants), le compte propose 3 — un
 * DOUBLON avec le devoir déjà là. Le maximum, lui, reste juste quels que
 * soient les trous et les suppressions.
 */
export const nextAssessmentNumber = (
    assessments: readonly { id: string; type: string; num?: number }[],
    type: string,
    excludeId?: string,
): number => assessments.reduce(
    (max, item) => (item.type === type && item.id !== excludeId && typeof item.num === 'number' && item.num > max ? item.num : max),
    0,
) + 1;

/** Source unique des évaluations visibles d'une classe, utilisée par la vue et les notifications. */
export const resolveClassAssessments = (
    classInfo: ClassInfo,
    planning: PlanningFile,
    config: AssessmentConfig,
    cal: HolidayCalendar,
    today: string,
): PlannedAssessment[] => {
    const year = getEffectiveSchoolYear(cal, config.schoolYearStart, today);
    const plan = findPlanFor(planning, classInfo);
    const planningApplies = !planning.schoolYear || planning.schoolYear === year.libelle;
    const base = plan && planningApplies
        ? applyOverrides(computeAssessmentDates(plan, cal, today, config.schoolYearStart), config.assessmentDates?.[classInfo.id])
        : [];

    const baseByLegacyId = new Map(base.flatMap(item => item.legacyId ? [[item.legacyId, item] as const] : []));
    const manual = (config.manualAssessments?.[classInfo.id] ?? [])
        .map(manualToPlanned)
        .filter(item => item.schoolYear === year.libelle)
        .map(item => {
            const official = baseByLegacyId.get(item.id);
            return official ? { ...item, id: official.id, legacyId: official.legacyId } : item;
        });

    const removed = new Set(config.removedAssessments?.[classInfo.id] ?? []);
    const combined = [...base, ...manual].filter(item => !removed.has(item.id) && !(item.legacyId && removed.has(item.legacyId)));
    const deduplicated = new Map<string, PlannedAssessment>();
    for (const item of combined) deduplicated.set(item.id, item);
    let assessments = [...deduplicated.values()];

    const order = config.assessmentOrder?.[classInfo.id] ?? [];
    if (order.length > 0) {
        const orderIndex = new Map(order.map((id, index) => [id, index]));
        assessments = assessments.sort((a, b) => {
            const aIndex = orderIndex.get(a.id) ?? (a.legacyId ? orderIndex.get(a.legacyId) : undefined);
            const bIndex = orderIndex.get(b.id) ?? (b.legacyId ? orderIndex.get(b.legacyId) : undefined);
            if (aIndex === undefined && bIndex === undefined) return a.dateISO.localeCompare(b.dateISO);
            if (aIndex === undefined) return 1;
            if (bIndex === undefined) return -1;
            return aIndex - bIndex;
        });
    }
    return assessments;
};
