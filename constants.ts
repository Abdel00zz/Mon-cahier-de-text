import { TopLevelItem } from './types';
import { Book, TestTube, Home, FileSignature, CheckCheck, CheckSquare } from './components/ui/icons';
import type { ComponentType } from 'react';

export const TYPE_MAP: { [key: string]: string } = {
  'definition': 'définition', 'définition': 'définition',
  'theorem': 'théorème', 'théorème': 'théorème', 'theoreme': 'théorème',
  'proposition': 'proposition', 'prop': 'proposition',
  'lemma': 'lemme', 'lemme': 'lemme',
  'corollary': 'corollaire', 'corollaire': 'corollaire', 'corol': 'corollaire',
  'remark': 'remarque', 'remarque': 'remarque', 'rem': 'remarque',
  'proof': 'preuve', 'preuve': 'preuve',
  'example': 'exemple', 'exemple': 'exemple', 'ex': 'exemple',
  'exercise': 'exercice', 'exercice': 'exercice', 'exo': 'exercice',
  'activity': 'activité', 'activité': 'activité', 'activite': 'activité', 'act': 'activité',
  'application': 'application', 'app': 'application'
};

export const BADGE_TEXT_MAP: { [key: string]: string } = {
  'définition': 'Déf.',
  'théorème': 'Th.',
  'proposition': 'Prop.',
  'lemme': 'Lem.',
  'corollaire': 'Cor.',
  'remarque': 'Rem.',
  'preuve': 'Prv.',
  'exemple': 'Ex.',
  'exercice': 'Exo.',
  'activité': 'Act.',
  'application': 'Appli.'
};

export const BADGE_COLOR_MAP: { [key: string]: string } = {
    'activité': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'définition': 'bg-blue-50 text-blue-700 border-blue-200',
    'théorème': 'bg-purple-50 text-purple-700 border-purple-200',
    'proposition': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'lemme': 'bg-violet-50 text-violet-700 border-violet-200',
    'corollaire': 'bg-pink-50 text-pink-700 border-pink-200',
    'remarque': 'bg-slate-50 text-slate-600 border-slate-200',
    'preuve': 'bg-slate-100 text-slate-700 border-slate-200',
    'exemple': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'exercice': 'bg-amber-50 text-amber-700 border-amber-200',
    'application': 'bg-teal-50 text-teal-700 border-teal-200',
};

export const BADGE_TOOLTIP_MAP: { [key: string]: string } = {
  'activité': 'Activité',
  'définition': 'Définition',
  'théorème': 'Théorème',
  'proposition': 'Proposition',
  'lemme': 'Lemme',
  'corollaire': 'Corollaire',
  'remarque': 'Remarque',
  'preuve': 'Preuve',
  'exemple': 'Exemple',
  'exercice': 'Exercice',
  'application': "Exercice d'application",
};

// Mapping for subject names to concise badge text
export const SUBJECT_ABBREV_MAP: Record<string, string> = {
  'Mathématiques': 'Mathématiques',
  'Physique': 'Physique',
  'Économie': 'Économie',
  'Français': 'Français',
  'SVT': 'SVT',
  'Sciences de la Vie': 'SVT',
  'Sciences de la Vie et de la Terre': 'SVT',
};

// Unified band color per subject (used to color the card border/ring)
// Note: use lowercase normalized keys without accents for robust matching
export const SUBJECT_BAND_CLASS_MAP: Record<string, string> = {
  // FR subjects
  'mathematiques': 'border-teal-500 ring-2 ring-inset ring-teal-100',
  'maths': 'border-teal-500 ring-2 ring-inset ring-teal-100',
  'physique': 'border-indigo-500 ring-2 ring-inset ring-indigo-100',
  'physique-chimie': 'border-blue-500 ring-2 ring-inset ring-blue-100',
  'francais': 'border-blue-600 ring-2 ring-inset ring-blue-100',
  'economie': 'border-amber-500 ring-2 ring-inset ring-amber-100',
  'svt': 'border-emerald-500 ring-2 ring-inset ring-emerald-100',
  'sciences de la vie': 'border-emerald-500 ring-2 ring-inset ring-emerald-100',
  'sciences de la vie et de la terre': 'border-emerald-500 ring-2 ring-inset ring-emerald-100',
  'informatique': 'border-cyan-500 ring-2 ring-inset ring-cyan-100',
  'lettres': 'border-fuchsia-500 ring-2 ring-inset ring-fuchsia-100',
  // AR subjects
  'الرياضيات': 'border-teal-500 ring-2 ring-inset ring-teal-100',
  'علوم فيزيائية': 'border-indigo-500 ring-2 ring-inset ring-indigo-100',
  'اللغة العربية': 'border-blue-600 ring-2 ring-inset ring-blue-100',
  'علوم الحياة والأرض': 'border-emerald-500 ring-2 ring-inset ring-emerald-100',
};

