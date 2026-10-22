import type { AppLocale } from '@/types';
import type { ClassGuidance } from '@/domain/assistant/classGuidance';
import { formatLocalizedClassDisplayName } from '@/constants/class-levels';

export interface CompanionMessage {
  id: string;
  title: string;
  detail: string;
  /** Literal text to emphasize; never parsed as HTML or Markdown. */
  detailEmphasis?: string;
  subject?: string;
  action?: string;
  context?: string;
}

const COPY = {
  fr: {
    checking: { title: 'Je retrouve vos cahiers', detail: 'Synchronisation en cours…', context: 'Synchronisation', action: undefined },
    'notebook-unavailable': { title: 'Vérifions ce cahier', detail: 'Je n’arrive pas à lire ce cahier. On essaie de l’ouvrir ?', context: 'Lecture indisponible', action: 'Ouvrir le cahier' },
    open: 'Ouvrir le compagnon',
    close: 'Fermer le message',
    attention: 'Action requise',
    create: {
      title: 'On commence ?',
      detail: 'Ajoutez votre première classe. Je vous guide pour la suite.',
      action: 'Créer ma classe',
      context: 'Démarrage',
    },
    schedule: {
      title: 'Emploi du temps',
      detail: 'Il manque ses créneaux. On les fixe ?',
      action: 'Régler les horaires',
    },
    'active-session': {
      title: 'Séance en cours',
      detail: 'Un contenu terminé ? Sélectionnez-le pour lui attribuer la date de la séance.',
      action: 'Ouvrir le cahier',
      context: 'En cours',
    },
    'notebook-issue': {
      title: 'Un point à regarder',
      detail: 'J’ai repéré un point à vérifier avec vous.',
      action: 'Vérifier le cahier',
      context: 'À vérifier',
    },
    'notebook-empty': {
      title: 'À vous de jouer',
      detail: 'Ce cahier attend son premier contenu. On le prépare ?',
      action: 'Ouvrir le cahier',
      context: 'À débuter',
    },
    ready: {
      title: 'Tout est en ordre',
      detail: 'Vos cahiers et votre emploi du temps sont parfaitement en ordre. Continuez sur votre belle lancée, bravo !',
      action: 'Ouvrir le cahier',
      context: 'Prêt',
    },
  },
  ar: {
    checking: { title: 'أستعيد دفاتر حصصك', detail: 'جارٍ مزامنة المحتوى وتحديث الدفاتر…', context: 'جارٍ التزامن', action: undefined },
    'notebook-unavailable': { title: 'معاينة الدفتر', detail: 'تعذرت قراءة هذا الدفتر تلقائياً. هل نحاول فتحه معاً؟', context: 'القراءة غير متاحة', action: 'فتح الدفتر' },
    open: 'فتح الرفيق',
    close: 'إغلاق الرسالة',
    attention: 'تنبيه تربوي',
    create: {
      title: 'مرحباً بك مع رفيقك',
      detail: 'لنبدأ معاً بإضافة قسمك الأول، وسأرافقك خطوة بخطوة في تنظيم دروسك وحصصك.',
      action: 'إضافة قسم جديد',
      context: 'البداية',
    },
    schedule: {
      title: 'تنظيم استعمال الزمن',
      detail: 'ينقصنا تحديد الحصص الأسبوعية في استعمال الزمن لتنظيم مواعيدك بدقة. هل نضبطها معاً؟',
      action: 'ضبط الحصص الآن',
    },
    'active-session': {
      title: 'حصة جارية الآن',
      detail: 'حصتك جارية حالياً؛ اختر درساً أو نشاطاً منجزاً لإسناد تاريخ اليوم إليه وتثبيته مباشرة.',
      action: 'تسجيل محتوى الحصة',
      context: 'الآن',
    },
    'notebook-issue': {
      title: 'ملاحظة للمراجعة',
      detail: 'لاحظت نقطة تستحق الانتباه في هذا الدفتر لنراجعها معاً.',
      action: 'مراجعة الدفتر',
      context: 'للمعاينة',
    },
    'notebook-empty': {
      title: 'تجهيز أول درس',
      detail: 'هذا الدفتر ينتظر درسه الأول. ما رأيك أن نبدأ بإعداده معاً؟',
      action: 'بدء تحضير الدفتر',
      context: 'جديد',
    },
    ready: {
      title: 'كل شيء على ما يرام',
      detail: 'دفاترك واستعمال الزمن في أفضل حال ومضبوطة بدقة. استمر في هذا التقدم الرائع، وبرافو!',
      action: 'فتح الدفتر',
      context: 'جاهز',
    },
  },
  en: {
    checking: { title: 'Finding your notebooks', detail: 'Syncing your content…', context: 'Syncing', action: undefined },
    'notebook-unavailable': { title: 'Let’s check this notebook', detail: 'I couldn’t read this notebook. Shall we try opening it?', context: 'Reading unavailable', action: 'Open notebook' },
    open: 'Open companion',
    close: 'Close message',
    attention: 'Action needed',
    create: {
      title: 'Shall we start?',
      detail: 'Add your first class. I’ll guide you through the next step.',
      action: 'Create class',
      context: 'Getting started',
    },
    schedule: {
      title: 'Timetable',
      detail: 'This class needs its weekly slots. Shall we set them?',
      action: 'Set timetable',
    },
    'active-session': {
      title: 'Session in progress',
      detail: 'Finished some content? Select it to assign the session date.',
      action: 'Open notebook',
      context: 'Live',
    },
    'notebook-issue': {
      title: 'Something to check',
      detail: 'I spotted something worth checking together.',
      action: 'Review notebook',
      context: 'Review',
    },
    'notebook-empty': {
      title: 'Let’s get started',
      detail: 'This notebook is waiting for its first content. Shall we add it?',
      action: 'Open notebook',
      context: 'Start',
    },
    ready: {
      title: 'All set and ready',
      detail: 'Everything is in order and up to date. Keep up the great work, bravo!',
      action: 'Open notebook',
      context: 'Ready',
    },
  },
} as const;

