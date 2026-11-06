import type { AppLocale } from '../../types';
import type { ClassGuidance } from '../../domain/assistant/classGuidance';
import type { CompanionMessage } from './companionMessage';
import { companionClassName } from './companionClassName';

/** A dated trace is evidence of recording, never proof of a teacher's absence or lack of work. */
export function notebookFollowupMessage(guidance: Extract<ClassGuidance, { step: 'notebook-followup' }>, locale: AppLocale): CompanionMessage {
  const name = companionClassName(guidance.className, locale);
  const days = new Intl.NumberFormat(locale).format(guidance.elapsedDays);
  const date = guidance.lastSessionDate && new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${guidance.lastSessionDate}T12:00:00Z`));
  const copy = locale === 'ar' ? {
    title: 'مراجعة تسجيل الحصص', action: 'مراجعة الحصص', context: 'متابعة الدفتر',
    detail: date ? `آخر تاريخ مسجّل في دفتر قسم ${name} هو ${date}. حدّد ما أُنجز بعده لإسناد تاريخه.`
      : `لا توجد حصة مؤرخة بعد في دفتر قسم ${name}. حدّد المحتوى المنجز لإسناد تاريخه.`,
  } : locale === 'en' ? {
    title: 'Review recorded sessions', action: 'Review sessions', context: 'Notebook follow-up',
    detail: date ? `The last date in the notebook for ${name} is ${date}. Select any work covered since then to date it.`
      : `No session is dated for ${name} after ${days} scheduled teaching days. Select the work covered to date it.`,
  } : {
    title: 'Reprendre le fil des séances', action: 'Vérifier les séances', context: 'Suivi du cahier',
    detail: date ? `Dernière date dans le cahier de ${name} : le ${date}. Sélectionnez le contenu abordé depuis pour le dater.`
      : `Aucune séance datée pour ${name} après ${days} jours de cours prévus. Sélectionnez le contenu abordé pour le dater.`,
  };
  return { id: `followup:${guidance.classId}:${guidance.reason}`, ...copy, detailEmphasis: name };
}
