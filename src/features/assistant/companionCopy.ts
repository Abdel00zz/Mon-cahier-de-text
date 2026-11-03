import type { AppLocale } from '@/types';
import type { ClassGuidance } from '@/domain/assistant/classGuidance';
import type { CompanionNotificationPrompt } from '@/domain/assistant/companionDecision';
import { companionClassName } from './companionClassName';
import { notebookFollowupMessage } from './notebookFollowupCopy';

export interface CompanionMessage {
  id: string;
  title: string;
  detail: string;
  /** Literal text to emphasize; never parsed as HTML or Markdown. */
  detailEmphasis?: string;
  detailHighlights?: readonly string[];
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
    skip: 'Plus tard',
    attention: 'Action requise',
    'install-app': {
      title: 'Installer l’application',
      detail: 'Gardez votre cahier à portée de main depuis l’écran d’accueil.',
      action: 'Installer l’application',
      context: 'Installation',
    },
    'enable-notifications': {
      title: 'Activer les notifications',
      detail: 'Recevez un rappel avant vos séances sur cet appareil.',
      action: 'Activer les notifications',
      settingsDetail: 'Les notifications sont désactivées dans les réglages de votre téléphone. Autorisez-les pour recevoir les rappels de vos séances et de vos cahiers.',
      settingsAction: 'Ouvrir les paramètres de notification',
      settingsLink: 'Paramètres de notification',
      context: 'Notifications',
    },
    create: {
      title: 'On commence ?',
      detail: 'Créez votre première classe pour ouvrir son cahier de textes.',
      action: 'Créer ma classe',
      context: 'Démarrage',
    },
    schedule: {
      title: 'Emploi du temps',
      detail: 'Il manque ses créneaux. On les fixe ?',
      action: 'Régler les horaires',
    },
    'next-session': { title: 'Prochaine séance', detail: 'Votre prochaine séance approche.', action: 'Ouvrir le cahier', context: 'À venir' },
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
    'evaluation-conflict': {
      title: 'Évaluations à vérifier',
      detail: 'Des dates d’évaluation ou des devoirs nécessitent un ajustement.',
      action: 'Vérifier les évaluations',
      context: 'Évaluations',
    },
    'roster-incomplete': {
      title: 'Liste des élèves',
      detail: 'La liste des élèves de cette classe est incomplète ou à vérifier.',
      action: 'Gérer les élèves',
      context: 'Élèves',
    },
    standby: {
      title: 'Rappels mis de côté',
      detail: 'Vos rappels sont de côté. Vous pouvez les reprendre quand vous le souhaitez.',
      action: undefined,
      context: 'En veille',
    },
    ready: {
      title: 'Tout est en ordre',
      detail: 'Vos cahiers de textes et votre emploi du temps sont parfaitement organisés.',
      action: 'Ouvrir le cahier',
      context: 'Prêt',
    },
  },
  ar: {
    checking: { title: 'أستعيد دفاتر حصصك', detail: 'جارٍ مزامنة المحتوى وتحديث الدفاتر…', context: 'جارٍ التزامن', action: undefined },
    'notebook-unavailable': { title: 'معاينة الدفتر', detail: 'تعذرت قراءة هذا الدفتر تلقائياً. هل نحاول فتحه معاً؟', context: 'القراءة غير متاحة', action: 'فتح الدفتر' },
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
      title: 'مرحباً بك مع رفيقك',
      detail: 'أضف قسمك الأول لفتح دفتر نصوصه.',
      action: 'إضافة قسم جديد',
      context: 'البداية',
    },
    schedule: {
      title: 'تنظيم استعمال الزمن',
      detail: 'ينقصنا تحديد الحصص الأسبوعية في استعمال الزمن لتنظيم مواعيدك بدقة. هل نضبطها معاً؟',
      action: 'ضبط الحصص الآن',
    },
    'next-session': { title: 'الحصة القادمة', detail: 'حصتك القادمة تقترب.', action: 'فتح الدفتر', context: 'قريباً' },
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
    'evaluation-conflict': {
      title: 'فروض وتقويمات للمراجعة',
      detail: 'توجد تواريخ فروض أو تقويمات تحتاج إلى ضبط ومراجعة في هذا القسم.',
      action: 'مراجعة التقويمات',
      context: 'تقويمات',
    },
    'roster-incomplete': {
      title: 'لائحة التلاميذ',
      detail: 'لائحة التلاميذ لهذا القسم غير مكتملة أو تحتاج إلى مراجعة.',
      action: 'تنظيم التلاميذ',
      context: 'التلاميذ',
    },
    standby: {
      title: 'التنبيهات مؤجلة',
      detail: 'أجّلت التنبيهات. يمكنك العودة إليها متى شئت.',
      action: undefined,
      context: 'في الانتظار',
    },
    ready: {
      title: 'كل شيء على ما يرام',
      detail: 'دفاتر نصوصك واستعمال زمنك في حالة ممتازة ومضبوطة بدقة.',
      action: 'فتح الدفتر',
      context: 'جاهز',
    },
  },
  en: {
    checking: { title: 'Finding your notebooks', detail: 'Syncing your content…', context: 'Syncing', action: undefined },
    'notebook-unavailable': { title: 'Let’s check this notebook', detail: 'I couldn’t read this notebook. Shall we try opening it?', context: 'Reading unavailable', action: 'Open notebook' },
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
      title: 'Shall we start?',
      detail: 'Create your first class to open its lesson notebook.',
      action: 'Create class',
      context: 'Getting started',
    },
    schedule: {
      title: 'Timetable',
      detail: 'This class needs its weekly slots. Shall we set them?',
      action: 'Set timetable',
    },
    'next-session': { title: 'Next session', detail: 'Your next session is coming up.', action: 'Open notebook', context: 'Upcoming' },
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
    'evaluation-conflict': {
      title: 'Assessments to review',
      detail: 'Some assessment dates or assignments need adjustment.',
      action: 'Review assessments',
      context: 'Assessments',
    },
    'roster-incomplete': {
      title: 'Class roster',
      detail: 'The student roster for this class is incomplete or needs review.',
      action: 'Manage roster',
      context: 'Students',
    },
    standby: {
      title: 'Standing by',
      detail: 'Your reminders are set aside. Bring them back whenever you need.',
      action: undefined,
      context: 'Standby',
    },
    ready: {
      title: 'All set and ready',
      detail: 'Your lesson notebooks and schedule are fully organized.',
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
