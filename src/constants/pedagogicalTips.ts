import type { AppLocale } from '../types';

interface TipText { text: string; keyword: string; quotation?: true }
interface TipSource { label: string; url: string }
export interface PedagogicalTip { id: string; source: TipSource; copy: Record<AppLocale, TipText> }

const questions = { label: 'د. إخلاص محمد عبد الحي · تعليم جديد', url: 'https://www.new-educ.com/نصائح-لأسئلة-فاعلة-في-التدريس' };
const planning = { label: 'سراب العاني · تعليم جديد', url: 'https://www.new-educ.com/خطة-التدريس-إعداد-خطة-فاعلة-قبل-كل-درس' };
const feedback = { label: 'مؤسسة الملكة رانيا · دليل التغذية الراجعة', url: 'https://qrf.org/ar/برامجنا/الدليل-الإرشادي-للتغذية-الراجعة?page=2' };
const management = { label: 'هشام البشر · تعليم جديد', url: 'https://www.new-educ.com/الإدارة-الصفية-الفعالة' };
const assessment = { label: 'الأونروا · التقييم الهادف لتحسين نوعية التعلم', url: 'https://www.unrwa.org/ar/content/المجمع-التدريبي-الثالث-التقييم-الهادف-لتحسين-نوعية-التعلم' };
const preparation = { label: 'نوري حمدون · تعليم جديد', url: 'https://www.new-educ.com/أفكار-حول-تحضير-الدروس' };
const colleagues = { label: 'فاطمة محمد الحتيرشي · تعليم جديد', url: 'https://www.new-educ.com/الزيارات-المتبادلة-و-التنمية-المهنية' };
const reflection = { label: 'د. محمود عبد المجيد رشيد عساف · تعليم جديد', url: 'https://www.new-educ.com/المعايير-المهنية-واختبارات-المهنة' };
const understanding = { label: 'زكريا الشهاوي · تعليم جديد', url: 'https://www.new-educ.com/التغذية-الراجعة-و-قياس-مستوى-الفهم' };

/** Teacher-facing excerpts from published Arabic texts, checked against the linked sources.
 * Arabic preserves short literal excerpts (at most 25 words per source across this collection).
 * French and English are practical translations/adaptations, never marked as quotations.
 * Extracts describe teaching practice, not guaranteed results or instructions addressed to pupils. */
