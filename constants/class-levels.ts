/* ── Niveaux de classes (système marocain) ────────────────────────────────── */

import type { Cycle, AppLocale } from '../types';

export const CLASS_LEVELS_BY_CYCLE: Record<Cycle, string[]> = {
  college: ['1AC', '2AC', '3AC'],
  lycee: [
    'Tronc Commun Scientifique',
    'Tronc Commun Lettres et Sciences Humaines',
    'Tronc Commun Technologique',
    '1er Bac Sciences Expérimentales',
    '1er Bac Sciences Mathématiques',
    '1er Bac Lettres et Sciences Humaines',
    '1er Bac Sciences Économiques et Gestion',
    '2ème Bac Sciences Physiques',
    '2ème Bac Sciences de la Vie et de la Terre',
    '2ème Bac Sciences Mathématiques A',
    '2ème Bac Sciences Mathématiques B',
    '2ème Bac Sciences Économiques',
    '2ème Bac Sciences de Gestion Comptable',
    '2ème Bac Lettres',
    '2ème Bac Sciences Humaines',
  ],
  prepa: [
    '1re année MPSI',
    '1re année PCSI',
    '1re année TSI',
    '1re année ECS',
    '1re année ECT',
    '2e année MP',
    '2e année PSI',
    '2e année TSI',
    '2e année ECS',
    '2e année ECT',
  ],
};

export type ClassLevelGroupKey = 'college' | 'common' | 'firstBac' | 'secondBac' | 'prepa' | 'prepaFirst' | 'prepaSecond';

export interface ClassLevelGroup {
  key: ClassLevelGroupKey;
  levels: string[];
}

/**
 * Regroupe les niveaux officiels d'un cycle en paliers pédagogiques (Tronc
 * commun, 1re Bac, 2e Bac…) pour proposer un choix en deux temps, plus lisible
 * sur petit écran qu'une longue liste à plat.
 */
