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
      title: 'Prêt pour la suite',
      detail: 'Vos contenus sont ici. On ouvre le cahier ?',
      action: 'Ouvrir le cahier',
      context: 'Prêt',
    },
  },
  ar: {
    checking: { title: 'أستعيد دفاترك', detail: 'جارٍ مزامنة المحتوى…', context: 'جارٍ التزامن', action: undefined },
    'notebook-unavailable': { title: 'لنراجع هذا الدفتر', detail: 'لم أتمكن من قراءة هذا الدفتر. نجرّب فتحه؟', context: 'القراءة غير متاحة', action: 'فتح الدفتر' },
    open: 'فتح الرفيق',
    close: 'إغلاق الرسالة',
    attention: 'تنبيه تربوي',
    create: {
      title: 'نبدأ معاً؟',
      detail: 'أضف قسمك الأول، وسأرشدك إلى الخطوة التالية.',
      action: 'إضافة القسم',
      context: 'البداية',
    },
    schedule: {
      title: 'استعمال الزمن',
      detail: 'تنقص هذا القسم حصصه الأسبوعية. نحدّدها؟',
      action: 'ضبط الحصص',
    },
    'active-session': {
      title: 'حصة جارية',
      detail: 'أنهيت محتوى؟ حدّده لإسناد تاريخ الحصة إليه.',
      action: 'فتح الدفتر',
      context: 'الآن',
    },
    'notebook-issue': {
      title: 'نقطة نراجعها معاً',
      detail: 'وجدت نقطة تستحق المراجعة في هذا الدفتر.',
      action: 'مراجعة الدفتر',
      context: 'للمعاينة',
    },
    'notebook-empty': {
      title: 'لنجهّز هذا الدفتر',
      detail: 'هذا الدفتر ينتظر محتواه الأول. نبدأ؟',
      action: 'بدء الدفتر',
      context: 'جديد',
    },
    ready: {
      title: 'جاهز للخطوة التالية',
      detail: 'محتوياتك هنا. نفتح الدفتر؟',
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
      title: 'Ready for the next step',
      detail: 'Your content is here. Shall we open the notebook?',
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
    if (guidance.remaining > 1) detail = locale === 'fr'
      ? `${new Intl.NumberFormat(locale).format(guidance.remaining)} classes à planifier. ${guidance.remaining > 5 ? 'Une à la fois : on commence ici ?' : 'Commençons par celle-ci.'}`
      : locale === 'en' ? `${new Intl.NumberFormat(locale).format(guidance.remaining)} classes need a timetable. Let’s start with this one.` : `${context}. خطوة بخطوة، نبدأ بهذا القسم؟`;
    if (guidance.remaining > 1) detailEmphasis = locale === 'fr' ? `${new Intl.NumberFormat(locale).format(guidance.remaining)} classes`
      : locale === 'en' ? `${new Intl.NumberFormat(locale).format(guidance.remaining)} classes`
      : guidance.remaining === 2 ? 'قسمان' : `${new Intl.NumberFormat(locale).format(guidance.remaining)} ${guidance.remaining <= 10 ? 'أقسام' : 'قسماً'}`;
  } else if (guidance.step === 'notebook-issue') {
    context = notebookIssuesLabel(guidance.remaining, locale);
    detail = ADVICE_COPY[locale][guidance.issueCode];
    if (guidance.count > 1) {
      const number = new Intl.NumberFormat(locale).format(guidance.count);
      detail += locale === 'fr' ? ` ${number} passages concernés.` : locale === 'en' ? ` ${number} places to check.` : ` المواضع المعنية: ${number}.`;
    }
  } else if (guidance.step === 'notebook-empty') {
    context = emptyNotebooksLabel(guidance.remaining, locale);
    if (guidance.remaining > 1) detail = locale === 'fr' ? `${context}. Commençons par celui-ci.`
      : locale === 'en' ? `${context}. Let’s start with this one.` : `${context}. نبدأ بهذا الدفتر؟`;
  }

  return {
    id: guidance.step,
    title: base.title,
    detail,
    ...(detailEmphasis ? { detailEmphasis } : {}),
    action: base.action,
    ...(context ? { context } : {}),
    ...(guidance.step !== 'create'
      ? { subject: formatLocalizedClassDisplayName(guidance.className, locale) }
      : {}),
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
  if (count === 1) return 'دفتر ينتظر محتواه';
  if (count === 2) return 'دفتران ينتظران المحتوى';
  return count >= 3 && count <= 10 ? `${number} دفاتر تنتظر المحتوى` : `${number} دفتراً بانتظار المحتوى`;
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
    unclosedFormula: 'تبدو صيغة رياضية غير مكتملة. نراجع علامات فتحها وإغلاقها؟',
    outOfOrderSessions: 'بعض التواريخ لا تتبع ترتيب المحتوى. نراجع الحصص المعنية؟',
    duplicateBlocks: 'وجدت عناصر متطابقة مكررة. نتحقق إن كان التكرار مقصوداً؟',
    emptyStructure: 'بعض الفقرات ما زالت فارغة. أكملها حسب تقدمك.',
    controlCharacters: 'في النص الملصق رموز خفية غير معتادة. نراجعه معاً؟',
  },
  en: {
    unclosedFormula: 'A formula seems incomplete. Shall we check its delimiters?',
    outOfOrderSessions: 'Some dates don’t follow the content order. Shall we check those sessions?',
    duplicateBlocks: 'I found repeated blocks. Shall we check whether that’s intentional?',
    emptyStructure: 'Some sections are still empty. Complete them as you progress.',
    controlCharacters: 'The pasted text contains unusual invisible characters. Shall we check it?',
  },
} as const;
