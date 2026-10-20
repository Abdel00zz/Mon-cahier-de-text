import { ClassInfo } from '../../types.js';
import { prepareImportedLessons, type ImportPreparationResult } from '../notebook/importPipeline.js';
import { normalizeOfficialClassName } from '../../constants/class-levels.js';

/**
 * Bibliothèque de contenus prédéfinis (public/contenus/) : pour chaque
 * niveau × matière, un JSON de programme officiel que le prof peut charger
 * dans un cahier vide, puis modifier librement, ou ignorer et créer le sien.
 *
 * Organisation sur disque : `public/contenus/<matière>/<fichier>.json`, où
 * `<matière>` est le slug de la matière (ex. `mathematiques`, `physique-chimie`,
 * `svt`). Le manifest ne stocke que le nom de fichier ; le dossier est déduit
 * de la matière via `subjectFolder`.
 */

export interface PredefinedEntry {
    niveau: string;
    matiere: string;
    titre: string;
    fichier: string;
}

interface Manifest {
    version: number;
    contenus: PredefinedEntry[];
}

let manifestCache: Manifest | null = null;

export const setManifestCache = (manifest: Manifest | null): void => {
    manifestCache = manifest;
};

const loadManifest = async (): Promise<Manifest | null> => {
    if (manifestCache) return manifestCache;
    try {
        const response = await fetch('/contenus/manifest.json', { cache: 'no-cache' });
        if (!response.ok) return null;
        manifestCache = (await response.json()) as Manifest;
        return manifestCache;
    } catch {
        return null;
    }
};

const normalize = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/[ى]/g, 'ي')
        .replace(/[ة]/g, 'ه')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/** Dictionnaire des matières canoniques et de leurs alias multilingues (arabe, français, sigles). */
const CANONICAL_SUBJECTS: Record<string, string> = {
    // Mathématiques
    'mathematiques': 'Mathématiques',
    'mathematique': 'Mathématiques',
    'maths': 'Mathématiques',
    'math': 'Mathématiques',
    'الرياضيات': 'Mathématiques',
    'رياضيات': 'Mathématiques',

    // Physique-Chimie
    'physique chimie': 'Physique-Chimie',
    'physique': 'Physique-Chimie',
    'chimie': 'Physique-Chimie',
    'pc': 'Physique-Chimie',
    'الفيزياء والكيمياء': 'Physique-Chimie',
    'الفيزياء و الكيمياء': 'Physique-Chimie',
    'فيزياء وكيمياء': 'Physique-Chimie',
    'فيزياء و كيمياء': 'Physique-Chimie',
    'الفيزياء': 'Physique-Chimie',
    'فيزياء': 'Physique-Chimie',
    'الكيمياء': 'Physique-Chimie',
    'كيمياء': 'Physique-Chimie',

    // Sciences de la Vie et de la Terre
    'sciences de la vie et de la terre': 'Sciences de la Vie et de la Terre',
    'svt': 'Sciences de la Vie et de la Terre',
    'علوم الحياة والارض': 'Sciences de la Vie et de la Terre',
    'علوم الحياة والأرض': 'Sciences de la Vie et de la Terre',
    'علوم الحياة و الارض': 'Sciences de la Vie et de la Terre',
    'علوم الحياة و الأرض': 'Sciences de la Vie et de la Terre',
    'علوم': 'Sciences de la Vie et de la Terre',
};

const resolveCanonicalSubject = (subject: string): string => {
    const raw = subject.trim();
    if (CANONICAL_SUBJECTS[raw]) return CANONICAL_SUBJECTS[raw];
    const norm = normalize(raw);
    if (CANONICAL_SUBJECTS[norm]) return CANONICAL_SUBJECTS[norm];
    for (const [key, canonical] of Object.entries(CANONICAL_SUBJECTS)) {
        if (norm === normalize(key)) return canonical;
    }
    return raw;
};

/** Slug de dossier par matière (dossier sous `public/contenus/`). */
const SUBJECT_FOLDER: Record<string, string> = {
    'Mathématiques': 'mathematiques',
    'Physique-Chimie': 'physique-chimie',
    'Sciences de la Vie et de la Terre': 'svt',
};

const subjectFolder = (matiere: string): string =>
    SUBJECT_FOLDER[matiere] ??
    matiere.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Correspondance des niveaux marocains en arabe et de leurs formes canoniques dans le manifest. */
