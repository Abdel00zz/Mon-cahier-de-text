import type { AppLocale } from '../../types';
import type { CompanionCalendarNotice } from '../../domain/assistant/companionCalendar';
import { localizeCalendarName } from '../../domain/calendar/calendar';
import type { CompanionMessage } from './companionCopy';
import { companionClassName } from './companionClassName';

/** Calendar-only message: no content offer, notebook finding or teaching tip is appended. */
export function companionCalendarMessage(notice: CompanionCalendarNotice, locale: AppLocale, targetName?: string): CompanionMessage {
  const format = (date: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  const date = format(notice.kind === 'upcoming' ? notice.start : notice.end);
  const resume = notice.resumeDate && format(notice.resumeDate);
  const className = targetName && companionClassName(targetName, locale);
  const name = notice.name ? localizeCalendarName(notice.name, locale)
    : locale === 'ar' ? 'العطلة المدرسية' : locale === 'en' ? 'School break' : 'Vacances scolaires';
  let text: string;
  if (locale === 'ar') {
    text = notice.kind === 'return' ? className ? `تُستأنف حصص قسم ${className} اليوم حسب استعمال الزمن.` : 'استئناف حصص هذا القسم اليوم حسب استعمال الزمن.'
      : notice.kind === 'upcoming' ? `في ${date}: ${name}.`
        : notice.kind === 'holiday' ? `اليوم ${name}.` : `تستمر فترة العطلة حتى ${date} (${name}).`;
    if (resume && notice.kind !== 'return') text += className
      ? ` الحصة المقبلة مع قسم ${className} يوم ${resume}.` : ` الحصة المبرمجة التالية في ${resume}.`;
    if (notice.approximate) text += ' التاريخ تقديري، رهن التأكيد الرسمي.';
  } else if (locale === 'en') {
    text = notice.kind === 'return' ? className ? `Lessons with ${className} resume today according to its timetable.` : 'This class resumes today according to its timetable.'
      : notice.kind === 'upcoming' ? `${name} starts on ${date}.`
        : notice.kind === 'holiday' ? `Today: ${name}.` : `${name} continues through ${date}.`;
    if (resume && notice.kind !== 'return') text += className
      ? ` Next scheduled lesson with ${className}: ${resume}.` : ` Next scheduled lesson: ${resume}.`;
    if (notice.approximate) text += ' Indicative date, subject to official confirmation.';
  } else {
    text = notice.kind === 'return' ? className ? `Reprise des cours avec ${className} aujourd’hui selon son emploi du temps.` : 'Reprise des cours de cette classe aujourd’hui selon son emploi du temps.'
      : notice.kind === 'upcoming' ? `À partir du ${date} : ${name}.`
        : notice.kind === 'holiday' ? `Aujourd’hui : ${name}.` : `Les vacances se poursuivent jusqu’au ${date} inclus (${name}).`;
    if (resume && notice.kind !== 'return') text += className
      ? ` Prochain cours avec ${className} : ${resume}.` : ` Prochain cours prévu : ${resume}.`;
    if (notice.approximate) text += ' Date indicative, sous réserve de confirmation officielle.';
  }
  const title = locale === 'ar' ? 'التقويم المدرسي' : locale === 'en' ? 'School calendar' : 'Calendrier scolaire';
  return { id: `calendar:${notice.kind}:${notice.start}:${notice.end}:${className ?? ''}`, title, detail: text,
    detailHighlights: [name, date, ...(resume ? [resume] : []), ...(className ? [className] : [])].filter(value => text.includes(value)) };
}