export function getSubjectBandClass(subject: string | undefined | null): string {
  if (!subject) return 'border-slate-300 ring-2 ring-inset ring-slate-100';
  const norm = subject
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .trim();
  if (SUBJECT_BAND_CLASS_MAP[norm]) return SUBJECT_BAND_CLASS_MAP[norm];
  const abbr = SUBJECT_ABBREV_MAP[subject];
  if (abbr) {
    const abbrKey = abbr.toLowerCase();
    if (SUBJECT_BAND_CLASS_MAP[abbrKey]) return SUBJECT_BAND_CLASS_MAP[abbrKey];
  }
  return 'border-slate-300 ring-2 ring-inset ring-slate-100';
}

// ── Niveaux de classes officiels (système marocain), par cycle ──────────────
// Utilisés par le formulaire de création de classe : le prof choisit un niveau
// dans cette liste puis ajoute éventuellement un numéro de groupe (ex. « 1 »).
import type { Cycle } from './types';

export const CLASS_LEVELS_BY_CYCLE: Record<Cycle, string[]> = {
    college: [
        '1AC',
        '2AC',
        '3AC',
    ],
    lycee: [
        'Tronc commun scientifique',
        'Tronc commun lettres',
        'Tronc commun technologique',
        '1BAC Sc. Expérimentales',
        '1BAC Sc. Mathématiques',
        '1BAC Lettres',
        '1BAC Sc. Économiques',
        '2BAC PC',
        '2BAC SVT',
        '2BAC Sc. Maths A',
        '2BAC Sc. Maths B',
        '2BAC Sc. Économiques',
        '2BAC Sc. Gestion Comptable',
        '2BAC Lettres',
        '2BAC Sc. Humaines',
    ],
    prepa: [
        'MPSI',
        'PCSI',
        'MP',
        'PSI',
        'TSI',
        'ECS',
        'ECT',
    ],
};

const CLASS_LEVEL_RENAMES: Array<[RegExp, string]> = [
    [/^(?:trc|tc\s*sciences?|tc\s*scientifique|tronc\s+commun\s+sciences?|tronc\s+commun\s+scientifique)\b/i, 'Tronc commun scientifique'],
    [/^(?:tc\s*lettres?|tronc\s+commun\s+lettres?)\b/i, 'Tronc commun lettres'],
    [/^(?:tc\s*technologique|tronc\s+commun\s+technologique)\b/i, 'Tronc commun technologique'],
];

export const normalizeOfficialClassName = (name: string): string => {
    const trimmed = (name || '').trim().replace(/\s+/g, ' ');
    for (const [pattern, replacement] of CLASS_LEVEL_RENAMES) {
        const match = trimmed.match(pattern);
        if (!match) continue;
        const suffix = trimmed.slice(match[0].length).trim();
        return suffix ? `${replacement} ${suffix}` : replacement;
    }
    return trimmed;
};

// Matières enseignées (proposées à l'inscription et à la création de classe)
export const SUBJECTS = [
    'Mathématiques',
    'Physique-Chimie',
    'Sciences de la Vie et de la Terre',
    'Sciences Économiques',
    'Français',
    'Arabe',
    'Anglais',
    'Philosophie',
    'Histoire-Géographie',
    'Éducation Islamique',
    'Informatique',
    'EPS',
] as const;

