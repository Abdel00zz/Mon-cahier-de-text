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
    'activité': 'bg-primary/10 text-primary border-primary/20',
    'définition': 'bg-success/10 text-success border-success/20',
    'théorème': 'bg-warning/10 text-warning border-warning/20',
    'proposition': 'bg-primary/10 text-primary border-primary/20',
    'lemme': 'bg-primary/10 text-primary border-primary/20',
    'corollaire': 'bg-warning/10 text-warning border-warning/20',
    'remarque': 'bg-secondary text-secondary-foreground border-border',
    'preuve': 'bg-secondary text-secondary-foreground border-border',
    'exemple': 'bg-success/10 text-success border-success/20',
    'exercice': 'bg-warning/10 text-warning border-warning/20',
    'application': 'bg-primary/10 text-primary border-primary/20',
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
  'francais': 'border-rose-500 ring-2 ring-inset ring-rose-100',
  'economie': 'border-amber-500 ring-2 ring-inset ring-amber-100',
  'svt': 'border-emerald-500 ring-2 ring-inset ring-emerald-100',
  'sciences de la vie': 'border-emerald-500 ring-2 ring-inset ring-emerald-100',
  'sciences de la vie et de la terre': 'border-emerald-500 ring-2 ring-inset ring-emerald-100',
  'informatique': 'border-cyan-500 ring-2 ring-inset ring-cyan-100',
  'lettres': 'border-fuchsia-500 ring-2 ring-inset ring-fuchsia-100',
  // AR subjects
  'الرياضيات': 'border-teal-500 ring-2 ring-inset ring-teal-100',
  'علوم فيزيائية': 'border-indigo-500 ring-2 ring-inset ring-indigo-100',
  'اللغة العربية': 'border-rose-500 ring-2 ring-inset ring-rose-100',
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
    'chapter': { name: 'Chapitre', icon: Book, color: 'text-foreground', rowColor: 'bg-secondary/45' },
    'evaluation_diagnostic': { name: 'Évaluation diagnostique', icon: TestTube, color: 'text-warning', badgeColor: 'bg-warning/10 text-warning border-warning/20', rowColor: 'bg-warning/5' },
    // autoNumber : titre pré-rempli « {nom} N » (N = occurrences existantes du
    // type dans le cahier + 1) — réservé aux types récurrents.
    'devoir_maison': { name: 'Devoir maison', icon: Home, color: 'text-primary', badgeColor: 'bg-primary/10 text-primary border-primary/20', rowColor: 'bg-primary/5', autoNumber: true },
    'controle_continu': { name: 'Contrôle continu', icon: FileSignature, color: 'text-success', badgeColor: 'bg-success/10 text-success border-success/20', rowColor: 'bg-success/5', autoNumber: true },
    'correction_devoir_maison': { name: 'Correction Devoir maison', icon: CheckCheck, color: 'text-primary', badgeColor: 'bg-primary/10 text-primary border-primary/20', rowColor: 'bg-primary/5', autoNumber: true },
    'correction_controle_continu': { name: 'Correction Contrôle continu', icon: CheckSquare, color: 'text-success', badgeColor: 'bg-success/10 text-success border-success/20', rowColor: 'bg-success/5', autoNumber: true },
};


export const GUIDE_MARKDOWN = `# Aide - Cahier de Textes Interactif

Bienvenue dans le guide du Cahier de Textes Interactif ! Voici un aperçu des fonctionnalités clés pour vous aider à démarrer.

Voir l'aide complète bilingue dans la fenêtre: Aide | مساعدة.
`;

