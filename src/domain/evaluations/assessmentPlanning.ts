import { uniq } from 'es-toolkit';
import type { ClassInfo, Cycle, DevoirType } from '../../types.js';
import { loadAssessmentReference } from './assessmentRules.js';
import { normalizeOfficialClassName } from '../../constants/class-levels.js';

/**
 * Moteur du planning OFFICIEL des devoirs (فروض محروسة/منزلية).
 *
 * Source : public/planning-devoirs.json (transcription des documents
 * ministériels). Les semaines sont RELATIVES au début de chaque semestre :
 *   • Semestre 1 : la rentrée (année scolaire du calendrier) ;
 *   • Semestre 2 : le lendemain des vacances de mi-année.
 * Les dates calculées sont INDICATIVES et modifiables par le professeur
 * (onglet Emploi du temps), jamais imposées.
 */

export interface PlannedAssessment {
    /** identifiant annuel stable : {année}:s{semestre}-{type}{num} */
    id: string;
    /** Ancienne clé sans millésime, lue uniquement pour migrer les réglages existants. */
    legacyId?: string;
    schoolYear: string;
    semestre: 1 | 2;
    type: DevoirType;
    num: number;
    /** libellé français complet */
    label: string;
    /** date indicative calculée (lundi de la semaine cible), ISO */
    dateISO: string;
    duree?: string;
    fenetre?: string;
    semaine: number;
    /** vrai si ajouté manuellement par le prof (hors planning officiel) */
    manual?: boolean;
    /** compte dans la note officielle */
    note?: boolean;
    /** La date affichée est une projection, jamais la règle officielle elle-même. */
    predictionStatus: 'derived' | 'adjusted' | 'manual' | 'unresolved';
    confidence: 'high' | 'medium' | 'low';
    predictedStart?: string;
    predictedEnd?: string;
    predictionReason: string;
}

interface PlanDevoir {
    type: DevoirType;
    num: number;
    semaine: number;
    duree?: string;
    fenetre?: string;
}

interface PlanExam {
    type: 'local' | 'regional' | 'national' | 'blanc';
    libelle: string;
    dateDebut: string;
    dateFin?: string;
    sessionRattrapage?: string;
    coefficient?: number;
    description?: string;
}

interface PlanSemester {
    n: 1 | 2;
    devoirs: PlanDevoir[];
    massarCloture?: string;
    remiseBulletins?: string;
}

export interface Plan {
    id?: string;
    /** matière concernée (ex. « Mathématiques », « SVT ») */
    matiere: string;
    /** cycle d'enseignement (college / lycee / prepa) */
    cycle?: Cycle;
    classe?: string;
    classeCode?: string;
    branche?: string;
    brancheCode?: string;
    filiereAr?: string;
    volumeHoraire?: string;
    coefficient?: number;
    niveaux: string[];
    libelle: string;
    sourceRef?: string;
    semestres: PlanSemester[];
    examens?: PlanExam[];
}

export interface PlanningFile {
    version: number;
    schoolYear?: string;
    rulesFile?: string;
    sourcesFile?: string;
    plans: Plan[];
}

let planningCache: PlanningFile | null = null;

