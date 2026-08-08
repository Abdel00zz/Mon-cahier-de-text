import { normalizeOfficialClassName } from '../constants';

export interface ClassVisual {
    /** Fond de l'icône, commun aux cartes et à la vue liste. */
    iconSurfaceClass: string;
    /** Couleur de l'icône et du numéro de groupe éventuel. */
    iconClass: string;
    /** Accent discret de la carte au survol. */
    cardHoverClass: string;
}

const visual = (
    color: string,
    cardHoverClass: string,
): ClassVisual => {
    // Les classes Tailwind restent explicites afin d'être détectées au build.
    const colors: Record<string, Pick<ClassVisual, 'iconSurfaceClass' | 'iconClass'>> = {
        sky: { iconSurfaceClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300', iconClass: 'text-sky-600 dark:text-sky-300' },
        blue: { iconSurfaceClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300', iconClass: 'text-blue-600 dark:text-blue-300' },
        indigo: { iconSurfaceClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300', iconClass: 'text-indigo-600 dark:text-indigo-300' },
        emerald: { iconSurfaceClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300', iconClass: 'text-emerald-600 dark:text-emerald-300' },
        rose: { iconSurfaceClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300', iconClass: 'text-rose-600 dark:text-rose-300' },
        cyan: { iconSurfaceClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-300', iconClass: 'text-cyan-600 dark:text-cyan-300' },
        lime: { iconSurfaceClass: 'bg-lime-50 text-lime-600 dark:bg-lime-950/50 dark:text-lime-300', iconClass: 'text-lime-600 dark:text-lime-300' },
        violet: { iconSurfaceClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300', iconClass: 'text-violet-600 dark:text-violet-300' },
        amber: { iconSurfaceClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300', iconClass: 'text-amber-600 dark:text-amber-300' },
        orange: { iconSurfaceClass: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300', iconClass: 'text-orange-600 dark:text-orange-300' },
        red: { iconSurfaceClass: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300', iconClass: 'text-red-600 dark:text-red-300' },
        teal: { iconSurfaceClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300', iconClass: 'text-teal-600 dark:text-teal-300' },
        purple: { iconSurfaceClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300', iconClass: 'text-purple-600 dark:text-purple-300' },
        fuchsia: { iconSurfaceClass: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950/50 dark:text-fuchsia-300', iconClass: 'text-fuchsia-600 dark:text-fuchsia-300' },
        yellow: { iconSurfaceClass: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-300', iconClass: 'text-yellow-600 dark:text-yellow-300' },
        pink: { iconSurfaceClass: 'bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300', iconClass: 'text-pink-600 dark:text-pink-300' },
        stone: { iconSurfaceClass: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300', iconClass: 'text-stone-600 dark:text-stone-300' },
    };
    return { ...colors[color], cardHoverClass };
};

/*
 * Identité du NIVEAU, jamais du numéro de groupe : « Tronc commun
 * scientifique 1 » et « … 2 » restent donc instantanément identifiables.
 */
const CLASS_VISUALS: Record<string, ClassVisual> = {
    '1AC': visual('sky', 'hover:border-sky-300 dark:hover:border-sky-700'),
    '2AC': visual('blue', 'hover:border-blue-300 dark:hover:border-blue-700'),
    '3AC': visual('indigo', 'hover:border-indigo-300 dark:hover:border-indigo-700'),
    'Tronc commun scientifique': visual('emerald', 'hover:border-emerald-300 dark:hover:border-emerald-700'),
    'Tronc commun lettres': visual('rose', 'hover:border-rose-300 dark:hover:border-rose-700'),
    'Tronc commun technologique': visual('cyan', 'hover:border-cyan-300 dark:hover:border-cyan-700'),
    '1BAC Sc. Expérimentales': visual('lime', 'hover:border-lime-300 dark:hover:border-lime-700'),
    '1BAC Sc. Mathématiques': visual('violet', 'hover:border-violet-300 dark:hover:border-violet-700'),
    '1BAC Lettres': visual('amber', 'hover:border-amber-300 dark:hover:border-amber-700'),
    '1BAC Sc. Économiques': visual('orange', 'hover:border-orange-300 dark:hover:border-orange-700'),
    '2BAC PC': visual('red', 'hover:border-red-300 dark:hover:border-red-700'),
    '2BAC SVT': visual('teal', 'hover:border-teal-300 dark:hover:border-teal-700'),
    '2BAC Sc. Maths A': visual('purple', 'hover:border-purple-300 dark:hover:border-purple-700'),
    '2BAC Sc. Maths B': visual('fuchsia', 'hover:border-fuchsia-300 dark:hover:border-fuchsia-700'),
    '2BAC Sc. Économiques': visual('yellow', 'hover:border-yellow-300 dark:hover:border-yellow-700'),
    '2BAC Sc. Gestion Comptable': visual('blue', 'hover:border-blue-300 dark:hover:border-blue-700'),
    '2BAC Lettres': visual('pink', 'hover:border-pink-300 dark:hover:border-pink-700'),
    '2BAC Sc. Humaines': visual('stone', 'hover:border-stone-300 dark:hover:border-stone-700'),
    'MPSI': visual('blue', 'hover:border-blue-300 dark:hover:border-blue-700'),
    'PCSI': visual('cyan', 'hover:border-cyan-300 dark:hover:border-cyan-700'),
    'MP': visual('violet', 'hover:border-violet-300 dark:hover:border-violet-700'),
    'PSI': visual('indigo', 'hover:border-indigo-300 dark:hover:border-indigo-700'),
    'TSI': visual('orange', 'hover:border-orange-300 dark:hover:border-orange-700'),
    'ECS': visual('emerald', 'hover:border-emerald-300 dark:hover:border-emerald-700'),
    'ECT': visual('amber', 'hover:border-amber-300 dark:hover:border-amber-700'),
};

const LEVELS = Object.keys(CLASS_VISUALS).sort((left, right) => right.length - left.length);
const FALLBACKS = [
    visual('blue', 'hover:border-blue-300 dark:hover:border-blue-700'),
    visual('violet', 'hover:border-violet-300 dark:hover:border-violet-700'),
    visual('emerald', 'hover:border-emerald-300 dark:hover:border-emerald-700'),
    visual('amber', 'hover:border-amber-300 dark:hover:border-amber-700'),
    visual('rose', 'hover:border-rose-300 dark:hover:border-rose-700'),
] as const;

const hashText = (value: string): number =>
    Array.from(value).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);

/** Retourne une identité stable basée sur le niveau, sans dépendre de l'id ou du groupe. */
export const getClassVisual = (className: string): ClassVisual => {
    const normalized = normalizeOfficialClassName(className);
    const level = LEVELS.find(key => normalized === key || normalized.startsWith(`${key} `));
    if (level) return CLASS_VISUALS[level];
    return FALLBACKS[hashText(normalized) % FALLBACKS.length];
};
