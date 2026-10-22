import type { AppLocale } from '../../types';
import type { ContentSuggestion } from '../../domain/assistant/contentSuggestion';
import { formatLocalizedClassDisplayName } from '../../constants/class-levels';
import type { CompanionMessage } from './companionCopy';

type ContentSituation = 'empty' | 'personal' | 'predefined' | 'imported' | 'assigned' | 'unknown';
type Phrase = (name: string) => string;
const phrases: Record<AppLocale, Record<ContentSituation, readonly Phrase[]>> = {
  fr: {
    empty: [n => `Un contenu sur mesure pour ${n} ? L’équipe peut vous aider à préparer votre cahier.`, n => `Pour démarrer avec ${n}, souhaitez-vous un contenu adapté à votre façon d’enseigner ?`],
    personal: [n => `Vous construisez le contenu de ${n} : envie de l’enrichir avec des exercices sur mesure ?`, n => `Votre approche, votre contenu : souhaitez-vous un coup de main pour enrichir le cahier de ${n} ?`],
    predefined: [n => `La base prédéfinie de ${n} est en place ; souhaitez-vous l’adapter à votre progression ?`, n => `Envie d’aller plus loin avec ${n} ? L’équipe peut vous aider à personnaliser la base proposée.`],
    imported: [n => `Vous avez importé le contenu de ${n} ; souhaitez-vous l’enrichir ou l’adapter avec l’équipe ?`, n => `Un ajustement pour ${n} ? L’équipe peut vous accompagner à partir de votre contenu importé.`],
    assigned: [n => `Des contenus de ${n} sont déjà rattachés à des séances ; envie de préparer la suite avec des exercices adaptés ?`, n => `Pour les prochaines séances de ${n}, souhaitez-vous enrichir votre contenu avec l’équipe ?`],
    unknown: [n => `Souhaitez-vous enrichir le contenu de ${n} ou préparer des exercices sur mesure avec l’équipe ?`, n => `Un contenu plus proche de vos besoins pour ${n} ? Parlons-en avec l’équipe sur WhatsApp.`],
  },
  ar: {
    empty: [n => `هل تريد محتوى خاصاً بقسم ${n}؟ يمكن للفريق مساعدتك في إعداد دفتر يناسب طريقتك في التدريس.`, n => `لنبدأ مع قسم ${n}؛ هل تودّ إعداد محتوى مخصّص يناسب حصصك بمساعدة الفريق؟`],
    personal: [n => `أنت تبني محتوى قسم ${n} بطريقتك؛ هل تودّ إثراءه بتمارين أو إضافات مخصّصة؟`, n => `محتواك لقسم ${n} يحمل أسلوبك؛ هل ترغب في تطويره بمساعدة الفريق؟`],
    predefined: [n => `المحتوى الجاهز لقسم ${n} نقطة انطلاق؛ هل تودّ تكييفه مع تدرّجك وطريقتك في التدريس؟`, n => `اخترت محتوى جاهزاً لقسم ${n}؛ هل ترغب في إثرائه بإضافات تناسب حصصك؟`],
    imported: [n => `أدرجت محتوى لقسم ${n}؛ هل تودّ تحسينه أو تكييفه مع احتياجاتك بمساعدة الفريق؟`, n => `هل ترغب في إثراء المحتوى المستورد لقسم ${n}؟ الفريق يساعدك على تطويره وفق احتياجاتك.`],
    assigned: [n => `ربطت محتويات قسم ${n} بحصص؛ هل تودّ تحضير ما يلي بتمارين مخصّصة؟`, n => `للحصص القادمة مع قسم ${n}، هل ترغب في إثراء محتواك بمساعدة الفريق؟`],
    unknown: [n => `هل تودّ تحسين محتوى قسم ${n} أو إعداد تمارين تناسب احتياجاتك بمساعدة الفريق؟`, n => `محتوى خاصّ لقسم ${n}؟ تواصل مع الفريق عبر واتساب لتوضيح ما تحتاجه.`],
  },
  en: {
    empty: [n => `Would you like tailored content for ${n}? The team can help you prepare your notebook.`, n => `Getting started with ${n}? Would you like content that fits your teaching approach?`],
    personal: [n => `You’re building your own content for ${n}; would you like to enrich it with tailored exercises?`, n => `Your approach, your content: would you like help developing the notebook for ${n}?`],
    predefined: [n => `The predefined content for ${n} is in place; would you like to adapt it to your progression?`, n => `Want to go further with ${n}? The team can help you tailor the provided content.`],
    imported: [n => `You’ve imported content for ${n}; would you like help enriching or adapting it?`, n => `Something to adjust for ${n}? The team can work with your imported content.`],
    assigned: [n => `Content for ${n} is linked to sessions; would you like tailored exercises for what comes next?`, n => `For your next sessions with ${n}, would you like help enriching your content?`],
    unknown: [n => `Would you like to enrich the content for ${n} or prepare tailored exercises with the team?`, n => `Content that better fits your needs for ${n}? Talk it through with the team on WhatsApp.`],
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
    title: locale === 'ar' ? 'محتوى يناسبك' : locale === 'en' ? 'Content your way' : 'Un contenu à votre mesure',
    detail: variants[hash % variants.length](name), detailEmphasis: name,
    context: name,
  };
}
