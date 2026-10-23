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
      n => `Pour enrichir vos cours de ${n}, souhaitez-vous des exercices ou des fiches sur mesure préparés avec l’équipe ?`,
      n => `L’équipe peut préparer des évaluations et activités adaptées à votre approche pour ${n}. Parlons de vos besoins sur WhatsApp.`,
    ],
    predefined: [
      n => `Souhaitez-vous des leçons ou exercices adaptés au programme de ${n} ? L’équipe peut les préparer avec vous.`,
      n => `Pour ${n}, l’équipe peut préparer des cours adaptés et des activités sur mesure. Échangeons sur ce qui vous serait utile.`,
    ],
    imported: [
      n => `Souhaitez-vous structurer vos supports importés ou les enrichir d’exercices pour ${n} ? Contactez l’équipe.`,
      n => `Vos supports importés peuvent être adaptés au rythme de ${n} avec l’équipe. Discutons-en sur WhatsApp.`,
    ],
    assigned: [
      n => `Pour les prochaines séances avec ${n}, souhaitez-vous des devoirs et exercices adaptés, préparés avec l’équipe ?`,
      n => `Pour les prochains chapitres de ${n}, l’équipe peut préparer des activités sur mesure. Parlons de votre progression.`,
    ],
    unknown: [
      n => `Besoin de cours, fiches ou exercices adaptés à ${n} ? Échangez avec l’équipe sur WhatsApp.`,
      n => `Pour adapter ou enrichir les contenus de ${n} selon vos besoins, contactez l’équipe sur WhatsApp.`,
    ],
  },
  ar: {
    empty: [
      n => `لإعداد أولى الحصص لقسم ${n}، هل ترغب في تكييف البرنامج الرسمي أو تصميم محتوى مخصص مع فريقنا؟ تواصل معنا عبر واتساب.`,
      n => `لبدء دروس قسم ${n} بكل يسر، هل تودّ تجهيز حصص وتمارين مكيفة تناسب أسلوبك بمساعدة الفريق؟ تواصل معنا.`,
    ],
    personal: [
      n => `فيما يخص دروس قسم ${n}، هل تودّ إثراءها بمحتوى إضافي أو تمارين مكيفة؟ يمكن لفريقنا إعدادها معك.`,
      n => `لقسم ${n}، هل ترغب في ملخصات وفروض مخصصة تتماشى مع طريقتك؟ تواصل مع فريقنا لبحث ما يناسبك.`,
    ],
    predefined: [
      n => `فيما يخص مقرر قسم ${n}، هل تودّ تكييف بعض الدروس أو التمارين مع احتياجاتك؟ يمكن للفريق مساعدتك في إعدادها.`,
      n => `لقسم ${n}، يمكن للفريق إعداد محتوى وأنشطة مكيفة مع تدرجك. تواصل معنا لنتعرف على ما تحتاجه.`,
    ],
    imported: [
      n => `بخصوص دروسك المستوردة لقسم ${n}، هل تودّ تكييفها أو إثراءها بتمارين؟ تواصل مع فريقنا.`,
      n => `هل ترغب في تنظيم محتواك المستورد لقسم ${n} في حصص متناسقة؟ ناقش احتياجاتك مع الفريق عبر واتساب.`,
    ],
    assigned: [
      n => `فيما يخص محتوى الحصص القادمة لقسم ${n}، هل تودّ إعداد تمارين وفروض مكيفة بمساعدة الفريق؟`,
      n => `لقسم ${n}، هل ترغب في مراجعات وأنشطة مخصصة تتماشى مع تدرجك؟ تواصل معنا لبحث ما يناسب حصصك القادمة.`,
    ],
    unknown: [
      n => `هل تحتاج إلى دروس أو تمارين أو فروض مكيفة لقسم ${n}؟ تواصل مع فريقنا عبر واتساب.`,
      n => `لتكييف محتوى حصص قسم ${n} وفق احتياجاتك، يمكنك مناقشة التفاصيل مع فريقنا عبر واتساب.`,
    ],
  },
  en: {
    empty: [
      n => `The notebook for ${n} is ready for its first lesson: would you like to adapt the standard curriculum or create custom content with our team? Contact us.`,
      n => `To start smoothly with ${n}: would you like ready lessons tailored to your style or fully personalized content? Contact us.`,
    ],
    personal: [
      n => `Would you like to enrich your materials for ${n} with tailored exercises? Our team can help prepare them with you.`,
      n => `Our team can prepare assessments and practice sheets suited to your teaching style for ${n}. Let’s discuss your needs.`,
    ],
    predefined: [
      n => `Would you like to adapt lessons or exercises from the curriculum for ${n}? Contact our team to prepare them together.`,
      n => `Our team can prepare lessons and activities tailored to ${n}. Tell us what would be useful for your class.`,
    ],
    imported: [
      n => `Would you like help structuring your imported materials or adding exercises for ${n}? Contact our team.`,
      n => `Our team can adapt your imported materials for ${n} into lessons. Discuss your needs with us on WhatsApp.`,
    ],
    assigned: [
      n => `For your upcoming lessons with ${n}, would you like tailored exercises and reviews prepared with our team?`,
      n => `For the next chapters with ${n}, our team can prepare custom activities. Let’s discuss your teaching plan.`,
    ],
    unknown: [
      n => `Need tailored lessons, exercises or tests for ${n}? Talk to our team on WhatsApp.`,
      n => `To adapt or enrich your content for ${n}, discuss your needs with our team on WhatsApp.`,
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
