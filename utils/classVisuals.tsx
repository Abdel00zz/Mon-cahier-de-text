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

