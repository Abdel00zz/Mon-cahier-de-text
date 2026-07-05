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
    'activité': 'bg-sky-200 text-sky-800', 
    'définition': 'bg-emerald-100 text-emerald-800', 
    'théorème': 'bg-amber-100 text-amber-800',
    'proposition': 'bg-indigo-100 text-indigo-800', 
    'lemme': 'bg-purple-100 text-purple-800', 
    'corollaire': 'bg-yellow-100 text-yellow-800',
    'remarque': 'bg-slate-200 text-slate-800', 
    'preuve': 'bg-slate-200 text-slate-700', 
    'exemple': 'bg-teal-100 text-teal-800',
    'exercice': 'bg-orange-100 text-orange-800', 
    'application': 'bg-cyan-100 text-cyan-800',
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
        'TC Sciences',
        'TC Lettres',
        'TC Technologique',
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
export const TOP_LEVEL_TYPE_CONFIG: Record<TopLevelItem['type'], { name: string; icon: ComponentType<{ className?: string }>; color: string; badgeColor?: string; }> = {
    'chapter': { name: 'Chapitre', icon: Book, color: 'text-red-700' },
    'evaluation_diagnostic': { name: 'Évaluation diagnostique', icon: TestTube, color: 'text-purple-700', badgeColor: 'bg-purple-100 text-purple-800' },
    'devoir_maison': { name: 'Devoir maison', icon: Home, color: 'text-blue-700', badgeColor: 'bg-blue-100 text-blue-800' },
    'controle_continu': { name: 'Contrôle continu', icon: FileSignature, color: 'text-green-700', badgeColor: 'bg-green-100 text-green-800' },
    'correction_devoir_maison': { name: 'Correction Devoir maison', icon: CheckCheck, color: 'text-blue-600', badgeColor: 'bg-blue-100 text-blue-800' },
    'correction_controle_continu': { name: 'Correction Contrôle continu', icon: CheckSquare, color: 'text-green-600', badgeColor: 'bg-green-100 text-green-800' },
};


export const GUIDE_MARKDOWN = `# Aide - Cahier de Textes Interactif

Bienvenue dans le guide du Cahier de Textes Interactif ! Voici un aperçu des fonctionnalités clés pour vous aider à démarrer.

Voir l'aide complète bilingue dans la fenêtre: Aide | مساعدة.
`;

// Aide complète en Français
export const GUIDE_FR = `# Aide – Cahier de Textes Interactif

Un guide court et ciblé. L'essentiel en 2 minutes.

## Démarrer en 3 étapes
1. **Créez une classe** (carte « + » du tableau de bord) : choisissez le niveau et la matière — le nom se compose seul. Un programme officiel peut être pré-chargé.
2. **Renseignez votre emploi du temps** (Paramètres ▸ Emploi du temps) : vos créneaux servent au calcul de progression et aux alertes.
3. **Remplissez le cahier** : ajoutez chapitres, sections et éléments, puis datez vos séances.

## Éditer le cahier
- **Ajouter** : bouton « + » (mobile) ou barre de sélection ▸ « Ajouter après ».
- **Modifier** : double-cliquez un élément (ou barre de sélection ▸ Modifier).
- **Dater** : sélectionnez une ou plusieurs lignes ▸ « Dater aujourd'hui » (1 clic) ou « Choisir une date… ». L'application vous prévient si la date pose un conflit (jour non enseigné, férié, vacances, absence) — sans jamais bloquer.
- **Réordonner / supprimer** : via la barre de sélection (Monter/Descendre, Supprimer).
- **LaTeX** : écrivez vos formules entre \`$…$\` ; listes avec « - » ou « 1. », **gras** et *italique* pris en charge dans les descriptions.

## Suivi & alertes
- **Progression** : menu ▸ Analyse (complétion, séances).
- **Retards & devoirs** : bannières sur le tableau de bord quand un devoir approche ou que le cahier prend du retard. Purement indicatif.
- **Absences** : Paramètres ▸ Notifications — vos certificats excluent ces périodes des calculs.

## Impression intelligente
Menu ▸ Imprimer : l'application sait ce qui a déjà été imprimé et propose « Nouveautés seulement » (zéro doublon). Option de numérotation des pages.

## Compte & sauvegarde
- **Synchronisation** automatique quand vous êtes connecté (pastille d'état dans l'en-tête).
- **Sauvegarde totale** : Paramètres ▸ Données ▸ Exporter (toutes vos données dans un fichier). Importer pour restaurer.

## Raccourcis
\`/\` ou \`Ctrl+K\` recherche · \`Ctrl+Z\` / \`Ctrl+Y\` annuler/rétablir · \`Échap\` fermer/désélectionner.

## À propos
Développé par Boudouh Abdelmalek (Maroc). Contact : [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;


// دليل كامل بالعربية
export const GUIDE_AR = `# مساعدة – دفتر النصوص التفاعلي

دليل موجز ومركّز. الأساسيات في دقيقتين.

## البداية في 3 خطوات
1. **أنشئ قسماً** (بطاقة « + ») : اختر المستوى والمادة — يتكوّن الاسم تلقائياً. يمكن تحميل مقرر رسمي جاهز.
2. **أدخل استعمال الزمن** (الإعدادات ▸ استعمال الزمن) : حصصك تُستعمل لحساب التقدم والتنبيهات.
3. **املأ الدفتر** : أضف الفصول والأقسام والعناصر ثم أرّخ الحصص.

## تحرير الدفتر
- **إضافة** : زر « + » (الهاتف) أو شريط التحديد ▸ « إضافة بعد ».
- **تعديل** : نقر مزدوج على العنصر (أو شريط التحديد ▸ تعديل).
- **التأريخ** : حدّد سطراً أو أكثر ▸ « تأريخ اليوم » أو « اختيار تاريخ ». ينبّهك التطبيق عند تعارض التاريخ (يوم بدون تدريس، عطلة، إجازة، غياب) دون منع.
- **الترتيب/الحذف** : عبر شريط التحديد.
- **LaTeX** : اكتب المعادلات بين \`$…$\` ؛ القوائم بـ « - » أو « 1. »، والخط الغليظ والمائل مدعومة في الأوصاف.

## المتابعة والتنبيهات
- **التقدم** : القائمة ▸ تحليل.
- **التأخر والفروض** : لافتات في لوحة التحكم عند اقتراب فرض أو تأخر الدفتر. للإشارة فقط.
- **الغيابات** : الإعدادات ▸ الإشعارات — شهاداتك تستثني تلك الفترات من الحسابات.

## الطباعة الذكية
القائمة ▸ طباعة : يعرف التطبيق ما طُبع سابقاً ويقترح « الجديد فقط ». مع خيار ترقيم الصفحات.

## الحساب والنسخ الاحتياطي
- **مزامنة** تلقائية عند تسجيل الدخول.
- **نسخة كاملة** : الإعدادات ▸ البيانات ▸ تصدير. استورد للاسترجاع.

## اختصارات
\`/\` أو \`Ctrl+K\` بحث · \`Ctrl+Z\` / \`Ctrl+Y\` تراجع/إعادة · \`Échap\` إغلاق/إلغاء التحديد.

## عن التطبيق
تطوير بودوح عبد المالك (المغرب). تواصل : [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;
