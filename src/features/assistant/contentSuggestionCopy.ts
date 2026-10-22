import type { AppLocale } from '../../types';
import type { ContentSuggestion } from '../../domain/assistant/contentSuggestion';
import { formatLocalizedClassDisplayName } from '../../constants/class-levels';
import type { CompanionMessage } from './companionCopy';

type ContentSituation = 'empty' | 'personal' | 'predefined' | 'imported' | 'assigned' | 'unknown';
type Phrase = (name: string) => string;
const phrases: Record<AppLocale, Record<ContentSituation, readonly Phrase[]>> = {
  fr: {
    empty: [
      n => `Un contenu sur mesure pour ${n} ? L’équipe peut vous accompagner pour préparer vos séances pas à pas.`,
      n => `Pour démarrer sereinement avec ${n}, souhaitez-vous un contenu adapté à votre façon d’enseigner ?`,
    ],
    personal: [
      n => `Vous construisez le contenu de ${n} : envie de l’enrichir avec des exercices ou activités sur mesure ?`,
      n => `Votre approche, votre contenu pour ${n} : souhaitez-vous un coup de main de l’équipe pour aller plus loin ?`,
    ],
    predefined: [
      n => `La base prédéfinie de ${n} est en place ; souhaitez-vous l’adapter avec nous à votre propre progression ?`,
      n => `Envie de personnaliser le cahier de ${n} ? L’équipe peut vous aider à ajuster la base selon vos besoins.`,
    ],
    imported: [
      n => `Vous avez importé le contenu de ${n} ; souhaitez-vous l’enrichir ou le structurer avec l’équipe ?`,
      n => `Un ajustement pour ${n} ? L’équipe peut vous accompagner pour perfectionner votre contenu importé.`,
    ],
    assigned: [
      n => `Des séances de ${n} sont déjà en place ; envie de préparer la suite avec des exercices ciblés ?`,
      n => `Pour vos prochaines séances avec ${n}, souhaitez-vous enrichir vos supports avec l’équipe ?`,
    ],
    unknown: [
      n => `Souhaitez-vous enrichir le contenu de ${n} ou préparer des exercices adaptés avec l’équipe ?`,
      n => `Un contenu plus proche de vos attentes pour ${n} ? Échangeons directement sur WhatsApp.`,
    ],
  },
  ar: {
    empty: [
      n => `هل ترغب في محتوى مفصل لقسم ${n}؟ يسعد فريقنا مساعدتك في إعداد دفتر يناسب أسلوبك في التدريس.`,
      n => `لبدء العمل مع قسم ${n} بكل راحة، هل تود أن نساعدك في تجهيز دروس وتمارين تلائم منهاجك؟`,
    ],
    personal: [
      n => `أنت تبني محتوى قسم ${n} بأسلوبك؛ هل تود أن نساعدك في إثرائه بتمارين نوعية وأنشطة مخصصة؟`,
      n => `محتواك لقسم ${n} يحمل لمستك؛ هل ترغب في دعم إضافي من فريقنا لتطويره أكثر عبر واتساب؟`,
    ],
    predefined: [
      n => `المحتوى المقترح لقسم ${n} نقطة انطلاق ميسرة؛ هل تود تكييفه مع تدرجك السنوي بمساعدة الفريق؟`,
      n => `اخترت المحتوى الجاهز لقسم ${n}؛ يسعدنا مساعدتك في إثرائه وتطويره ليوافق احتياجات تلاميذك.`,
    ],
    imported: [
      n => `قمت باستيراد محتوى قسم ${n} بنجاح؛ هل ترغب في مراجعته أو تكييفه مع متطلباتك برفقة الفريق؟`,
      n => `هل تحتاج لتعديل أو إثراء المحتوى المستورد لقسم ${n}؟ فريقنا جاهز لمرافقتك وتسهيل عملك.`,
    ],
    assigned: [
      n => `بدأت ربط محتويات قسم ${n} بحصصك؛ هل ترغب في تحضير الحصص القادمة بتمارين ومسائل مخصصة؟`,
      n => `للحصص القادمة مع قسم ${n}، هل تود مساعدة من الفريق لإعداد امتدادات وتمارين نوعية لتلاميذك؟`,
    ],
    unknown: [
      n => `هل ترغب في إثراء محتوى قسم ${n} أو إعداد تمارين تناسب احتياجات تلاميذك؟ الفريق في خدمتك عبر واتساب.`,
      n => `محتوى مخصص ومناسب لقسم ${n}؟ تواصل مع الفريق عبر واتساب لنتعاون معاً على إعداده وتجهيزه.`,
    ],
  },
  en: {
    empty: [
      n => `Would you like tailored content for ${n}? The team can help you prepare your lessons step by step.`,
      n => `Getting started with ${n}? Would you like content that fits your teaching approach?`,
    ],
    personal: [
      n => `You’re building your own content for ${n}; would you like help enriching it with tailored exercises?`,
      n => `Your approach, your content: would you like help developing the notebook for ${n}?`,
    ],
    predefined: [
      n => `The predefined content for ${n} is in place; would you like to adapt it to your progression with us?`,
      n => `Want to go further with ${n}? The team can help you tailor the provided content.`,
    ],
    imported: [
      n => `You’ve imported content for ${n}; would you like help enriching or fine-tuning it?`,
      n => `Something to adjust for ${n}? The team can work with your imported content.`,
    ],
    assigned: [
      n => `Content for ${n} is linked to sessions; would you like tailored exercises for what comes next?`,
      n => `For your next sessions with ${n}, would you like help enriching your materials?`,
    ],
    unknown: [
      n => `Would you like to enrich the content for ${n} or prepare tailored exercises with the team?`,
      n => `Content that better fits your needs for ${n}? Talk it through with the team on WhatsApp.`,
    ],
  },
};

/** Variants stay stable throughout a day; renders and cloud updates never shuffle the text. */
export function contentSuggestionMessage(suggestion: ContentSuggestion, locale: AppLocale, day: string): CompanionMessage {
  const name = formatLocalizedClassDisplayName(suggestion.target.name, locale).replace(/[\r\n\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
  const situation: ContentSituation = suggestion.evidence.empty ? 'empty'
    : suggestion.evidence.assignedCount > 0 ? 'assigned' : suggestion.origin;
  const variants = phrases[locale][situation];
  let hash = 0;
  for (const char of `${suggestion.target.id}:${situation}:${day}`) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return {
    id: `content:${suggestion.target.id}:${situation}`,
    title: locale === 'ar' ? 'محتوى مخصص لقسمك' : locale === 'en' ? 'Tailored class content' : 'Un contenu adapté à votre classe',
    detail: variants[hash % variants.length](name), detailEmphasis: name,
    context: name,
  };
}
