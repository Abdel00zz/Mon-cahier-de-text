import type { AppLocale, Cycle } from '../types';
import type { ClassLevelGroupKey, ClassLevelIdentity } from './classLevelTypes';

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

export const CLASS_LEVEL_GROUP_LABELS: Record<AppLocale, Record<ClassLevelGroupKey, string>> = {
  fr: {
    college: 'Collège',
    common: 'Tronc commun',
    firstBac: '1er Bac',
    secondBac: '2ème Bac',
    prepa: 'Prépa',
    prepaFirst: '1ère année CPGE',
    prepaSecond: '2éme année CPGE',
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

export const CLASS_LEVEL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
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
  'MPSI': 'Mathématiques, Physique et Sciences de l’Ingénieur',
  'PCSI': 'Physique, Chimie et Sciences de l’Ingénieur',
  'MP': 'Mathématiques et Physique',
  'PSI': 'Physique et Sciences de l’Ingénieur',
  'TSI': 'Technologie et Sciences Industrielles',
  'ECS': 'Économie et Commerce, option scientifique',
  'ECT': 'Économie et Commerce, option technologique',
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

export const CLASS_LEVEL_DISPLAY_NAMES_AR: Readonly<Record<string, string>> = {
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

export const DISPLAY_LEVEL_KEYS = Object.keys(CLASS_LEVEL_DISPLAY_NAMES)
  .sort((left, right) => right.length - left.length);

export const CLASS_LEVEL_RENAMES: Array<[RegExp, string]> = [
  // Collège (1AC, 2AC, 3AC et variantes APIC / ASC / Année Collégiale / avec ou sans espaces)
  [/^(?:1\s*apic|1\s*asc|1[èeé]re?\s*année\s*collégiale|1ere\s*annee\s*collegiale|1[èeé]re?\s*ac|1re\s*ac|1\s*ac)(?=[0-9\s]|$)/iu, '1AC'],
  [/^(?:2\s*apic|2\s*asc|2[èeé]me?\s*année\s*collégiale|2eme\s*annee\s*collegiale|2[èeé]me?\s*ac|2e\s*ac|2\s*ac)(?=[0-9\s]|$)/iu, '2AC'],
  [/^(?:3\s*apic|3\s*asc|3[èeé]me?\s*année\s*collégiale|3eme\s*annee\s*collegiale|3[èeé]me?\s*ac|3e\s*ac|3\s*ac)(?=[0-9\s]|$)/iu, '3AC'],

  // Tronc Commun (TCS, TCL, TCT, BIOF, etc.)
  [/^(?:tcs\s*biof|tcs|trc|tc\s*sciences?|tc\s*scientifique|tc\s*biof|tronc\s+commun\s+sciences?|tronc\s+commun\s+scientifique|tronc\s+commun\s+biof|tronc\s+commun\s+sci|tc\s*sci)(?=[0-9\s]|$)/iu, 'Tronc Commun Scientifique'],
  [/^(?:tcl|tc\s*lettres?|tc\s*lsh|tronc\s+commun\s+lettres?(?:\s+et\s+sciences?\s+humaines?)?|tronc\s+commun\s+lsh)(?=[0-9\s]|$)/iu, 'Tronc Commun Lettres et Sciences Humaines'],
  [/^(?:tct|tc\s*technologique|tc\s*tech|tronc\s+commun\s+technologique|tronc\s+commun\s+tech)(?=[0-9\s]|$)/iu, 'Tronc Commun Technologique'],

  // 1er Bac / 1BAC
  [/^(?:1bac+?\s*(?:se|sef|biof)|1[eé]r\s*bac+?\s*(?:se|sef|biof)|(?:1bac+?|1[eé]r\s*bac+?|1[èeé]re?\s*bac+?|1e\s*bac+?|1re\s*bac+?|1[èeé]re?\s*année\s*bac(?:calauréat)?|1ere\s*annee\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:exp\.?|expérimentales?|exp))(?![\p{L}_])/iu, '1er Bac Sciences Expérimentales'],
  [/^(?:1bac+?\s*(?:sm|smf|s\.?m\.?)|1[eé]r\s*bac+?\s*(?:sm|smf|s\.?m\.?)|(?:1bac+?|1[eé]r\s*bac+?|1[èeé]re?\s*bac+?|1e\s*bac+?|1re\s*bac+?|1[èeé]re?\s*année\s*bac(?:calauréat)?|1ere\s*annee\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?|math))(?![\p{L}_])/iu, '1er Bac Sciences Mathématiques'],
  [/^(?:1bac+?\s*(?:lsh|l\.?s\.?h\.?)|1bac+?\s*l|(?:1bac+?|1[eé]r\s*bac+?|1[èeé]re?\s*bac+?|1e\s*bac+?|1re\s*bac+?|1[èeé]re?\s*année\s*bac(?:calauréat)?|1ere\s*annee\s*bac(?:calauréat)?)\s*(?:lettres?(?:\s+et\s+sciences?\s+humaines?)?))(?![\p{L}_])/iu, '1er Bac Lettres et Sciences Humaines'],
  [/^(?:1bac+?\s*(?:eco|seg|seco|s\.?e\.?g\.?)|(?:1bac+?|1[eé]r\s*bac+?|1[èeé]re?\s*bac+?|1e\s*bac+?|1re\s*bac+?|1[èeé]re?\s*année\s*bac(?:calauréat)?|1ere\s*annee\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:éco\.?|eco\.?|économiques?(?:\s+et\s+gestion)?|economiques?(?:\s+et\s+gestion)?))(?![\p{L}_])/iu, '1er Bac Sciences Économiques et Gestion'],

  // 2ème Bac / 2BAC
  [/^(?:2bac+?\s*(?:pc|p\.?c\.?|physique)\s*biof|2bac+?\s*(?:pc|p\.?c\.?)|2[èeé]me\s*bac+?\s*(?:pc|p\.?c\.?)|2e\s*bac+?\s*(?:pc|p\.?c\.?)|2bac+?\s*biof|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?|2de\s*bac+?|2[èeé]me\s*année\s*bac(?:calauréat)?|2eme\s*annee\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:physiques?|phys\.?|pc|p\.?c\.?)|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?|2[èeé]me\s*année\s*bac(?:calauréat)?|2eme\s*annee\s*bac(?:calauréat)?)\s*sciences?\s*physiques?)(?![\p{L}_])/iu, '2ème Bac Sciences Physiques'],
  [/^(?:2bac+?\s*(?:svt|s\.?v\.?t\.?)\s*biof|2bac+?\s*(?:svt|s\.?v\.?t\.?)|2[èeé]me\s*bac+?\s*(?:svt|s\.?v\.?t\.?)|2e\s*bac+?\s*(?:svt|s\.?v\.?t\.?)|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?|2[èeé]me\s*année\s*bac(?:calauréat)?|2eme\s*annee\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:de\s+la\s+vie\s+et\s+de\s+la\s+terre|svt|s\.?v\.?t\.?)|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?)\s*sciences?\s*svt)(?![\p{L}_])/iu, '2ème Bac Sciences de la Vie et de la Terre'],
  [/^(?:2bac+?\s*(?:sm|s\.?m\.?)\s*a|2bac+?\s*sma|2bac+?\s*sc\.?\s*maths?\s*a|2[èeé]me\s*bac+?\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?|math)\s*a|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?|2[èeé]me\s*année\s*bac(?:calauréat)?)\s*sciences?\s*maths?\s*a)(?![\p{L}_])/iu, '2ème Bac Sciences Mathématiques A'],
  [/^(?:2bac+?\s*(?:sm|s\.?m\.?)\s*b|2bac+?\s*smb|2bac+?\s*sc\.?\s*maths?\s*b|2[èeé]me\s*bac+?\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?|math)\s*b|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?|2[èeé]me\s*année\s*bac(?:calauréat)?)\s*sciences?\s*maths?\s*b)(?![\p{L}_])/iu, '2ème Bac Sciences Mathématiques B'],
  [/^(?:2bac+?\s*(?:sm|s\.?m\.?)|2bac+?\s*sc\.?\s*maths?|2[èeé]me\s*bac+?\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?)|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?|2[èeé]me\s*année\s*bac(?:calauréat)?)\s*sciences?\s*maths?)(?![\p{L}_])/iu, '2ème Bac Sciences Mathématiques A'],
  [/^(?:2bac+?\s*(?:se|sef|sexp|sc\.?\s*exp)|2[èeé]me\s*bac+?\s*(?:se|sef|sexp|sc\.?\s*exp)|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?)\s*(?:sc\.?|sciences?)\s*exp(?:érimentales?)?)(?![\p{L}_])/iu, '2ème Bac Sciences Physiques'],
  [/^(?:2bac+?\s*(?:eco|seco)|2bac+?\s*sc\.?\s*éco\.?|2bac+?\s*sc\.?\s*eco\.?|2[èeé]me\s*bac+?\s*(?:sc\.?|sciences?)\s*économiques?|2[èeé]me\s*bac+?\s*(?:sc\.?|sciences?)\s*economiques?|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?)\s*sciences?\s*éco(?:nomiques?)?)(?![\p{L}_])/iu, '2ème Bac Sciences Économiques'],
  [/^(?:2bac+?\s*(?:sgc|s\.?g\.?c\.?)|2bac+?\s*sc\.?\s*gestion\s*comptable|2bac+?\s*sc\.?\s*gestion|2[èeé]me\s*bac+?\s*(?:sc\.?|sciences?)\s*(?:de\s+)?gestion\s*comptable|2[èeé]me\s*bac+?\s*gestion\s*comptable)(?![\p{L}_])/iu, '2ème Bac Sciences de Gestion Comptable'],
  [/^(?:2bac+?\s*l|2bac+?\s*lettres?|2[èeé]me\s*bac+?\s*lettres?|2e\s*bac+?\s*lettres?)(?![\p{L}_])/iu, '2ème Bac Lettres'],
  [/^(?:2bac+?\s*(?:sh|lsh|s\.?h\.?|l\.?s\.?h\.?)|2bac+?\s*sc\.?\s*humaines?|2[èeé]me\s*bac+?\s*(?:sc\.?|sciences?)\s*humaines?|(?:2bac+?|2[èeé]me\s*bac+?|2e\s*bac+?)\s*sciences?\s*humaines?)(?![\p{L}_])/iu, '2ème Bac Sciences Humaines'],

  // CPGE (Classes Préparatoires)
  [/^(?:(?:cpge\s+)?(?:1[reèé]re?\s*année|1ere\s*annee)\s+mpsi|cpge\s+mpsi)(?![\p{L}_])/iu, '1re année MPSI'],
  [/^(?:(?:cpge\s+)?(?:1[reèé]re?\s*année|1ere\s*annee)\s+pcsi|cpge\s+pcsi)(?![\p{L}_])/iu, '1re année PCSI'],
  [/^(?:(?:cpge\s+)?(?:1[reèé]re?\s*année|1ere\s*annee)\s+tsi|cpge\s+tsi)(?![\p{L}_])/iu, '1re année TSI'],
  [/^(?:(?:cpge\s+)?(?:1[reèé]re?\s*année|1ere\s*annee)\s+ecs|cpge\s+ecs)(?![\p{L}_])/iu, '1re année ECS'],
  [/^(?:(?:cpge\s+)?(?:1[reèé]re?\s*année|1ere\s*annee)\s+ect|cpge\s+ect)(?![\p{L}_])/iu, '1re année ECT'],
  [/^(?:(?:cpge\s+)?(?:2[èeé]me?\s*année|2e\s*année|2eme\s*annee)\s+mp|cpge\s+mp)(?!si)(?![\p{L}_])/iu, '2e année MP'],
  [/^(?:(?:cpge\s+)?(?:2[èeé]me?\s*année|2e\s*année|2eme\s*annee)\s+psi|cpge\s+psi)(?![\p{L}_])/iu, '2e année PSI'],
  [/^(?:(?:cpge\s+)?(?:2[èeé]me?\s*année|2e\s*année|2eme\s*annee)\s+tsi)(?![\p{L}_])/iu, '2e année TSI'],
  [/^(?:(?:cpge\s+)?(?:2[èeé]me?\s*année|2e\s*année|2eme\s*annee)\s+ecs)(?![\p{L}_])/iu, '2e année ECS'],
  [/^(?:(?:cpge\s+)?(?:2[èeé]me?\s*année|2e\s*année|2eme\s*annee)\s+ect)(?![\p{L}_])/iu, '2e année ECT'],
];