const ARABIC_LEVEL_MAP: Array<[RegExp, string]> = [
    // Collège
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الأولى|1)\s*(?:إعدادي|إع|اعدادي)|1\s*ac)/iu, '1AC'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*(?:إعدادي|إع|اعدادي)|2\s*ac)/iu, '2AC'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثالثة|3)\s*(?:إعدادي|إع|اعدادي)|3\s*ac)/iu, '3AC'],

    // Tronc Commun
    [/^(?:(?:classe|قسم)\s+)?(?:(?:ال)?ج[ذد]ع\s*(?:ال)?مشترك\s*(?:ال)?ع(?:لمي|لوم)?|ج[ذد]ع\s*ع(?:لمي|لوم)?|tcs)/iu, 'Tronc Commun Scientifique'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:ال)?ج[ذد]ع\s*(?:ال)?مشترك\s*(?:ال)?آ?داب(?:\s*و\s*(?:ال)?علوم\s*(?:ال)?إنسانية)?|ج[ذد]ع\s*آ?داب|tcl)/iu, 'Tronc Commun Lettres et Sciences Humaines'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:ال)?ج[ذد]ع\s*(?:ال)?مشترك\s*(?:ال)?تكنولوجي|tct)/iu, 'Tronc Commun Technologique'],

    // 1er Bac
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الأولى|1)\s*باك(?:الوريا)?\s*(?:علوم\s*تجريبية|ع\.?\s*ت\.?|ع\s*ت)|1bac\s*(?:se|exp))/iu, '1er Bac Sciences Expérimentales'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الأولى|1)\s*باك(?:الوريا)?\s*(?:علوم\s*رياضية|ع\.?\s*ر\.?|ع\s*ر)|1bac\s*sm)/iu, '1er Bac Sciences Mathématiques'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الأولى|1)\s*باك(?:الوريا)?\s*(?:آ?داب(?:\s*و\s*(?:ال)?علوم\s*(?:ال)?إنسانية)?)|1bac\s*l)/iu, '1er Bac Lettres et Sciences Humaines'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الأولى|1)\s*باك(?:الوريا)?\s*(?:علوم\s*اقتصادية(?:\s*وتدبير)?|اقتصاد)|1bac\s*(?:eco|seg))/iu, '1er Bac Sciences Économiques et Gestion'],

    // 2ème Bac
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:علوم\s*فيزيائية|ع\.?\s*ف\.?|ع\s*ف|فيزياء)|2bac\s*pc)/iu, '2ème Bac Sciences Physiques'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:علوم\s*الحياة\s*و\s*(?:ال)?أرض|علوم\s*الحياة\s*والارض|ع\.?\s*ح\.?\s*أ\.?|ع\s*ح\s*أ|svt)|2bac\s*svt)/iu, '2ème Bac Sciences de la Vie et de la Terre'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:علوم\s*رياضية\s*[أا]|ع\.?\s*ر\.?\s*[أا]\.?|ع\s*ر\s*[أا])|2bac\s*sma)/iu, '2ème Bac Sciences Mathématiques A'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:علوم\s*رياضية\s*ب|ع\.?\s*ر\.?\s*ب\.?|ع\s*ر\s*ب)|2bac\s*smb)/iu, '2ème Bac Sciences Mathématiques B'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:علوم\s*رياضية|ع\.?\s*ر\.?|ع\s*ر)|2bac\s*sm)/iu, '2ème Bac Sciences Mathématiques A'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:علوم\s*اقتصادية|اقتصاد)|2bac\s*eco)/iu, '2ème Bac Sciences Économiques'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:تدبير\s*محاسباتي|علوم\s*التدبير\s*المحاسباتي|محاسبة)|2bac\s*sgc)/iu, '2ème Bac Sciences de Gestion Comptable'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:آ?داب)|2bac\s*l)/iu, '2ème Bac Lettres'],
    [/^(?:(?:classe|قسم)\s+)?(?:(?:الثانية|2)\s*باك(?:الوريا)?\s*(?:علوم\s*إنسانية)|2bac\s*sh)/iu, '2ème Bac Sciences Humaines'],
];

const resolveCanonicalLevel = (name: string): string => {
    const trimmed = name.trim();
    for (const [pattern, canonical] of ARABIC_LEVEL_MAP) {
        if (pattern.test(trimmed)) return canonical;
    }
    const official = normalizeOfficialClassName(trimmed);
    for (const [pattern, canonical] of ARABIC_LEVEL_MAP) {
        if (pattern.test(official)) return canonical;
    }
    return official;
};

/** Contenu prédéfini correspondant à la classe (niveau préfixe du nom + matière, en français ou arabe). */
export const findPredefinedFor = async (classInfo: ClassInfo): Promise<PredefinedEntry | null> => {
    const manifest = await loadManifest();
    if (!manifest) return null;

    const canonicalSubject = resolveCanonicalSubject(classInfo.subject);
    const resolvedLevel = resolveCanonicalLevel(classInfo.name);
    const resolvedLevelNorm = normalize(resolvedLevel);
    const officialName = normalizeOfficialClassName(classInfo.name);
    const officialNorm = normalize(officialName);
    const rawNameNorm = normalize(classInfo.name);

    return (
        manifest.contenus.find(entry => {
            const entrySubject = resolveCanonicalSubject(entry.matiere);
            const matchesSubject =
                normalize(canonicalSubject) === normalize(entrySubject) ||
                normalize(classInfo.subject) === normalize(entry.matiere);
            if (!matchesSubject) return false;

            const entryResolved = resolveCanonicalLevel(entry.niveau);
            const entryResolvedNorm = normalize(entryResolved);
            const entryOfficial = normalizeOfficialClassName(entry.niveau);
            const entryOfficialNorm = normalize(entryOfficial);
            const entryRawNorm = normalize(entry.niveau);

            const matchesNiveau =
                resolvedLevelNorm === entryResolvedNorm ||
                resolvedLevelNorm.startsWith(entryResolvedNorm) ||
                resolvedLevelNorm.includes(entryResolvedNorm) ||
                officialNorm.startsWith(entryOfficialNorm) ||
                officialNorm.includes(entryOfficialNorm) ||
                rawNameNorm.startsWith(entryRawNorm) ||
                rawNameNorm.includes(entryRawNorm) ||
                entryOfficialNorm.startsWith(officialNorm);

            return matchesNiveau;
        }) ?? null
    );
};

/** Charge et normalise le contenu (même pipeline que l'import JSON manuel). */
export const loadPredefinedContent = async (entry: PredefinedEntry): Promise<ImportPreparationResult> => {
    const path = `/contenus/${subjectFolder(entry.matiere)}/${entry.fichier}`;
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Contenu prédéfini introuvable.');
    const raw = await response.json();
    return prepareImportedLessons(raw);
};