// Aide complète en Français
export const GUIDE_FR = `# Aide – Cahier de Textes Interactif

Un guide court et ciblé. L'essentiel en 2 minutes.

## Démarrer en 3 étapes
1. **Créez une classe** : Cliquez sur la carte « **Nouvelle classe** » sur le tableau de bord, puis choisissez le niveau de votre classe et votre matière. L'application génère automatiquement le nom de la classe. Vous pouvez aussi pré-charger un programme officiel de cours si disponible.
2. **Définissez votre emploi du temps** : Allez dans l'onglet **Paramètres** puis cliquez sur **Emploi du temps** pour saisir vos heures de cours hebdomadaires. Vos créneaux saisis servent à calculer automatiquement votre progression et à vous alerter en cas de retard.
3. **Remplissez le cahier** : Ajoutez vos chapitres, sections et éléments, puis associez des dates à vos séances de cours.

## Éditer le cahier
- **Ajouter des éléments** : Sur mobile, utilisez le bouton rond « **+** ». Sur ordinateur, sélectionnez une ligne de votre tableau, puis cliquez sur **Ajouter après** dans la barre de sélection qui apparaît en bas de l'écran.
- **Modifier un élément** : Double-cliquez directement sur la case que vous souhaitez modifier (ou sélectionnez la ligne puis cliquez sur **Modifier** dans la barre de sélection en bas).
- **Dater une séance** : Sélectionnez une ou plusieurs lignes de votre tableau puis cliquez sur **Dater aujourd'hui** (en 1 clic) ou sur **Choisir une date...**. L'application calcule automatiquement les jours fériés, les vacances scolaires ou vos absences programmées pour vous signaler d'éventuels conflits, sans jamais bloquer votre saisie.
- **Réorganiser ou supprimer** : Sélectionnez une ligne puis utilisez les boutons **Monter / Descendre** ou **Supprimer** dans la barre de sélection en bas.
- **Formules de Math (LaTeX)** : Écrivez vos formules mathématiques entre les symboles dollars, par exemple : \`$E = mc^2$\`. Pour faire une liste, commencez vos lignes par un tiret « **-** » ou un numéro « **1.** ». Vous pouvez aussi mettre du texte en **Gras** (avec \`**texte**\`) ou en *Italique* (avec \`*texte*\`).

## Suivi & alertes
- **Progression** : Cliquez sur le bouton **Analyse** dans le menu pour visualiser votre taux de complétion du programme et l'historique de vos séances.
- **Retards & devoirs** : Des bannières de rappel s'affichent automatiquement sur votre tableau de bord lorsqu'un devoir approche ou qu'un retard est détecté dans votre calendrier. Ces alertes sont de simples indicateurs d'aide.
- **Absences programmées** : Allez dans **Paramètres** puis cliquez sur **Notifications / Absences** pour déclarer vos arrêts ou congés. Vos calculs de progression excluront automatiquement ces périodes.

## Impression intelligente
- **Imprimer son cahier** : Allez dans le menu puis cliquez sur **Imprimer**. L'application se souvient de ce qui a déjà été imprimé et vous propose l'option pratique **Nouveautés seulement** pour éviter tout doublon. Vous pouvez aussi numéroter les pages.

## Compte & sauvegarde
- **Mise à jour en temps réel** : Vos données sont sauvegardées et synchronisées automatiquement dès que vous êtes connecté à Internet (vérifiable grâce à la pastille verte de synchronisation dans l'en-tête).
- **Sauvegarde manuelle** : Allez dans **Paramètres** puis cliquez sur **Données** et choisissez **Exporter** pour télécharger l'intégralité de vos classes dans un fichier de secours sur votre appareil. Vous pourrez le restaurer à tout moment via l'option **Importer**.

## Raccourcis clavier pratiques
- Rechercher rapidement : Appuyez sur la touche \`/\` ou \`Ctrl + K\`
- Annuler l'action précédente : Appuyez sur \`Ctrl + Z\`
- Rétablir l'action annulée : Appuyez sur \`Ctrl + Y\`
- Fermer un panneau ou désélectionner : Appuyez sur la touche \`Échap\` (Escape)

## À propos
Développé par Boudouh Abdelmalek (Maroc). Pour toute suggestion ou aide, contactez : [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;


// دليل كامل بالعربية
export const GUIDE_AR = `# مساعدة – دفتر النصوص التفاعلي

دليل موجز ومركّز. الأساسيات في دقيقتين.

