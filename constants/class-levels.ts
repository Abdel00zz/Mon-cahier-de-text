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
  prepa: ['MPSI', 'PCSI', 'MP', 'PSI', 'TSI', 'ECS', 'ECT'],
};

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
  [/^(?:trc|tc\s*sciences?|tc\s*scientifique|tronc\s+commun\s+sciences?|tronc\s+commun\s+scientifique)\b/i, 'Tronc Commun Scientifique'],
  [/^(?:tc\s*lettres?|tronc\s+commun\s+lettres?(?:\s+et\s+sciences?\s+humaines?)?)\b/i, 'Tronc Commun Lettres et Sciences Humaines'],
  [/^(?:tc\s*technologique|tronc\s+commun\s+technologique)\b/i, 'Tronc Commun Technologique'],

  // 1er Bac / 1BAC
  [/^(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:exp\.?|expérimentales?)\b/i, '1er Bac Sciences Expérimentales'],
  [/^(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?)\b/i, '1er Bac Sciences Mathématiques'],
  [/^(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:lettres?(?:\s+et\s+sciences?\s+humaines?)?)\b/i, '1er Bac Lettres et Sciences Humaines'],
  [/^(?:1bac|1er\s*bac|1ère\s*bac|1re\s*bac|1e\s*bac|1ère\s*année\s*bac(?:calauréat)?)\s*(?:sc\.?|sciences?)\s*(?:éco\.?|économiques?(?:\s+et\s+gestion)?)\b/i, '1er Bac Sciences Économiques et Gestion'],

  // 2ème Bac / 2BAC
  [/^(?:2bac\s*pc|2ème\s*bac\s*pc|2e\s*bac\s*pc|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:physiques?|pc))\b/i, '2ème Bac Sciences Physiques'],
  [/^(?:2bac\s*svt|2ème\s*bac\s*svt|2e\s*bac\s*svt|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:de\s+la\s+vie\s+et\s+de\s+la\s+terre|svt))\b/i, '2ème Bac Sciences de la Vie et de la Terre'],
  [/^(?:2bac\s*sc\.?\s*maths?\s*a|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?)\s*a)\b/i, '2ème Bac Sciences Mathématiques A'],
  [/^(?:2bac\s*sc\.?\s*maths?\s*b|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?)\s*b)\b/i, '2ème Bac Sciences Mathématiques B'],
  [/^(?:2bac\s*sc\.?\s*maths?|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:maths?|mathématiques?))\b/i, '2ème Bac Sciences Mathématiques A'],
  [/^(?:2bac\s*sc\.?\s*éco\.?|2ème\s*bac\s*(?:sc\.?|sciences?)\s*économiques?)\b/i, '2ème Bac Sciences Économiques'],
  [/^(?:2bac\s*sc\.?\s*gestion\s*comptable|2ème\s*bac\s*(?:sc\.?|sciences?)\s*(?:de\s+)?gestion\s+comptable)\b/i, '2ème Bac Sciences de Gestion Comptable'],
  [/^(?:2bac\s*lettres?|2ème\s*bac\s*lettres?)\b/i, '2ème Bac Lettres'],
  [/^(?:2bac\s*sc\.?\s*humaines?|2ème\s*bac\s*(?:sc\.?|sciences?)\s*humaines?)\b/i, '2ème Bac Sciences Humaines'],
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
