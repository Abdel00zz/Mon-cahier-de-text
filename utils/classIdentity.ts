import type { AppLocale } from '../types';
import {
    formatClassStreamLabel,
    formatClassTierLabel,
    lookupClassLevelIdentity,
    tierForLevelCode,
    type ClassTierKey,
} from '../constants/class-levels';
import { parseClassName } from './classAbbreviation';

/**
 * Identité lisible d'une classe : le palier (badge) et la filière (branche).
 *
 * Le principe est de ne jamais *deviner* : trois sources sont essayées dans un
 * ordre de fiabilité décroissant, et si aucune ne reconnaît le nom, l'appelant
 * retrouve son affichage habituel au lieu d'un badge inventé.
 *
 *   1. nom canonique officiel  (« 2ème Bac Sciences Physiques 3 »)
 *   2. nom compacté par le professeur  (« 2Bacpc3 », « 2BSMA-A »)
 *   3. nom écrit directement en arabe  (« قسم الثانية بكالوريا علوم فيزيائية 3 »)
 */
export interface ClassIdentity {
    /** Palier reconnu, `null` si le nom est libre (« Ma classe »). */
    tierKey: ClassTierKey | null;
    /** Libellé localisé du palier, prêt pour le badge. */
    tierLabel: string | null;
    /** Filière localisée ; `null` quand le niveau n'en porte pas (collège). */
    stream: string | null;
    /** Groupe (« 3 », « A »), `null` si absent. */
    group: string | null;
    /** Nom complet d'origine : jamais perdu (info-bulle, lecteurs d'écran). */
    full: string;
}

const EMPTY_IDENTITY: Omit<ClassIdentity, 'full'> = {
    tierKey: null,
    tierLabel: null,
    stream: null,
    group: null,
};

/**
 * Paliers qui portent un badge.
 *
 * Le collège (« 1ère Année Collégiale ») et les classes préparatoires (sigle
 * officiel MPSI, PCSI…) n'en ont pas : leur intitulé d'origine reste affiché
 * tel quel, comme avant.
 */
const BADGE_TIERS: ReadonlySet<ClassTierKey> = new Set<ClassTierKey>(['common', 'firstBac', 'secondBac']);

const tierLabelFor = (tier: ClassTierKey, locale: AppLocale): string | null =>
    BADGE_TIERS.has(tier) ? formatClassTierLabel(tier, locale) : null;

const LAST_NUMBER = /\b\d{1,2}\b/g;
const TRAILING_LETTER = /(?:^|[\s·\-–])([A-Za-z])$/;
/** Mot annonçant le groupe : il décrit le numéro, il ne fait pas partie de la filière. */
const GROUP_WORD = /(?:^|\s)(?:groupe|grp|group|section|classe|فوج|الفوج)\s*$/iu;

/**
 * Sépare le groupe du reste d'une mention libre : « 2ème Bac Sc. Physiques 3 »,
 * « … groupe A ». Ce qui n'est pas un groupe est conservé dans la filière, pour
 * qu'aucune information saisie ne disparaisse de la carte.
 */