// FIX: Changed type from `{[key: string]: ...}` to `Record<TopLevelItem['type'], ...>`.
// The previous weak key type (`string`) caused `keyof typeof` to resolve to `string | number`,
// which broke type narrowing for discriminated unions in `App.tsx`. This change ensures
// the keys are correctly typed, fixing errors related to `NewContentContext`.
export const TOP_LEVEL_TYPE_CONFIG: Record<TopLevelItem['type'], { name: string; icon: ComponentType<{ className?: string }>; color: string; badgeColor?: string; rowColor?: string; autoNumber?: boolean; }> = {
    // rowColor : fond de la LIGNE de titre du bloc dans la table — chaînes
    // Tailwind COMPLÈTES uniquement (règle d'or n°8 : jamais d'interpolation).
    'chapter': { name: 'Chapitre', icon: Book, color: 'text-slate-700', rowColor: 'bg-slate-50' },
    'evaluation_diagnostic': { name: 'Évaluation diagnostique', icon: TestTube, color: 'text-rose-600', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200', rowColor: 'bg-rose-50/40' },
    // autoNumber : titre pré-rempli « {nom} N » (N = occurrences existantes du
    // type dans le cahier + 1) — réservé aux types récurrents.
    'devoir_maison': { name: 'Devoir maison', icon: Home, color: 'text-blue-600', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', rowColor: 'bg-blue-50/40', autoNumber: true },
    'controle_continu': { name: 'Contrôle continu', icon: FileSignature, color: 'text-indigo-600', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', rowColor: 'bg-indigo-50/40', autoNumber: true },
    'correction_devoir_maison': { name: 'Correction Devoir maison', icon: CheckCheck, color: 'text-cyan-600', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200', rowColor: 'bg-cyan-50/40', autoNumber: true },
    'correction_controle_continu': { name: 'Correction Contrôle continu', icon: CheckSquare, color: 'text-emerald-600', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', rowColor: 'bg-emerald-50/40', autoNumber: true },
};


export const GUIDE_MARKDOWN = `# Aide - Cahier de Textes Interactif

Bienvenue dans le guide du Cahier de Textes Interactif ! Voici un aperçu des fonctionnalités clés pour vous aider à démarrer.

Voir l'aide complète bilingue dans la fenêtre: Aide | مساعدة.
`;

// Aide complète en Français
export const GUIDE_FR = `# Guide d'utilisation

Votre cahier de textes numérique, pas à pas. Chaque section se lit en moins d'une minute.

## Bien démarrer
1. **Composez votre emploi du temps** : Le geste fondateur ! Dans **Paramètres ▸ Emploi du temps**, posez vos créneaux — et créez vos classes **directement depuis la grille** avec « **＋ Créer une classe…** » dans chaque case. Deux minutes suffisent, et tout le reste s'active : progression, alertes de retard, rappels de séance.
2. **Vos classes prennent vie** : Nées de la grille, elles apparaissent sur le tableau de bord avec leur couleur, leur prochaine séance et leur progression. Vous pouvez aussi en créer une manuellement via « **Nouvelle classe** ».
3. **Remplissez le cahier** : Si un programme officiel existe pour le niveau, l'application propose de le pré-charger — acceptez puis adaptez librement. Datez ensuite vos séances au fil des cours.

## Le cahier au quotidien
- **Ajouter** : Sur téléphone, le bouton rond « **+** ». Sur ordinateur, sélectionnez une ligne puis « **Ajouter après** » dans la barre du bas.
- **Modifier** : Double-touchez la ligne à corriger, ou sélectionnez-la puis « **Modifier** ».
- **Dater en un geste** : Sélectionnez une ou plusieurs lignes puis « **Dater aujourd'hui** » (un seul tap) ou « **Choisir une date…** » avec aperçu avant/après.
- **Réorganiser / supprimer** : Boutons **Monter / Descendre** et **Supprimer** de la barre de sélection. Tout est annulable (\`Ctrl + Z\`).
- **Formules de maths (LaTeX)** : Entre symboles dollars : \`$E = mc^2$\`. Listes avec « **-** » ou « **1.** », **gras** avec \`**texte**\`, *italique* avec \`*texte*\`.

## L'emploi du temps intelligent
- **Une couleur par classe** : Chaque classe garde sa teinte dans la grille et le récapitulatif — l'emploi du temps se lit d'un coup d'œil.
- **Séances de 2 h fusionnées** : Deux heures consécutives de la même classe forment **une seule cellule** ; l'application n'attend alors qu'**une** date dans le cahier, pas deux.
- **Repère officiel** : À côté de chaque classe, « off. X h » rappelle l'horaire hebdomadaire officiel de votre matière — un simple repère indicatif, jamais une contrainte.

## Un calendrier qui pense pour vous
- **Garde-fou des dates** : Une date posée un jour férié, pendant les vacances ou une absence déclenche une simple alerte informative — la saisie n'est jamais bloquée (séance de rattrapage, exception…).
- **Alertes en pause automatique** : Vacances, jours fériés et absences suspendent le moteur de retard et les rappels. Aucun reproche pendant les vacances !
- **Fin d'année sereine** : L'été venu, vos cartes affichent « Année scolaire terminée » — pas de fausse « prochaine séance » vers la rentrée suivante.
- **Absences programmées** : Déclarez un congé ou un arrêt dans **Paramètres ▸ Notifications** : la période est exclue de tous les calculs.

## Suivi & progression
- **Cartes du tableau de bord** : Progression globale, séances, chapitres actifs, dernière séance — touchez une carte pour ouvrir le détail.
- **Analyse par classe** : Menu **⋮ ▸ Analyse & progression** pour le taux de complétion et l'historique détaillé.
- **Rappels de fin de séance** : Une minute avant la fin d'un cours, votre téléphone vibre ; à la fin, il vérifie qu'une date a bien été posée. Activable dans **Paramètres ▸ Notifications**.

## Impression intelligente
- **Nouveautés seulement** : L'application se souvient de ce qui est déjà imprimé et recommande de n'imprimer que le nouveau — économie de papier garantie.
- **Sélection personnalisée** : Cochez précisément les séances à imprimer, date par date, avec badges « Nouvelle / Déjà imprimée ».
- **Vos réglages mémorisés** : Taille du texte, espacement et numérotation sont retenus par classe — la prochaine impression repart de vos choix.

## Compte, synchro & sauvegarde
- **Synchronisation automatique** : Dès que vous êtes en ligne, tout se sauvegarde et se synchronise entre vos appareils (pastille de synchro dans l'en-tête). Hors ligne, vous travaillez normalement — la synchro rattrape au retour du réseau.
- **Votre profil** : **Paramètres ▸ Profil** pour modifier établissement, nom et cycle à tout moment.
- **Sauvegarde de secours** : **Paramètres ▸ Données ▸ Exporter** télécharge tout dans un fichier restaurable via **Importer** — utile avant un changement d'appareil.

## Raccourcis clavier
- Rechercher : \`/\` ou \`Ctrl + K\`
- Annuler : \`Ctrl + Z\`
- Rétablir : \`Ctrl + Y\`
- Fermer / désélectionner : \`Échap\`

## À propos
Développé par Boudouh Abdelmalek (Maroc). Suggestions et aide : [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;


// دليل كامل بالعربية — نفس بنية الدليل الفرنسي (٩ أقسام متوازية)
export const GUIDE_AR = `# دليل الاستخدام

دفتر نصوصكم الرقمي، خطوة بخطوة. كل قسم يُقرأ في أقل من دقيقة.

## البداية الصحيحة
1. **ركّبوا استعمال الزمن** : الخطوة المؤسِّسة! في **الإعدادات ▸ استعمال الزمن**، ضعوا حصصكم — وأنشئوا أقسامكم **مباشرة من الشبكة** عبر « **＋ إنشاء قسم…** » في كل خانة. دقيقتان تكفيان، وكل الباقي يشتغل: التقدم، تنبيهات التأخر، تذكيرات الحصص.
2. **أقسامكم تنبض بالحياة** : وُلدت من الشبكة، وتظهر في لوحة التحكم بلونها وحصتها القادمة وتقدمها. يمكنكم أيضاً إنشاء قسم يدوياً عبر « **قسم جديد** ».
3. **املؤوا الدفتر** : إن وُجد مقرر رسمي للمستوى، يقترحه التطبيق جاهزاً — اقبلوه ثم عدّلوه بحرية. أرّخوا بعدها حصصكم مع مرور الدروس.

## الدفتر في الاستعمال اليومي
- **الإضافة** : في الهاتف، الزر الدائري « **+** ». في الحاسوب، حدّدوا سطراً ثم « **إضافة بعد** » في الشريط السفلي.
- **التعديل** : المسّوا السطر مرتين، أو حدّدوه ثم « **تعديل** ».
- **التأريخ بلمسة** : حدّدوا سطراً أو أكثر ثم « **تأريخ اليوم** » (لمسة واحدة) أو « **اختيار تاريخ…** » مع معاينة قبل/بعد.
- **الترتيب / الحذف** : أزرار **لأعلى / لأسفل** و**حذف** في شريط التحديد. كل شيء قابل للتراجع (\`Ctrl + Z\`).
- **الرموز الرياضية (LaTeX)** : بين رمزي الدولار: \`$E = mc^2$\`. القوائم بـ « **-** » أو « **1.** »، **عريض** بـ \`**نص**\`، *مائل* بـ \`*نص*\`.

## استعمال زمن ذكي
- **لون لكل قسم** : يحتفظ كل قسم بلونه في الشبكة وفي الملخص — يُقرأ استعمال الزمن بنظرة واحدة.
- **حصص الساعتين مدموجة** : ساعتان متتاليتان لنفس القسم تكوّنان **خلية واحدة** ؛ ولا ينتظر التطبيق حينها سوى تاريخ **واحد** في الدفتر، لا اثنين.
- **المرجع الرسمي** : بجانب كل قسم، « off. X h » يذكّر بالغلاف الزمني الأسبوعي الرسمي لمادتكم — مجرد إشارة استرشادية، لا قيد أبداً.

## تقويم يفكّر معكم
- **حارس التواريخ** : تاريخ يصادف عطلة أو عيداً أو غياباً يُطلق تنبيهاً إخبارياً بسيطاً — التسجيل لا يُحظر أبداً (حصة استدراك، استثناء…).
- **توقّف تلقائي للتنبيهات** : العطل والأعياد والغيابات توقف محرّك التأخر والتذكيرات. لا عتاب خلال العطلة!
- **نهاية سنة هادئة** : في الصيف، تعرض البطاقات « السنة الدراسية انتهت » — دون « حصة قادمة » وهمية نحو الدخول المقبل.
- **الغيابات المبرمجة** : صرّحوا بإجازة أو توقف في **الإعدادات ▸ الإشعارات** : تُستثنى الفترة من جميع الحسابات.

## المتابعة والتقدم
- **بطاقات لوحة التحكم** : التقدم الإجمالي، الحصص، الفصول النشطة، آخر حصة — المسّوا بطاقة لفتح التفاصيل.
- **تحليل لكل قسم** : القائمة **⋮ ▸ التحليل والتقدم** لنسبة الإنجاز والسجل المفصّل.
- **تذكير نهاية الحصة** : قبل نهاية الحصة بدقيقة يهتزّ هاتفكم؛ وعند نهايتها يتحقق من وضع التاريخ. يُفعَّل من **الإعدادات ▸ الإشعارات**.

## الطباعة الذكية
- **الجديد فقط** : يتذكّر التطبيق ما طُبع سابقاً ويوصي بطباعة الجديد وحده — اقتصاد مضمون في الورق.
- **اختيار مخصّص** : اختاروا الحصص المراد طباعتها بدقة، تاريخاً بتاريخ، مع شارات « جديدة / مطبوعة سابقاً ».
- **إعداداتكم محفوظة** : حجم الخط والتباعد والترقيم تُحفظ لكل قسم — الطباعة القادمة تنطلق من اختياراتكم.

## الحساب والمزامنة والنسخ الاحتياطي
- **مزامنة تلقائية** : بمجرد الاتصال بالإنترنت، يُحفظ كل شيء ويتزامن بين أجهزتكم (مؤشر المزامنة أعلى الشاشة). دون اتصال، تعملون بشكل عادي — وتلتحق المزامنة عند عودة الشبكة.
- **ملفكم الشخصي** : **الإعدادات ▸ الملف الشخصي** لتعديل المؤسسة والاسم والسلك في أي وقت.
- **نسخة أمان** : **الإعدادات ▸ البيانات ▸ تصدير** يحمّل كل شيء في ملف يُسترجع عبر **استيراد** — مفيد قبل تغيير الجهاز.

## اختصارات لوحة المفاتيح
- البحث : \`/\` أو \`Ctrl + K\`
- التراجع : \`Ctrl + Z\`
- الإعادة : \`Ctrl + Y\`
- الإغلاق / إلغاء التحديد : \`Échap\`

## عن التطبيق
تطوير الأستاذ بودوح عبد المالك (المغرب). للمقترحات والمساعدة : [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;
