import type { AppLocale } from '../../types';
import type { NotebookActivityKind } from '../../domain/assistant/notebookActivity';

/** Reflects confirmed edits only; a date assignment is not evidence of teaching success. */
const phrases: Record<AppLocale, Record<NotebookActivityKind, (name: string) => string>> = {
  fr: {
    content: n => `Le saviez-vous : vos ajustements pour ${n} sont enregistrés ; si vous souhaitez enrichir ce cours avec des exercices sur mesure, contactez l’équipe.`,
    dates: n => `Le saviez-vous : les séances de ${n} sont à jour ; vous pouvez contacter l’équipe pour préparer des supports et devoirs adaptés.`,
    order: n => `Le saviez-vous : vous avez réorganisé ${n} ; si vous souhaitez adapter aussi son contenu avec l’équipe, vous pouvez nous contacter.`,
  },
  ar: {
    content: n => `هل تعلم : حُفظت تعديلاتك لقسم ${n}؛ إذا كنت ترغب في محتوى أو تمارين مكيفة مع تدرجك، يمكنك التواصل معنا لإعدادها.`,
    dates: n => `هل تعلم : حُدّثت معلومات حصص قسم ${n}؛ يمكنك التواصل معنا لتحضير الدروس والأنشطة القادمة بشكل مكيّف.`,
    order: n => `هل تعلم : أعدت تنظيم دفتر قسم ${n}؛ هل تودّ تكييف محتواه أيضاً مع تدرّجك؟ تواصل معنا.`,
  },
  en: {
    content: n => `Did you know: your changes for ${n} are saved; if you would like to enrich this content with tailored exercises, contact our team.`,
    dates: n => `Did you know: session details for ${n} are up to date; you can contact our team to prepare tailored materials for what comes next.`,
    order: n => `Did you know: you’ve reorganized the notebook for ${n}; you can contact our team to adapt its content to your progression too.`,
  },
};

export const notebookActivityPhrase = (kind: NotebookActivityKind, name: string, locale: AppLocale): string => phrases[locale][kind](name);
