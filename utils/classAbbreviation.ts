import type { AppLocale } from '../types.js';

/**
 * Abréviation LISIBLE du nom d'une classe dans une cellule d'emploi du temps.
 *
 * Le nom saisi par le professeur est souvent compacté (« 2Bacpc3 », « 2BSMA-A »)
 * et devient illisible dans une case étroite. Plutôt que de tronquer, on
 * DÉCOUPE le nom en trois segments séparés par un point médian :
 *
 *      niveau · filière · groupe
 *
 *   2Bacpc3                        → 2B·PC·3      (2e Bac Physique-Chimie, groupe 3)
 *   2ème Bac Sciences Physiques 3  → 2B·PC·3
 *   2BSMA-A                        → 2B·SM-A      (variante rattachée à la filière)
 *   1AC 1                          → 1AC·1
 *   Tronc Commun Scientifique      → TC·S
 *
 * Les noms arabes restent compacts (l'écriture arabe n'a pas ces ambiguïtés) et
 * les classes préparatoires gardent leur sigle officiel (MPSI, PCSI…).
 * Le nom complet reste toujours disponible : info-bulle de la cellule et
 * libellé accessible.
 */

/** Filières reconnues dans un nom complet, du plus spécifique au plus général. */
const STREAM_PHRASES: ReadonlyArray<readonly [RegExp, string]> = [
    [/sciences?\s*de\s*la\s*vie\s*(?:et\s*(?:de\s*la\s*)?terre)?/, 'SVT'],
    [/sciences?\s*(?:de\s*la\s*)?vie\s*(?:et\s*)?terre/, 'SVT'],
    [/sciences?\s*mather?matiques/, 'SM'],
    [/sciences?\s*physiques?/, 'PC'],
    [/sciences?\s*experimentales?/, 'SE'],
    [/sciences?\s*[ee]conomiques?(?:\s*et\s*gestion)?/, 'SE'],
    [/gestion\s*comptable/, 'SGC'],
    [/sciences?\s*(?:de\s*la\s*)?(?:l\s*)?ing[ee]nieur/, 'SI'],
    [/sciences?\s*humaines/, 'SH'],
    [/lettres/, 'L'],
];

/** Sigles courts déjà employés par les professeurs. */
const STREAM_SHORTHANDS: ReadonlyArray<readonly [RegExp, string]> = [
    [/^(?:sma|sm\s*a)$/, 'SM-A'],
    [/^(?:smb|sm\s*b)$/, 'SM-B'],
    [/^sm$/, 'SM'],
    [/^(?:sp|pc|spc|phys)$/, 'PC'],
    [/^(?:svt|svi)$/, 'SVT'],
    [/^(?:se|ses|eco)$/, 'SE'],
    [/^sgc$/, 'SGC'],
    [/^(?:sh|shs|lsh)$/, 'LSH'],
    [/^si$/, 'SI'],
    [/^l$/, 'L'],
];

/** Mots qui ne portent jamais d'information de filière ou de groupe. */
const LEVEL_WORDS = /^(?:1er|1ere|2eme|1e|2e|eme|ere|annee|an|bac|baccalaureat|tronc|commun|commune|general|generale)$/;

