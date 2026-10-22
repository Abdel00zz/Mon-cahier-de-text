import type { AppLocale } from '../../types';
import type { NotebookActivityKind } from '../../domain/assistant/notebookActivity';

/** Reflects confirmed edits only; a date assignment is not evidence of teaching success. */
const phrases: Record<AppLocale, Record<NotebookActivityKind, (name: string) => string>> = {
  fr: {
    content: n => `Vos ajustements pour ${n} sont enregistrés ; souhaitez-vous enrichir ce contenu avec des exercices sur mesure ?`,
    dates: n => `Les informations de séance de ${n} sont mises à jour ; envie de préparer la suite avec un contenu adapté ?`,
    order: n => `Vous avez réorganisé le cahier de ${n} ; souhaitez-vous adapter aussi son contenu à votre progression ?`,
  },
  ar: {
    content: n => `حُفظت تعديلاتك لقسم ${n}؛ هل تودّ إثراء هذا المحتوى بتمارين مخصّصة؟`,
    dates: n => `حُدّثت معلومات الحصص لقسم ${n}؛ هل ترغب في تحضير ما يلي بمحتوى يناسب تدرّجك؟`,
    order: n => `أعدت تنظيم دفتر قسم ${n}؛ هل تودّ تكييف محتواه أيضاً مع تدرّجك؟`,
  },
  en: {
    content: n => `Your changes for ${n} are saved; would you like to enrich this content with tailored exercises?`,
    dates: n => `Session details for ${n} are updated; would you like tailored content for what comes next?`,
    order: n => `You’ve reorganized the notebook for ${n}; would you like to adapt its content to your progression too?`,
  },
};

export const notebookActivityPhrase = (kind: NotebookActivityKind, name: string, locale: AppLocale): string => phrases[locale][kind](name);
