/* ── Niveaux de classes (système marocain) ────────────────────────────────── */

import type { Cycle, AppLocale } from '../types';

export const CLASS_LEVELS_BY_CYCLE: Record<Cycle, string[]> = {
  college: ['1AC', '2AC', '3AC'],
  lycee: [
    'Tronc commun scientifique',
    'Tronc commun lettres',
    'Tronc commun technologique',
    '1BAC Sc. Expérimentales',
    '1BAC Sc. Mathématiques',
    '1BAC Lettres',
    '1BAC Sc. Économiques',
    '2BAC PC',
    '2BAC SVT',
    '2BAC Sc. Maths A',
    '2BAC Sc. Maths B',
    '2BAC Sc. Économiques',
    '2BAC Sc. Gestion Comptable',
    '2BAC Lettres',
    '2BAC Sc. Humaines',
  ],
  prepa: ['MPSI', 'PCSI', 'MP', 'PSI', 'TSI', 'ECS', 'ECT'],
};

const CLASS_LEVEL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  '1AC': '1re année collégiale',
  '2AC': '2e année collégiale',
  '3AC': '3e année collégiale',
  'Tronc commun scientifique': 'Tronc commun scientifique',
  'Tronc commun lettres': 'Tronc commun littéraire',
  'Tronc commun technologique': 'Tronc commun technologique',
  '1BAC Sc. Expérimentales': '1re Bac · Sciences expérimentales',
  '1BAC Sc. Mathématiques': '1re Bac · Sciences mathématiques',
  '1BAC Lettres': '1re Bac · Lettres',
  '1BAC Sc. Économiques': '1re Bac · Sciences économiques et gestion',
  '2BAC PC': '2e Bac · Sciences physiques',
  '2BAC SVT': '2e Bac · Sciences de la vie et de la Terre',
  '2BAC Sc. Maths A': '2e Bac · Sciences mathématiques A',
  '2BAC Sc. Maths B': '2e Bac · Sciences mathématiques B',
  '2BAC Sc. Économiques': '2e Bac · Sciences économiques',
  '2BAC Sc. Gestion Comptable': '2e Bac · Sciences de gestion comptable',
  '2BAC Lettres': '2e Bac · Lettres',
  '2BAC Sc. Humaines': '2e Bac · Sciences humaines',
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
  'Tronc commun scientifique': 'الجذع المشترك العلمي',
  'Tronc commun lettres': 'الجذع المشترك الآداب',
  'Tronc commun technologique': 'الجذع المشترك التكنولوجي',
  '1BAC Sc. Expérimentales': 'الأولى باك · علوم تجريبية',
  '1BAC Sc. Mathématiques': 'الأولى باك · علوم رياضية',
  '1BAC Lettres': 'الأولى باك · آداب',
  '1BAC Sc. Économiques': 'الأولى باك · علوم اقتصادية وتدبير',
  '2BAC PC': 'الثانية باك · علوم فيزيائية',
  '2BAC SVT': 'الثانية باك · علوم الحياة والأرض',
  '2BAC Sc. Maths A': 'الثانية باك · علوم رياضية أ',
  '2BAC Sc. Maths B': 'الثانية باك · علوم رياضية ب',
  '2BAC Sc. Économiques': 'الثانية باك · علوم اقتصادية',
  '2BAC Sc. Gestion Comptable': 'الثانية باك · علوم التدبير المحاسباتي',
  '2BAC Lettres': 'الثانية باك · آداب',
  '2BAC Sc. Humaines': 'الثانية باك · علوم إنسانية',
  'MPSI': 'رياضيات وفيزياء وعلوم المهندس',
  'PCSI': 'فيزياء وكيمياء وعلوم المهندس',
  'MP': 'رياضيات وفيزياء',
  'PSI': 'فيزياء وعلوم المهندس',
  'TSI': 'تكنولوجيا وعلوم صناعية',
  'ECS': 'اقتصاد وتجارة · خيار علمي',
  'ECT': 'اقتصاد وتجارة · خيار تكنولوجي',
};

const DISPLAY_LEVEL_KEYS = Object.keys(CLASS_LEVEL_DISPLAY_NAMES)
  .sort((left, right) => right.length - left.length);

export const formatClassDisplayName = (name: string): string => {
  const normalized = (name || '').trim().replace(/\s+/g, ' ');
  const level = DISPLAY_LEVEL_KEYS.find(key =>
    normalized === key || normalized.startsWith(`${key} `)
  );
  if (!level) return normalized;

  const suffix = normalized.slice(level.length).trim();
  const label = CLASS_LEVEL_DISPLAY_NAMES[level];
  return suffix ? `${label} · Gr. ${suffix}` : label;
};

export const formatLocalizedClassDisplayName = (name: string, locale: AppLocale): string => {
  if (locale !== 'ar') return formatClassDisplayName(name);

  const normalized = (name || '').trim().replace(/\s+/g, ' ');
  const level = DISPLAY_LEVEL_KEYS.find(key => normalized === key || normalized.startsWith(`${key} `));
  if (!level) return normalized;

  const suffix = normalized.slice(level.length).trim();
  const label = CLASS_LEVEL_DISPLAY_NAMES_AR[level] ?? CLASS_LEVEL_DISPLAY_NAMES[level];
  return suffix ? `${label} · المجموعة ${suffix}` : label;
};

const CLASS_LEVEL_RENAMES: Array<[RegExp, string]> = [
  [/^(?:trc|tc\s*sciences?|tc\s*scientifique|tronc\s+commun\s+sciences?|tronc\s+commun\s+scientifique)\b/i, 'Tronc commun scientifique'],
  [/^(?:tc\s*lettres?|tronc\s+commun\s+lettres?)\b/i, 'Tronc commun lettres'],
  [/^(?:tc\s*technologique|tronc\s+commun\s+technologique)\b/i, 'Tronc commun technologique'],
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
