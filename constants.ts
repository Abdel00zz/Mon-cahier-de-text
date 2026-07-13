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
    'activité': 'bg-emerald-100/75 text-emerald-800 border-emerald-200/90',
    'définition': 'bg-blue-100/75 text-blue-800 border-blue-200/90',
    'théorème': 'bg-purple-100/75 text-purple-800 border-purple-200/90',
    'proposition': 'bg-indigo-100/75 text-indigo-800 border-indigo-200/90',
    'lemme': 'bg-violet-100/75 text-violet-800 border-violet-200/90',
    'corollaire': 'bg-pink-100/75 text-pink-800 border-pink-200/90',
    'remarque': 'bg-slate-100/85 text-slate-700 border-slate-200/90',
    'preuve': 'bg-zinc-100 text-zinc-800 border-zinc-200/90',
    'exemple': 'bg-cyan-100/75 text-cyan-800 border-cyan-200/90',
    'exercice': 'bg-amber-100/80 text-amber-800 border-amber-200/90',
    'application': 'bg-teal-100/75 text-teal-800 border-teal-200/90',
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

/**
 * Intitulés lisibles affichés à l'utilisateur : niveau développé, filière
 * explicite et abréviations scolaires usuelles pour rester compact sur mobile.
 *
 * Les valeurs courtes de `CLASS_LEVELS_BY_CYCLE` restent les identifiants
 * historiques utilisés par le planning, les imports et les synchronisations.
 * Cette couche de présentation évite donc de casser ces branchements tout en
 * employant une nomenclature scolaire lisible et soignée dans l'interface.
 */
const CLASS_LEVEL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    '1AC': '1re année collégiale',
    '2AC': '2e année collégiale',
    '3AC': '3e année collégiale',
    'Tronc commun scientifique': 'Tronc commun scientifique',
    'Tronc commun lettres': 'Tronc commun littéraire',
    'Tronc commun technologique': 'Tronc commun technologique',
    '1BAC Sc. Expérimentales': '1re Bac · Sciences expérimentales',
    '1BAC Sc. Mathématiques': '1re Bac · Sciences mathématiques',
    '1BAC Lettres': '1re Bac · Lettres',
    '1BAC Sc. Économiques': '1re Bac · Sciences économiques et gestion',
    '2BAC PC': '2e Bac · Sciences physiques',
    '2BAC SVT': '2e Bac · Sciences de la vie et de la Terre',
    '2BAC Sc. Maths A': '2e Bac · Sciences mathématiques A',
    '2BAC Sc. Maths B': '2e Bac · Sciences mathématiques B',
    '2BAC Sc. Économiques': '2e Bac · Sciences économiques',
    '2BAC Sc. Gestion Comptable': '2e Bac · Sciences de gestion comptable',
    '2BAC Lettres': '2e Bac · Lettres',
    '2BAC Sc. Humaines': '2e Bac · Sciences humaines',
    'MPSI': 'Mathématiques, physique et sciences de l’ingénieur',
    'PCSI': 'Physique, chimie et sciences de l’ingénieur',
    'MP': 'Mathématiques et physique',
    'PSI': 'Physique et sciences de l’ingénieur',
    'TSI': 'Technologie et sciences industrielles',
    'ECS': 'Économie et commerce — option scientifique',
    'ECT': 'Économie et commerce — option technologique',
};

const DISPLAY_LEVEL_KEYS = Object.keys(CLASS_LEVEL_DISPLAY_NAMES)
    .sort((left, right) => right.length - left.length);

/**
 * Développe le niveau d'une classe sans modifier son nom enregistré.
 * Un éventuel groupe est conservé, par exemple `2BAC PC 3` devient
 * `2e Bac · Sciences physiques · Gr. 3`.
 */