const DEVOIR_TYPES: DevoirType[] = ['controle', 'controle_court', 'controle_global', 'oral', 'maison'];
const validCycle = (value: unknown): value is Cycle => value === 'college' || value === 'lycee' || value === 'prepa';
const requiredText = (value: unknown, path: string, max = 300): string => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${path} est obligatoire.`);
    if (value.length > max) throw new Error(`${path} est trop long.`);
    return value.trim();
};

/** Validation d'exécution : un référentiel édité ne peut pas casser silencieusement les vues. */
const validatePlanningFile = (value: unknown): PlanningFile => {
    if (!value || typeof value !== 'object') throw new Error('Le planning doit être un objet JSON.');
    const raw = value as { version?: unknown; schoolYear?: unknown; rulesFile?: unknown; sourcesFile?: unknown; plans?: unknown };
    if (!Number.isInteger(raw.version) || Number(raw.version) < 1) throw new Error('planning.version doit être un entier positif.');
    if (!Array.isArray(raw.plans) || raw.plans.length === 0 || raw.plans.length > 250) {
        throw new Error('planning.plans doit contenir entre 1 et 250 plans.');
    }

    const planKeys = new Set<string>();
    const plans = raw.plans.map((candidate, planIndex): Plan => {
        if (!candidate || typeof candidate !== 'object') throw new Error(`plans[${planIndex}] est invalide.`);
        const plan = candidate as Partial<Plan>;
        const matiere = requiredText(plan.matiere, `plans[${planIndex}].matiere`, 100);
        const libelle = requiredText(plan.libelle, `plans[${planIndex}].libelle`);
        if (plan.cycle !== undefined && !validCycle(plan.cycle)) throw new Error(`${libelle} : cycle inconnu.`);
        if (!Array.isArray(plan.niveaux) || plan.niveaux.length === 0) throw new Error(`${libelle} : niveaux est vide.`);
        const niveaux = uniq(plan.niveaux.map((niveau, index) => requiredText(niveau, `${libelle}.niveaux[${index}]`, 100)));
        const planKey = `${matiere.toLowerCase()}|${plan.cycle ?? ''}|${niveaux.map(n => n.toLowerCase()).sort().join('|')}`;
        if (planKeys.has(planKey)) throw new Error(`${libelle} : plan dupliqué.`);
        planKeys.add(planKey);
        if (!Array.isArray(plan.semestres) || plan.semestres.length === 0) throw new Error(`${libelle} : semestres est vide.`);

        const semesterKeys = new Set<number>();
        const semestres = plan.semestres.map((semester, semesterIndex) => {
            if (!semester || (semester.n !== 1 && semester.n !== 2)) throw new Error(`${libelle}.semestres[${semesterIndex}].n est invalide.`);
            if (semesterKeys.has(semester.n)) throw new Error(`${libelle} : semestre ${semester.n} dupliqué.`);
            semesterKeys.add(semester.n);
            if (!Array.isArray(semester.devoirs)) throw new Error(`${libelle}, semestre ${semester.n} : devoirs doit être un tableau.`);
            const assessmentKeys = new Set<string>();
            const devoirs = semester.devoirs.map((assessment, assessmentIndex): PlanDevoir => {
                if (!assessment || typeof assessment !== 'object') throw new Error(`${libelle} : devoir ${assessmentIndex + 1} invalide.`);
                const item = assessment as Partial<PlanDevoir>;
                if (!DEVOIR_TYPES.includes(item.type as DevoirType)) throw new Error(`${libelle} : type de devoir inconnu.`);
                if (!Number.isInteger(item.num) || Number(item.num) < 1 || Number(item.num) > 50) throw new Error(`${libelle} : numéro de devoir invalide.`);
                if (!Number.isInteger(item.semaine) || Number(item.semaine) < 1 || Number(item.semaine) > 30) throw new Error(`${libelle} : semaine de devoir invalide.`);
                const key = `${item.type}:${item.num}`;
                if (assessmentKeys.has(key)) throw new Error(`${libelle}, semestre ${semester.n} : ${key} dupliqué.`);
                assessmentKeys.add(key);
                return {
                    type: item.type as DevoirType,
                    num: Number(item.num),
                    semaine: Number(item.semaine),
                    ...(item.duree ? { duree: requiredText(item.duree, `${libelle}.${key}.duree`, 30) } : {}),
                    ...(item.fenetre ? { fenetre: requiredText(item.fenetre, `${libelle}.${key}.fenetre`, 200) } : {}),
                };
            });
            return {
                n: semester.n,
                devoirs,
                ...(semester.massarCloture ? { massarCloture: String(semester.massarCloture).trim() } : {}),
                ...(semester.remiseBulletins ? { remiseBulletins: String(semester.remiseBulletins).trim() } : {}),
            };
        });

        const examens = Array.isArray(plan.examens)
            ? plan.examens.map((ex): PlanExam => ({
                type: ex.type,
                libelle: requiredText(ex.libelle, `${libelle}.examens.libelle`, 150),
                dateDebut: requiredText(ex.dateDebut, `${libelle}.examens.dateDebut`, 20),
                ...(ex.dateFin ? { dateFin: requiredText(ex.dateFin, `${libelle}.examens.dateFin`, 20) } : {}),
                ...(ex.sessionRattrapage ? { sessionRattrapage: requiredText(ex.sessionRattrapage, `${libelle}.examens.sessionRattrapage`, 30) } : {}),
                ...(typeof ex.coefficient === 'number' ? { coefficient: ex.coefficient } : {}),
                ...(ex.description ? { description: requiredText(ex.description, `${libelle}.examens.description`, 500) } : {}),
            }))
            : undefined;

        return {
            id: plan.id,
            matiere,
            ...(plan.cycle ? { cycle: plan.cycle } : {}),
            classe: plan.classe,
            classeCode: plan.classeCode,
            branche: plan.branche,
            brancheCode: plan.brancheCode,
            filiereAr: plan.filiereAr,
            volumeHoraire: plan.volumeHoraire,
            coefficient: plan.coefficient,
            niveaux,
            libelle,
            ...(plan.sourceRef ? { sourceRef: requiredText(plan.sourceRef, `${libelle}.sourceRef`, 100) } : {}),
            semestres,
            ...(examens ? { examens } : {}),
        };
    });
    const schoolYear = raw.schoolYear === undefined ? undefined : requiredText(raw.schoolYear, 'planning.schoolYear', 9);
    if (schoolYear && !/^\d{4}-\d{4}$/.test(schoolYear)) throw new Error('planning.schoolYear doit respecter YYYY-YYYY.');
    return {
        version: Number(raw.version),
        ...(schoolYear ? { schoolYear } : {}),
        ...(raw.rulesFile ? { rulesFile: requiredText(raw.rulesFile, 'planning.rulesFile', 100) } : {}),
        ...(raw.sourcesFile ? { sourcesFile: requiredText(raw.sourcesFile, 'planning.sourcesFile', 100) } : {}),
        plans,
    };
};

export const loadPlanning = async (): Promise<PlanningFile | null> => {
    if (planningCache) return planningCache;
    try {
        const response = await fetch('/planning-devoirs.json', { cache: 'no-cache' });
        if (!response.ok) return null;
        const planning = validatePlanningFile(await response.json());
        if (planning.version >= 3) {
            const reference = await loadAssessmentReference();
            if (!reference) return null;
            const sourceIds = new Set(reference.sources.sources.map(source => source.id));
            if (planning.plans.some(plan => !plan.sourceRef || !sourceIds.has(plan.sourceRef))) return null;
        }
        planningCache = planning;
        return planningCache;
    } catch {
        return null;
    }
};

export const normalize = (value: string): string =>
    value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Plan officiel correspondant à la matière, au cycle, à la classe et à la branche. */
export const findPlanFor = (
    planning: PlanningFile,
    classInfo: Pick<ClassInfo, 'name' | 'subject' | 'cycle'> & Partial<Pick<ClassInfo, 'level' | 'branch'>>,
): Plan | null => {
    const subject = normalize(classInfo.subject);
    const rawName = classInfo.name || '';
    const normalizedName = normalize(normalizeOfficialClassName(rawName));
    const rawNameNorm = normalize(rawName);
    const cycle = classInfo.cycle;

    return (
        planning.plans.find(plan => {
            if (normalize(plan.matiere) !== subject) return false;
            // Le cycle n'est contraint que si le plan ET la classe le précisent.
            if (plan.cycle && cycle && plan.cycle !== cycle) return false;

            // 1. Si la classe dispose de level ou branch explicites
            if (classInfo.level && plan.classe && normalize(plan.classe) === normalize(classInfo.level)) {
                if (!classInfo.branch || !plan.branche || normalize(plan.branche).includes(normalize(classInfo.branch))) {
                    return true;
                }
            }

            // 2. Correspondance par alias dans plan.niveaux
            return plan.niveaux.some(niveau => {
                const n = normalize(niveau);
                return (
                    normalizedName === n ||
                    normalizedName.startsWith(`${n} `) ||
                    rawNameNorm === n ||
                    rawNameNorm.startsWith(`${n} `) ||
                    normalizedName.includes(n) ||
                    rawNameNorm.includes(n)
                );
            });
        }) ?? null
    );
};

export interface ClassAssessmentPlanDetails {
    planId?: string;
    cycle?: Cycle;
    cycleLabel: string;
    classe?: string;
    branche?: string;
    filiereAr?: string;
    volumeHoraire?: string;
    coefficient?: number;
    libelle: string;
    sourceRef?: string;
    examens: PlanExam[];
    s1MassarCloture?: string;
    s1RemiseBulletins?: string;
    s2MassarCloture?: string;
    s2RemiseBulletins?: string;
    totalControlesS1: number;
    totalControlesS2: number;
}

export const getAssessmentPlanDetailsForClass = (
    classInfo: ClassInfo,
    planning: PlanningFile | null
): ClassAssessmentPlanDetails | null => {
    if (!planning) return null;
    const plan = findPlanFor(planning, classInfo);
    if (!plan) return null;

    const s1 = plan.semestres.find(s => s.n === 1);
    const s2 = plan.semestres.find(s => s.n === 2);

    return {
        planId: plan.id,
        cycle: plan.cycle,
        cycleLabel: plan.cycle === 'college' ? 'Collège' : plan.cycle === 'lycee' ? 'Lycée' : 'CPGE',
        classe: plan.classe,
        branche: plan.branche,
        filiereAr: plan.filiereAr,
        volumeHoraire: plan.volumeHoraire,
        coefficient: plan.coefficient,
        libelle: plan.libelle,
        sourceRef: plan.sourceRef,
        examens: plan.examens ?? [],
        s1MassarCloture: s1?.massarCloture,
        s1RemiseBulletins: s1?.remiseBulletins,
        s2MassarCloture: s2?.massarCloture,
        s2RemiseBulletins: s2?.remiseBulletins,
        totalControlesS1: s1?.devoirs.filter(d => d.type === 'controle').length ?? 0,
        totalControlesS2: s2?.devoirs.filter(d => d.type === 'controle').length ?? 0,
    };
};

