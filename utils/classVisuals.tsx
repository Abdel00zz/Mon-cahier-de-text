import { normalizeOfficialClassName } from '../constants';

export interface ClassVisual {
    /** Couleur d'accent pour les jauges et repères compacts. */
    frameBg: string;
    /** Surface de carte : stable par niveau, jamais déterminée par l'ordre. */
    cardSurfaceClass: string;
    /** Surface du chapitre dans le cahier de cette classe. */
    chapterSurfaceClass: string;
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
    cardSurfaceClass = 'border-slate-200 bg-white shadow-[0_10px_24px_rgba(30,41,59,0.06)]',
    chapterSurfaceClass = 'border-slate-200 bg-slate-50',
): ClassVisual => ({
    frameBg,
    cardSurfaceClass,
    chapterSurfaceClass,
    badgeStyle,
    iconSurfaceClass,
    iconClass,
});

// Modern, accessible, and balanced visual identity for classes and levels
const TRONC_COMMUN = visual(
    'bg-emerald-500',
    'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40',
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    'text-emerald-600 dark:text-emerald-400',
    'border-emerald-300/80 bg-white shadow-[0_4px_20px_rgba(16,185,129,0.08)] hover:border-emerald-500 hover:shadow-[0_8px_24px_rgba(16,185,129,0.14)] dark:border-emerald-800/70',
    'border-emerald-200/60 bg-emerald-50/40'
);

const PREMIERE_ANNEE = visual(
    'bg-blue-500',
    'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40',
    'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    'text-blue-600 dark:text-blue-400',
    'border-blue-300/80 bg-white shadow-[0_4px_20px_rgba(59,130,246,0.08)] hover:border-blue-500 hover:shadow-[0_8px_24px_rgba(59,130,246,0.14)] dark:border-blue-800/70',
    'border-blue-200/60 bg-blue-50/40'
);

const DEUXIEME_ANNEE = visual(
    'bg-amber-500',
    'bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40',
    'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    'text-amber-600 dark:text-amber-400',
    'border-amber-300/80 bg-white shadow-[0_4px_20px_rgba(245,158,11,0.08)] hover:border-amber-500 hover:shadow-[0_8px_24px_rgba(245,158,11,0.14)] dark:border-amber-800/70',
    'border-amber-200/60 bg-amber-50/40'
);

const TROISIEME_ANNEE = visual(
    'bg-purple-500',
    'bg-purple-50 text-purple-900 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/40',
    'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    'text-purple-600 dark:text-purple-400',
    'border-purple-300/80 bg-white shadow-[0_4px_20px_rgba(168,85,247,0.08)] hover:border-purple-500 hover:shadow-[0_8px_24px_rgba(168,85,247,0.14)] dark:border-purple-800/70',
    'border-purple-200/60 bg-purple-50/40'
);

/*
 * Identité visuelle unifiée par Niveau/Cycle.
 * Tronc commun : vert clair ; 1re : ivoire ; 2e : jaune doux ; 3e : rose lilas.
 */
