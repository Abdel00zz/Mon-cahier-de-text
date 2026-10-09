import type { AppLocale, LessonsData, TimetableClockPolicy, TimetableEntry } from '@/types';
import { classSessionsDuring, notebookSessionDates } from './absenceInjection';

/**
 * Calcule l'intersection d'une plage de dates [startDate, endDate] avec les séances
 * associées à cette classe (emploi du temps officiel et séances déjà consignées).
 *
 * Règle pédagogique :
 * 1. On cherche les jours de créneau prévus dans l'emploi du temps pour cette classe.
 * 2. On cherche les jours déjà consignés dans le cahier pour cette classe.
 * 3. L'union chronologique forme les vraies dates de séance de la classe dans cet intervalle.
 * 4. Si aucune séance n'est trouvée (ex: grille non encore renseignée), on retient les bornes [startDate, endDate].
 */
export function resolveClassSessionDatesInRange(
  startDate: string | undefined,
  endDate: string | undefined,
  classId: string | undefined,
  timetable: TimetableEntry[] | undefined,
  timetableClock?: TimetableClockPolicy,
  lessonsData?: LessonsData | unknown,
): string[] {
  if (!startDate) return [];
  const start = startDate.trim();
  const end = (endDate ?? '').trim();

  if (!end || end === start) {
    return [start];
  }

  const debut = start <= end ? start : end;
  const fin = start <= end ? end : start;

  // 1. Emploi du temps de la classe
  if (classId && Array.isArray(timetable) && timetable.length > 0) {
    const scheduled = classSessionsDuring(timetable, timetableClock, { debut, fin }, [classId]);
    const classDates = scheduled.find(item => item.classId === classId)?.dates ?? [];
    const inRange = classDates.filter(d => d >= debut && d <= fin);
    if (inRange.length > 0) {
      return inRange.sort();
    }
  }

  // 2. Si d'autres séances distinctes sont déjà consignées dans le cahier
  if (lessonsData) {
    const recorded = notebookSessionDates(lessonsData).filter(d => d > debut && d <= fin);
    if (recorded.length > 0) {
      return Array.from(new Set([debut, ...recorded])).sort();
    }
  }

  // 3. Fallback : les deux bornes [debut, fin]
  return [debut, fin];
}

/**
 * Formate les dates de séance résolues pour l'affichage pédagogique.
 * Ne produit JAMAIS de texte brut « Du XX au YY » ou « من XX إلى YY ».
 */
export function formatSessionDatesDisplay(
  dates: readonly string[],
  locale: AppLocale = 'fr',
): string {
  if (dates.length === 0) return '';
  if (dates.length === 1) return dates[0];

  const conjunction = locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';

  if (dates.length === 2) {
    return `${dates[0]} ${conjunction} ${dates[1]}`;
  }

  // 3+ dates
  if (locale === 'ar') {
    return dates.join(' و ');
  }
  return `${dates.slice(0, -1).join(', ')} ${conjunction} ${dates[dates.length - 1]}`;
}

/**
 * Normalise une chaîne de date pour la clé de fusion de séance.
 * Permet aux formes « Du X au Y », « X et Y », « X و Y » portant les mêmes dates de fusionner.
 */
export const normalizeDateForMerge = (dateStr: string | null | undefined): string | null => {
  if (!dateStr || !dateStr.trim()) return null;
  const trimmed = dateStr.trim();

  // Plage "Du ... au ..." / "من ... إلى ..." / "From ... to ..."
  const rangeMatch = trimmed.match(
    /(?:Du|du|De|de|From|from|من)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:au|à|a|to|إلى)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)/i,
  );
  if (rangeMatch) {
    return `${rangeMatch[1]} et ${rangeMatch[2]}`;
  }

  // Deux jours avec 'et' / 'and' / 'و'
  const pairMatch = trimmed.match(
    /(?:^|\s)(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:et|and|و)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)(?:\s|$)/i,
  );
  if (pairMatch) {
    return `${pairMatch[1]} et ${pairMatch[2]}`;
  }

  return trimmed;
};