const ARABIC_INDIC_DIGITS = /[\u0660-\u0669]/g;
const EXTENDED_ARABIC_INDIC_DIGITS = /[\u06F0-\u06F9]/g;

export const normalizeArabicDigits = (value: string): string =>
  value
    .replace(ARABIC_INDIC_DIGITS, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(EXTENDED_ARABIC_INDIC_DIGITS, digit => String(digit.charCodeAt(0) - 0x06F0));

export const ARABIC_DISPLAY_LEVEL_ENTRIES: ReadonlyArray<readonly [string, string]> = Object.entries(CLASS_LEVEL_DISPLAY_NAMES_AR)
  .sort(([leftKey, leftLabel], [rightKey, rightLabel]) => {
    if (rightLabel.length !== leftLabel.length) return rightLabel.length - leftLabel.length;
    const leftCanonical = leftKey in CLASS_LEVEL_DISPLAY_NAMES && CLASS_LEVEL_DISPLAY_NAMES[leftKey] === leftKey ? 1 : 0;
    const rightCanonical = rightKey in CLASS_LEVEL_DISPLAY_NAMES && CLASS_LEVEL_DISPLAY_NAMES[rightKey] === rightKey ? 1 : 0;
    return rightCanonical - leftCanonical;
  });

export const CLASS_LEVEL_IDENTITY: Readonly<Record<string, ClassLevelIdentity>> = {
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
export const LEVEL_IDENTITY_KEYS = Object.keys(CLASS_LEVEL_IDENTITY)
  .sort((left, right) => right.length - left.length);
