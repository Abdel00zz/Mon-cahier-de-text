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

// Les quatre niveaux gardent une surface très claire, lisible et calme.
// L'identité est partagée par les cartes, les jauges et les chapitres.
const TRONC_COMMUN = visual(
    'bg-[#b5dc90]',
    'bg-[#e8ffd1] text-[#365126] dark:bg-[#375428] dark:text-[#e8ffd1]',
    'bg-[#e8ffd1] text-[#4b712f] dark:bg-[#263b21] dark:text-[#cfeeb4]',
    'text-[#587d3c]',
    'border-[#cfeab7] bg-[#e8ffd1] shadow-[0_10px_24px_rgba(100,142,63,0.10)] hover:border-[#b9df9b] hover:shadow-[0_14px_28px_rgba(100,142,63,0.14)]',
    'border-[#cfeab7] bg-[#e8ffd1]'
);

const PREMIERE_ANNEE = visual(
    'bg-[#ded6c8]',
    'bg-[#fffcf6] text-[#665e51] dark:bg-[#4c473f] dark:text-[#fffcf6]',
    'bg-[#fffcf6] text-[#756c5d] dark:bg-[#37322b] dark:text-[#eee6d8]',
    'text-[#756c5d]',
    'border-[#eee7da] bg-[#fffcf6] shadow-[0_10px_24px_rgba(103,93,76,0.07)] hover:border-[#dfd3c1] hover:shadow-[0_14px_28px_rgba(103,93,76,0.11)]',
    'border-[#eee7da] bg-[#fffcf6]'
);

const DEUXIEME_ANNEE = visual(
    'bg-[#d6c84e]',
    'bg-[#fffcbb] text-[#655c13] dark:bg-[#665d17] dark:text-[#fffcbb]',
    'bg-[#fffcbb] text-[#756a19] dark:bg-[#454012] dark:text-[#fff7a7]',
    'text-[#827622]',
    'border-[#eee392] bg-[#fffcbb] shadow-[0_10px_24px_rgba(135,120,31,0.10)] hover:border-[#dfd275] hover:shadow-[0_14px_28px_rgba(135,120,31,0.15)]',
    'border-[#eee392] bg-[#fffcbb]'
);

const TROISIEME_ANNEE = visual(
    'bg-[#e2b9e1]',
    'bg-[#ffedff] text-[#6d3f6d] dark:bg-[#673d68] dark:text-[#ffedff]',
    'bg-[#ffedff] text-[#875489] dark:bg-[#432b45] dark:text-[#f5d9f5]',
    'text-[#925d94]',
    'border-[#ebcdea] bg-[#ffedff] shadow-[0_10px_24px_rgba(146,84,148,0.10)] hover:border-[#dfb6df] hover:shadow-[0_14px_28px_rgba(146,84,148,0.15)]',
    'border-[#ebcdea] bg-[#ffedff]'
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