const CLASS_VISUALS: Record<string, ClassVisual> = {
    // Collège
    '1AC': PREMIERE_ANNEE,
    '2AC': DEUXIEME_ANNEE,
    '3AC': TROISIEME_ANNEE,

    // Tronc Commun
    'Tronc Commun Scientifique': TRONC_COMMUN,
    'Tronc Commun Lettres et Sciences Humaines': TRONC_COMMUN,
    'Tronc Commun Technologique': TRONC_COMMUN,
    'Tronc commun scientifique': TRONC_COMMUN,
    'Tronc commun lettres': TRONC_COMMUN,
    'Tronc commun technologique': TRONC_COMMUN,

    // 1er Bac
    '1er Bac Sciences Expérimentales': PREMIERE_ANNEE,
    '1er Bac Sciences Mathématiques': PREMIERE_ANNEE,
    '1er Bac Lettres et Sciences Humaines': PREMIERE_ANNEE,
    '1er Bac Lettres': PREMIERE_ANNEE,
    '1er Bac Sciences Économiques et Gestion': PREMIERE_ANNEE,
    '1er Bac Sciences Économiques': PREMIERE_ANNEE,

    // 2ème Bac
    '2ème Bac Sciences Physiques': DEUXIEME_ANNEE,
    '2ème Bac Sciences de la Vie et de la Terre': DEUXIEME_ANNEE,
    '2ème Bac Sciences Mathématiques A': DEUXIEME_ANNEE,
    '2ème Bac Sciences Mathématiques B': DEUXIEME_ANNEE,
    '2ème Bac Sciences Économiques': DEUXIEME_ANNEE,
    '2ème Bac Sciences de Gestion Comptable': DEUXIEME_ANNEE,
    '2ème Bac Lettres': DEUXIEME_ANNEE,
    '2ème Bac Sciences Humaines': DEUXIEME_ANNEE,

    // Legacy keys (Backward compatibility)
    '1BAC Sc. Expérimentales': PREMIERE_ANNEE,
    '1BAC Sc. Mathématiques': PREMIERE_ANNEE,
    '1BAC Lettres': PREMIERE_ANNEE,
    '1BAC Sc. Économiques': PREMIERE_ANNEE,
    '2BAC PC': DEUXIEME_ANNEE,
    '2BAC SVT': DEUXIEME_ANNEE,
    '2BAC Sc. Maths A': DEUXIEME_ANNEE,
    '2BAC Sc. Maths B': DEUXIEME_ANNEE,
    '2BAC Sc. Économiques': DEUXIEME_ANNEE,
    '2BAC Sc. Gestion Comptable': DEUXIEME_ANNEE,
    '2BAC Lettres': DEUXIEME_ANNEE,
    '2BAC Sc. Humaines': DEUXIEME_ANNEE,

    // Prépas
    'MPSI': PREMIERE_ANNEE,
    'PCSI': PREMIERE_ANNEE,
    'MP': PREMIERE_ANNEE,
    'PSI': PREMIERE_ANNEE,
    'TSI': PREMIERE_ANNEE,
    'ECS': PREMIERE_ANNEE,
    'ECT': PREMIERE_ANNEE,
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
        return DEUXIEME_ANNEE;
    }
    if (lower.startsWith('1er') || lower.includes('1ere') || lower.includes('1ère') || lower.includes('1bac')) {
        return PREMIERE_ANNEE;
    }
    if (lower.startsWith('3') || lower.includes('3eme') || lower.includes('3ème') || lower.includes('3ac')) {
        return TROISIEME_ANNEE;
    }
    if (lower.includes('tronc') || lower.startsWith('tc')) {
        return TRONC_COMMUN;
    }
    if (lower.includes('ac') || lower.includes('coll')) {
        return TROISIEME_ANNEE;
    }
    if (['mpsi', 'pcsi', 'mp', 'psi', 'tsi', 'ecs', 'ect'].some(p => lower.includes(p))) {
        return PREMIERE_ANNEE;
    }

    return PREMIERE_ANNEE;
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
    'Mathématiques': visual(
        'bg-blue-500',
        'bg-blue-50/80 text-blue-700 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/40',
        'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
        'text-blue-600'
    ),
    'Physique-Chimie': visual(
        'bg-purple-500',
        'bg-purple-50/80 text-purple-700 border border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700/40',
        'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
        'text-purple-600'
    ),
    'Sciences de la Vie et de la Terre': visual(
        'bg-emerald-500',
        'bg-emerald-50/80 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/40',
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        'text-emerald-600'
    ),
    'Sciences de l’Ingénieur': visual(
        'bg-slate-500',
        'bg-slate-50/80 text-slate-700 border border-slate-200/70 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/40',
        'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300',
        'text-slate-600'
    ),
    'Sciences Économiques et Gestion': visual(
        'bg-amber-500',
        'bg-amber-50/80 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/40',
        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        'text-amber-600'
    ),
    'Informatique': visual(
        'bg-indigo-500',
        'bg-indigo-50/80 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700/40',
        'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
        'text-indigo-600'
    ),
    'Français': visual(
        'bg-rose-500',
        'bg-rose-50/80 text-rose-700 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/40',
        'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
        'text-rose-600'
    ),
    'Arabe': visual(
        'bg-teal-500',
        'bg-teal-50/80 text-teal-700 border border-teal-200/70 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700/40',
        'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
        'text-teal-600'
    ),
    'Anglais': visual(
        'bg-sky-500',
        'bg-sky-50/80 text-sky-700 border border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700/40',
        'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
        'text-sky-600'
    ),
    'Espagnol': visual(
        'bg-orange-500',
        'bg-orange-50/80 text-orange-700 border border-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-700/40',
        'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
        'text-orange-600'
    ),
    'Allemand': visual(
        'bg-yellow-500',
        'bg-yellow-50/80 text-yellow-700 border border-yellow-200/70 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-700/40',
        'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
        'text-yellow-600'
    ),
    'Philosophie': visual(
        'bg-cyan-500',
        'bg-cyan-50/80 text-cyan-700 border border-cyan-200/70 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-700/40',
        'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
        'text-cyan-600'
    ),
    'Histoire-Géographie': visual(
        'bg-fuchsia-500',
        'bg-fuchsia-50/80 text-fuchsia-700 border border-fuchsia-200/70 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-700/40',
        'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
        'text-fuchsia-600'
    ),
    'Éducation Islamique': visual(
        'bg-lime-500',
        'bg-lime-50/80 text-lime-700 border border-lime-200/70 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-700/40',
        'bg-lime-50 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
        'text-lime-600'
    ),
    'Éducation Physique et Sportive': visual(
        'bg-stone-500',
        'bg-stone-50/80 text-stone-700 border border-stone-200/70 dark:bg-stone-900/40 dark:text-stone-300 dark:border-stone-700/40',
        'bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-300',
        'text-stone-600'
    ),
};

const SUBJECT_VISUAL_KEYS = Object.keys(SUBJECT_VISUALS);

const NEUTRAL_VISUAL = visual(
    'bg-slate-300',
    'bg-slate-50/80 text-slate-700 border border-slate-200/70 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/40',
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
