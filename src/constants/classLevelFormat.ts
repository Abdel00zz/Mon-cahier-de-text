import type { AppLocale, Cycle } from '../types';
import { toDisplayText } from '../lib/text/textValue.js';
import type { ClassLevelGroup, ClassLevelGroupKey, ClassLevelIdentity, ClassTierKey } from './classLevelTypes';
import {
  ARABIC_DISPLAY_LEVEL_ENTRIES,
  CLASS_LEVELS_BY_CYCLE,
  CLASS_LEVEL_DISPLAY_NAMES,
  CLASS_LEVEL_DISPLAY_NAMES_AR,
  CLASS_LEVEL_GROUP_LABELS,
  CLASS_LEVEL_IDENTITY,
  CLASS_LEVEL_RENAMES,
  DISPLAY_LEVEL_KEYS,
  LEVEL_IDENTITY_KEYS,
  normalizeArabicDigits,
} from './classLevelCatalog';
import {
  CLASS_STREAM_FULL_NAMES,
  CLASS_STREAM_LABELS,
  CLASS_TIER_LABELS,
  COMPACT_TIER_LABELS_AR,
  PREPA_LEVEL_CODES,
} from './classLevelLabels';

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

export const formatClassLevelGroupLabel = (key: ClassLevelGroupKey, locale: AppLocale): string =>
  CLASS_LEVEL_GROUP_LABELS[locale][key];

const formatClassDisplayName = (name: string): string => {
  const normalized = normalizeOfficialClassName(toDisplayText(name)).trim().replace(/\s+/g, ' ');
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

  const normalized = normalizeOfficialClassName(toDisplayText(name)).trim().replace(/\s+/g, ' ');
  const level = DISPLAY_LEVEL_KEYS.find(key => normalized === key || normalized.startsWith(`${key} `));
  if (!level) return normalized;

  const suffix = normalized.slice(level.length).trim();
  const label = CLASS_LEVEL_DISPLAY_NAMES_AR[level] ?? CLASS_LEVEL_DISPLAY_NAMES[level];
  const classLabel = suffix ? `${label} ${suffix}` : label;
  return includeClassPrefix ? `قسم ${classLabel}` : classLabel;
};

export const normalizeOfficialClassName = (name: string): string => {
  const trimmed = toDisplayText(name).trim().replace(/\s+/g, ' ');
  for (const [pattern, replacement] of CLASS_LEVEL_RENAMES) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const suffix = trimmed.slice(match[0].length).trim();
    return suffix ? `${replacement} ${suffix}` : replacement;
  }
  const withoutArabicClassPrefix = trimmed.replace(/^(?:ال)?قسم\s+/u, '').trim();
  for (const [canonicalKey, arabicLabel] of ARABIC_DISPLAY_LEVEL_ENTRIES) {
    if (withoutArabicClassPrefix === arabicLabel || withoutArabicClassPrefix.startsWith(`${arabicLabel} `)) {
      const suffix = normalizeArabicDigits(withoutArabicClassPrefix.slice(arabicLabel.length).trim());
      return suffix ? `${canonicalKey} ${suffix}` : canonicalKey;
    }
  }
  return trimmed;
};

export const formatClassTierLabel = (key: ClassTierKey, locale: AppLocale): string =>
  CLASS_TIER_LABELS[locale][key];

export const formatCompactTierLabel = (key: ClassTierKey, locale: AppLocale): string =>
  locale === 'ar' ? COMPACT_TIER_LABELS_AR[key] : CLASS_TIER_LABELS[locale][key];

export const formatStreamSigla = (code: string, locale: AppLocale): string => {
  const canonical = normalizeStreamCode(code);
  if (locale !== 'ar') return canonical;
  const label = CLASS_STREAM_LABELS.ar[canonical] ?? canonical;
  if (!/[\u0600-\u06FF]/.test(label)) return label;
  const letters = label
    .split(/\s+/)
    .map(word => word.replace(/^(?:ال|و)/, ''))
    .filter(Boolean)
    .map(word => word[0]);
  return letters.length > 1 ? letters.join('.') : label.replace(/^(?:ال|و)/, '');
};

const normalizeStreamCode = (code: string): string => code.replace(/[·\s_]/g, '-').toUpperCase();

export const formatClassStreamLabel = (code: string, locale: AppLocale): string | null => {
  if (!code) return null;
  return CLASS_STREAM_LABELS[locale][normalizeStreamCode(code)] ?? null;
};

export const formatClassStreamFullName = (code: string, locale: AppLocale): string | null => {
  if (!code) return null;
  return CLASS_STREAM_FULL_NAMES[locale][normalizeStreamCode(code)] ?? null;
};

/**
 * Nom officiel de la filière / branche seule (sans le préfixe de palier/niveau).
 * Exemples :
 * - 'Tronc Commun Lettres et Sciences Humaines' → 'الآداب والعلوم الإنسانية' (ar) / 'Lettres et Sciences Humaines' (fr)
 * - 'Tronc Commun Scientifique' → 'العلمي' (ar) / 'Scientifique' (fr)
 * - '1er Bac Sciences Mathématiques' → 'العلوم الرياضية' (ar) / 'Sciences Mathématiques' (fr)
 * - '2ème Bac Sciences Physiques' → 'العلوم الفيزيائية' (ar) / 'Sciences Physiques' (fr)
 */
export const formatLocalizedBranchForLevel = (level: string, locale: AppLocale): string => {
  const identityResult = lookupClassLevelIdentity(level);
  if (identityResult?.identity.stream) {
    const stream = identityResult.identity.stream;
    if (PREPA_LEVEL_CODES.has(stream)) {
      const full = formatClassStreamFullName(stream, locale);
      return full && full !== stream ? `${stream} · ${full}` : stream;
    }
    const label = formatClassStreamFullName(stream, locale) ?? formatClassStreamLabel(stream, locale);
    if (label) return label;
  }
  return formatLocalizedClassDisplayName(level, locale, { includeClassPrefix: false });
};

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
  const normalized = normalizeOfficialClassName(toDisplayText(name)).trim().replace(/\s+/g, ' ');
  const key = LEVEL_IDENTITY_KEYS.find(candidate =>
    normalized === candidate || normalized.startsWith(`${candidate} `)
  );
  if (!key) return null;
  return { identity: CLASS_LEVEL_IDENTITY[key], suffix: normalized.slice(key.length).trim() };
};

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
