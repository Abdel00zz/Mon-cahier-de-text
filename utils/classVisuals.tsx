import { normalizeOfficialClassName } from '../constants';

export interface ClassVisual {
    /** Classe de fond pour le cadre extérieur de 12px (ex: bg-[#ec4899]). */
    frameBg: string;
    /** Style du badge de cycle ou sous-titre assorti. */
    badgeStyle: string;
    /** Fond de l'icône dans la carte intérieure blanche. */
    iconSurfaceClass: string;
    /** Couleur de l'icône. */
    iconClass: string;
}

const visual = (
    frameBg: string,
    badgeStyle: string,
    iconSurfaceClass: string,
    iconClass: string,
): ClassVisual => ({
    frameBg,
    badgeStyle,
    iconSurfaceClass,
    iconClass,
});

// Orange Pêche pour Tronc Commun (#ffc085)
const ORANGE_PECHE = visual(
    'bg-[#ffc085]',
    'bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100',
    'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    'text-orange-600'
);

// Mauve Pastel pour 1er Bac (#d9b8ff)
const MAUVE_PASTEL = visual(
    'bg-[#d9b8ff]',
    'bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-100',
    'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    'text-purple-600'
);

// Bleu Marine pour 2ème Bac (#2e3856)
const NAVY_BLUE = visual(
    'bg-[#2e3856]',
    'bg-slate-100 text-slate-900 dark:bg-slate-900/60 dark:text-slate-100',
    'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300',
    'text-slate-800'
);

// Cyan Vif pour Collège (#3cccfe)
const CYAN_COLLEGE = visual(
    'bg-[#3cccfe]',
    'bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100',
    'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    'text-sky-600'
);

/*
 * Identité visuelle unifiée par Niveau/Cycle.
 * Tronc Commun: Orange Pêche (#ffc085)
 * 1er Bac: Mauve Pastel (#d9b8ff)
 * 2ème Bac: Bleu Marine (#2e3856)
 * Collège: Cyan Vif (#3cccfe)
 */
const CLASS_VISUALS: Record<string, ClassVisual> = {
    // Collège
    '1AC': CYAN_COLLEGE,
    '2AC': CYAN_COLLEGE,
    '3AC': CYAN_COLLEGE,

    // Tronc Commun
    'Tronc Commun Scientifique': ORANGE_PECHE,
    'Tronc Commun Lettres et Sciences Humaines': ORANGE_PECHE,
    'Tronc Commun Technologique': ORANGE_PECHE,
    'Tronc commun scientifique': ORANGE_PECHE,
    'Tronc commun lettres': ORANGE_PECHE,
    'Tronc commun technologique': ORANGE_PECHE,

    // 1er Bac
    '1er Bac Sciences Expérimentales': MAUVE_PASTEL,
    '1er Bac Sciences Mathématiques': MAUVE_PASTEL,
    '1er Bac Lettres et Sciences Humaines': MAUVE_PASTEL,
    '1er Bac Lettres': MAUVE_PASTEL,
    '1er Bac Sciences Économiques et Gestion': MAUVE_PASTEL,
    '1er Bac Sciences Économiques': MAUVE_PASTEL,

    // 2ème Bac
    '2ème Bac Sciences Physiques': NAVY_BLUE,
    '2ème Bac Sciences de la Vie et de la Terre': NAVY_BLUE,
    '2ème Bac Sciences Mathématiques A': NAVY_BLUE,
    '2ème Bac Sciences Mathématiques B': NAVY_BLUE,
    '2ème Bac Sciences Économiques': NAVY_BLUE,
    '2ème Bac Sciences de Gestion Comptable': NAVY_BLUE,
    '2ème Bac Lettres': NAVY_BLUE,
    '2ème Bac Sciences Humaines': NAVY_BLUE,

    // Legacy keys (Backward compatibility)
    '1BAC Sc. Expérimentales': MAUVE_PASTEL,
    '1BAC Sc. Mathématiques': MAUVE_PASTEL,
    '1BAC Lettres': MAUVE_PASTEL,
    '1BAC Sc. Économiques': MAUVE_PASTEL,
    '2BAC PC': NAVY_BLUE,
    '2BAC SVT': NAVY_BLUE,
    '2BAC Sc. Maths A': NAVY_BLUE,
    '2BAC Sc. Maths B': NAVY_BLUE,
    '2BAC Sc. Économiques': NAVY_BLUE,
    '2BAC Sc. Gestion Comptable': NAVY_BLUE,
    '2BAC Lettres': NAVY_BLUE,
    '2BAC Sc. Humaines': NAVY_BLUE,

    // Prépas
    'MPSI': MAUVE_PASTEL,
    'PCSI': MAUVE_PASTEL,
    'MP': MAUVE_PASTEL,
    'PSI': MAUVE_PASTEL,
    'TSI': MAUVE_PASTEL,
    'ECS': MAUVE_PASTEL,
    'ECT': MAUVE_PASTEL,
};

const LEVELS = Object.keys(CLASS_VISUALS).sort((left, right) => right.length - left.length);

