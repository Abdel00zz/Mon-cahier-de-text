import type { AppLocale } from '../../types';
import { formatLocalizedClassDisplayName } from '../../constants/class-levels';

// Match a standalone prefix, including vocalized Arabic and repeated legacy prefixes.
const ARABIC_CLASS_PREFIX = /^(?:ق[\u064b-\u065f]*س[\u064b-\u065f]*م[\u064b-\u065f]*\s+)+(?=\S)/u;

/** Messages supply their own grammatical prefix (قسم / لقسم); stored names stay untouched. */
export function companionClassName(name: string, locale: AppLocale): string {
  const clean = name.replace(/[\r\n\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
  const label = locale === 'ar' ? clean.replace(ARABIC_CLASS_PREFIX, '') : clean;
  return formatLocalizedClassDisplayName(label, locale, { includeClassPrefix: false });
}
