import { SUBJECTS } from '@/constants/subjects';
import type { AppLocale } from '@/types';

/**
 * Normalise une chaîne pour comparaison insensible à la casse, aux accents et aux espaces,
 * ainsi qu'aux variantes de graphie arabes (hamzas, taa marbuta, tachkeel).
 */
export const normalizeSubjectKey = (input: string): string =>
  input
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ');

interface StreamMistakeInfo {
  streamCode: string;
  labels: Record<AppLocale, string>;
  inferredSubject: string | null;
}

/**
 * Filières et branches souvent confondues avec des matières.
 */
const RAW_STREAM_MISTAKES: Readonly<Record<string, StreamMistakeInfo>> = {
  // Lettres et Sciences Humaines
  'lettres et sciences humaines': {
    streamCode: 'LSH',
    labels: {
      fr: 'Lettres et Sciences Humaines',
      ar: 'الآداب والعلوم الإنسانية',
      en: 'Literature and Humanities',
    },
    inferredSubject: null,
  },
  'lsh': {
    streamCode: 'LSH',
    labels: {
      fr: 'Lettres et Sciences Humaines',
      ar: 'الآداب والعلوم الإنسانية',
      en: 'Literature and Humanities',
    },
    inferredSubject: null,
  },
  'tc-l': {
    streamCode: 'TC-L',
    labels: {
      fr: 'Tronc Commun Lettres et Sciences Humaines',
      ar: 'الجذع المشترك الآداب والعلوم الإنسانية',
      en: 'Literature and Humanities Common Core',
    },
    inferredSubject: null,
  },
  'tcl': {
    streamCode: 'TC-L',
    labels: {
      fr: 'Tronc Commun Lettres et Sciences Humaines',
      ar: 'الجذع المشترك الآداب والعلوم الإنسانية',
      en: 'Literature and Humanities Common Core',
    },
    inferredSubject: null,
  },
  'sciences humaines': {
    streamCode: 'SH',
    labels: {
      fr: 'Sciences Humaines',
      ar: 'العلوم الإنسانية',
      en: 'Humanities',
    },
    inferredSubject: null,
  },
  'sh': {
    streamCode: 'SH',
    labels: {
      fr: 'Sciences Humaines',
      ar: 'العلوم الإنسانية',
      en: 'Humanities',
    },
    inferredSubject: null,
  },
  'lettres': {
    streamCode: 'L',
    labels: {
      fr: 'Lettres',
      ar: 'الآداب',
      en: 'Literature',
    },
    inferredSubject: null,
  },
  'الاداب والعلوم الانسانية': {
    streamCode: 'LSH',
    labels: {
      fr: 'Lettres et Sciences Humaines',
      ar: 'الآداب والعلوم الإنسانية',
      en: 'Literature and Humanities',
    },
    inferredSubject: null,
  },
  'اداب وعلوم انسانية': {
    streamCode: 'LSH',
    labels: {
      fr: 'Lettres et Sciences Humaines',
      ar: 'الآداب والعلوم الإنسانية',
      en: 'Literature and Humanities',
    },
    inferredSubject: null,
  },
  'الاداب': {
    streamCode: 'L',
    labels: {
      fr: 'Lettres',
      ar: 'الآداب',
      en: 'Literature',
    },
    inferredSubject: null,
  },
  'اداب': {
    streamCode: 'L',
    labels: {
      fr: 'Lettres',
      ar: 'الآداب',
      en: 'Literature',
    },
    inferredSubject: null,
  },
  'العلوم الانسانية': {
    streamCode: 'SH',
    labels: {
      fr: 'Sciences Humaines',
      ar: 'العلوم الإنسانية',
      en: 'Humanities',
    },
    inferredSubject: null,
  },
  'علوم انسانية': {
    streamCode: 'SH',
    labels: {
      fr: 'Sciences Humaines',
      ar: 'العلوم الإنسانية',
      en: 'Humanities',
    },
    inferredSubject: null,
  },

  // Sciences et Technologies Électriques & Mécaniques (filières -> matière : Sciences de l'Ingénieur)
  'sciences et technologies electriques': {
    streamCode: 'STE',
    labels: {
      fr: 'Sciences et Technologies Électriques',
      ar: 'العلوم والتكنولوجيات الكهربائية',
      en: 'Electrical Engineering & Tech',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'ste': {
    streamCode: 'STE',
    labels: {
      fr: 'Sciences et Technologies Électriques',
      ar: 'العلوم والتكنولوجيات الكهربائية',
      en: 'Electrical Engineering & Tech',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'العلوم والتكنولوجيات الكهربائية': {
    streamCode: 'STE',
    labels: {
      fr: 'Sciences et Technologies Électriques',
      ar: 'العلوم والتكنولوجيات الكهربائية',
      en: 'Electrical Engineering & Tech',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'sciences et technologies mecaniques': {
    streamCode: 'STM',
    labels: {
      fr: 'Sciences et Technologies Mécaniques',
      ar: 'العلوم والتكنولوجيات الميكانيكية',
      en: 'Mechanical Engineering & Tech',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'stm': {
    streamCode: 'STM',
    labels: {
      fr: 'Sciences et Technologies Mécaniques',
      ar: 'العلوم والتكنولوجيات الميكانيكية',
      en: 'Mechanical Engineering & Tech',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'العلوم والتكنولوجيات الميكانيكية': {
    streamCode: 'STM',
    labels: {
      fr: 'Sciences et Technologies Mécaniques',
      ar: 'العلوم والتكنولوجيات الميكانيكية',
      en: 'Mechanical Engineering & Tech',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'sciences et technologies': {
    streamCode: 'TC-T',
    labels: {
      fr: 'Sciences et Technologies',
      ar: 'العلوم والتكنولوجيات',
      en: 'Sciences & Technologies',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'tc-t': {
    streamCode: 'TC-T',
    labels: {
      fr: 'Tronc Commun Technologique',
      ar: 'الجذع المشترك التكنولوجي',
      en: 'Technology Common Core',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'tct': {
    streamCode: 'TC-T',
    labels: {
      fr: 'Tronc Commun Technologique',
      ar: 'الجذع المشترك التكنولوجي',
      en: 'Technology Common Core',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },
  'technologique': {
    streamCode: 'TC-T',
    labels: {
      fr: 'Technologique',
      ar: 'التكنولوجي',
      en: 'Technological',
    },
    inferredSubject: 'Sciences de l’Ingénieur',
  },

  // Autres filières courantes
  'sciences experimentales': {
    streamCode: 'SEXP',
    labels: {
      fr: 'Sciences Expérimentales',
      ar: 'العلوم التجريبية',
      en: 'Experimental Sciences',
    },
    inferredSubject: null,
  },
  'sciences mathematiques': {
    streamCode: 'SM',
    labels: {
      fr: 'Sciences Mathématiques',
      ar: 'العلوم الرياضية',
      en: 'Mathematical Sciences',
    },
    inferredSubject: 'Mathématiques',
  },
  'sciences mathematiques a': {
    streamCode: 'SM-A',
    labels: {
      fr: 'Sciences Mathématiques A',
      ar: 'العلوم الرياضية أ',
      en: 'Mathematical Sciences A',
    },
    inferredSubject: 'Mathématiques',
  },
  'sciences mathematiques b': {
    streamCode: 'SM-B',
    labels: {
      fr: 'Sciences Mathématiques B',
      ar: 'العلوم الرياضية ب',
      en: 'Mathematical Sciences B',
    },
    inferredSubject: 'Mathématiques',
  },
  'sciences physiques': {
    streamCode: 'PC',
    labels: {
      fr: 'Sciences Physiques',
      ar: 'العلوم الفيزيائية',
      en: 'Physics and Chemistry',
    },
    inferredSubject: 'Physique-Chimie',
  },
  'sciences de gestion comptable': {
    streamCode: 'SGC',
    labels: {
      fr: 'Sciences de Gestion Comptable',
      ar: 'علوم التدبير المحاسباتي',
      en: 'Accounting Management',
    },
    inferredSubject: 'Comptabilité et Mathématiques Financières',
  },
};

const STREAM_MISTAKE_MAP = new Map<string, StreamMistakeInfo>();
for (const [key, value] of Object.entries(RAW_STREAM_MISTAKES)) {
  STREAM_MISTAKE_MAP.set(normalizeSubjectKey(key), value);
}

const findStreamMistake = (value: string | undefined | null): StreamMistakeInfo | null => {
  if (!value || typeof value !== 'string') return null;
  const norm = normalizeSubjectKey(value);
  return STREAM_MISTAKE_MAP.get(norm) ?? null;
};

const LEGACY_SUBJECT_ALIASES: Readonly<Record<string, string>> = {
  'sciences economiques': 'Sciences Économiques et Gestion',
  'eps': 'Éducation Physique et Sportive',
};

const LEGACY_ALIASES_MAP = new Map<string, string>();
for (const [key, value] of Object.entries(LEGACY_SUBJECT_ALIASES)) {
  LEGACY_ALIASES_MAP.set(normalizeSubjectKey(key), value);
}

/**
 * Vérifie si une valeur correspond à une matière d'enseignement valide
 * et non à une filière / branche d'études.
 */
export const isTeachingSubject = (value: string | undefined | null): boolean => {
  if (!value || typeof value !== 'string') return false;
  const raw = value.trim();
  if (!raw) return false;
  const norm = normalizeSubjectKey(raw);

  // Une filière n'est jamais une matière
  if (STREAM_MISTAKE_MAP.has(norm)) {
    return false;
  }

  for (const subject of SUBJECTS) {
    if (normalizeSubjectKey(subject) === norm) return true;
  }

  if (LEGACY_ALIASES_MAP.has(norm)) {
    return true;
  }

  return false;
};

/**
 * Détecte si une valeur saisie ou enregistrée comme matière est en fait une filière.
 */
export const isClassStream = (value: string | undefined | null): boolean => {
  return Boolean(findStreamMistake(value));
};

/**
 * Tente de déduire la matière d'enseignement à partir d'une filière enregistrée par erreur.
 * Renvoie `null` si plusieurs matières sont possibles (ex: Lettres et Sciences Humaines).
 */
export const subjectFromStreamMistake = (value: string | undefined | null): string | null => {
  return findStreamMistake(value)?.inferredSubject ?? null;
};

/**
 * Renvoie le libellé localisé de la filière pour le message d'aide.
 */
export const streamLabelForMistake = (value: string | undefined | null, locale: AppLocale): string => {
  if (!value) return '';
  const info = findStreamMistake(value);
  if (info) return info.labels[locale] || info.labels.fr;
  return value.trim();
};
