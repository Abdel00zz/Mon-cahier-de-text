import type { AppLocale } from '@/types';

const numberLocale = (locale: AppLocale): string => {
  if (locale === 'ar') return 'ar-MA-u-nu-arab';
  if (locale === 'en') return 'en-GB';
  return 'fr-MA';
};

const defaultFormatters: Record<AppLocale, Intl.NumberFormat> = {
  fr: new Intl.NumberFormat(numberLocale('fr')),
  en: new Intl.NumberFormat(numberLocale('en')),
  ar: new Intl.NumberFormat(numberLocale('ar')),
};

/** Formateur partagé qui impose les chiffres ٠١٢٣ en interface arabe. */
export const createLocalizedNumberFormatter = (
  locale: AppLocale,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat => new Intl.NumberFormat(numberLocale(locale), options);

/** Formate une valeur numérique destinée à être affichée. */
export const formatLocalizedNumber = (value: number, locale: AppLocale): string =>
  defaultFormatters[locale].format(value);

/** Localise les chiffres d'une chaîne sans modifier sa valeur métier. */
export const localizeDigits = (value: string, locale: AppLocale): string => {
  if (locale !== 'ar') return value;
  return value.replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
};