const normalize = (name: string): string => name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\[\]]/g, ' ')
    // normalise les abréviations officielles avec points (S.VT, P.C, S.M, L.S.H...)
    .replace(/\bs\s*\.\s*v\s*\.\s*t\b/gi, 'svt')
    .replace(/\bs\s*\.\s*vt\b/gi, 'svt')
    .replace(/\bp\s*\.\s*c\b/gi, 'pc')
    .replace(/\bs\s*\.\s*m\b/gi, 'sm')
    .replace(/\bl\s*\.\s*s\s*\.\s*h\b/gi, 'lsh')
    .replace(/\bsc\s*\.\s*exp\b/gi, 'se')
    .replace(/\bsc\s*\.\s*maths?\b/gi, 'sm')
    .replace(/\bsc\s*\.\s*[eé]co\b/gi, 'se')
    // découpe les écritures compactées : 2Bac → 2 Bac, BacPc → Bac Pc, PC3 → PC 3
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/[-_.\/,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const matchLevel = (value: string): { code: string; rest: string } => {
    let match = value.match(/^([123])\s*(?:eme|ere|er|e)?\s*(?:annee)?\s*(?:collegiale?|college|a\s*c)\b/);
    if (match) return { code: `${match[1]}AC`, rest: value.slice(match[0].length) };
    match = value.match(/^tc\s*([slt])\b/);
    if (match) return { code: `TC·${match[1].toUpperCase()}`, rest: value.slice(match[0].length) };
    match = value.match(/^tronc\s+commun(?:\s+(scientifique|lettres|technologique|sciences?\s*humaines))?/);
    if (match) {
        const suffix = match[1]
            ? (match[1].startsWith('scient') ? 'S' : match[1].startsWith('lettres') ? 'L' : match[1].startsWith('techno') ? 'T' : 'H')
            : '';
        return { code: suffix ? `TC·${suffix}` : 'TC', rest: value.slice(match[0].length) };
    }
    // « 2 Bac… », « 2ème bac… » et formes compactées « 2Bacpc3 » (bac suivi du sigle).
    match = value.match(/^([12])\s*(?:eme|ere|er|e)?\s*(?:annee)?\s*bac/);
    if (match) return { code: `${match[1]}B`, rest: value.slice(match[0].length) };
    // « 2BSMA-A » : le niveau est porté par le seul chiffre, devant un sigle connu
    // (le « b » de « Bac » peut être collé au sigle).
    match = value.match(/^([12])\s*b?(sma|smb|sm|sp|spc|pc|svt|svi|se|ses|eco|sgc|sh|shs|lsh|si|l)\b/);
    if (match) return { code: `${match[1]}B`, rest: `${match[2]}${value.slice(match[0].length)}` };
    match = value.match(/^(mpsi|pcsi|tsi|ecs|ect|mp|psi|bts|cpge)\b/);
    if (match) return { code: match[1].toUpperCase(), rest: value.slice(match[0].length) };
    return { code: '', rest: value };
};

/** Groupe : un nombre (1–2 chiffres) ou une lettre isolée qui n'appartient pas à la filière. */
const collectGroup = (tokens: string[], stream: string): string => {
    const digits = tokens.find(token => /^\d{1,2}$/.test(token));
    if (digits) return digits;
    const letters = tokens.filter(token => /^[a-z]$/.test(token) && !stream.endsWith(token.toUpperCase()));
    return letters.length > 0 ? letters[letters.length - 1].toUpperCase() : '';
};

/** La variante A/B d'une filière se rattache à la filière : « SM » + « A » → « SM-A ». */
const mergeVariant = (stream: string, group: string): { stream: string; group: string } =>
    /^(?:SM|SVT|SE|SH|LSH|SGC|SI)$/.test(stream) && /^[AB]$/.test(group)
        ? { stream: `${stream}-${group}`, group: '' }
        : { stream, group };

const splitStreamAndGroup = (rest: string): { stream: string; group: string } => {
    const tokens = rest.split(' ').filter(token => token && !LEVEL_WORDS.test(token));
    if (tokens.length === 0) return { stream: '', group: '' };
    // 1) sigle déjà employé par le professeur (« PC », « SM », « SMA »…), même
    //    collé au reste du nom ; c'est le cas le plus fréquent des cahiers réels.
    for (const token of tokens) {
        for (const [pattern, code] of STREAM_SHORTHANDS) {
            if (pattern.test(token)) return mergeVariant(code, collectGroup(tokens, code));
        }
    }
    // 2) filière écrite en clair (« Sciences Mathématiques », « Sciences Physiques »…)
    const joined = tokens.join(' ');
    for (const [pattern, code] of STREAM_PHRASES) {
        if (pattern.test(joined)) return mergeVariant(code, collectGroup(tokens, code));
    }
    return { stream: '', group: collectGroup(tokens, '') };
};

const isArabic = (name: string): boolean => /[\u0600-\u06FF]/.test(name);

/** Même compaction que l'existant pour l'arabe : le niveau reste explicite. */
const abbreviateArabic = (name: string): string => {
    const cleaned = name.replace(/^قسم\s+/, '').trim();
    const group = cleaned.match(/\d+\s*$/)?.[0].trim();
    const levels: ReadonlyArray<readonly [RegExp, string]> = [
        [/الجذع المشترك العلمي/, 'ج.م.ع'],
        [/الجذع المشترك الأدبي/, 'ج.م.أ'],
        [/الأولى إعدادي/, '1إ'],
        [/الثانية إعدادي/, '2إ'],
        [/الثالثة إعدادي/, '3إ'],
        [/(الأولى باك|الأولى بكالوريا)/, '1ب'],
        [/(الثانية باك|الثانية بكالوريا)/, '2ب'],
    ];
    const match = levels.find(([pattern]) => pattern.test(cleaned));
    return match ? `${match[1]}${group ?? ''}` : cleaned;
};

/**
 * Découpage structuré d'un nom de classe, en codes stables :
 *
 *     { level, stream, group }
 *
 * Les codes sont volontairement neutres (indépendants de la langue) : c'est
 * l'appelant qui les traduit. `abbreviateClassName` s'en sert pour l'emploi du
 * temps, et l'identité de carte de classe pour composer le badge de palier et
 * la filière. Un nom non reconnu (« Ma classe ») renvoie trois chaînes vides :
 * l'appelant choisit alors son repli, sans jamais rien inventer.
 */
export interface ParsedClassName {
    /** Palier : « 1AC », « TC·S », « 1B », « 2B », « MPSI »… */
    level: string;
    /** Filière : « SVT », « SM-A », « PC »… chaîne vide si absente. */
    stream: string;
    /** Groupe : « 3 », « A »… chaîne vide si absent. */
    group: string;
}

export const parseClassName = (name: string): ParsedClassName => {
    const source = (name || '').trim();
    if (!source) return { level: '', stream: '', group: '' };
    const { code: level, rest } = matchLevel(normalize(source));
    const { stream, group } = splitStreamAndGroup(rest);
    return { level, stream, group };
};

/**
 * Abréviation affichée dans la cellule. Le nom complet reste accessible par
 * l'info-bulle et le libellé du créneau, jamais perdu.
 */
export const abbreviateClassName = (name: string, locale: AppLocale = 'fr'): string => {
    const source = (name || '').trim();
    if (!source) return '';
    if (locale === 'ar' || isArabic(source)) return abbreviateArabic(source);
    const { level, stream, group } = parseClassName(source);
    const segments = [level, stream, group].filter(Boolean);
    if (segments.length === 0) {
        // Nom libre (ex. « Ma classe ») : on garde le libellé compacté tel quel.
        return source;
    }
    return segments.join('·');
};