export const companionLabels = (locale: AppLocale) => COPY[locale];

export function classGuidanceMessage(guidance: ClassGuidance, locale: AppLocale): CompanionMessage {
  const base = COPY[locale][guidance.step];
  let context: string | undefined = 'context' in base ? base.context : undefined;
  let detail: string = base.detail;
  let detailEmphasis: string | undefined;

  if (guidance.step === 'schedule') {
    context = pendingClassesLabel(guidance.remaining, locale);
  } else if (guidance.step === 'notebook-issue') {
    context = notebookIssuesLabel(guidance.remaining, locale);
    detail = ADVICE_COPY[locale][guidance.issueCode];
    if (guidance.count > 1) {
      const number = new Intl.NumberFormat(locale).format(guidance.count);
      detail += locale === 'fr' ? ` ${number} passages concernés.` : locale === 'en' ? ` ${number} places to check.` : ` المواضع المعنية: ${number}.`;
    }
  } else if (guidance.step === 'notebook-empty') {
    context = emptyNotebooksLabel(guidance.remaining, locale);
  }

  const name = guidance.step === 'create' ? undefined
    : formatLocalizedClassDisplayName(guidance.className, locale).replace(/[\r\n\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
  if (name) {
    if (guidance.step === 'schedule') detail = locale === 'fr' ? `Fixons les créneaux de ${name} pour retrouver ses séances dans votre emploi du temps.`
      : locale === 'ar' ? `لنضبط حصص قسم ${name} في استعمال الزمن لتتابع مواعيد حصصك بكل سهولة ووضوح.`
        : `Shall we set the weekly slots for ${name} so you can find its sessions in your timetable?`;
    else if (guidance.step === 'active-session') detail = locale === 'fr' ? `Votre séance avec ${name} est en cours ; sélectionnez le contenu réalisé pour lui attribuer la date de cette séance.`
      : locale === 'ar' ? `حصتك مع قسم ${name} جارية الآن؛ اختر المحتوى المنجز لإسناد تاريخ اليوم إليه وتثبيته مباشرة.`
        : `Your session with ${name} is in progress; select the content covered to assign this session’s date.`;
    else if (guidance.step === 'notebook-empty') detail = locale === 'fr' ? `Le cahier de ${name} attend son premier contenu ; commençons par ce que vous souhaitez enseigner.`
      : locale === 'ar' ? `دفتر قسم ${name} في انتظار درسه الأول؛ ما رأيك أن نفتحه ونبدأ بما ترغب في تدريسه؟`
        : `The notebook for ${name} is waiting for its first content; shall we start with what you want to teach?`;
    else if (guidance.step === 'ready') detail = locale === 'fr' ? `Tout est en ordre pour ${name} ! Vos contenus sont prêts et à jour, continuez ainsi, bravo !`
      : locale === 'ar' ? `كل شيء على ما يرام لقسم ${name} ومضبوط تماماً! تدرجك ممتاز ودفترك جاهز، واصل تقدمك وبرافو!`
        : `Everything is in order for ${name}! Your content is ready and up to date, keep up the great work, bravo!`;
    else detail = `${locale === 'ar' ? `في دفتر قسم ${name}، ` : locale === 'en' ? `For ${name}: ` : `Dans le cahier de ${name} : `}${detail}`;
    detailEmphasis = name;
  }

  return {
    id: guidance.step,
    title: base.title,
    detail,
    ...(detailEmphasis ? { detailEmphasis } : {}),
    action: base.action,
    ...(context ? { context } : {}),
  };
}

function pendingClassesLabel(count: number, locale: AppLocale): string {
  const number = new Intl.NumberFormat(locale).format(count);
  if (locale === 'fr') return count === 1 ? '1 classe sans horaires' : `${number} classes sans horaires`;
  if (locale === 'en') return `${number} ${count === 1 ? 'class unscheduled' : 'classes unscheduled'}`;
  if (count === 1) return 'قسم بدون حصص';
  if (count === 2) return 'قسمان بدون حصص';
  return count >= 3 && count <= 10 ? `${number} أقسام بدون حصص` : `${number} قسماً بدون حصص`;
}

function notebookIssuesLabel(count: number, locale: AppLocale): string {
  const number = new Intl.NumberFormat(locale).format(count);
  if (locale === 'fr') return count === 1 ? '1 remarque à vérifier' : `${number} remarques à vérifier`;
  if (locale === 'en') return `${number} ${count === 1 ? 'item to review' : 'items to review'}`;
  if (count === 1) return 'ملاحظة للمراجعة';
  if (count === 2) return 'ملاحظتان للمراجعة';
  return count >= 3 && count <= 10 ? `${number} ملاحظات للمراجعة` : `${number} ملاحظة للمراجعة`;
}

function emptyNotebooksLabel(count: number, locale: AppLocale): string {
  const number = new Intl.NumberFormat(locale).format(count);
  if (locale === 'fr') return count === 1 ? '1 cahier à préparer' : `${number} cahiers à préparer`;
  if (locale === 'en') return `${number} ${count === 1 ? 'blank notebook' : 'blank notebooks'}`;
  if (count === 1) return 'دفتر في انتظار محتواه';
  if (count === 2) return 'دفتران في انتظار المحتوى';
  return count >= 3 && count <= 10 ? `${number} دفاتر في انتظار المحتوى` : `${number} دفتراً بانتظار المحتوى`;
}

// Same diagnostic codes as notebookAdvisor; each suggestion explains the actual finding.
const ADVICE_COPY = {
  fr: {
    unclosedFormula: 'Une formule semble incomplète. On regarde ses délimiteurs ?',
    outOfOrderSessions: 'Certaines dates ne suivent pas l’ordre du contenu. On vérifie les séances concernées ?',
    duplicateBlocks: 'Des blocs identiques se répètent. On vérifie si c’est voulu ?',
    emptyStructure: 'Ces rubriques attendent du contenu. Complétez-les à votre rythme.',
    controlCharacters: 'Le texte collé contient des caractères invisibles inhabituels. On le vérifie ?',
  },
  ar: {
    unclosedFormula: 'تبدو إحدى الصيغ الرياضية غير مكتملة الإغلاق ($). هل نراجع علامات فتحها وإغلاقها؟',
    outOfOrderSessions: 'بعض تواريخ الحصص لا تتبع التسلسل الزمني للمحتوى. هل نراجع ترتيبها معاً؟',
    duplicateBlocks: 'وجدت عناصر متطابقة ومكررة في هذا الدفتر. هل نتحقق إن كان ذلك مقصوداً؟',
    emptyStructure: 'توجد بعض العناوين الفارغة في انتظار محتواها. يمكنك إكمالها حسب وتيرتك.',
    controlCharacters: 'النص الملصق يحتوي على بعض الرموز غير المرئية. هل نراجعه معاً لتنظيفه؟',
  },
  en: {
    unclosedFormula: 'A formula seems incomplete. Shall we check its delimiters?',
    outOfOrderSessions: 'Some dates don’t follow the content order. Shall we check those sessions?',
    duplicateBlocks: 'I found repeated blocks. Shall we check whether that’s intentional?',
    emptyStructure: 'Some sections are still empty. Complete them as you progress.',
    controlCharacters: 'The pasted text contains unusual invisible characters. Shall we check it?',
  },
} as const;
