import type { AppLocale } from '../types';

interface TipText { text: string; keyword: string }
interface TipSource { label: string; url: string }
export interface PedagogicalTip { id: string; source: TipSource; copy: Record<AppLocale, TipText> }

const learning = { label: 'Dunlosky et al. · Psychological Science in the Public Interest, 2013', url: 'https://doi.org/10.1177/1529100612453266' };
const instruction = { label: 'Rosenshine · American Educator, 2012', url: 'https://www.aft.org/sites/default/files/periodicals/Rosenshine.pdf' };
const behaviour = { label: 'EEF · Improving Behaviour in Schools, 2019', url: 'https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/behaviour/' };

/** Practical adaptations of the cited research, not quotations or guaranteed effects. */
export const PEDAGOGICAL_TIPS: readonly PedagogicalTip[] = [
  { id: 'retrieval', source: learning, copy: {
    fr: { text: 'Pratiquez le rappel actif : faites retrouver une notion sans cahier, puis corrigez ensemble.', keyword: 'rappel actif' },
    ar: { text: 'جرّب الاسترجاع النشط: اطلب استحضار مفهوم دون دفتر، ثم راجع الإجابات مع التلاميذ.', keyword: 'الاسترجاع النشط' },
    en: { text: 'Try retrieval practice: ask pupils to recall a concept without notes, then review answers together.', keyword: 'retrieval practice' },
  } },
  { id: 'spacing', source: learning, copy: {
    fr: { text: 'Préférez la pratique espacée : reprenez une notion sur plusieurs séances plutôt qu’en une seule révision.', keyword: 'pratique espacée' },
    ar: { text: 'اعتمد المراجعة المتباعدة: عُد إلى المفهوم في حصص مختلفة بدل تجميع مراجعته في حصة واحدة.', keyword: 'المراجعة المتباعدة' },
    en: { text: 'Use spaced practice: revisit a concept across lessons instead of concentrating all revision in one sitting.', keyword: 'spaced practice' },
  } },
  { id: 'self-explanation', source: learning, copy: {
    fr: { text: 'Encouragez l’auto-explication : « Pourquoi cette étape ? » aide à examiner le raisonnement, au-delà du résultat.', keyword: 'auto-explication' },
    ar: { text: 'شجّع التفسير الذاتي: سؤال «لماذا اخترت هذه الخطوة؟» يكشف الاستدلال، لا النتيجة وحدها.', keyword: 'التفسير الذاتي' },
    en: { text: 'Prompt self-explanation: “Why this step?” invites pupils to examine their reasoning, beyond the final answer.', keyword: 'self-explanation' },
  } },
  { id: 'small-steps', source: instruction, copy: {
    fr: { text: 'Avancez par petites étapes : présentez une idée, proposez un essai, puis ajustez avant de poursuivre.', keyword: 'petites étapes' },
    ar: { text: 'تقدّم بخطوات صغيرة: اعرض فكرة، وأتح فرصة لتجريبها، ثم عدّل الشرح قبل الانتقال.', keyword: 'خطوات صغيرة' },
    en: { text: 'Teach in small steps: introduce one idea, let pupils try it, then adjust before moving on.', keyword: 'small steps' },
  } },
  { id: 'worked-example', source: instruction, copy: {
    fr: { text: 'Utilisez un exemple résolu : explicitez votre raisonnement, puis retirez progressivement l’aide.', keyword: 'exemple résolu' },
    ar: { text: 'قدّم مثالاً محلولاً: وضّح تفكيرك أثناء الحل، ثم خفّف المساعدة تدريجياً.', keyword: 'مثالاً محلولاً' },
    en: { text: 'Use a worked example: explain your reasoning aloud, then gradually withdraw support.', keyword: 'worked example' },
  } },
  { id: 'check-understanding', source: instruction, copy: {
    fr: { text: 'Vérifiez la compréhension de tous : une réponse brève de chacun renseigne mieux que les seuls volontaires.', keyword: 'compréhension de tous' },
    ar: { text: 'تحقّق من فهم الجميع: إجابة قصيرة من كل تلميذ تكشف أكثر من الاقتصار على المتطوعين.', keyword: 'فهم الجميع' },
    en: { text: 'Check everyone’s understanding: a short response from each pupil reveals more than hearing only volunteers.', keyword: 'everyone’s understanding' },
  } },
  { id: 'actionable-feedback', source: { label: 'Hattie & Timperley · Review of Educational Research, 2007', url: 'https://doi.org/10.3102/003465430298487' }, copy: {
    fr: { text: 'Donnez un retour exploitable : précisez ce qui est réussi et la prochaine correction à essayer.', keyword: 'retour exploitable' },
    ar: { text: 'قدّم تغذية راجعة قابلة للتطبيق: حدّد ما نجح والخطوة التالية لتحسين العمل.', keyword: 'تغذية راجعة قابلة للتطبيق' },
    en: { text: 'Give actionable feedback: identify what worked and the next correction to try.', keyword: 'actionable feedback' },
  } },
  { id: 'formative-check', source: { label: 'Black & Wiliam · Assessment in Education, 1998', url: 'https://doi.org/10.1080/0969595980050102' }, copy: {
    fr: { text: 'Utilisez une vérification formative : posez une question courte, puis adaptez la prochaine explication aux réponses.', keyword: 'vérification formative' },
    ar: { text: 'وظّف التقويم التكويني: اطرح سؤالاً قصيراً، ثم كيّف الشرح المقبل وفق الإجابات.', keyword: 'التقويم التكويني' },
    en: { text: 'Use a formative check: ask a short question, then adapt the next explanation to the responses.', keyword: 'formative check' },
  } },
  { id: 'metacognition', source: { label: 'EEF · Metacognition and Self-Regulated Learning, 2025', url: 'https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition' }, copy: {
    fr: { text: 'Enseignez la métacognition : demandez aux élèves de planifier leur démarche, la vérifier, puis l’évaluer.', keyword: 'métacognition' },
    ar: { text: 'نمِّ مهارات ما وراء المعرفة: اطلب تخطيط طريقة الحل ومراقبتها ثم تقييمها.', keyword: 'ما وراء المعرفة' },
    en: { text: 'Teach metacognition: ask pupils to plan their approach, monitor it, then evaluate it.', keyword: 'metacognition' },
  } },
  { id: 'cooperation', source: { label: 'EEF · Collaborative learning approaches', url: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/collaborative-learning-approaches' }, copy: {
    fr: { text: 'Structurez la coopération : fixez un objectif commun et veillez à ce que chacun explique sa contribution.', keyword: 'coopération' },
    ar: { text: 'نظّم التعلم التعاوني: حدّد هدفاً مشتركاً، وتحقّق من قدرة كل تلميذ على شرح مساهمته.', keyword: 'التعلم التعاوني' },
    en: { text: 'Structure cooperation: set a shared goal and ensure each pupil can explain their contribution.', keyword: 'cooperation' },
  } },
  { id: 'routines', source: behaviour, copy: {
    fr: { text: 'Installez des routines explicites : faites pratiquer l’entrée, la mise au travail et les transitions.', keyword: 'routines explicites' },
    ar: { text: 'أرسِ روتيناً واضحاً: درّب التلاميذ على الدخول وبدء العمل والانتقال بين الأنشطة.', keyword: 'روتيناً واضحاً' },
    en: { text: 'Teach explicit routines: practise entering, starting work and moving between activities.', keyword: 'explicit routines' },
  } },
  { id: 'relationships', source: behaviour, copy: {
    fr: { text: 'Cultivez une relation positive : accueillir chaque élève et connaître son contexte aide à ajuster vos réponses.', keyword: 'relation positive' },
    ar: { text: 'ابنِ علاقة إيجابية: استقبال كل تلميذ وفهم ظروفه يساعدان على اختيار استجابة ملائمة.', keyword: 'علاقة إيجابية' },
    en: { text: 'Build positive relationships: greeting each pupil and understanding their context helps you respond appropriately.', keyword: 'positive relationships' },
  } },
  { id: 'expectations', source: behaviour, copy: {
    fr: { text: 'Rendez les attentes cohérentes : enseignez les comportements attendus et appliquez les règles avec constance.', keyword: 'attentes cohérentes' },
    ar: { text: 'وضّح السلوك المنتظر: علّمه للتلاميذ وطبّق القواعد بثبات واتساق.', keyword: 'السلوك المنتظر' },
    en: { text: 'Make expectations consistent: teach the desired behaviours and apply the rules reliably.', keyword: 'expectations consistent' },
  } },
];

/** One tip per day, identical across rerenders/locales; browsing never needs a timer or storage write. */
export function pedagogicalTipForDay(day: string, offset = 0): PedagogicalTip {
  const epoch = Date.parse(`${day}T12:00:00Z`);
  const index = Number.isFinite(epoch) ? Math.floor(epoch / 86_400_000) : 0;
  const step = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  return PEDAGOGICAL_TIPS[((index + step) % PEDAGOGICAL_TIPS.length + PEDAGOGICAL_TIPS.length) % PEDAGOGICAL_TIPS.length];
}
