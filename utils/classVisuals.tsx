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

// Pink Bonbon pour Tronc Commun (#ec4899)
const PINK_BONBON = visual(
    'bg-[#ec4899]',
    'bg-pink-100 text-pink-900 dark:bg-pink-900/60 dark:text-pink-100',
    'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    'text-pink-600'
);

// Jaune Soleil pour 1er Bac (#eab308)
const JAUNE_SOLEIL = visual(
    'bg-[#eab308]',
    'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    'text-yellow-700'
);

// Bleu Roi pour 2ème Bac (#2563eb)
const BLEU_ROI = visual(
    'bg-[#2563eb]',
    'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100',
    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'text-blue-600'
);

// Cyan Vif pour Collège (#3cccfe)
const CYAN_COLLEGE = visual(
    'bg-[#3cccfe]',
    'bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100',
    'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    'text-sky-600'
);

// Mauve Pastel pour Prépas (#d9b8ff)
const MAUVE_PREPA = visual(
    'bg-[#d9b8ff]',
    'bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-100',
    'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    'text-purple-600'
);

/*
 * Identité visuelle unifiée par Niveau/Cycle.
 * Tronc Commun: Pink Bonbon (#ec4899)
 * 1er Bac: Jaune Soleil (#eab308)
 * 2ème Bac: Bleu Roi (#2563eb)
 * Collège: Cyan Vif (#3cccfe)
 * Prépas: Mauve Pastel (#d9b8ff)
 */
const CLASS_VISUALS: Record<string, ClassVisual> = {
    // Collège
    '1AC': CYAN_COLLEGE,
    '2AC': CYAN_COLLEGE,
    '3AC': CYAN_COLLEGE,

    // Tronc Commun
    'Tronc Commun Scientifique': PINK_BONBON,
    'Tronc Commun Lettres et Sciences Humaines': PINK_BONBON,
    'Tronc Commun Technologique': PINK_BONBON,
    'Tronc commun scientifique': PINK_BONBON,
    'Tronc commun lettres': PINK_BONBON,
    'Tronc commun technologique': PINK_BONBON,

    // 1er Bac
    '1er Bac Sciences Expérimentales': JAUNE_SOLEIL,
    '1er Bac Sciences Mathématiques': JAUNE_SOLEIL,
    '1er Bac Lettres et Sciences Humaines': JAUNE_SOLEIL,
    '1er Bac Lettres': JAUNE_SOLEIL,
    '1er Bac Sciences Économiques et Gestion': JAUNE_SOLEIL,
    '1er Bac Sciences Économiques': JAUNE_SOLEIL,

    // 2ème Bac
    '2ème Bac Sciences Physiques': BLEU_ROI,
    '2ème Bac Sciences de la Vie et de la Terre': BLEU_ROI,
    '2ème Bac Sciences Mathématiques A': BLEU_ROI,
    '2ème Bac Sciences Mathématiques B': BLEU_ROI,
    '2ème Bac Sciences Économiques': BLEU_ROI,
    '2ème Bac Sciences de Gestion Comptable': BLEU_ROI,
    '2ème Bac Lettres': BLEU_ROI,
    '2ème Bac Sciences Humaines': BLEU_ROI,

    // Legacy keys (Backward compatibility)
    '1BAC Sc. Expérimentales': JAUNE_SOLEIL,
    '1BAC Sc. Mathématiques': JAUNE_SOLEIL,
    '1BAC Lettres': JAUNE_SOLEIL,
    '1BAC Sc. Économiques': JAUNE_SOLEIL,
    '2BAC PC': BLEU_ROI,
    '2BAC SVT': BLEU_ROI,
    '2BAC Sc. Maths A': BLEU_ROI,
    '2BAC Sc. Maths B': BLEU_ROI,
    '2BAC Sc. Économiques': BLEU_ROI,
    '2BAC Sc. Gestion Comptable': BLEU_ROI,
    '2BAC Lettres': BLEU_ROI,
    '2BAC Sc. Humaines': BLEU_ROI,

    // Prépas
    'MPSI': MAUVE_PREPA,
    'PCSI': MAUVE_PREPA,
    'MP': MAUVE_PREPA,
    'PSI': MAUVE_PREPA,
    'TSI': MAUVE_PREPA,
    'ECS': MAUVE_PREPA,
    'ECT': MAUVE_PREPA,
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
        return BLEU_ROI;
    }
    if (lower.startsWith('1er') || lower.includes('1ere') || lower.includes('1ère') || lower.includes('1bac')) {
        return JAUNE_SOLEIL;
    }
    if (lower.includes('tronc') || lower.startsWith('tc')) {
        return PINK_BONBON;
    }
    if (lower.includes('ac') || lower.includes('coll')) {
        return CYAN_COLLEGE;
    }
    if (['mpsi', 'pcsi', 'mp', 'psi', 'tsi', 'ecs', 'ect'].some(p => lower.includes(p))) {
        return MAUVE_PREPA;
    }

    return CYAN_COLLEGE;
};