export const classLevelGroupsForCycle = (cycle: Cycle): ClassLevelGroup[] => {
  switch (cycle) {
    case 'college':
      return [{ key: 'college', levels: CLASS_LEVELS_BY_CYCLE.college }];
    case 'lycee':
      return [
        { key: 'common', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(level => level.startsWith('Tronc')) },
        { key: 'firstBac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(level => level.startsWith('1er Bac')) },
        { key: 'secondBac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(level => level.startsWith('2ème Bac')) },
      ];
    case 'prepa':
      return [
        { key: 'prepaFirst', levels: CLASS_LEVELS_BY_CYCLE.prepa.filter(level => level.startsWith('1re année')) },
        { key: 'prepaSecond', levels: CLASS_LEVELS_BY_CYCLE.prepa.filter(level => level.startsWith('2e année')) },
      ];
  }
};

const CLASS_LEVEL_GROUP_LABELS: Record<AppLocale, Record<ClassLevelGroupKey, string>> = {
  fr: {
    college: 'Collège',
    common: 'Tronc commun',
    firstBac: '1re Bac',
    secondBac: '2e Bac',
    prepa: 'Prépa',
    prepaFirst: '1re année CPGE',
    prepaSecond: '2e année CPGE',
  },
  ar: {
    college: 'الإعدادي',
    common: 'الجذع المشترك',
    firstBac: 'الأولى بكالوريا',
    secondBac: 'الثانية بكالوريا',
    prepa: 'الأقسام التحضيرية',
    prepaFirst: 'السنة الأولى CPGE',
    prepaSecond: 'السنة الثانية CPGE',
  },
  en: {
    college: 'Middle School',
    common: 'Common Core',
    firstBac: '1st Bac',
    secondBac: '2nd Bac',
    prepa: 'Preparatory Classes',
    prepaFirst: 'CPGE Year 1',
    prepaSecond: 'CPGE Year 2',
  },
};

export const formatClassLevelGroupLabel = (key: ClassLevelGroupKey, locale: AppLocale): string =>
  CLASS_LEVEL_GROUP_LABELS[locale][key];

const CLASS_LEVEL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  '1AC': '1ère Année Collégiale',
  '2AC': '2ème Année Collégiale',
  '3AC': '3ème Année Collégiale',
  'Tronc Commun Scientifique': 'Tronc Commun Scientifique',
  'Tronc Commun Lettres et Sciences Humaines': 'Tronc Commun Lettres et Sciences Humaines',
  'Tronc Commun Technologique': 'Tronc Commun Technologique',
  'Tronc commun scientifique': 'Tronc Commun Scientifique',
  'Tronc commun lettres': 'Tronc Commun Lettres et Sciences Humaines',
  'Tronc commun technologique': 'Tronc Commun Technologique',
  '1er Bac Sciences Expérimentales': '1er Bac Sciences Expérimentales',
  '1er Bac Sciences Mathématiques': '1er Bac Sciences Mathématiques',
  '1er Bac Lettres et Sciences Humaines': '1er Bac Lettres et Sciences Humaines',
  '1er Bac Lettres': '1er Bac Lettres et Sciences Humaines',
  '1er Bac Sciences Économiques et Gestion': '1er Bac Sciences Économiques et Gestion',
  '1er Bac Sciences Économiques': '1er Bac Sciences Économiques et Gestion',
  '2ème Bac Sciences Physiques': '2ème Bac Sciences Physiques',
  '2ème Bac Sciences de la Vie et de la Terre': '2ème Bac Sciences de la Vie et de la Terre',
  '2ème Bac Sciences Mathématiques A': '2ème Bac Sciences Mathématiques A',
  '2ème Bac Sciences Mathématiques B': '2ème Bac Sciences Mathématiques B',
  '2ème Bac Sciences Économiques': '2ème Bac Sciences Économiques',
  '2ème Bac Sciences de Gestion Comptable': '2ème Bac Sciences de Gestion Comptable',
  '2ème Bac Lettres': '2ème Bac Lettres',
  '2ème Bac Sciences Humaines': '2ème Bac Sciences Humaines',
  // Backward compatibility keys (without dots)
  '1BAC Sc. Expérimentales': '1er Bac Sciences Expérimentales',
  '1BAC Sc. Mathématiques': '1er Bac Sciences Mathématiques',
  '1BAC Lettres': '1er Bac Lettres et Sciences Humaines',
  '1BAC Sc. Économiques': '1er Bac Sciences Économiques et Gestion',
  '2BAC PC': '2ème Bac Sciences Physiques',
  '2BAC SVT': '2ème Bac Sciences de la Vie et de la Terre',
  '2BAC Sc. Maths A': '2ème Bac Sciences Mathématiques A',
  '2BAC Sc. Maths B': '2ème Bac Sciences Mathématiques B',
  '2BAC Sc. Économiques': '2ème Bac Sciences Économiques',
  '2BAC Sc. Gestion Comptable': '2ème Bac Sciences de Gestion Comptable',
  '2BAC Lettres': '2ème Bac Lettres',
  '2BAC Sc. Humaines': '2ème Bac Sciences Humaines',
  'MPSI': 'Mathématiques, physique et sciences de l’ingénieur',
  'PCSI': 'Physique, chimie et sciences de l’ingénieur',
  'MP': 'Mathématiques et physique',
  'PSI': 'Physique et sciences de l’ingénieur',
  'TSI': 'Technologie et sciences industrielles',
  'ECS': 'Économie et commerce, option scientifique',
  'ECT': 'Économie et commerce, option technologique',
  '1re année MPSI': '1re année · MPSI',
  '1re année PCSI': '1re année · PCSI',
  '1re année TSI': '1re année · TSI',
  '1re année ECS': '1re année · ECS',
  '1re année ECT': '1re année · ECT',
  '2e année MP': '2e année · MP',
  '2e année PSI': '2e année · PSI',
  '2e année TSI': '2e année · TSI',
  '2e année ECS': '2e année · ECS',
  '2e année ECT': '2e année · ECT',
};

const CLASS_LEVEL_DISPLAY_NAMES_AR: Readonly<Record<string, string>> = {
  '1AC': 'الأولى إعدادي',
  '2AC': 'الثانية إعدادي',
  '3AC': 'الثالثة إعدادي',
  'Tronc Commun Scientifique': 'الجذع المشترك العلمي',
  'Tronc Commun Lettres et Sciences Humaines': 'الجذع المشترك الآداب والعلوم الإنسانية',
  'Tronc Commun Technologique': 'الجذع المشترك التكنولوجي',
  'Tronc commun scientifique': 'الجذع المشترك العلمي',
  'Tronc commun lettres': 'الجذع المشترك الآداب والعلوم الإنسانية',
  'Tronc commun technologique': 'الجذع المشترك التكنولوجي',
  '1er Bac Sciences Expérimentales': 'الأولى بكالوريا علوم تجريبية',
  '1er Bac Sciences Mathématiques': 'الأولى بكالوريا علوم رياضية',
  '1er Bac Lettres et Sciences Humaines': 'الأولى بكالوريا آداب وعلوم إنسانية',
  '1er Bac Lettres': 'الأولى بكالوريا آداب وعلوم إنسانية',
  '1er Bac Sciences Économiques et Gestion': 'الأولى بكالوريا علوم اقتصادية وتدبير',
  '1er Bac Sciences Économiques': 'الأولى بكالوريا علوم اقتصادية وتدبير',
  '2ème Bac Sciences Physiques': 'الثانية بكالوريا علوم فيزيائية',
  '2ème Bac Sciences de la Vie et de la Terre': 'الثانية بكالوريا علوم الحياة والأرض',
  '2ème Bac Sciences Mathématiques A': 'الثانية بكالوريا علوم رياضية أ',
  '2ème Bac Sciences Mathématiques B': 'الثانية بكالوريا علوم رياضية ب',
  '2ème Bac Sciences Économiques': 'الثانية بكالوريا علوم اقتصادية',
  '2ème Bac Sciences de Gestion Comptable': 'الثانية بكالوريا علوم التدبير المحاسباتي',
  '2ème Bac Lettres': 'الثانية بكالوريا آداب',
  '2ème Bac Sciences Humaines': 'الثانية بكالوريا علوم إنسانية',
  // Backward compatibility keys
  '1BAC Sc. Expérimentales': 'الأولى بكالوريا علوم تجريبية',
  '1BAC Sc. Mathématiques': 'الأولى بكالوريا علوم رياضية',
  '1BAC Lettres': 'الأولى بكالوريا آداب وعلوم إنسانية',
  '1BAC Sc. Économiques': 'الأولى بكالوريا علوم اقتصادية وتدبير',
  '2BAC PC': 'الثانية بكالوريا علوم فيزيائية',
  '2BAC SVT': 'الثانية بكالوريا علوم الحياة والأرض',
  '2BAC Sc. Maths A': 'الثانية بكالوريا علوم رياضية أ',
  '2BAC Sc. Maths B': 'الثانية بكالوريا علوم رياضية ب',
  '2BAC Sc. Économiques': 'الثانية بكالوريا علوم اقتصادية',
  '2BAC Sc. Gestion Comptable': 'الثانية بكالوريا علوم التدبير المحاسباتي',
  '2BAC Lettres': 'الثانية بكالوريا آداب',
  '2BAC Sc. Humaines': 'الثانية بكالوريا علوم إنسانية',
  'MPSI': 'رياضيات وفيزياء وعلوم المهندس',
  'PCSI': 'فيزياء وكيمياء وعلوم المهندس',
  'MP': 'رياضيات وفيزياء',
  'PSI': 'فيزياء وعلوم المهندس',
  'TSI': 'تكنولوجيا وعلوم صناعية',
  'ECS': 'اقتصاد وتجارة خيار علمي',
  'ECT': 'اقتصاد وتجارة خيار تكنولوجي',
  '1re année MPSI': 'السنة الأولى · MPSI',
  '1re année PCSI': 'السنة الأولى · PCSI',
  '1re année TSI': 'السنة الأولى · TSI',
  '1re année ECS': 'السنة الأولى · ECS',
  '1re année ECT': 'السنة الأولى · ECT',
  '2e année MP': 'السنة الثانية · MP',
  '2e année PSI': 'السنة الثانية · PSI',
  '2e année TSI': 'السنة الثانية · TSI',
  '2e année ECS': 'السنة الثانية · ECS',
  '2e année ECT': 'السنة الثانية · ECT',
};

const DISPLAY_LEVEL_KEYS = Object.keys(CLASS_LEVEL_DISPLAY_NAMES)
  .sort((left, right) => right.length - left.length);

export const getBaseLevelKey = (name: string): string => {
  const normalized = normalizeOfficialClassName(name || '').trim().replace(/\s+/g, ' ');
  const level = DISPLAY_LEVEL_KEYS.find(key => normalized === key || normalized.startsWith(`${key} `));
  return level || normalized;
};

export const formatClassDisplayName = (name: string): string => {
  const normalized = normalizeOfficialClassName(name || '').trim().replace(/\s+/g, ' ');
  const level = DISPLAY_LEVEL_KEYS.find(key =>
    normalized === key || normalized.startsWith(`${key} `)
  );
  if (!level) return normalized;

  const suffix = normalized.slice(level.length).trim();
  const label = CLASS_LEVEL_DISPLAY_NAMES[level];
  return suffix ? `${label} ${suffix}` : label;
};

interface LocalizedClassDisplayOptions {
  /** Préfixe « قسم » pour une classe créée ; masqué dans les sélecteurs de niveaux. */
  includeClassPrefix?: boolean;
}

export const formatLocalizedClassDisplayName = (
  name: string,
  locale: AppLocale,
  { includeClassPrefix = true }: LocalizedClassDisplayOptions = {},
): string => {
  if (locale !== 'ar') return formatClassDisplayName(name);

  const normalized = normalizeOfficialClassName(name || '').trim().replace(/\s+/g, ' ');
  const level = DISPLAY_LEVEL_KEYS.find(key => normalized === key || normalized.startsWith(`${key} `));
  if (!level) return normalized;

  const suffix = normalized.slice(level.length).trim();
  const label = CLASS_LEVEL_DISPLAY_NAMES_AR[level] ?? CLASS_LEVEL_DISPLAY_NAMES[level];
  const classLabel = suffix ? `${label} ${suffix}` : label;
  return includeClassPrefix ? `قسم ${classLabel}` : classLabel;
};

const CLASS_LEVEL_RENAMES: Array<[RegExp, string]> = [
  // Collège (1AC, 2AC, 3AC et variantes APIC / ASC / Année Collégiale)
  [/^(?:1\s*apic|1\s*asc|1ère\s*année\s*collégiale|1ere\s*annee\s*collegiale|1ère\s*ac|1re\s*ac)(?![\p{L}\p{N}_])/iu, '1AC'],
  [/^(?:2\s*apic|2\s*asc|2ème\s*année\s*collégiale|2eme\s*annee\s*collegiale|2ème\s*ac|2e\s*ac)(?![\p{L}\p{N}_])/iu, '2AC'],
  [/^(?:3\s*apic|3\s*asc|3ème\s*année\s*collégiale|3eme\s*annee\s*collegiale|3ème\s*ac|3e\s*ac)(?![\p{L}\p{N}_])/iu, '3AC'],

  // Tronc Commun (TCS, TCL, TCT)
  [/^(?:tcs\s*biof|tcs|trc|tc\s*sciences?|tc\s*scientifique|tronc\s+commun\s+sciences?|tronc\s+commun\s+scientifique)(?![\p{L}\p{N}_])/iu, 'Tronc Commun Scientifique'],
  [/^(?:tcl|tc\s*lettres?|tronc\s+commun\s+lettres?(?:\s+et\s+sciences?\s+humaines?)?)(?![\p{L}\p{N}_])/iu, 'Tronc Commun Lettres et Sciences Humaines'],
  [/^(?:tct|tc\s*technologique|tronc\s+commun\s+technologique)(?![\p{L}\p{N}_])/iu, 'Tronc Commun Technologique'],

  // 1er Bac / 1BAC
  [/^(?:1bac\s*(?:se|sef|biof)|1er\s*bac\s*(?:se|sef|biof)|(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:exp\.?|expérimentales?))(?![\p{L}\p{N}_])/iu, '1er Bac Sciences Expérimentales'],
  [/^(?:1bac\s*(?:sm|smf)|1er\s*bac\s*(?:sm|smf)|(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?))(?![\p{L}\p{N}_])/iu, '1er Bac Sciences Mathématiques'],
  [/^(?:1bac\s*lsh|1bac\s*l|(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:lettres?(?:\s+et\s+sciences?\s+humaines?)?))(?![\p{L}\p{N}_])/iu, '1er Bac Lettres et Sciences Humaines'],
  [/^(?:1bac\s*(?:eco|seg|seco)|(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:éco\.?|économiques?(?:\s+et\s+gestion)?))(?![\p{L}\p{N}_])/iu, '1er Bac Sciences Économiques et Gestion'],

  // 2ème Bac / 2BAC
  [/^(?:2bac\s*(?:pc|physique)\s*biof|2bac\s*pc|2ème\s*bac\s*pc|2e\s*bac\s*pc|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:physiques?|pc))(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences Physiques'],
  [/^(?:2bac\s*svt\s*biof|2bac\s*svt|2ème\s*bac\s*svt|2e\s*bac\s*svt|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:de\s+la\s+vie\s+et\s+de\s+la\s+terre|svt))(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences de la Vie et de la Terre'],
  [/^(?:2bac\s*sm\s*a|2bac\s*sma|2bac\s*sc\.?\s*maths?\s*a|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?)\s*a)(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences Mathématiques A'],
  [/^(?:2bac\s*sm\s*b|2bac\s*smb|2bac\s*sc\.?\s*maths?\s*b|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?)\s*b)(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences Mathématiques B'],
  [/^(?:2bac\s*sm|2bac\s*sc\.?\s*maths?|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?))(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences Mathématiques A'],
  [/^(?:2bac\s*(?:eco|seco)|2bac\s*sc\.?\s*éco\.?|2ème\s*bac\s*(?:sc\.?|sciences?)\s*économiques?)(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences Économiques'],
  [/^(?:2bac\s*sgc|2bac\s*sc\.?\s*gestion\s*comptable|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:de\s+)?gestion\s+comptable)(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences de Gestion Comptable'],
  [/^(?:2bac\s*l|2bac\s*lettres?|2ème\s*bac\s*lettres?)(?![\p{L}\p{N}_])/iu, '2ème Bac Lettres'],
  [/^(?:2bac\s*(?:sh|lsh)|2bac\s*sc\.?\s*humaines?|2ème\s*bac\s*(?:sc\.?|sciences?)\s*humaines?)(?![\p{L}\p{N}_])/iu, '2ème Bac Sciences Humaines'],
];

export const normalizeOfficialClassName = (name: string): string => {
  const trimmed = (name || '').trim().replace(/\s+/g, ' ');
  for (const [pattern, replacement] of CLASS_LEVEL_RENAMES) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const suffix = trimmed.slice(match[0].length).trim();
    return suffix ? `${replacement} ${suffix}` : replacement;
  }
  return trimmed;
};

/* ── Identité de classe : palier (badge) et filière ───────────────────────── */

/**
 * Palier pédagogique porté par le badge des cartes de classe.
 *
 * Plus précis que `ClassLevelGroupKey` : au collège, deux classes ne doivent
 * pas afficher le même badge, sinon les cartes deviennent indiscernables.
 */
export type ClassTierKey =
  | 'college1' | 'college2' | 'college3'
  | 'common' | 'firstBac' | 'secondBac'
  | 'prepa' | 'prepa1' | 'prepa2';

/** Réutilise le vocabulaire déjà employé par les sélecteurs de cycle (loi de Jakob). */
const CLASS_TIER_LABELS: Record<AppLocale, Record<ClassTierKey, string>> = {
  fr: {
    college1: '1re Collège',
    college2: '2e Collège',
    college3: '3e Collège',
    common: CLASS_LEVEL_GROUP_LABELS.fr.common,
    firstBac: CLASS_LEVEL_GROUP_LABELS.fr.firstBac,
    secondBac: CLASS_LEVEL_GROUP_LABELS.fr.secondBac,
    prepa: CLASS_LEVEL_GROUP_LABELS.fr.prepa,
    prepa1: '1re année',
    prepa2: '2e année',
  },
  ar: {
    college1: 'الأولى إعدادي',
    college2: 'الثانية إعدادي',
    college3: 'الثالثة إعدادي',
    common: CLASS_LEVEL_GROUP_LABELS.ar.common,
    firstBac: CLASS_LEVEL_GROUP_LABELS.ar.firstBac,
    secondBac: CLASS_LEVEL_GROUP_LABELS.ar.secondBac,
    prepa: CLASS_LEVEL_GROUP_LABELS.ar.prepa,
    prepa1: 'السنة الأولى',
    prepa2: 'السنة الثانية',
  },
  en: {
    college1: 'Middle School 1',
    college2: 'Middle School 2',
    college3: 'Middle School 3',
    common: CLASS_LEVEL_GROUP_LABELS.en.common,
    firstBac: CLASS_LEVEL_GROUP_LABELS.en.firstBac,
    secondBac: CLASS_LEVEL_GROUP_LABELS.en.secondBac,
    prepa: CLASS_LEVEL_GROUP_LABELS.en.prepa,
    prepa1: 'Year 1',
    prepa2: 'Year 2',
  },
};

export const formatClassTierLabel = (key: ClassTierKey, locale: AppLocale): string =>
  CLASS_TIER_LABELS[locale][key];

/**
 * Libellé accessible du groupe (« Groupe 3 »), employé en info-bulle et pour
 * les lecteurs d'écran : à l'écran, seule la valeur du groupe est affichée.
 */
const CLASS_GROUP_LABELS: Record<AppLocale, string> = {
  fr: 'Groupe {group}',
  ar: 'الفوج {group}',
  en: 'Group {group}',
};

export const formatClassGroupLabel = (group: string, locale: AppLocale): string =>
  CLASS_GROUP_LABELS[locale].replace('{group}', group);

/**
 * Libellés de filières, indexés par code neutre — ceux produits par
 * `parseClassName` et `CLASS_LEVEL_IDENTITY`. L'anglais est fourni bien que les
 * intitulés officiels des classes restent en français : le badge est un élément
 * d'interface, au même titre que les onglets de cycle.
 */
const CLASS_STREAM_LABELS: Record<AppLocale, Record<string, string>> = {
  fr: {
    'SVT': 'Sciences de la Vie et de la Terre',
    'SM': 'Sciences Mathématiques',
    'SM-A': 'Sciences Mathématiques A',
    'SM-B': 'Sciences Mathématiques B',
    'PC': 'Sciences Physiques',
    'SEXP': 'Sciences Expérimentales',
    'SECO': 'Sciences Économiques',
    'SEG': 'Sciences Économiques et Gestion',
    'SGC': 'Sciences de Gestion Comptable',
    'SH': 'Sciences Humaines',
    'L': 'Lettres',
    'LSH': 'Lettres et Sciences Humaines',
    'SI': 'Sciences de l’ingénieur',
    'TC-S': 'Scientifique',
    'TC-L': 'Lettres et Sciences Humaines',
    'TC-T': 'Technologique',
    // Sigles des classes préparatoires : identiques dans les trois langues.
    'MPSI': 'MPSI',
    'PCSI': 'PCSI',
    'TSI': 'TSI',
    'ECS': 'ECS',
    'ECT': 'ECT',
    'MP': 'MP',
    'PSI': 'PSI',
  },
  ar: {
    'SVT': 'علوم الحياة والأرض',
    'SM': 'علوم رياضية',
    'SM-A': 'علوم رياضية أ',
    'SM-B': 'علوم رياضية ب',
    'PC': 'علوم فيزيائية',
    'SEXP': 'علوم تجريبية',
    'SECO': 'علوم اقتصادية',
    'SEG': 'علوم اقتصادية وتدبير',
    'SGC': 'علوم التدبير المحاسباتي',
    'SH': 'علوم إنسانية',
    'L': 'آداب',
    'LSH': 'آداب وعلوم إنسانية',
    'SI': 'علوم المهندس',
    'TC-S': 'علمي',
    'TC-L': 'الآداب والعلوم الإنسانية',
    'TC-T': 'تكنولوجي',
    'MPSI': 'MPSI',
    'PCSI': 'PCSI',
    'TSI': 'TSI',
    'ECS': 'ECS',
    'ECT': 'ECT',
    'MP': 'MP',
    'PSI': 'PSI',
  },
  en: {
    'SVT': 'Life and Earth Sciences',
    'SM': 'Mathematical Sciences',
    'SM-A': 'Mathematical Sciences A',
    'SM-B': 'Mathematical Sciences B',
    'PC': 'Physics and Chemistry',
    'SEXP': 'Experimental Sciences',
    'SECO': 'Economic Sciences',
    'SEG': 'Economics and Management',
    'SGC': 'Accounting Management',
    'SH': 'Humanities',
    'L': 'Literature',
    'LSH': 'Literature and Humanities',
    'SI': 'Engineering Sciences',
    'TC-S': 'Science',
    'TC-L': 'Literature and Humanities',
    'TC-T': 'Technology',
    'MPSI': 'MPSI',
    'PCSI': 'PCSI',
    'TSI': 'TSI',
    'ECS': 'ECS',
    'ECT': 'ECT',
    'MP': 'MP',
    'PSI': 'PSI',
  },
};

/** Ramène un code de filière à sa forme canonique (« sm-a » → « SM-A »). */
const normalizeStreamCode = (code: string): string => code.replace(/[·\s_]/g, '-').toUpperCase();

export const formatClassStreamLabel = (code: string, locale: AppLocale): string | null => {
  if (!code) return null;
  return CLASS_STREAM_LABELS[locale][normalizeStreamCode(code)] ?? null;
};

export interface ClassLevelIdentity {
  tier: ClassTierKey;
  /** Code de filière, vide pour les niveaux qui n'en portent pas (collège). */
  stream: string;
}

/**
 * Niveaux officiels → palier et filière. Les clés sont **canoniques** : tout nom
 * saisi par le professeur passe d'abord par `normalizeOfficialClassName`, qui
 * ramène « 2BAC PC », « 2ème bac svt biof »… sur ces intitulés.
 */
const CLASS_LEVEL_IDENTITY: Readonly<Record<string, ClassLevelIdentity>> = {
  '1AC': { tier: 'college1', stream: '' },
  '2AC': { tier: 'college2', stream: '' },
  '3AC': { tier: 'college3', stream: '' },

  'Tronc Commun Scientifique': { tier: 'common', stream: 'TC-S' },
  'Tronc Commun Lettres et Sciences Humaines': { tier: 'common', stream: 'TC-L' },
  'Tronc Commun Technologique': { tier: 'common', stream: 'TC-T' },

  '1er Bac Sciences Expérimentales': { tier: 'firstBac', stream: 'SEXP' },
  '1er Bac Sciences Mathématiques': { tier: 'firstBac', stream: 'SM' },
  '1er Bac Lettres et Sciences Humaines': { tier: 'firstBac', stream: 'LSH' },
  '1er Bac Sciences Économiques et Gestion': { tier: 'firstBac', stream: 'SEG' },

  '2ème Bac Sciences Physiques': { tier: 'secondBac', stream: 'PC' },
  '2ème Bac Sciences de la Vie et de la Terre': { tier: 'secondBac', stream: 'SVT' },
  '2ème Bac Sciences Mathématiques A': { tier: 'secondBac', stream: 'SM-A' },
  '2ème Bac Sciences Mathématiques B': { tier: 'secondBac', stream: 'SM-B' },
  '2ème Bac Sciences Économiques': { tier: 'secondBac', stream: 'SECO' },
  '2ème Bac Sciences de Gestion Comptable': { tier: 'secondBac', stream: 'SGC' },
  '2ème Bac Lettres': { tier: 'secondBac', stream: 'L' },
  '2ème Bac Sciences Humaines': { tier: 'secondBac', stream: 'SH' },

  'MPSI': { tier: 'prepa', stream: 'MPSI' },
  'PCSI': { tier: 'prepa', stream: 'PCSI' },
  'TSI': { tier: 'prepa', stream: 'TSI' },
  'ECS': { tier: 'prepa', stream: 'ECS' },
  'ECT': { tier: 'prepa', stream: 'ECT' },
  'MP': { tier: 'prepa', stream: 'MP' },
  'PSI': { tier: 'prepa', stream: 'PSI' },
  '1re année MPSI': { tier: 'prepa1', stream: 'MPSI' },
  '1re année PCSI': { tier: 'prepa1', stream: 'PCSI' },
  '1re année TSI': { tier: 'prepa1', stream: 'TSI' },
  '1re année ECS': { tier: 'prepa1', stream: 'ECS' },
  '1re année ECT': { tier: 'prepa1', stream: 'ECT' },
  '2e année MP': { tier: 'prepa2', stream: 'MP' },
  '2e année PSI': { tier: 'prepa2', stream: 'PSI' },
  '2e année TSI': { tier: 'prepa2', stream: 'TSI' },
  '2e année ECS': { tier: 'prepa2', stream: 'ECS' },
  '2e année ECT': { tier: 'prepa2', stream: 'ECT' },
};

/** Plus long d'abord : « MP » ne doit jamais masquer « MPSI ». */
const LEVEL_IDENTITY_KEYS = Object.keys(CLASS_LEVEL_IDENTITY)
  .sort((left, right) => right.length - left.length);

/**
 * Identité d'un nom de classe **canonique**. Retourne `null` quand le nom ne
 * correspond à aucun niveau officiel : l'appelant conserve alors son rendu
 * habituel plutôt que d'inventer un badge.
 *
 * Le suffixe (groupe, mention libre) est renvoyé tel quel, sans être interprété.
 */
export const lookupClassLevelIdentity = (
  name: string,
): { identity: ClassLevelIdentity; suffix: string } | null => {
  const normalized = normalizeOfficialClassName(name || '').trim().replace(/\s+/g, ' ');
  const key = LEVEL_IDENTITY_KEYS.find(candidate =>
    normalized === candidate || normalized.startsWith(`${candidate} `)
  );
  if (!key) return null;
  return { identity: CLASS_LEVEL_IDENTITY[key], suffix: normalized.slice(key.length).trim() };
};

const PREPA_LEVEL_CODES = new Set(['MPSI', 'PCSI', 'TSI', 'ECS', 'ECT', 'MP', 'PSI', 'BTS', 'CPGE']);

/**
 * Palier déduit d'un code de niveau produit par `parseClassName` — utile pour
 * les noms compactés (« 2Bacpc3 », « 2BSMA-A ») que la table canonique ignore.
 */
export const tierForLevelCode = (code: string): ClassTierKey | null => {
  if (!code) return null;
  const key = normalizeStreamCode(code);
  if (key.startsWith('TC')) return 'common';
  if (key === '1AC' || key === '2AC' || key === '3AC') {
    return `college${key[0]}` as ClassTierKey;
  }
  if (key === '1B') return 'firstBac';
  if (key === '2B') return 'secondBac';
  return PREPA_LEVEL_CODES.has(key) ? 'prepa' : null;
};
