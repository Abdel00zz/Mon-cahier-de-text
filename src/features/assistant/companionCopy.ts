import type { AppLocale } from '@/types';
import type { ClassGuidance } from '@/domain/assistant/classGuidance';
import { formatLocalizedClassDisplayName } from '@/constants/class-levels';

export interface CompanionMessage {
  id: string;
  title: string;
  detail: string;
  subject?: string;
  action?: string;
  context?: string;
}

const COPY = {
  fr: {
    checking: { title: 'Vos cahiers arrivent', detail: 'Synchronisation en cours…', context: 'Synchronisation', action: undefined },
    'notebook-unavailable': { title: 'Vérifions ce cahier', detail: 'Lecture indisponible. Ouvrez le cahier pour réessayer.', context: 'Lecture indisponible', action: 'Ouvrir le cahier' },
    open: 'Ouvrir le compagnon',
    close: 'Fermer le message',
    attention: 'Action requise',
    create: {
      title: 'Créer une classe',
      detail: 'Votre premier cahier commence ici.',
      action: 'Créer ma classe',
      context: 'Démarrage',
    },
    schedule: {
      title: 'Horaires',
      detail: 'Ajoutez ses créneaux hebdomadaires.',
      action: 'Définir les horaires',
    },
    'active-session': {
      title: 'Séance en cours',
      detail: 'Sélectionnez les contenus réalisés pour les dater.',
      action: 'Ouvrir le cahier',
      context: 'En cours',
    },
    'notebook-issue': {
      title: 'Ajustement du cahier',
      detail: 'Quelques éléments à vérifier.',
      action: 'Vérifier le cahier',
      context: 'À vérifier',
    },
    'notebook-empty': {
      title: 'Cahier vierge',
      detail: 'Ajoutez votre premier contenu.',
      action: 'Ouvrir le cahier',
      context: 'À débuter',
    },
    ready: {
      title: 'Cahier prêt',
      detail: 'Retrouvez vos contenus et vos séances.',
      action: 'Ouvrir le cahier',
      context: 'Prêt',
    },
  },
  ar: {
    checking: { title: 'دفاترك في الطريق', detail: 'جارٍ مزامنة المحتوى…', context: 'جارٍ التزامن', action: undefined },
    'notebook-unavailable': { title: 'لنراجع هذا الدفتر', detail: 'تعذّرت القراءة. افتح الدفتر للمحاولة مجدداً.', context: 'القراءة غير متاحة', action: 'فتح الدفتر' },
    open: 'فتح الرفيق',
    close: 'إغلاق الرسالة',
    attention: 'تنبيه تربوي',
    create: {
      title: 'إضافة قسم',
      detail: 'ابدأ دفتر النصوص بقسمك الأول.',
      action: 'إضافة القسم',
      context: 'البداية',
    },
    schedule: {
      title: 'ضبط حصص',
      detail: 'حدّد حصصه الأسبوعية.',
      action: 'ضبط الحصص',
    },
    'active-session': {
      title: 'حصة جارية',
      detail: 'حدّد المحتويات المنجزة لإسناد تاريخ الحصة.',
      action: 'فتح الدفتر',
      context: 'الآن',
    },
    'notebook-issue': {
      title: 'ملاحظة تربوية',
      detail: 'تنبيه في دفتر النصوص يتطلب المراجعة (صيغة رياضية أو تسلسل التواريخ).',
      action: 'مراجعة الدفتر',
      context: 'للمعاينة',
    },
    'notebook-empty': {
      title: 'دفتر غير ممسوك',
      detail: 'أضف المحتوى الأول.',
      action: 'بدء الدفتر',
      context: 'جديد',
    },
    ready: {
      title: 'الدفتر جاهز',
      detail: 'محتوياتك وحصصك في مكان واحد.',
      action: 'فتح الدفتر',
      context: 'جاهز',
    },
  },
  en: {
    checking: { title: 'Your notebooks are arriving', detail: 'Syncing your content…', context: 'Syncing', action: undefined },
    'notebook-unavailable': { title: 'Let’s check this notebook', detail: 'Content unavailable. Open the notebook to try again.', context: 'Reading unavailable', action: 'Open notebook' },
    open: 'Open companion',
    close: 'Close message',
    attention: 'Action needed',
    create: {
      title: 'Create class',
      detail: 'Your first notebook starts here.',
      action: 'Create class',
      context: 'Getting started',
    },
    schedule: {
      title: 'Timetable',
      detail: 'Add its weekly time slots.',
      action: 'Set timetable',
    },
    'active-session': {
      title: 'Session in progress',
      detail: 'Select completed content to date it.',
      action: 'Open notebook',
      context: 'Live',
    },
    'notebook-issue': {
      title: 'Notebook review',
      detail: 'Some items in the notebook need attention (formulas or dates).',
      action: 'Review notebook',
      context: 'Review',
    },
    'notebook-empty': {
      title: 'Blank notebook',
      detail: 'Add your first content.',
      action: 'Open notebook',
      context: 'Start',
    },
    ready: {
      title: 'Notebook ready',
      detail: 'Find your content and sessions here.',
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

  if (guidance.step === 'schedule') {
    context = pendingClassesLabel(guidance.remaining, locale);
    if (guidance.remaining > 1) detail = `${context}.`;
  } else if (guidance.step === 'notebook-issue') {
    context = notebookIssuesLabel(guidance.remaining, locale);
    detail = `${ADVICE_COPY[locale][guidance.issueCode]} (${new Intl.NumberFormat(locale).format(guidance.count)})`;
  } else if (guidance.step === 'notebook-empty') {
    context = emptyNotebooksLabel(guidance.remaining, locale);
  }

  return {
    id: guidance.step,
    title: base.title,
    detail,
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
  if (locale === 'fr') return count === 1 ? '1 cahier vierge' : `${number} cahiers vierges`;
  if (locale === 'en') return `${number} ${count === 1 ? 'blank notebook' : 'blank notebooks'}`;
  if (count === 1) return 'دفتر غير ممسوك';
  if (count === 2) return 'دفتران غير ممسوكين';
  return count >= 3 && count <= 10 ? `${number} دفاتر غير ممسوكة` : `${number} دفتراً غير ممسوك`;
}

// Same diagnostic codes as notebookAdvisor; each suggestion explains the actual finding.
const ADVICE_COPY = {
  fr: {
    unclosedFormula: 'Une formule semble incomplète. Vérifiez ses délimiteurs dans le cahier.',
    outOfOrderSessions: 'Certaines dates ne suivent pas l’ordre du contenu. Vérifiez les séances concernées.',
    duplicateBlocks: 'Des blocs identiques apparaissent plusieurs fois. Vérifiez si cette répétition est voulue.',
    emptyStructure: 'Certaines rubriques sont encore vides. Complétez-les à votre rythme.',
    controlCharacters: 'Le texte contient des caractères invisibles inhabituels. Vérifiez le contenu collé.',
  },
  ar: {
    unclosedFormula: 'تبدو صيغة رياضية غير مكتملة. راجع علامات فتحها وإغلاقها في الدفتر.',
    outOfOrderSessions: 'بعض التواريخ لا تتبع ترتيب المحتوى. راجع الحصص المعنية.',
    duplicateBlocks: 'توجد عناصر متطابقة مكررة. تأكد إن كان تكرارها مقصوداً.',
    emptyStructure: 'بعض الفقرات ما زالت فارغة. أكملها حسب تقدمك.',
    controlCharacters: 'يتضمن النص رموزاً خفية غير معتادة. راجع المحتوى الملصق.',
  },
  en: {
    unclosedFormula: 'A formula seems incomplete. Check its opening and closing delimiters.',
    outOfOrderSessions: 'Some dates do not follow the content order. Check the relevant sessions.',
    duplicateBlocks: 'Identical blocks appear more than once. Check whether the repetition is intentional.',
    emptyStructure: 'Some sections are still empty. Complete them as you progress.',
    controlCharacters: 'The text contains unusual invisible characters. Check the pasted content.',
  },
} as const;
