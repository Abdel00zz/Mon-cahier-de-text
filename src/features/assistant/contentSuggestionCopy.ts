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
      n => `Le cahier de ${n} attend ses premiers cours : préférez-vous adapter le programme officiel, ou créer un contenu sur mesure avec l’équipe ?`,
      n => `Pour démarrer sereinement avec ${n} : souhaitez-vous des séances adaptées prêtes à l'emploi ou un contenu entièrement personnalisé ?`,
    ],
    personal: [
      n => `Vous construisez le contenu de ${n} à votre manière : souhaitez-vous de l’aide pour préparer fiches de cours, activités ou exercices adaptés ?`,
      n => `Votre approche pour ${n} est personnalisée : envie d’enrichir vos séances avec des évaluations ou exercices ciblés préparés avec l’équipe ?`,
    ],
    predefined: [
      n => `Vous avez choisi le programme prédéfini pour ${n} : souhaitez-vous des leçons adaptées à ce contenu, ou préférez-vous concevoir un contenu personnalisé avec l’équipe ?`,
      n => `La base officielle de ${n} est en place : désirez-vous des séances adaptées à ce programme, ou des cours et activités entièrement sur mesure ?`,
    ],
    imported: [
      n => `Vous avez importé le contenu de ${n} : souhaitez-vous le structurer en séances fluides ou l’enrichir d'exercices et devoirs avec l’équipe ?`,
      n => `Vos documents pour ${n} sont importés : désirez-vous un accompagnement pour les adapter à votre rythme ou concevoir des supports complémentaires ?`,
    ],
    assigned: [
      n => `Des contenus de ${n} sont rattachés à des séances ; souhaitez-vous préparer la suite avec des exercices ou des devoirs sur mesure ?`,
      n => `Pour les prochaines séances de ${n}, envie de prévoir des supports et activités adaptés avec l’équipe ?`,
    ],
    unknown: [
      n => `Besoin de cours structurés, d’exercices ciblés ou d’évaluations pour ${n} ? L’équipe est à votre écoute sur WhatsApp pour vous accompagner.`,
      n => `Pour adapter ou enrichir les contenus de ${n} selon vos besoins réels : échangeons directement sur WhatsApp pour préparer vos supports.`,
    ],
  },
  ar: {
    empty: [
      n => `لإعداد أولى الحصص، هل تودّ تكييف البرنامج المقرر لقسم ${n} أو بناء محتوى مخصص بمساعدة الفريق؟`,
      n => `للبدء بمحتوى يناسب أسلوبك، هل ترغب في تجهيز دروس وتمارين لقسم ${n} مع الفريق؟`,
    ],
    personal: [
      n => `لإثراء المحتوى الذي تعدّه، هل تودّ إعداد تمارين وأنشطة لقسم ${n} تناسب طريقتك بمساعدة الفريق؟`,
      n => `لتطوير محتواك، هل ترغب في ملخصات أو فروض مخصصة لقسم ${n} يعدّها الفريق وفق احتياجاتك؟`,
    ],
    predefined: [
      n => `فيما يخصّ المحتوى الجاهز، هل تودّ تكييف دروسه لقسم ${n} أو إعداد محتوى مخصص مع الفريق؟`,
      n => `لتكييف البرنامج الذي اخترته، هل ترغب في أنشطة وفروض لقسم ${n} يعدّها الفريق بما يناسب تلاميذك؟`,
    ],
    imported: [
      n => `فيما يخصّ المحتوى الذي استوردته، هل تودّ تنظيمه في حصص لقسم ${n} بمساعدة الفريق؟`,
      n => `لإثراء محتواك المستورد، هل ترغب في تمارين وأنشطة لقسم ${n} يعدّها الفريق وفق احتياجاتك؟`,
    ],
    assigned: [
      n => `فيما يخصّ محتوى الحصص القادمة، هل تودّ إعداد تمارين وأنشطة مخصّصة لقسم ${n} بمساعدة الفريق؟`,
      n => `فيما يخصّ محتوى الحصص القادمة، هل ترغب في تحضير دروس ومراجعات لقسم ${n} تناسب تدرّجك بمساعدة الفريق؟`,
    ],
    unknown: [
      n => `فيما يخصّ محتوى حصصك، هل تودّ إعداد دروس أو تمارين لقسم ${n} مع الفريق عبر واتساب؟`,
      n => `لتحضير محتوى يناسب احتياجاتك، هل ترغب في مناقشة دروس قسم ${n} مع الفريق عبر واتساب؟`,
    ],
  },
  en: {
    empty: [
      n => `The notebook for ${n} is waiting for its first lesson: would you like to adapt the standard curriculum, or create custom content with the team?`,
      n => `To get started smoothly with ${n}: would you like ready-to-teach lessons that fit your style, or fully personalized materials?`,
    ],
    personal: [
      n => `You’re building your own content for ${n}: would you like help preparing lesson summaries, activities, or tailored exercises?`,
      n => `Your teaching approach for ${n} is unique: would you like additional exercises or assessments crafted with the team?`,
    ],
    predefined: [
      n => `You chose the predefined curriculum for ${n}: would you like lessons adapted to this content, or would you prefer custom-designed content with the team?`,
      n => `The standard curriculum for ${n} is ready: do you want lessons tailored to match this content, or fully personalized teaching materials?`,
    ],
    imported: [
      n => `You imported content for ${n}: would you like help structuring it into ready lessons or enriching it with tailored exercises and tests?`,
      n => `Your imported files for ${n} are in place: would you like the team’s help adapting them to your schedule or creating extra materials?`,
    ],
    assigned: [
      n => `Content for ${n} is linked to sessions; would you like tailored exercises or tests for what comes next?`,
      n => `For your upcoming sessions with ${n}, would you like help preparing targeted exercises and activities?`,
    ],
    unknown: [
      n => `Looking for structured lessons, exercises, or tests for ${n}? The team is available on WhatsApp to prepare whatever you need.`,
      n => `To adapt or enrich the curriculum for ${n} to your exact needs: talk it through with our team on WhatsApp.`,
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