export const PEDAGOGICAL_TIPS: readonly PedagogicalTip[] = [
  { id: 'prepare-questions', source: questions, copy: {
    fr: { text: 'Préparez les questions de votre cours avant d’entrer en classe.', keyword: 'Préparez les questions' },
    ar: { text: 'خطط جيداً لأسئلة درسك قبل أن تباشر بالتدريس', keyword: 'لأسئلة درسك', quotation: true },
    en: { text: 'Plan your lesson questions before you start teaching.', keyword: 'Plan your lesson questions' },
  } },
  { id: 'wait-time', source: questions, copy: {
    fr: { text: 'Laissez un temps de réflexion après la question, plus long si elle demande un raisonnement complexe.', keyword: 'temps de réflexion' },
    ar: { text: 'الجأ لإستخدام وقت الانتظار، وتذكر أن أسئلة المستويات الأعلى تتطلب وقت انتظار أطول', keyword: 'وقت الانتظار', quotation: true },
    en: { text: 'Allow thinking time after a question, and more time for questions requiring deeper reasoning.', keyword: 'thinking time' },
  } },
  { id: 'lesson-objective', source: planning, copy: {
    fr: { text: 'Fixez l’objectif d’apprentissage que votre séance doit permettre d’atteindre.', keyword: 'l’objectif d’apprentissage' },
    ar: { text: 'تحديد الهدف التعليمي المؤمل الوصول إليه من هذا الدرس', keyword: 'الهدف التعليمي', quotation: true },
    en: { text: 'Identify the learning objective you want your lesson to achieve.', keyword: 'learning objective' },
  } },
  { id: 'lesson-pacing', source: planning, copy: {
    fr: { text: 'Ajustez le déroulement de la séance au temps disponible, à l’effectif et aux possibilités de votre classe.', keyword: 'temps disponible' },
    ar: { text: 'الانتباه إلى التناسب بين الوقت المتاح من جهة وعدد المتعلمين وقابلياتهم من الجهة الأخرى', keyword: 'الوقت المتاح', quotation: true },
    en: { text: 'Match your lesson plan to the time available, class size and pupils’ capabilities.', keyword: 'time available' },
  } },
  { id: 'listen-to-answers', source: feedback, copy: {
    fr: { text: 'Écoutez les réponses des élèves pour comprendre leur raisonnement avant de réagir.', keyword: 'Écoutez les réponses' },
    ar: { text: 'ينبغي للمعلم أن يستمع جيدًا إلى إجابات الطلبة', keyword: 'يستمع جيدًا', quotation: true },
    en: { text: 'Listen to pupils’ answers to understand their thinking before responding.', keyword: 'Listen to pupils’ answers' },
  } },
  { id: 'timely-feedback', source: feedback, copy: {
    fr: { text: 'Choisissez le moment de votre retour pour aider les élèves à progresser dans leur travail.', keyword: 'le moment de votre retour' },
    ar: { text: 'تقديم تغذية راجعة حسنة التوقيت تدفع التعلّم إلى الأمام', keyword: 'حسنة التوقيت', quotation: true },
    en: { text: 'Time your feedback so pupils can use it to move their learning forward.', keyword: 'Time your feedback' },
  } },
  { id: 'prevent-disruption', source: management, copy: {
    fr: { text: 'Préparez des moyens de prévenir les perturbations, au lieu d’intervenir seulement lorsqu’elles apparaissent.', keyword: 'prévenir les perturbations' },
    ar: { text: 'التفكير في الأساليب الوقائية التي تقلل من الأفعال غير المرغوب فيها', keyword: 'الأساليب الوقائية', quotation: true },
    en: { text: 'Plan ways to prevent disruption instead of responding only after it happens.', keyword: 'prevent disruption' },
  } },
  { id: 'classroom-signals', source: management, copy: {
    fr: { text: 'Enseignez un signal simple pour participer, par exemple lever un doigt pour proposer une réponse.', keyword: 'un signal simple' },
    ar: { text: 'نعلم طلابنا بعض الإشارات مثل: رفع السبابة يدل على معرفة الجواب', keyword: 'بعض الإشارات', quotation: true },
    en: { text: 'Teach a simple participation signal, such as raising a finger to offer an answer.', keyword: 'participation signal' },
  } },
  { id: 'record-progress', source: assessment, copy: {
    fr: { text: 'Gardez des traces de la progression des élèves pour préparer les étapes suivantes de votre enseignement.', keyword: 'traces de la progression' },
    ar: { text: 'من الضروري أن يحتفظ المعلم بسجلات عن تقدم تعلم الطلبة', keyword: 'بسجلات', quotation: true },
    en: { text: 'Keep records of pupils’ progress to plan the next steps in your teaching.', keyword: 'records of pupils’ progress' },
  } },
  { id: 'feedback-on-the-task', source: preparation, copy: {
    fr: { text: 'Commentez la tâche et ses points positifs, plutôt que de juger la personne.', keyword: 'la tâche' },
    ar: { text: 'تغذية راجعة فعالة تركز على الإيجابيات لا السلبيات، و تركز على المهمة لا الأشخاص', keyword: 'المهمة لا الأشخاص', quotation: true },
    en: { text: 'Focus feedback on the task and its positives rather than judging the person.', keyword: 'the task' },
  } },
  { id: 'share-teaching-practice', source: colleagues, copy: {
    fr: { text: 'Échangez avec un collègue sur une pratique observée : présentation, gestion de classe ou évaluation.', keyword: 'Échangez avec un collègue' },
    ar: { text: 'يتبادل المعلمون الخبرات في الجوانب التدريسية المتنوعة كالعروض، وإدارة الصف، والتقويم، وغيرها', keyword: 'يتبادل المعلمون الخبرات', quotation: true },
    en: { text: 'Share an observed teaching practice with a colleague: presentation, classroom management or assessment.', keyword: 'with a colleague' },
  } },
  { id: 'reflect-on-teaching', source: reflection, copy: {
    fr: { text: 'Revenez sur vos décisions d’enseignant et sur leurs effets pour ajuster votre pratique.', keyword: 'vos décisions d’enseignant' },
    ar: { text: 'المعلم ممارس للتفكير والتأمل والتدبر، يقوم باستمرار بمراجعة وتقييم آثار قراراته وأفعاله على الآخرين.', keyword: 'بمراجعة وتقييم', quotation: true },
    en: { text: 'Review your teaching decisions and their effects to refine your practice.', keyword: 'teaching decisions' },
  } },
  { id: 'adapt-after-checking', source: understanding, copy: {
    fr: { text: 'Vérifiez la compréhension avant de décider de poursuivre, de reprendre l’explication ou de proposer un entraînement.', keyword: 'Vérifiez la compréhension' },
    ar: { text: 'التحقق من فهم الطلاب سيجعلك تقرر الانتقال إلى درس جديد أو إعادة الشرح لما سبق أو إجراء المزيد من التدريبات أو الأنشطة', keyword: 'التحقق من فهم الطلاب', quotation: true },
    en: { text: 'Check understanding before deciding to move on, explain again or offer more practice.', keyword: 'Check understanding' },
  } },
];

/** One tip per day, identical across rerenders/locales; browsing never needs a timer or storage write. */
export function pedagogicalTipForDay(day: string, offset = 0): PedagogicalTip {
  const epoch = Date.parse(`${day}T12:00:00Z`);
  const index = Number.isFinite(epoch) ? Math.floor(epoch / 86_400_000) : 0;
  const step = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  return PEDAGOGICAL_TIPS[((index + step) % PEDAGOGICAL_TIPS.length + PEDAGOGICAL_TIPS.length) % PEDAGOGICAL_TIPS.length];
}
