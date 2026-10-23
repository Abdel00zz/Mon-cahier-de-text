import type { AppLocale } from '../../types';
import type { ClassGuidance } from '../../domain/assistant/classGuidance';
import type { CompanionMessage } from './companionCopy';
import { companionClassName } from './companionClassName';

/** A dated trace is evidence of recording, never proof of a teacher's absence or lack of work. */
export function notebookFollowupMessage(guidance: Extract<ClassGuidance, { step: 'notebook-followup' }>, locale: AppLocale): CompanionMessage {
  const name = companionClassName(guidance.className, locale);
  const date = guidance.lastSessionDate && new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${guidance.lastSessionDate}T12:00:00Z`));
  const copy = locale === 'ar' ? {
    title: 'مراجعة تسجيل الحصص', action: 'مراجعة الحصص', context: 'متابعة الدفتر',
    detail: date ? `فيما يخصّ حصص قسم ${name}، آخر حصة مؤرخة هي ${date} رغم مرور أيام تدريس مبرمجة؛ هل نراجع ما أُنجز لإسناد تواريخه؟`
      : `فيما يخصّ دفتر قسم ${name}، لم تُسجّل حصة مؤرخة بعد رغم مرور أيام تدريس مبرمجة؛ هل نحدّد المحتوى المنجز لإسناد تواريخه؟`,
  } : locale === 'en' ? {
    title: 'Review recorded sessions', action: 'Review sessions', context: 'Notebook follow-up',
    detail: date ? `The latest dated session for ${name} is ${date}, with scheduled teaching days since then. Shall we review what was covered and assign its dates?`
      : `No session has been dated for ${name} yet, although scheduled teaching days have passed. Shall we select the work covered and assign its dates?`,
  } : {
    title: 'Reprendre le fil des séances', action: 'Vérifier les séances', context: 'Suivi du cahier',
    detail: date ? `Pour ${name}, la dernière séance datée remonte au ${date}, malgré des jours de cours prévus depuis. On vérifie le travail réalisé pour lui attribuer ses dates ?`
      : `Aucune séance n’est encore datée pour ${name}, malgré des jours de cours prévus. On sélectionne le travail réalisé pour lui attribuer ses dates ?`,
  };
  return { id: `followup:${guidance.classId}:${guidance.reason}`, ...copy, detailEmphasis: name };
}
