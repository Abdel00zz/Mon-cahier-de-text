import type { AppLocale } from '@/types';
import type { ClassGuidance } from '@/domain/assistant/classGuidance';
import type { CompanionNotificationPrompt } from '@/domain/assistant/companionDecision';
import type { CompanionMessage } from './companionMessage';
import { companionClassName } from './companionClassName';
import { notebookFollowupMessage } from './notebookFollowupCopy';

export type { CompanionMessage } from './companionMessage';

const COPY = {
  fr: {
    checking: { title: 'Je retrouve vos cahiers', detail: 'Synchronisation en cours…', context: 'Synchronisation', action: undefined },
    'notebook-unavailable': { title: 'Cahier illisible', detail: 'Le cahier n’a pas pu être lu. Ouvrez-le pour vérifier.', context: 'Lecture impossible', action: 'Ouvrir le cahier' },
    open: 'Ouvrir le compagnon',
    close: 'Fermer le message',
    skip: 'Plus tard',
    attention: 'Action requise',
    'install-app': {
      title: 'Installer l’application',
      detail: 'Ouvrez votre cahier depuis l’écran d’accueil.',
      action: 'Installer l’application',
      context: 'Installation',
    },
    'enable-notifications': {
      title: 'Activer les notifications',
      detail: 'Un rappel avant chaque séance, sur cet appareil.',
      action: 'Activer les notifications',
      settingsDetail: 'Les notifications sont désactivées dans les réglages de votre téléphone. Autorisez-les pour recevoir les rappels de vos séances et de vos cahiers.',
      settingsAction: 'Ouvrir les paramètres de notification',
      settingsLink: 'Paramètres de notification',
      context: 'Notifications',
    },
    create: {
      title: 'Créer une classe',
      detail: 'Créez votre première classe pour ouvrir son cahier.',
      action: 'Créer une classe',
      context: 'Démarrage',
    },
    schedule: {
      title: 'Créneaux manquants',
      detail: 'Aucun créneau pour cette classe. Ajoutez-en un.',
      action: 'Ajouter un créneau',
    },
    'next-session': { title: 'Prochaine séance', detail: 'Votre prochaine séance approche.', action: 'Ouvrir le cahier', context: 'À venir' },
    'active-session': {
      title: 'Séance en cours',
      detail: 'Sélectionnez le contenu abordé pour le dater.',
      action: 'Ouvrir le cahier',
      context: 'En cours',
    },
    'notebook-issue': {
      title: 'À vérifier',
      detail: 'Un point précis à corriger dans ce cahier.',
      action: 'Vérifier',
      context: 'À vérifier',
    },
    'notebook-empty': {
      title: 'À vous de jouer',
      detail: 'Ajoutez votre premier contenu pour démarrer.',
      action: 'Ouvrir le cahier',
      context: 'À débuter',
    },
    'evaluation-conflict': {
      title: 'Évaluations à corriger',
      detail: 'Des dates se chevauchent ou se répètent.',
      action: 'Corriger',
      context: 'Évaluations',
    },
    'roster-incomplete': {
      title: 'Liste à compléter',
      detail: 'La liste des élèves de cette classe est incomplète.',
      action: 'Compléter',
      context: 'Élèves',
    },
    standby: {
      title: 'Rappels en pause',
      detail: 'Reprenez-les quand vous voulez.',
      action: undefined,
      context: 'En veille',
    },
    ready: {
      title: 'Tout est à jour',
      detail: 'Aucun point à vérifier : vos cahiers sont organisés.',
      action: 'Ouvrir le cahier',
      context: 'Prêt',
    },
  },
  ar: {
    checking: { title: 'أستعيد دفاتر حصصك', detail: 'جارٍ مزامنة المحتوى وتحديث الدفاتر…', context: 'جارٍ التزامن', action: undefined },
    'notebook-unavailable': { title: 'دفتر غير مقروء', detail: 'تعذّرت قراءة الدفتر. افتحه للتحقق.', context: 'القراءة غير متاحة', action: 'فتح الدفتر' },
    open: 'فتح الرفيق',
    close: 'إغلاق الرسالة',
    skip: 'لاحقاً',
    attention: 'تنبيه تربوي',
    'install-app': {
      title: 'تثبيت التطبيق',
      detail: 'أضف التطبيق إلى الشاشة الرئيسية لتفتح دفترك مباشرة.',
      action: 'تثبيت التطبيق',
      context: 'تثبيت التطبيق',
    },
    'enable-notifications': {
      title: 'تفعيل الإشعارات',
      detail: 'فعّل الإشعارات ليصلك تذكير قبل حصصك على هذا الجهاز.',
      action: 'تفعيل الإشعارات',
      settingsDetail: 'الإشعارات معطّلة حالياً في إعدادات هاتفك. اسمح بها للتوصل بتذكيرات الحصص ومتابعة دفاتر نصوصك.',
      settingsAction: 'فتح إعدادات الإشعارات',
      settingsLink: 'إعدادات الإشعارات',
      context: 'الإشعارات',
    },
    create: {
      title: 'إنشاء قسم',
      detail: 'أضف قسمك الأول لفتح دفتره.',
      action: 'إضافة قسم',
      context: 'البداية',
    },
    schedule: {
      title: 'حصص غير محددة',
      detail: 'لا توجد حصة أسبوعية لهذا القسم. أضف أول حصة.',
      action: 'إضافة حصة',
    },
    'next-session': { title: 'الحصة القادمة', detail: 'حصتك القادمة تقترب.', action: 'فتح الدفتر', context: 'قريباً' },
    'active-session': {
      title: 'حصة جارية الآن',
      detail: 'حدّد المحتوى المنجز لإسناد تاريخ اليوم إليه.',
      action: 'فتح الدفتر',
      context: 'الآن',
    },
    'notebook-issue': {
      title: 'نقطة للمراجعة',
      detail: 'توجد نقطة محددة تحتاج إلى تصحيح في هذا الدفتر.',
      action: 'مراجعة',
      context: 'للمعاينة',
    },
    'notebook-empty': {
      title: 'تجهيز أول درس',
      detail: 'أضف أول محتوى لبدء الدفتر.',
      action: 'فتح الدفتر',
      context: 'جديد',
    },
    'evaluation-conflict': {
      title: 'تقويمات للتصحيح',
      detail: 'تتداخل بعض التواريخ أو تتكرر.',
      action: 'تصحيح',
      context: 'تقويمات',
    },
    'roster-incomplete': {
      title: 'لائحة ناقصة',
      detail: 'لائحة التلاميذ لهذا القسم غير مكتملة.',
      action: 'إكمال',
      context: 'التلاميذ',
    },
    standby: {
      title: 'التنبيهات متوقفة',
      detail: 'استعدها عندما تشاء.',
      action: undefined,
      context: 'في الانتظار',
    },
    ready: {
      title: 'كل شيء محدّث',
      detail: 'لا توجد حالياً ملاحظات : دفاترك منظمة.',
      action: 'فتح الدفتر',
      context: 'جاهز',
    },
  },
  en: {
    checking: { title: 'Finding your notebooks', detail: 'Syncing your content…', context: 'Syncing', action: undefined },
    'notebook-unavailable': { title: 'Notebook unreadable', detail: 'The notebook could not be read. Open it to check.', context: 'Reading unavailable', action: 'Open notebook' },
    open: 'Open companion',
    close: 'Close message',
    skip: 'Later',
    attention: 'Action needed',
    'install-app': {
      title: 'Install application',
      detail: 'Open your notebook directly from your home screen.',
      action: 'Install application',
      context: 'Installation',
    },
    'enable-notifications': {
      title: 'Enable notifications',
      detail: 'Get a reminder before lessons on this device.',
      action: 'Enable notifications',
      settingsDetail: 'Notifications are currently disabled in your phone settings. Allow them to receive session and notebook reminders.',
      settingsAction: 'Open notification settings',
      settingsLink: 'Notification settings',
      context: 'Notifications',
    },
    create: {
      title: 'Create a class',
      detail: 'Create your first class to open its notebook.',
      action: 'Create a class',
      context: 'Getting started',
    },
    schedule: {
      title: 'Missing slots',
      detail: 'This class has no weekly slot. Add one.',
      action: 'Add a slot',
    },
    'next-session': { title: 'Next session', detail: 'Your next session is coming up.', action: 'Open notebook', context: 'Upcoming' },
    'active-session': {
      title: 'Session in progress',
      detail: 'Select the content you covered to date it.',
      action: 'Open notebook',
      context: 'Live',
    },
    'notebook-issue': {
      title: 'To check',
      detail: 'One precise item needs fixing in this notebook.',
      action: 'Check',
      context: 'Review',
    },
    'notebook-empty': {
      title: 'Let’s get started',
      detail: 'Add your first content to get started.',
      action: 'Open notebook',
      context: 'Start',
    },
    'evaluation-conflict': {
      title: 'Assessments to fix',
      detail: 'Some dates overlap or repeat.',
      action: 'Fix',
      context: 'Assessments',
    },
    'roster-incomplete': {
      title: 'Roster to complete',
      detail: 'The student roster for this class is incomplete.',
      action: 'Complete',
      context: 'Students',
    },
    standby: {
      title: 'Reminders paused',
      detail: 'Bring them back whenever you want.',
      action: undefined,
      context: 'Standby',
    },
    ready: {
      title: 'Everything is up to date',
      detail: 'Nothing to check: your notebooks are organized.',
      action: 'Open notebook',
      context: 'Ready',
    },
  },
} as const;