## البداية في 3 خطوات بسيطة
1. **أنشئ قسماً جديداً** : اضغط على بطاقة الإضافة « **Nouvelle classe** » في لوحة التحكم، ثم اختر مستوى القسم والمادة. يقوم التطبيق بإنشاء الاسم تلقائياً. يمكنك أيضاً تحميل مقرر دراسي رسمي جاهز لتوفير الوقت.
2. **أدخل استعمال الزمن الخاص بك** : اذهب إلى **الإعدادات** ثم اختر **استعمال الزمن** لتحديد حصصك الأسبوعية. تُستعمل هذه الحصص لحساب مدى تقدمك في الدروس وتنبيهك تلقائياً في حالة التأخر.
3. **املأ دفتر النصوص** : أضف الفصول والفقرات والأنشطة، ثم حدد تواريخ إنجاز الحصص.

## تحرير وإدارة الدفتر
- **إضافة عناصر جديدة** : في الهاتف، اضغط على الزر الدائري « **+** ». في الحاسوب، حدّد سطراً من الجدول ثم اضغط على **إضافة بعد** في شريط التحديد الذي يظهر أسفل الشاشة.
- **تعديل عنصر** : انقر نقراً مزدوجاً على الخانة المراد تعديلها (أو حدد السطر ثم اضغط على **تعديل** في شريط التحديد بالأسفل).
- **تأريخ حصة** : حدد سطراً أو أكثر من الجدول، ثم اضغط على **تأريخ اليوم** (بكبسة زر واحدة) أو **اختيار تاريخ...**. ينبهك التطبيق تلقائياً إذا كان التاريخ يتزامن مع عطلة، إجازة أو غياب دون حظر تسجيل الحصة.
- **الترتيب والحذف** : حدد السطر المطلوب ثم استخدم أزرار **لأعلى / لأسفل** أو **حذف** في شريط التحديد بالأسفل.
- **كتابة الرموز الرياضية (LaTeX)** : اكتب المعادلات الرياضية بين رمزي الدولار، مثلاً: \`$E = mc^2$\`. لكتابة قائمة، ابدأ السطر بعلامة « **-** » أو رقم « **1.** ». يمكنك كتابة نص **عريض** باستعمال \`**نص**\` أو نص *مائل* باستعمال \`*نص*\`.

## المتابعة والتقارير التلقائية
- **نسبة التقدم** : اضغط على زر **تحليل** في القائمة لعرض الرسوم البيانية لنسبة إنجاز المقرر وإحصائيات الحصص.
- **التأخر والفروض** : تظهر تنبيهات تلقائية في لوحة التحكم عند اقتراب موعد فرض محروس أو عند ملاحظة تأخر في إنجاز المقرر مقارنة باستعمال الزمن. هذه التنبيهات استرشادية فقط.
- **تسجيل الغيابات** : اذهب إلى **الإعدادات** ثم **الإشعارات والغيابات** لتسجيل فترات غيابك (كالشهادات الطبية). سيقوم التطبيق تلقائياً باستثنائها من حسابات التقدم.

## الطباعة الذكية
- **طباعة الدفتر** : اذهب إلى القائمة واضغط على **طباعة**. يتذكر التطبيق الحصص التي قمت بطباعتها سابقاً ويقترح عليك خيار **الجديد فقط** لتفادي التكرار وتوفير الورق. مع إمكانية تفعيل ترقيم الصفحات تلقائياً.

## الحساب والنسخ الاحتياطي لبياناتك
- **المزامنة الفورية** : يتم حفظ بياناتك ومزامنتها تلقائياً عند اتصالك بالإنترنت (يمكنك التأكد من ذلك عبر ظهور أيقونة المزامنة الخضراء في أعلى الشاشة).
- **النسخ الاحتياطي اليدوي** : اذهب إلى **الإعدادات** ثم **البيانات** واضغط على **تصدير** لتحميل جميع أقسامك وبياناتك في ملف آمن على جهازك. يمكنك استرجاعها في أي وقت عبر خيار **استيراد**.

## اختصارات لوحة المفاتيح المفيدة
- البحث السريع في الدفتر : اضغط على \`/\` أو \`Ctrl + K\`
- التراجع عن آخر إجراء : اضغط على \`Ctrl + Z\`
- إعادة الإجراء المتراجع عنه : اضغط على \`Ctrl + Y\`
- إغلاق نافذة أو إلغاء تحديد سطر : اضغط على زر \`Échap\` (Escape)

## عن التطبيق
تطوير الأستاذ بودوح عبد المالك (المغرب). للتواصل وتقديم المقترحات : [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;
