import type { AppLocale } from '../../types';
import type { NotebookActivityKind } from '../../domain/assistant/notebookActivity';

/** Reflects confirmed edits only; a date assignment is not evidence of teaching success. */
const phrases: Record<AppLocale, Record<NotebookActivityKind, (name: string) => string>> = {
  fr: {
    content: n => `Vos ajustements pour ${n} sont enregistrés. Souhaitez-vous enrichir ce cours avec des exercices préparés sur mesure par l’équipe ?`,
    dates: n => `Les dates des séances de ${n} ont été modifiées. Pour préparer les prochains supports ou devoirs, l’équipe peut vous accompagner.`,
    order: n => `Vous avez réorganisé le cahier de ${n}. Souhaitez-vous adapter aussi son contenu avec l’équipe ?`,
  },
  ar: {
    content: n => `حُفظت تعديلاتك لقسم ${n}. هل تودّ إثراء هذا المحتوى بتمارين مكيفة مع تدرجك؟ يمكن للفريق إعدادها معك.`,
    dates: n => `عُدّلت تواريخ حصص قسم ${n}. فيما يخص المحتوى القادم، هل ترغب في إعداد دروس أو أنشطة مكيفة بمساعدة الفريق؟`,
    order: n => `أعدت تنظيم دفتر قسم ${n}. هل تودّ تكييف محتواه أيضاً مع تدرّجك؟ تواصل معنا.`,
  },
  en: {
    content: n => `Your changes for ${n} are saved. Would you like tailored exercises to enrich this content? Our team can prepare them with you.`,
    dates: n => `Lesson dates for ${n} were changed. Our team can help prepare tailored materials for your next lessons.`,
    order: n => `You’ve reorganized the notebook for ${n}. Would you like our team to help adapt its content too?`,
  },
};

export const notebookActivityPhrase = (kind: NotebookActivityKind, name: string, locale: AppLocale): string => phrases[locale][kind](name);