export const formatClassDisplayName = (name: string): string => {
    const normalized = (name || '').trim().replace(/\s+/g, ' ');
    const level = DISPLAY_LEVEL_KEYS.find(key =>
        normalized === key || normalized.startsWith(`${key} `)
    );
    if (!level) return normalized;

    const suffix = normalized.slice(level.length).trim();
    const label = CLASS_LEVEL_DISPLAY_NAMES[level];
    return suffix ? `${label} · Gr. ${suffix}` : label;
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
    'chapter': { name: 'Chapitre', icon: Book, color: 'text-red-700', rowColor: 'bg-slate-50' },
    'evaluation_diagnostic': { name: 'Évaluation diagnostique', icon: TestTube, color: 'text-rose-600', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200', rowColor: 'bg-rose-50/40' },
    // autoNumber : titre pré-rempli « {nom} N » (N = occurrences existantes du
    // type dans le cahier + 1) — réservé aux types récurrents.
    'devoir_maison': { name: 'Devoir maison', icon: Home, color: 'text-blue-600', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', rowColor: 'bg-blue-50/40', autoNumber: true },
    'controle_continu': { name: 'Contrôle continu', icon: FileSignature, color: 'text-indigo-600', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', rowColor: 'bg-indigo-50/40', autoNumber: true },
    'correction_devoir_maison': { name: 'Correction Devoir maison', icon: CheckCheck, color: 'text-cyan-600', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200', rowColor: 'bg-cyan-50/40', autoNumber: true },
    'correction_controle_continu': { name: 'Correction Contrôle continu', icon: CheckSquare, color: 'text-emerald-600', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', rowColor: 'bg-emerald-50/40', autoNumber: true },
};


// Aide complète en Français
export const GUIDE_FR = `# Guide d'utilisation

Votre cahier de textes numérique, pas à pas. Chaque section se lit en moins d'une minute.

## Bien démarrer
1. **Composez votre emploi du temps** : Le geste fondateur ! Dans **Paramètres ▸ Emploi du temps**, posez vos créneaux — et créez vos classes **directement depuis la grille** avec « **＋ Créer une classe…** » dans chaque case. Deux minutes suffisent, et tout le reste s'active : progression, alertes de retard, rappels de séance.
2. **Vos classes prennent vie** : Nées de la grille, elles apparaissent dans **Mes classes** avec leur matière, leur prochaine séance et leur dernière mise à jour. Vous pouvez aussi en créer une manuellement via « **Nouveau cahier** ».
3. **Remplissez le cahier** : Si un programme officiel existe pour le niveau, l'application propose de le pré-charger — acceptez puis adaptez librement. Datez ensuite vos séances au fil des cours.

![Vue réelle du cahier de textes avec son programme organisé](/guide/02-cahier-de-textes.png)

## Le cahier au quotidien
- **Ajouter** : Sur téléphone, le bouton rond « **+** ». Sur ordinateur, sélectionnez une ligne puis « **Ajouter après** » dans la barre du bas.
- **Modifier** : Double-touchez la ligne à corriger, ou sélectionnez-la puis « **Modifier** ».
- **Dater en un geste** : Sélectionnez une ou plusieurs lignes puis « **Dater aujourd'hui** » (un seul tap) ou « **Choisir une date…** » avec aperçu avant/après.
- **Réorganiser / supprimer** : Boutons **Monter / Descendre** et **Supprimer** de la barre de sélection. Tout est annulable (\`Ctrl + Z\`).
- **Formules de maths (LaTeX)** : Entre symboles dollars : \`$E = mc^2$\`. Listes avec « **-** » ou « **1.** », **gras** avec \`**texte**\`, *italique* avec \`*texte*\`.
- **Recherche dans un cahier** : Le bouton **Rechercher** filtre instantanément les lignes et met en évidence le contenu correspondant.

![Recherche instantanée dans les lignes du cahier](/guide/03-recherche-dans-cahier.png)

- **Recherche depuis Mes classes** : Recherchez une classe, une matière, un chapitre, une description ou une remarque. Le cahier s'ouvre avec le même terme déjà actif.

![Recherche globale dans toutes les classes et tous les contenus](/guide/06-recherche-globale.png)

## L'emploi du temps intelligent
- **Une couleur par classe** : Chaque classe garde sa teinte dans la grille et le récapitulatif — l'emploi du temps se lit d'un coup d'œil.
- **Séances de 2 h fusionnées** : Deux heures consécutives de la même classe forment **une seule cellule** ; l'application n'attend alors qu'**une** date dans le cahier, pas deux.
- **Repère officiel** : À côté de chaque classe, « off. X h » rappelle l'horaire hebdomadaire officiel de votre matière — un simple repère indicatif, jamais une contrainte.

![Composition de l'emploi du temps directement dans la grille](/guide/01-emploi-du-temps.png)

## Un calendrier qui pense pour vous
- **Garde-fou des dates** : Une date posée un jour férié, pendant les vacances ou une absence déclenche une simple alerte informative — la saisie n'est jamais bloquée (séance de rattrapage, exception…).
- **Alertes en pause automatique** : Vacances, jours fériés et absences suspendent le moteur de retard et les rappels. Aucun reproche pendant les vacances !
- **Fin d'année sereine** : L'été venu, vos cartes affichent « Année scolaire terminée » — pas de fausse « prochaine séance » vers la rentrée suivante.
- **Absences programmées** : Déclarez un congé ou un arrêt dans **Paramètres ▸ Notifications** : la période est exclue de tous les calculs.

![Choix d'une date avec explication immédiate des points à vérifier](/guide/04-selection-date.png)

![Message de vérification avant l'enregistrement d'une date exceptionnelle](/guide/05-verification-date.png)

## Suivi & progression
- **Briefing Mes classes** : L’accueil résume la situation scolaire du jour, la progression et les actions réellement utiles, sans multiplier les cartes.
- **Progression de toutes les classes** : Les indicateurs sont calculés depuis les dates du cahier et l’emploi du temps, jamais saisis une seconde fois.
- **Rappels de fin de séance** : Une minute avant la fin d'un cours, votre téléphone vibre ; à la fin, il vérifie qu'une date a bien été posée. Activable dans **Paramètres ▸ Notifications**.
- **Préparer la prochaine séance** : L’accueil indique **où vous vous êtes arrêté** et l'élément exact par lequel commencer la séance suivante.

![Planification du prochain contenu à partir du dernier point traité](/guide/07-prochaine-seance.png)

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

هذا **دليل عملي مختصر** لاستعمال دفتر النصوص الرقمي. كل قسم يشرح مهمة أساسية بوضوح وفي أقل من دقيقة.

## البداية الصحيحة
1. **أعدّوا استعمال الزمن** : ابدؤوا من **الإعدادات ▸ استعمال الزمن**، ثم أضيفوا حصصكم وأنشئوا الأقسام **مباشرة من الشبكة** بواسطة « **إنشاء قسم** ». بعد ذلك يعمل حساب التقدم، وتنبيهات التأخر، وتذكيرات الحصص تلقائياً.
2. **نظّموا أقسامكم** : يظهر كل قسم في صفحة **أقسامي** مع المادة والحصة المقبلة وآخر تحديث. ويمكنكم أيضاً إنشاء دفتر يدوياً بواسطة زر « **دفتر جديد** ».
3. **أضيفوا محتوى الدفتر** : إذا كان المقرر الرسمي متاحاً، يقترحه التطبيق جاهزاً. راجعوه وعدّلوه عند الحاجة، ثم سجّلوا **تواريخ الحصص المنجزة** بالتدريج.

![عرض حقيقي لدفتر النصوص وبرنامجه المنظم](/guide/02-cahier-de-textes.png)

## الدفتر في الاستعمال اليومي
- **الإضافة** : في الهاتف، الزر الدائري « **+** ». في الحاسوب، حدّدوا سطراً ثم « **إضافة بعد** » في الشريط السفلي.
- **التعديل** : المسّوا السطر مرتين، أو حدّدوه ثم « **تعديل** ».
- **التأريخ بلمسة** : حدّدوا سطراً أو أكثر ثم « **تأريخ اليوم** » (لمسة واحدة) أو « **اختيار تاريخ…** » مع معاينة قبل/بعد.
- **الترتيب / الحذف** : أزرار **لأعلى / لأسفل** و**حذف** في شريط التحديد. كل شيء قابل للتراجع (\`Ctrl + Z\`).
- **الرموز الرياضية (LaTeX)** : بين رمزي الدولار: \`$E = mc^2$\`. القوائم بـ « **-** » أو « **1.** »، **عريض** بـ \`**نص**\`، *مائل* بـ \`*نص*\`.
- **البحث داخل الدفتر** : يرشّح زر **البحث** الأسطر فوراً، ويبرز المحتوى المطابق للكلمة المطلوبة.

![البحث الفوري داخل أسطر دفتر النصوص](/guide/03-recherche-dans-cahier.png)

- **البحث من صفحة أقسامي** : يمكن البحث باسم القسم أو المادة أو عنوان الدرس أو الوصف أو الملاحظة، ثم فتح الدفتر مع الاحتفاظ بكلمة البحث نفسها.

![البحث الشامل في جميع الأقسام ومحتويات الدفاتر](/guide/06-recherche-globale.png)

## استعمال زمن ذكي
- **لون لكل قسم** : يحتفظ كل قسم بلونه في الشبكة وفي الملخص — يُقرأ استعمال الزمن بنظرة واحدة.
- **حصص الساعتين مدموجة** : ساعتان متتاليتان لنفس القسم تكوّنان **خلية واحدة** ؛ ولا ينتظر التطبيق حينها سوى تاريخ **واحد** في الدفتر، لا اثنين.
- **المرجع الرسمي** : بجانب كل قسم، « off. X h » يذكّر بالغلاف الزمني الأسبوعي الرسمي لمادتكم — مجرد إشارة استرشادية، لا قيد أبداً.

![إعداد استعمال الزمن مباشرة داخل الشبكة](/guide/01-emploi-du-temps.png)

## تقويم يفكّر معكم
- **حارس التواريخ** : تاريخ يصادف عطلة أو عيداً أو غياباً يُطلق تنبيهاً إخبارياً بسيطاً — التسجيل لا يُحظر أبداً (حصة استدراك، استثناء…).
- **توقّف تلقائي للتنبيهات** : العطل والأعياد والغيابات توقف محرّك التأخر والتذكيرات. لا عتاب خلال العطلة!
- **نهاية سنة هادئة** : في الصيف، تعرض البطاقات « السنة الدراسية انتهت » — دون « حصة قادمة » وهمية نحو الدخول المقبل.
- **الغيابات المبرمجة** : صرّحوا بإجازة أو توقف في **الإعدادات ▸ الإشعارات** : تُستثنى الفترة من جميع الحسابات.

![اختيار التاريخ مع توضيح فوري للنقاط التي ينبغي التحقق منها](/guide/04-selection-date.png)

![رسالة التحقق قبل تسجيل تاريخ استثنائي](/guide/05-verification-date.png)

## المتابعة والتقدم
- **ملخص أقسامي** : تعرض الصفحة الرئيسية وضع اليوم الدراسي والتقدم والإجراءات الضرورية فقط، دون تكديس البطاقات.
- **تقدم جميع الأقسام** : تُحسب المؤشرات من تواريخ الدفتر واستعمال الزمن، ولا تُدخل المعطيات مرتين.
- **تذكير نهاية الحصة** : قبل نهاية الحصة بدقيقة يهتزّ هاتفكم؛ وعند نهايتها يتحقق من وضع التاريخ. يُفعَّل من **الإعدادات ▸ الإشعارات**.
- **تحضير الحصة المقبلة** : تعرض صفحة **أقسامي** آخر نقطة وصلتم إليها والعنصر الدقيق الذي ستبدأ منه الحصة التالية.

![تخطيط المحتوى المقبل انطلاقاً من آخر عنصر تم إنجازه](/guide/07-prochaine-seance.png)

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
