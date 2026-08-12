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