/** Retourne une identité visuelle basée sur le niveau/cycle pour les cartes encadrées à double couche. */
export const getClassVisual = (className: string): ClassVisual => {
    const normalized = normalizeOfficialClassName(className);
    const level = LEVELS.find(key => normalized === key || normalized.startsWith(`${key} `));
    if (level) return CLASS_VISUALS[level];

    // Fallback dynamique par préfixe
    const lower = normalized.toLowerCase();
    if (lower.startsWith('2') || lower.includes('2eme') || lower.includes('2ème') || lower.includes('2bac')) {
        return NAVY_BLUE;
    }
    if (lower.startsWith('1er') || lower.includes('1ere') || lower.includes('1ère') || lower.includes('1bac')) {
        return MAUVE_PASTEL;
    }
    if (lower.includes('tronc') || lower.startsWith('tc')) {
        return ORANGE_PECHE;
    }
    if (lower.includes('ac') || lower.includes('coll')) {
        return CYAN_COLLEGE;
    }
    if (['mpsi', 'pcsi', 'mp', 'psi', 'tsi', 'ecs', 'ect'].some(p => lower.includes(p))) {
        return MAUVE_PASTEL;
    }

    return CYAN_COLLEGE;
};

/* ── Identité visuelle par matière ──────────────────────────────────────── */

const SUBJECT_ALIASES: Record<string, string> = {
    'Physique': 'Physique-Chimie',
    'Sciences de la Vie': 'Sciences de la Vie et de la Terre',
    'SVT': 'Sciences de la Vie et de la Terre',
    'Économie': 'Sciences Économiques et Gestion',
    'Sciences Économiques': 'Sciences Économiques et Gestion',
    'EPS': 'Éducation Physique et Sportive',
};

const SUBJECT_VISUALS: Record<string, ClassVisual> = {
    'Mathématiques': visual('bg-[#8fb8ff]', 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100', 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', 'text-blue-600'),
    'Physique-Chimie': visual('bg-[#c3a6ff]', 'bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-100', 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', 'text-purple-600'),
    'Sciences de la Vie et de la Terre': visual('bg-[#93ddb0]', 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', 'text-emerald-600'),
    'Sciences de l’Ingénieur': visual('bg-[#aeb9cc]', 'bg-slate-100 text-slate-900 dark:bg-slate-900/60 dark:text-slate-100', 'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300', 'text-slate-600'),
    'Sciences Économiques et Gestion': visual('bg-[#ffcf7d]', 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', 'text-amber-600'),
    'Informatique': visual('bg-[#9aa8ff]', 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-100', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', 'text-indigo-600'),
    'Français': visual('bg-[#ffa8cc]', 'bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100', 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', 'text-rose-600'),
    'Arabe': visual('bg-[#7fd6cf]', 'bg-teal-100 text-teal-900 dark:bg-teal-900/60 dark:text-teal-100', 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300', 'text-teal-600'),
    'Anglais': visual('bg-[#ff9f9f]', 'bg-red-100 text-red-900 dark:bg-red-900/60 dark:text-red-100', 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', 'text-red-600'),
    'Espagnol': visual('bg-[#ffb879]', 'bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100', 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', 'text-orange-600'),
    'Allemand': visual('bg-[#f2dc7a]', 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100', 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300', 'text-yellow-600'),
    'Philosophie': visual('bg-[#7fd4f5]', 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/60 dark:text-cyan-100', 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300', 'text-cyan-600'),
    'Histoire-Géographie': visual('bg-[#f09be0]', 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/60 dark:text-fuchsia-100', 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300', 'text-fuchsia-600'),
    'Éducation Islamique': visual('bg-[#cfe58a]', 'bg-lime-100 text-lime-900 dark:bg-lime-900/60 dark:text-lime-100', 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300', 'text-lime-600'),
    'Éducation Physique et Sportive': visual('bg-[#bcc99a]', 'bg-stone-100 text-stone-900 dark:bg-stone-900/60 dark:text-stone-100', 'bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-300', 'text-stone-600'),
};

const SUBJECT_VISUAL_KEYS = Object.keys(SUBJECT_VISUALS);

const NEUTRAL_VISUAL = visual(
    'bg-slate-300',
    'bg-slate-100 text-slate-900 dark:bg-slate-900/60 dark:text-slate-100',
    'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300',
    'text-slate-600',
);

const normalizeSubject = (subject: string): string => {
    const trimmed = (subject || '').trim();
    return SUBJECT_ALIASES[trimmed] ?? trimmed;
};

/** Identité visuelle par matière : remplace la couleur par niveau/cycle des cartes. */
export const getSubjectVisual = (subject: string): ClassVisual => {
    const normalized = normalizeSubject(subject);
    if (!normalized) return NEUTRAL_VISUAL;
    if (SUBJECT_VISUALS[normalized]) return SUBJECT_VISUALS[normalized];

    // Matière hors liste (saisie libre) : couleur stable et déterministe.
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }
    return SUBJECT_VISUALS[SUBJECT_VISUAL_KEYS[hash % SUBJECT_VISUAL_KEYS.length]];
};


