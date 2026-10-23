import type { AppLocale } from '../../types';
import type { CompanionCalendarNotice } from '../../domain/assistant/companionCalendar';
import { localizeCalendarName } from '../../domain/calendar/calendar';
import type { CompanionMessage } from './companionCopy';

/** Short factual context complements the actual task, without asserting that a holiday was confirmed. */
export function withCompanionCalendar(message: CompanionMessage, notice: CompanionCalendarNotice | undefined, locale: AppLocale): CompanionMessage {
  if (!notice) return message;
  const format = (date: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  const date = format(notice.kind === 'upcoming' ? notice.start : notice.end);
  const resume = notice.resumeDate && format(notice.resumeDate);
  const name = notice.name ? localizeCalendarName(notice.name, locale)
    : locale === 'ar' ? 'العطلة المدرسية' : locale === 'en' ? 'School break' : 'Vacances scolaires';
  let text: string;
  if (locale === 'ar') {
    text = notice.kind === 'return' ? `استئناف حصص هذا القسم اليوم حسب استعمال الزمن.`
      : notice.kind === 'upcoming' ? `في ${date}: ${name}.`
        : notice.kind === 'holiday' ? `اليوم ${name}.` : `تستمر فترة العطلة حتى ${date} (${name}).`;
    if (resume && notice.kind !== 'return') text += ` الحصة المبرمجة التالية في ${resume}.`;
    if (notice.approximate) text += ' التاريخ تقديري، رهن التأكيد الرسمي.';
  } else if (locale === 'en') {
    text = notice.kind === 'return' ? 'This class resumes today according to its timetable.'
      : notice.kind === 'upcoming' ? `${name} starts on ${date}.`
        : notice.kind === 'holiday' ? `Today: ${name}.` : `${name} continues through ${date}.`;
    if (resume && notice.kind !== 'return') text += ` Next scheduled lesson: ${resume}.`;
    if (notice.approximate) text += ' Indicative date, subject to official confirmation.';
  } else {
    text = notice.kind === 'return' ? 'Reprise des cours de cette classe aujourd’hui selon son emploi du temps.'
      : notice.kind === 'upcoming' ? `À partir du ${date} : ${name}.`
        : notice.kind === 'holiday' ? `Aujourd’hui : ${name}.` : `Les vacances se poursuivent jusqu’au ${date} inclus (${name}).`;
    if (resume && notice.kind !== 'return') text += ` Prochain cours prévu : ${resume}.`;
    if (notice.approximate) text += ' Date indicative, sous réserve de confirmation officielle.';
  }
  return { ...message, detail: `${text} ${message.detail}`, detailHighlights: [...(message.detailHighlights ?? []), name, date, ...(resume ? [resume] : [])] };
}
