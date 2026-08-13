type AssessmentRuleStatus = 'verified' | 'partial' | 'unverified';
type RuleConfidence = 'high' | 'medium' | 'low';

type AssessmentTimingRule =
    | { kind: 'schoolWeek'; week: number }
    | { kind: 'semesterFinalWindow' }
    | { kind: 'monthWeek'; month: number; week: number }
    | { kind: 'unitMiddle' | 'unitEnd' | 'moduleProgress' | 'afterLesson' | 'learningCycleEnd' | 'continuous' | 'unresolved' }
    | { kind: 'schoolWeekByTrack' };

interface OfficialSource {
    id: string;
    documentNumber: string;
    documentDate?: string;
    title: string;
    authority: string;
    status: 'reference_pending_archive' | 'transcribed_partial' | 'archived';
    verification: 'secondary_reference' | 'page_checked' | 'verified_archive';
    pagesUsed?: number[];
    note?: string;
}

interface AssessmentRule {
    id: string;
    subjectId: string;
    cycle: 'college' | 'lycee' | 'prepa';
    levels: string[];
    semesters: (1 | 2)[];
    assessmentType: string;
    officialCount?: number;
    officialDurationMinutes?: number[];
    timingRules: AssessmentTimingRule[];
    sourceRef: string;
    sourcePages: number[];
    status: AssessmentRuleStatus;
    confidence: RuleConfidence;
    note?: string;
}

interface AssessmentRulesFile {
    version: number;
    scope: 'official_rules_only';
    rules: AssessmentRule[];
}

interface OfficialSourcesFile {
    version: number;
    sources: OfficialSource[];
}

const text = (value: unknown, path: string): string => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${path} est obligatoire.`);
    return value.trim();
};

const validateTimingRule = (value: unknown, path: string): AssessmentTimingRule => {
    if (!value || typeof value !== 'object') throw new Error(`${path} est invalide.`);
    const rule = value as { kind?: unknown; week?: unknown; month?: unknown };
    const kind = text(rule.kind, `${path}.kind`) as AssessmentTimingRule['kind'];
    if (kind === 'schoolWeek') {
        if (!Number.isInteger(rule.week) || Number(rule.week) < 1 || Number(rule.week) > 30) throw new Error(`${path}.week est invalide.`);
        return { kind, week: Number(rule.week) };
    }
    if (kind === 'monthWeek') {
        if (!Number.isInteger(rule.month) || Number(rule.month) < 1 || Number(rule.month) > 12) throw new Error(`${path}.month est invalide.`);
        if (!Number.isInteger(rule.week) || Number(rule.week) < 1 || Number(rule.week) > 5) throw new Error(`${path}.week est invalide.`);
        return { kind, month: Number(rule.month), week: Number(rule.week) };
    }
    const withoutParameters = new Set([
        'semesterFinalWindow', 'unitMiddle', 'unitEnd', 'moduleProgress', 'afterLesson',
        'learningCycleEnd', 'continuous', 'unresolved', 'schoolWeekByTrack',
    ]);
    if (!withoutParameters.has(kind)) throw new Error(`${path}.kind est inconnu.`);
    return { kind } as AssessmentTimingRule;
};

const validateOfficialSources = (value: unknown): OfficialSourcesFile => {
    if (!value || typeof value !== 'object') throw new Error('Le registre des sources est invalide.');
    const raw = value as { version?: unknown; sources?: unknown };
    if (!Number.isInteger(raw.version) || Number(raw.version) < 1) throw new Error('sources.version est invalide.');
    if (!Array.isArray(raw.sources) || raw.sources.length === 0) throw new Error('sources.sources est vide.');
    const ids = new Set<string>();
    const sources = raw.sources.map((candidate, index): OfficialSource => {
        if (!candidate || typeof candidate !== 'object') throw new Error(`sources[${index}] est invalide.`);
        const source = candidate as Partial<OfficialSource>;
        const id = text(source.id, `sources[${index}].id`);
        if (ids.has(id)) throw new Error(`Source dupliquée : ${id}.`);
        ids.add(id);
        if (source.status !== 'reference_pending_archive' && source.status !== 'transcribed_partial' && source.status !== 'archived') {
            throw new Error(`${id}.status est invalide.`);
        }
        if (source.verification !== 'secondary_reference' && source.verification !== 'page_checked' && source.verification !== 'verified_archive') {
            throw new Error(`${id}.verification est invalide.`);
        }
        if (source.status === 'archived' && source.verification !== 'verified_archive') {
            throw new Error(`${id} ne peut être archivée sans vérification d'archive.`);
        }
        return {
            ...source,
            id,
            documentNumber: text(source.documentNumber, `${id}.documentNumber`),
            title: text(source.title, `${id}.title`),
            authority: text(source.authority, `${id}.authority`),
        } as OfficialSource;
    });
    return { version: Number(raw.version), sources };
};

