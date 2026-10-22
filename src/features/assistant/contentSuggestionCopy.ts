import type { AppLocale } from '../../types';
import type { ContentSuggestion } from '../../domain/assistant/contentSuggestion';
import { companionClassName } from './companionClassName';
import type { CompanionMessage } from './companionCopy';
import { notebookActivityPhrase } from './notebookActivityCopy';

type ContentSituation = 'empty' | 'personal' | 'predefined' | 'imported' | 'assigned' | 'unknown';
type Phrase = (name: string) => string;
const phrases: Record<AppLocale, Record<ContentSituation, readonly Phrase[]>> = {
  fr: {
    empty: [
      n => `Le cahier de ${n} attend ses premiers cours : préférez-vous adapter le programme officiel ou concevoir un contenu sur mesure avec l’équipe ? Contactez-nous.`,
      n => `Pour démarrer sereinement avec ${n} : souhaitez-vous des séances prêtes à l’emploi ou un cours entièrement personnalisé ? Contactez-nous sur WhatsApp.`,
    ],
    personal: [
      n => `Le saviez-vous : si vous souhaitez enrichir vos cours de ${n} avec des exercices ou fiches sur mesure, vous pouvez contacter notre équipe.`,
      n => `Le saviez-vous : l’équipe peut vous préparer des évaluations et activités adaptées à votre approche pour ${n} sur simple contact.`,
    ],
    predefined: [
      n => `Le saviez-vous : si vous souhaitez des leçons ou exercices adaptés au programme de ${n}, vous pouvez contacter l’équipe pour les préparer.`,
      n => `Le saviez-vous : vous pouvez obtenir des cours et activités sur mesure adaptés à ${n} en contactant directement notre équipe.`,
    ],
    imported: [
      n => `Le saviez-vous : si vous souhaitez structurer votre contenu importé ou l’enrichir d’exercices pour ${n}, vous pouvez contacter l’équipe.`,
      n => `Le saviez-vous : notre équipe peut adapter vos supports importés au rythme de ${n} sur simple message WhatsApp.`,
    ],
    assigned: [
      n => `Le saviez-vous : pour vos prochaines séances avec ${n}, vous pouvez contacter l’équipe afin d’obtenir des devoirs et exercices adaptés.`,
      n => `Le saviez-vous : vous pouvez anticiper vos prochains chapitres pour ${n} avec des activités préparées sur mesure avec l’équipe.`,
    ],
    unknown: [
      n => `Le saviez-vous : si vous souhaitez des cours, fiches ou exercices adaptés à ${n}, vous pouvez contacter l’équipe sur WhatsApp.`,
      n => `Le saviez-vous : pour adapter ou enrichir les contenus de ${n} selon vos besoins, contactez directement l’équipe sur WhatsApp.`,
    ],
  },
  ar: {
    empty: [
      n => `لإعداد أولى الحصص لقسم ${n}، هل ترغب في تكييف البرنامج الرسمي أو تصميم محتوى مخصص مع فريقنا؟ تواصل معنا عبر واتساب.`,
      n => `لبدء دروس قسم ${n} بكل يسر، هل تودّ تجهيز حصص وتمارين مكيفة تناسب أسلوبك بمساعدة الفريق؟ تواصل معنا.`,
    ],
    personal: [
      n => `هل تعلم : إذا كنت ترغب في محتوى إضافي أو تمارين مكيفة مع دروسك لقسم ${n}، يمكنك التواصل معنا لإعدادها لك.`,
      n => `هل تعلم : يمكنك الحصول على ملخصات وفروض مخصصة تتماشى مع طريقتك لقسم ${n} بالتواصل مباشرة مع فريقنا.`,
    ],
    predefined: [
      n => `هل تعلم : إذا كنت ترغب في دروس أو تمارين مكيفة مع مقررك لقسم ${n}، يمكنك التواصل معنا لإعدادها لك.`,
      n => `هل تعلم : يمكنك طلب محتوى مخصص وأنشطة مكيفة مع تدرج قسم ${n} بالتواصل مباشرة مع فريقنا.`,
    ],
    imported: [
      n => `هل تعلم : إذا كنت ترغب في تكييف دروسك المستوردة لقسم ${n} أو إثرائها بتمارين، يمكنك التواصل مع فريقنا.`,
      n => `هل تعلم : يمكنك تنظيم وتكييف محتواك المستورد لقسم ${n} في حصص متناسقة بالتواصل معنا عبر واتساب.`,
    ],
    assigned: [
      n => `هل تعلم : إذا كنت ترغب في تحضير الحصص القادمة بتمارين وفروض مكيفة لقسم ${n}، يمكنك التواصل مع فريقنا.`,
      n => `هل تعلم : يمكنك الحصول على مراجعات وأنشطة مخصصة لقسم ${n} تتماشى مع تدرجك بالتواصل المباشر معنا.`,
    ],
    unknown: [
      n => `هل تعلم : إذا كنت ترغب في دروس، تمارين أو فروض مكيفة لقسم ${n}، يمكنك التواصل مع فريقنا عبر واتساب.`,
      n => `هل تعلم : يمكنك تكييف محتوى حصص قسم ${n} وفق احتياجاتك الحقيقية بالتواصل مباشرة مع فريقنا عبر واتساب.`,
    ],
  },
  en: {
    empty: [
      n => `The notebook for ${n} is ready for its first lesson: would you like to adapt the standard curriculum or create custom content with our team? Contact us.`,
      n => `To start smoothly with ${n}: would you like ready lessons tailored to your style or fully personalized content? Contact us.`,
    ],
    personal: [
      n => `Did you know: if you would like to enrich your materials for ${n} with tailored exercises, you can contact our team to help.`,
      n => `Did you know: our team can craft custom assessments and practice sheets suited to your teaching style for ${n} upon request.`,
    ],
    predefined: [
      n => `Did you know: if you would like lessons or exercises tailored to the curriculum for ${n}, you can contact our team to prepare them.`,
      n => `Did you know: you can request custom-designed lessons and activities adapted to ${n} by contacting our team.`,
    ],
    imported: [
      n => `Did you know: if you would like help structuring your imported files or enriching them for ${n}, you can contact our team.`,
      n => `Did you know: our team can adapt your imported documents for ${n} into ready-to-teach lessons upon request.`,
    ],
    assigned: [
      n => `Did you know: for your upcoming sessions with ${n}, you can contact our team to prepare tailored exercises and reviews.`,
      n => `Did you know: you can anticipate the next chapters for ${n} with custom activities crafted with our team upon request.`,
    ],
    unknown: [
      n => `Did you know: if you need tailored lessons, exercises or tests for ${n}, you can reach out to our team on WhatsApp.`,
      n => `Did you know: to adapt or enrich the curriculum for ${n} to your exact needs, talk it through with our team on WhatsApp.`,
    ],
  },
};

/** Variants stay stable throughout a day; renders and cloud updates never shuffle the text. */
export function contentSuggestionMessage(suggestion: ContentSuggestion, locale: AppLocale, day: string): CompanionMessage {
  const name = companionClassName(suggestion.target.name, locale);
  const situation: ContentSituation = suggestion.evidence.empty ? 'empty'
    : suggestion.origin !== 'unknown' ? suggestion.origin
    : suggestion.evidence.assignedCount > 0 ? 'assigned' : 'unknown';
  const variants = phrases[locale][situation];
  let hash = 0;
  for (const char of `${suggestion.target.id}:${situation}:${day}`) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  const activity = !suggestion.evidence.empty ? suggestion.activity : undefined;
  return {
    id: `content:${suggestion.target.id}:${activity?.kind ?? situation}`,
    title: locale === 'ar' ? 'محتوى مخصص لقسمك' : locale === 'en' ? 'Tailored class content' : 'Un contenu adapté à votre classe',
    detail: activity ? notebookActivityPhrase(activity.kind, name, locale) : variants[hash % variants.length](name), detailEmphasis: name,
    context: name,
  };
}
