import type { AppLocale } from '@/types';

const formatters = new Map<AppLocale, Intl.DateTimeFormat>();
export function latestClassOpening(...values: (string | undefined)[]): string | undefined {
  const timestamps = values.filter(value => typeof value === 'string' && value.length <= 40).map(value => Date.parse(value!)).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined;
}
export function classOpeningLabel(
  value: string | undefined,
  locale: AppLocale,
): string {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime()))
    return locale === 'ar'
      ? 'جاهز لأول حصة'
      : locale === 'en'
        ? 'Ready for your first lesson'
        : 'Prêt pour votre première séance';
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