/** Refuse les règles officielles sans source ou inventées pour une matière non certifiée. */
const validateAssessmentRules = (value: unknown, sources: OfficialSource[]): AssessmentRulesFile => {
    if (!value || typeof value !== 'object') throw new Error('Le référentiel des règles est invalide.');
    const raw = value as { version?: unknown; scope?: unknown; rules?: unknown };
    if (!Number.isInteger(raw.version) || Number(raw.version) < 1) throw new Error('rules.version est invalide.');
    if (raw.scope !== 'official_rules_only') throw new Error('rules.scope doit valoir official_rules_only.');
    if (!Array.isArray(raw.rules)) throw new Error('rules.rules doit être un tableau.');
    const sourceIds = new Set(sources.map(source => source.id));
    const ids = new Set<string>();
    const rules = raw.rules.map((candidate, index): AssessmentRule => {
        if (!candidate || typeof candidate !== 'object') throw new Error(`rules[${index}] est invalide.`);
        const rule = candidate as Partial<AssessmentRule>;
        const id = text(rule.id, `rules[${index}].id`);
        if (ids.has(id)) throw new Error(`Règle dupliquée : ${id}.`);
        ids.add(id);
        const sourceRef = text(rule.sourceRef, `${id}.sourceRef`);
        if (!sourceIds.has(sourceRef)) throw new Error(`${id} référence une source inconnue.`);
        if (!Array.isArray(rule.levels) || rule.levels.length === 0) throw new Error(`${id}.levels est vide.`);
        if (!Array.isArray(rule.semesters) || rule.semesters.some(s => s !== 1 && s !== 2)) throw new Error(`${id}.semesters est invalide.`);
        if (!Array.isArray(rule.timingRules) || rule.timingRules.length === 0) throw new Error(`${id}.timingRules est vide.`);
        if (!Array.isArray(rule.sourcePages) || rule.sourcePages.some(page => !Number.isInteger(page) || page < 1)) throw new Error(`${id}.sourcePages est invalide.`);
        if (rule.status !== 'verified' && rule.status !== 'partial' && rule.status !== 'unverified') throw new Error(`${id}.status est invalide.`);
        if (rule.confidence !== 'high' && rule.confidence !== 'medium' && rule.confidence !== 'low') throw new Error(`${id}.confidence est invalide.`);
        return {
            ...rule,
            id,
            subjectId: text(rule.subjectId, `${id}.subjectId`),
            assessmentType: text(rule.assessmentType, `${id}.assessmentType`),
            sourceRef,
            timingRules: rule.timingRules.map((timing, timingIndex) => validateTimingRule(timing, `${id}.timingRules[${timingIndex}]`)),
        } as AssessmentRule;
    });
    return { version: Number(raw.version), scope: 'official_rules_only', rules };
};

let referenceCache: { sources: OfficialSourcesFile; rules: AssessmentRulesFile } | null = null;

/** Charge ensemble les règles et leur registre de sources; aucun circuit orphelin n'est accepté. */
export const loadAssessmentReference = async (): Promise<{ sources: OfficialSourcesFile; rules: AssessmentRulesFile } | null> => {
    if (referenceCache) return referenceCache;
    try {
        const [sourcesResponse, rulesResponse] = await Promise.all([
            fetch('/official-sources.json', { cache: 'no-cache' }),
            fetch('/assessment-rules.json', { cache: 'no-cache' }),
        ]);
        if (!sourcesResponse.ok || !rulesResponse.ok) return null;
        const sources = validateOfficialSources(await sourcesResponse.json());
        const rules = validateAssessmentRules(await rulesResponse.json(), sources.sources);
        referenceCache = { sources, rules };
        return referenceCache;
    } catch {
        return null;
    }
};