const splitGroup = (mention: string): { group: string | null; rest: string } => {
    const trimmed = mention.trim();
    if (!trimmed) return { group: null, rest: '' };

    const numbers = [...trimmed.matchAll(LAST_NUMBER)];
    if (numbers.length > 0) {
        const last = numbers[numbers.length - 1];
        const start = last.index ?? 0;
        const rest = `${trimmed.slice(0, start)} ${trimmed.slice(start + last[0].length)}`
            .replace(GROUP_WORD, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return { group: last[0], rest };
    }

    const letter = trimmed.match(TRAILING_LETTER);
    if (letter) return { group: letter[1].toUpperCase(), rest: trimmed.slice(0, letter.index).trim() };

    return { group: null, rest: trimmed };
};

/**
 * Filière localisée : le code est traduit, la mention libre éventuelle est
 * ajoutée telle quelle. Un code inconnu n'est jamais perdu : il s'affiche brut
 * plutôt que de faire disparaître la filière.
 */
const composeStream = (code: string, mention: string, locale: AppLocale): string | null => {
    const label = formatClassStreamLabel(code, locale);
    if (!label) return mention || null;
    return mention ? `${label} ${mention}` : label;
};

/**
 * « SE » du parseur recouvre deux filières distinctes (expérimentales et
 * économiques). Le nom d'origine, lui, ne les confond pas : on tranche sur lui.
 */
const disambiguateStream = (code: string, source: string): string =>
    code === 'SE' ? (/exp[ée]rimenta/i.test(source) ? 'SEXP' : 'SECO') : code;

const ARABIC_SCRIPT = /[\u0600-\u06FF]/;

const ARABIC_TIERS: ReadonlyArray<readonly [RegExp, ClassTierKey]> = [
    [/الأولى\s*إعدادي/, 'college1'],
    [/الثانية\s*إعدادي/, 'college2'],
    [/الثالثة\s*إعدادي/, 'college3'],
    [/الجذع\s*المشترك/, 'common'],
    [/الأولى\s*(?:باك|بكالوريا)/, 'firstBac'],
    [/الثانية\s*(?:باك|بكالوريا)/, 'secondBac'],
];

/** Codes testés du plus spécifique au plus général : « رياضية أ » avant « رياضية ». */
const ARABIC_STREAM_CODES = [
    'SM-A', 'SM-B', 'TC-L', 'TC-S', 'TC-T',
    'SVT', 'SM', 'PC', 'SEXP', 'SECO', 'SEG', 'SGC', 'LSH', 'SH', 'SI', 'L',
];

const arabicStreamCodes = [...ARABIC_STREAM_CODES].sort((left, right) =>
    (formatClassStreamLabel(right, 'ar')?.length ?? 0) - (formatClassStreamLabel(left, 'ar')?.length ?? 0)
);

const arabicIdentity = (source: string, locale: AppLocale): Omit<ClassIdentity, 'full'> | null => {
    if (!ARABIC_SCRIPT.test(source)) return null;
    const matchedTier = ARABIC_TIERS.find(([pattern]) => pattern.test(source));
    if (!matchedTier) return null;
    const [, tierKey] = matchedTier;

    const streamCode = arabicStreamCodes.find(code => {
        const label = formatClassStreamLabel(code, 'ar');
        return label !== null && source.includes(label);
    }) ?? '';

    // Ce qui reste après le palier et le groupe : filière non répertoriée, que
    // l'on affiche telle quelle plutôt que de la perdre.
    const group = source.match(/(?:^|\s)(\d{1,2})\s*$/)?.[1] ?? null;
    const leftover = source
        .replace(/^\s*قسم\s*/, '')
        .replace(matchedTier[0], '')
        .replace(/(?:^|\s)\d{1,2}\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        tierKey,
        tierLabel: formatClassTierLabel(tierKey, locale),
        stream: composeStream(streamCode, streamCode ? '' : leftover, locale),
        group,
    };
};

/**
 * Décompose un nom de classe pour l'affichage en carte : badge de palier, puis
 * filière. `tierLabel === null` signifie « nom non reconnu » — la carte garde
 * alors son intitulé d'origine.
 */
export const classIdentityFor = (name: string, locale: AppLocale = 'fr'): ClassIdentity => {
    const full = (name || '').trim().replace(/\s+/g, ' ');
    if (!full) return { ...EMPTY_IDENTITY, full };

    const canonical = lookupClassLevelIdentity(full);
    if (canonical) {
        const { group, rest } = splitGroup(canonical.suffix);
        return {
            tierKey: canonical.identity.tier,
            tierLabel: tierLabelFor(canonical.identity.tier, locale),
            stream: composeStream(canonical.identity.stream, rest, locale),
            group,
            full,
        };
    }

    const parsed = parseClassName(full);
    const parsedTier = tierForLevelCode(parsed.level);
    if (parsedTier) {
        return {
            tierKey: parsedTier,
            tierLabel: tierLabelFor(parsedTier, locale),
            stream: composeStream(disambiguateStream(parsed.stream, full), '', locale),
            group: parsed.group || null,
            full,
        };
    }

    return { ...(arabicIdentity(full, locale) ?? EMPTY_IDENTITY), full };
};
