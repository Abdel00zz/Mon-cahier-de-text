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

export interface ResolvedClassHierarchy {
  cycle: Cycle;
  cycleLabel: string;
  cycleLabelAr: string;
  level: string; // e.g. "1AC", "Tronc Commun", "2ème Bac"
  levelCode: string; // "1AC", "2AC", "3AC", "TC", "1BAC", "2BAC", "CPGE"
  levelLabel: string;
  levelLabelAr: string;
  branch: string; // e.g. "Sciences Physiques", "Sciences Expérimentales", "Général"
  branchShort: string; // "PC", "SVT", "SE", "SM-A", "TCS", "Général"
  branchCode: string;
  branchLabelAr: string;
  group: string; // "1", "2"
  isCertificatif: boolean;
  examTitle?: string;
  examTitleAr?: string;
  fullBadge: string;
  fullBadgeAr: string;
}

/**
 * Analyse une classe en extrayant fidèlement sa structure hiérarchique :
 * Cycle (Collège / Lycée) ➔ Classe / Palier (1AC / TC / 2BAC) ➔ Branche / Filière (PC / SVT / SM) ➔ Groupe.
 */
export const resolveClassHierarchy = (name: string, cycleHint?: Cycle): ResolvedClassHierarchy => {
  const normalized = normalizeOfficialClassName(name || '');
  const groupMatch = normalized.match(/(\d+)\s*$/);
  const group = groupMatch ? groupMatch[1] : '';

  // Collège
  if (/^1\s*ac/i.test(normalized)) {
    return {
      cycle: 'college',
      cycleLabel: 'Collège',
      cycleLabelAr: 'الثانوي الإعدادي',
      level: '1AC',
      levelCode: '1AC',
      levelLabel: '1ère Année Collégiale',
      levelLabelAr: 'الأولى إعدادي',
      branch: 'Enseignement Général (BIOF)',
      branchShort: 'Général',
      branchCode: 'GENERAL',
      branchLabelAr: 'التعليم العام (مسار دولي)',
      group,
      isCertificatif: false,
      fullBadge: `Collège · 1AC${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `الإعدادي · الأولى إعدادي${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/^2\s*ac/i.test(normalized)) {
    return {
      cycle: 'college',
      cycleLabel: 'Collège',
      cycleLabelAr: 'الثانوي الإعدادي',
      level: '2AC',
      levelCode: '2AC',
      levelLabel: '2ème Année Collégiale',
      levelLabelAr: 'الثانية إعدادي',
      branch: 'Enseignement Général (BIOF)',
      branchShort: 'Général',
      branchCode: 'GENERAL',
      branchLabelAr: 'التعليم العام (مسار دولي)',
      group,
      isCertificatif: false,
      fullBadge: `Collège · 2AC${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `الإعدادي · الثانية إعدادي${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/^3\s*ac/i.test(normalized)) {
    return {
      cycle: 'college',
      cycleLabel: 'Collège',
      cycleLabelAr: 'الثانوي الإعدادي',
      level: '3AC',
      levelCode: '3AC',
      levelLabel: '3ème Année Collégiale',
      levelLabelAr: 'الثالثة إعدادي',
      branch: 'Enseignement Général (BIOF)',
      branchShort: 'Général',
      branchCode: 'GENERAL',
      branchLabelAr: 'التعليم العام (مسار دولي)',
      group,
      isCertificatif: true,
      examTitle: 'Examen local unifié (S1) & régional unifié (S2)',
      examTitleAr: 'الامتحان الموحد المحلي (د1) والجهوي (د2)',
      fullBadge: `Collège · 3AC (Certificatif)${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `الإعدادي · الثالثة إعدادي (إشهادي)${group ? ` · ف${group}` : ''}`,
    };
  }

  // Lycée - Tronc Commun
  if (/tronc\s+commun\s+scientifique/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: 'Tronc Commun',
      levelCode: 'TC',
      levelLabel: 'Tronc Commun',
      levelLabelAr: 'الجذع المشترك',
      branch: 'Scientifique (BIOF)',
      branchShort: 'TCS',
      branchCode: 'TCS',
      branchLabelAr: 'علمي (مسار دولي)',
      group,
      isCertificatif: false,
      fullBadge: `Lycée · TC Scientifique${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · ج.م علمي${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/tronc\s+commun\s+lettres/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: 'Tronc Commun',
      levelCode: 'TC',
      levelLabel: 'Tronc Commun',
      levelLabelAr: 'الجذع المشترك',
      branch: 'Lettres et Sciences Humaines',
      branchShort: 'TCL',
      branchCode: 'TCL',
      branchLabelAr: 'آداب وعلوم إنسانية',
      group,
      isCertificatif: false,
      fullBadge: `Lycée · TC Lettres${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · ج.م آداب${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/tronc\s+commun\s+technologique/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: 'Tronc Commun',
      levelCode: 'TC',
      levelLabel: 'Tronc Commun',
      levelLabelAr: 'الجذع المشترك',
      branch: 'Technologique',
      branchShort: 'TCT',
      branchCode: 'TCT',
      branchLabelAr: 'تكنولوجي',
      group,
      isCertificatif: false,
      fullBadge: `Lycée · TC Tech${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · ج.م تكنولوجي${group ? ` · ف${group}` : ''}`,
    };
  }

  // Lycée - 1ère Année Bac
  if (/1er\s*bac\s*sciences?\s*exp/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '1er Bac',
      levelCode: '1BAC',
      levelLabel: '1ère Année Baccalauréat',
      levelLabelAr: 'الأولى بكالوريا',
      branch: 'Sciences Expérimentales (BIOF)',
      branchShort: 'Sc. Exp',
      branchCode: '1BAC-SE',
      branchLabelAr: 'علوم تجريبية (مسار دولي)',
      group,
      isCertificatif: true,
      examTitle: 'Examen régional unifié (1BAC)',
      examTitleAr: 'الامتحان الجهوي الموحد (1 باك)',
      fullBadge: `Lycée · 1BAC · Sc. Exp${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 1 باك · علوم تجريبية${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/1er\s*bac\s*sciences?\s*math/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '1er Bac',
      levelCode: '1BAC',
      levelLabel: '1ère Année Baccalauréat',
      levelLabelAr: 'الأولى بكالوريا',
      branch: 'Sciences Mathématiques (BIOF)',
      branchShort: 'Sc. Maths',
      branchCode: '1BAC-SM',
      branchLabelAr: 'علوم رياضية (مسار دولي)',
      group,
      isCertificatif: true,
      examTitle: 'Examen régional unifié (1BAC)',
      examTitleAr: 'الامتحان الجهوي الموحد (1 باك)',
      fullBadge: `Lycée · 1BAC · Sc. Maths${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 1 باك · علوم رياضية${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/1er\s*bac\s*lettres/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '1er Bac',
      levelCode: '1BAC',
      levelLabel: '1ère Année Baccalauréat',
      levelLabelAr: 'الأولى بكالوريا',
      branch: 'Lettres et Sciences Humaines',
      branchShort: 'Lettres',
      branchCode: '1BAC-LSH',
      branchLabelAr: 'آداب وعلوم إنسانية',
      group,
      isCertificatif: true,
      examTitle: 'Examen régional unifié (1BAC)',
      examTitleAr: 'الامتحان الجهوي الموحد (1 باك)',
      fullBadge: `Lycée · 1BAC · Lettres${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 1 باك · آداب${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/1er\s*bac\s*sciences?\s*éco/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '1er Bac',
      levelCode: '1BAC',
      levelLabel: '1ère Année Baccalauréat',
      levelLabelAr: 'الأولى بكالوريا',
      branch: 'Sciences Économiques et Gestion',
      branchShort: 'Éco-Gestion',
      branchCode: '1BAC-ECO',
      branchLabelAr: 'علوم اقتصادية وتدبير',
      group,
      isCertificatif: true,
      examTitle: 'Examen régional unifié (1BAC)',
      examTitleAr: 'الامتحان الجهوي الموحد (1 باك)',
      fullBadge: `Lycée · 1BAC · Éco${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 1 باك · اقتصاد${group ? ` · ف${group}` : ''}`,
    };
  }

  // Lycée - 2ème Année Bac
  if (/2ème\s*bac\s*sciences?\s*physiques?/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Sciences Physiques (PC)',
      branchShort: 'PC',
      branchCode: '2BAC-PC',
      branchLabelAr: 'علوم فيزيائية (خيار فرنسية)',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · PC${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · فيزياء (PC)${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/2ème\s*bac\s*sciences?\s*de\s+la\s+vie/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Sciences de la Vie et de la Terre (SVT)',
      branchShort: 'SVT',
      branchCode: '2BAC-SVT',
      branchLabelAr: 'علوم الحياة والأرض (خيار فرنسية)',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · SVT${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · علوم الحياة والأرض${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/2ème\s*bac\s*sciences?\s*maths?\s*b/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Sciences Mathématiques B',
      branchShort: 'SM-B',
      branchCode: '2BAC-SMB',
      branchLabelAr: 'علوم رياضية ب',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · SM-B${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · رياضية ب${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/2ème\s*bac\s*sciences?\s*math/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Sciences Mathématiques A',
      branchShort: 'SM-A',
      branchCode: '2BAC-SMA',
      branchLabelAr: 'علوم رياضية أ',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · SM-A${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · رياضية أ${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/2ème\s*bac\s*sciences?\s*éco/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Sciences Économiques',
      branchShort: 'Sc. Éco',
      branchCode: '2BAC-ECO',
      branchLabelAr: 'علوم اقتصادية',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · Éco${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · اقتصاد${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/2ème\s*bac\s*sciences?\s*de\s+gestion|gestion\s+comptable/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Sciences de Gestion Comptable',
      branchShort: 'SGC',
      branchCode: '2BAC-SGC',
      branchLabelAr: 'علوم التدبير المحاسباتي',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · SGC${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · تدبير محاسباتي${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/2ème\s*bac\s*lettres/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Lettres',
      branchShort: 'Lettres',
      branchCode: '2BAC-L',
      branchLabelAr: 'آداب',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · Lettres${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · آداب${group ? ` · ف${group}` : ''}`,
    };
  }
  if (/2ème\s*bac\s*sciences?\s*humaines?/i.test(normalized)) {
    return {
      cycle: 'lycee',
      cycleLabel: 'Lycée qualifiant',
      cycleLabelAr: 'الثانوي التأهيلي',
      level: '2ème Bac',
      levelCode: '2BAC',
      levelLabel: '2ème Année Baccalauréat',
      levelLabelAr: 'الثانية بكالوريا',
      branch: 'Sciences Humaines',
      branchShort: 'Sc. Humaines',
      branchCode: '2BAC-SH',
      branchLabelAr: 'علوم إنسانية',
      group,
      isCertificatif: true,
      examTitle: 'Examen national unifié du Baccalauréat (2BAC)',
      examTitleAr: 'الامتحان الوطني الموحد للبكالوريا (2 باك)',
      fullBadge: `Lycée · 2BAC · Sc. Humaines${group ? ` · G${group}` : ''}`,
      fullBadgeAr: `التأهيلي · 2 باك · علوم إنسانية${group ? ` · ف${group}` : ''}`,
    };
  }

  // Fallback avec déduction de cycle
  const cycle: Cycle = cycleHint ?? (/collège|college|1ac|2ac|3ac/i.test(normalized) ? 'college' : 'lycee');
  const isCollege = cycle === 'college';
  return {
    cycle,
    cycleLabel: isCollege ? 'Collège' : 'Lycée qualifiant',
    cycleLabelAr: isCollege ? 'الثانوي الإعدادي' : 'الثانوي التأهيلي',
    level: normalized,
    levelCode: isCollege ? 'COLLEGE' : 'LYCEE',
    levelLabel: normalized,
    levelLabelAr: normalized,
    branch: 'Standard',
    branchShort: isCollege ? 'Collège' : 'Lycée',
    branchCode: 'STD',
    branchLabelAr: 'عام',
    group,
    isCertificatif: false,
    fullBadge: `${isCollege ? 'Collège' : 'Lycée'} · ${normalized}`,
    fullBadgeAr: `${isCollege ? 'الإعدادي' : 'التأهيلي'} · ${normalized}`,
  };
};
