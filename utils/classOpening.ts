import type { AppLocale } from '@/types';

const formatters = new Map<AppLocale, Intl.DateTimeFormat>();
const compactFormatters = new Map<AppLocale, Intl.DateTimeFormat>();

export function latestClassOpening(...values: (string | undefined)[]): string | undefined {
  const timestamps = values.filter(value => typeof value === 'string' && value.length <= 40).map(value => Date.parse(value!)).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined;
}

export function classOpeningLabel(
  value: string | undefined,
  locale: AppLocale,
  options?: { compact?: boolean },
): string {
  const date = value ? new Date(value) : null;
  const isCompact = options?.compact;

  if (!date || Number.isNaN(date.getTime())) {
    if (isCompact) {
      return locale === 'ar' ? 'جاهز' : locale === 'en' ? 'Ready' : 'Prêt';
    }
    return locale === 'ar'
      ? 'جاهز لأول حصة'
      : locale === 'en'
        ? 'Ready for your first lesson'
        : 'Prêt pour votre première séance';
  }

  if (isCompact) {
    let compactFormatter = compactFormatters.get(locale);
    if (!compactFormatter) {
      compactFormatter = new Intl.DateTimeFormat(
        locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-MA' : 'en-GB',
        {
          day: 'numeric',
          month: 'short',
          timeZone: 'Africa/Casablanca',
        },
      );
      compactFormatters.set(locale, compactFormatter);
    }
    return compactFormatter.format(date);
  }

  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(
      locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-MA' : 'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Casablanca',
      },
    );
    formatters.set(locale, formatter);
  }
  return (
    (locale === 'ar'
      ? 'آخر فتح · '
      : locale === 'en'
        ? 'Last opened · '
        : 'Dernière ouverture · ') + formatter.format(date)
  );
}