export const companionLabels = (locale: AppLocale) => COPY[locale];

export function companionInstallAppMessage(locale: AppLocale): CompanionMessage {
  const base = COPY[locale]['install-app'];
  return {
    id: 'install-app',
    title: base.title,
    detail: base.detail,
    action: base.action,
    context: base.context,
  };
}

export function companionEnableNotificationsMessage(
  locale: AppLocale,
  mode: CompanionNotificationPrompt = 'activate',
): CompanionMessage {
  const base = COPY[locale]['enable-notifications'];
  return {
    id: 'enable-notifications',
    title: base.title,
    detail: mode === 'settings' ? base.settingsDetail : base.detail,
    action: mode === 'settings' ? base.settingsAction : base.action,
    context: base.context,
  };
}

export function classGuidanceMessage(guidance: ClassGuidance, locale: AppLocale): CompanionMessage {
  if (guidance.step === 'notebook-followup') return notebookFollowupMessage(guidance, locale);
  const base = COPY[locale][guidance.step];
  if (guidance.step === 'create' || guidance.step === 'standby') return { id: guidance.step, ...base };
  const name = companionClassName(guidance.className, locale);
  const tr = (fr: string, ar: string, en: string) => locale === 'ar' ? ar : locale === 'en' ? en : fr;
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  let context = 'context' in base ? String(base.context) : '';
  let detail: string;
  switch (guidance.step) {
    case 'schedule':
      context = pendingClassesLabel(guidance.remaining, locale);
      detail = tr(`Aucun créneau n’est prévu pour ${name}. Choisissez sa première plage dans l’emploi du temps.`,
        `لم تُحدَّد حصص قسم ${name} بعد. اختر له خانة في استعمال الزمن.`,
        `${name} has no weekly slot. Choose its first slot in the timetable.`);
      break;
    case 'active-session': {
      const live = tr(`La séance avec ${name} est en cours.`, `حصتك مع قسم ${name} جارية الآن.`, `Your lesson with ${name} is in progress.`);
      const next = guidance.notebook === 'dated-today'
        ? tr('Du contenu porte déjà la date d’aujourd’hui.', 'يوجد محتوى مؤرّخ بتاريخ اليوم.', 'Some content already has today’s date.')
        : guidance.notebook === 'empty'
        ? tr('Ajoutez le premier contenu au cahier.', 'أضف أول محتوى إلى الدفتر.', 'Add the first item to the notebook.')
        : guidance.notebook === 'has-content'
        ? tr('Sélectionnez le contenu abordé pour lui attribuer la date du jour.', 'حدّد المحتوى المنجز لإسناد تاريخ اليوم إليه.', 'Select the material you covered to give it today’s date.') : '';
      detail = [live, next].filter(Boolean).join(' ');
      break;
    }
    case 'next-session':
      detail = tr(`${name} · ${guidance.scheduleLabel}`, `قسم ${name} · ${guidance.scheduleLabel}`, `${name} · ${guidance.scheduleLabel}`);
      break;
    case 'notebook-empty':
      context = emptyNotebooksLabel(guidance.remaining, locale);
      detail = tr(`Le cahier de ${name} n’a pas encore de cours. Ajoutez votre premier contenu.`,
        `لا يوجد درس بعد في دفتر قسم ${name}. أضف أول محتوى.`, `There are no lessons in the notebook for ${name} yet. Add the first item.`);
      break;
    case 'notebook-issue':
      context = notebookIssuesLabel(guidance.remaining, locale);
      detail = `${name} : ${ADVICE_COPY[locale][guidance.issueCode]}`;
      if (guidance.count > 1) detail += tr(` Passages concernés : ${number(guidance.count)}.`, ` عدد المواضع: ${number(guidance.count)}.`, ` Affected passages: ${number(guidance.count)}.`);
      break;
    case 'evaluation-conflict': {
      const findings = {
        binding: tr('Deux entrées renvoient à la même évaluation.', 'هناك مدخلان مرتبطان بالتقويم نفسه.', 'Two entries refer to the same assessment.'),
        identity: tr('Deux évaluations portent le même numéro pour ce semestre.', 'تقويمان يحملان الرقم نفسه في هذه الدورة.', 'Two assessments have the same number this term.'),
        duplicate: tr('Deux entrées ont le même intitulé et les mêmes dates.', 'هناك مدخلان بالعنوان نفسه والتواريخ نفسها.', 'Two entries share the same title and dates.'),
        overlap: tr('Les dates de deux activités du même type se chevauchent.', 'تتداخل تواريخ نشاطين من النوع نفسه.', 'The dates of two activities of the same type overlap.'),
      };
      detail = `${name} : ${findings[guidance.conflictKind]}`;
      break;
    }
    case 'roster-incomplete':
      detail = guidance.reason === 'missing-roster'
        ? tr(`Une activité de ${name} utilise les noms des élèves. La liste de la classe est encore vide.`,
            `يتطلّب أحد أنشطة قسم ${name} أسماء التلاميذ، ولائحة القسم فارغة.`, `An activity in ${name} uses student names, but its roster is empty.`)
        : tr(`${name} : des noms figurent dans les activités mais pas dans la liste de classe (${number(guidance.count)}).`,
            `توجد أسماء في أنشطة قسم ${name} غير مدرجة في لائحته. عددها: ${number(guidance.count)}.`,
            `${name}: names recorded in activities are missing from the roster (${number(guidance.count)}).`);
      break;
    case 'notebook-unavailable':
      detail = tr(`Je n’ai pas pu lire le cahier de ${name}. Ouvrez-le pour le vérifier.`,
        `تعذّرت قراءة دفتر قسم ${name}. افتحه للتحقق منه.`, `I couldn’t read the notebook for ${name}. Open it to check.`);
      break;
    case 'checking':
      detail = tr(`Le cahier de ${name} est en cours de chargement.`, `جارٍ تحميل دفتر قسم ${name}.`, `The notebook for ${name} is loading.`);
      break;
    case 'ready':
      detail = tr(`Aucun point à vérifier dans le cahier de ${name} pour le moment.`,
        `لا توجد حالياً ملاحظات تستدعي المراجعة في دفتر قسم ${name}.`, `Nothing needs review in the notebook for ${name} right now.`);
      break;
  }
  return { id: guidance.step, title: base.title, detail, detailEmphasis: name, action: base.action, context };
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
    unclosedFormula: 'Une formule semble incomplète : vérifiez ses délimiteurs.',
    outOfOrderSessions: 'Dates hors ordre : vérifiez les séances concernées.',
    duplicateBlocks: 'Blocs répétés : vérifiez s’ils sont voulus.',
    emptyStructure: 'Ces rubriques attendent du contenu. Complétez-les à votre rythme.',
    controlCharacters: 'Caractères invisibles dans le texte collé : vérifiez-le.',
  },
  ar: {
    unclosedFormula: 'صيغة غير مكتملة: راجع علامات فتحها وإغلاقها.',
    outOfOrderSessions: 'تواريخ لا تتبع ترتيب المحتوى: راجع الحصص المعنية.',
    duplicateBlocks: 'عناصر مكررة: تحقق إن كان ذلك مقصوداً.',
    emptyStructure: 'توجد بعض العناوين الفارغة في انتظار محتواها. يمكنك إكمالها حسب وتيرتك.',
    controlCharacters: 'رموز غير مرئية في النص الملصق: راجعها ونظّفها.',
  },
  en: {
    unclosedFormula: 'Incomplete formula: check its delimiters.',
    outOfOrderSessions: 'Dates out of order: check those sessions.',
    duplicateBlocks: 'Repeated blocks: check whether that’s intentional.',
    emptyStructure: 'Some sections are still empty. Complete them as you progress.',
    controlCharacters: 'Invisible characters in pasted text: check it.',
  },
} as const;
