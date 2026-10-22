import type { AppLocale } from '../../types';
import type { ContentSuggestion } from '../../domain/assistant/contentSuggestion';
import { formatLocalizedClassDisplayName } from '../../constants/class-levels';
import type { CompanionMessage } from './companionCopy';

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
      n => `Vos séances avec ${n} progressent bien : souhaitez-vous préparer la suite avec des exercices de soutien, révisions ou devoirs sur mesure ?`,
      n => `Votre progression pour ${n} est en route : envie d’anticiper les prochains chapitres avec des supports et activités préparés avec l’équipe ?`,
    ],
    unknown: [
      n => `Besoin de cours structurés, d’exercices ciblés ou d’évaluations pour ${n} ? L’équipe est à votre écoute sur WhatsApp pour vous accompagner.`,
      n => `Pour adapter ou enrichir les contenus de ${n} selon vos besoins réels : échangeons directement sur WhatsApp pour préparer vos supports.`,
    ],
  },
  ar: {
    empty: [
      n => `دفتر قسم ${n} ينتظر أولى دروسه؛ هل تود تكييف البرنامج المقرر أو تفضل إعداد محتوى مخصص بالكامل لأسلوبك من الصفر بمساعدة الفريق؟`,
      n => `لبدء العمل مع قسم ${n} بكل راحة؛ هل ترغب في دروس وتمارين مفصلة توافق طريقتك، أو تفضل أن نجهز لك دفتراً متكاملاً؟`,
    ],
    personal: [
      n => `أنت تبني محتوى قسم ${n} بأسلوبك؛ هل تود أن نساعدك في إعداد ملخصات دروس، أنشطة تطبيقية أو تمارين إضافية ترافق تقدمك؟`,
      n => `محتواك لقسم ${n} يعكس أسلوبك الخاص؛ هل ترغب في دعامات تعليمية أو فروض مخصصة من إعداد الفريق لتسهيل عملك؟`,
    ],
    predefined: [
      n => `اخترت المحتوى المقرر لقسم ${n}؛ هل ترغب في دروس وجذاذات مكيفة مع هذا البرنامج، أو تفضل إعداد محتوى مخصص بالكامل لأسلوبك بمساعدة الفريق؟`,
      n => `المحتوى الجاهز لقسم ${n} معتمد في دفترك؛ هل تود تكييفه بمذكرات ودروس مرافقة، أو تصميم أنشطة وفروض إضافية تناسب تلاميذك؟`,
    ],
    imported: [
      n => `استوردت محتوى قسم ${n} بنجاح؛ هل تود تحويله إلى دروس مهيكلة أو إثراءه بتمارين وفروض تطبيقية بمساعدة الفريق؟`,
      n => `ملفات قسم ${n} المستوردة في دفترك؛ هل ترغب في مواءمتها مع حصصك أو تصميم تمارين وأنشطة نوعية ترافقها؟`,
    ],
    assigned: [
      n => `حصص قسم ${n} تتقدم بنجاح؛ هل ترغب في إعداد تمارين دعم، مراجعات دورية أو فروض محروسة للمرحلة القادمة بمساعدة الفريق؟`,
      n => `ربطت دروس قسم ${n} بحصصك بانتظام؛ هل تود دعماً لتحضير ما تبقى من المنهاج بتمارين وأنشطة نوعية مناسبة؟`,
    ],
    unknown: [
      n => `هل تحتاج إلى دروس مهيكلة، تمارين نوعية أو فروض مخصصة لقسم ${n}؟ يسعد فريقنا مرافقتك وتجهيز كل ما يلزمك عبر واتساب.`,
      n => `لتطوير محتوى قسم ${n} وفق احتياجاتك الحقيقية؛ تواصل مع الفريق عبر واتساب لمناقشة ما تود إعداده وتكييفه.`,
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
      n => `Your sessions for ${n} are progressing well: would you like tailored review exercises, extra practice, or tests for what comes next?`,
      n => `Content for ${n} is being taught regularly: would you like help preparing the upcoming chapters with targeted exercises?`,
    ],
    unknown: [
      n => `Looking for structured lessons, exercises, or tests for ${n}? The team is available on WhatsApp to prepare whatever you need.`,
      n => `To adapt or enrich the curriculum for ${n} to your exact needs: talk it through with our team on WhatsApp.`,
    ],
  },
};

/** Variants stay stable throughout a day; renders and cloud updates never shuffle the text. */
export function contentSuggestionMessage(suggestion: ContentSuggestion, locale: AppLocale, day: string): CompanionMessage {
  const name = formatLocalizedClassDisplayName(suggestion.target.name, locale).replace(/[\r\n\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
  const situation: ContentSituation = suggestion.evidence.empty ? 'empty'
    : suggestion.origin !== 'unknown' ? suggestion.origin
    : suggestion.evidence.assignedCount > 0 ? 'assigned' : 'unknown';
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
