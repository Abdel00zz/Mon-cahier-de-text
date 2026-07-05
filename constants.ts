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
export const GUIDE_FR = `# Aide complète – Cahier de Textes Interactif

Bienvenue ! Ce guide pratique explique chaque bouton, badge, menu et écran de l'application.

## Vos avantages en bref
✅ Gestion flexible et moderne de votre cahier de textes.
✅ Interface intelligente et fluide pour une expérience utilisateur optimale.
✅ Organisation fine par chapitres, sections et éléments pédagogiques.
✅ Ajout rapide des activités, exercices, exemples et évaluations.
✅ Rendu d'impression de haute qualité.
✅ Recherche instantanée dans tout le contenu (par mot, date ou numéro).
✅ Sauvegarde automatique fiable + sauvegarde manuelle à la demande.
✅ Impression soignée, prête pour le format papier.
✅ Personnalisation des descriptions visibles à l'écran et à l'impression.
💡 Astuces et notifications pour rester efficace au quotidien.

## Nouveautés de la plateforme
✨ **Compte & synchronisation** : connexion par téléphone + mot de passe (en ligne) ; vos cahiers se synchronisent automatiquement dans le cloud (badge d'état dans l'en-tête) et restent utilisables hors connexion.
✨ **Emploi du temps** : Configuration ➜ onglet « Emploi du temps » — grille jours × créneaux par classe. Il alimente le calcul de progression et les alertes.
✨ **Alertes intelligentes de retard** : bannière sur le tableau de bord + notifications sur téléphone (PWA installée) si votre cahier prend du retard — jamais pendant les vacances, jours fériés ou vos absences (certificats saisis dans l'onglet Notifications).
✨ **Garde des dates** : à chaque date saisie, l'application vérifie emploi du temps, fériés, vacances et absences — « Vous n'enseignez pas cette classe le mardi » (alerte non bloquante).
✨ **Impression intelligente** : l'application mémorise ce qui a déjà été imprimé et propose « Nouveautés seulement » — zéro doublon, économie de papier.
✨ **Historique** : la ligne « Dernière modification… » au-dessus du tableau ouvre l'historique détaillé des actions.
✨ **Barre de sélection contextuelle** : sélectionnez une ligne ➜ Monter/Descendre, « Dater aujourd'hui » (1 clic), affecter/dissocier une date, description, modifier, supprimer.
✨ **Programmes prédéfinis** : sur un cahier vide, si un programme officiel existe pour votre niveau × matière, une bannière propose de le charger — puis adaptez-le librement.
✨ **LaTeX enrichi** : macros rapides \R \N \Z \Q \C, \abs{x}, \vect{AB}… ; listes « - » et « 1. », **gras**, *italique* dans les descriptions.

## Démarrage rapide (checklist)
☐ **Configuration initiale** : À la première utilisation, complétez le modal d'accueil (établissement, nom, préférences).
☐ **Sélection des cycles** : Choisissez au moins un cycle (Collège, Lycée, Prépa) - obligatoire pour continuer.
☐ **Matières favorites** : Sélectionnez vos matières préférées ou laissez vide pour tout afficher.
☐ Créer une classe depuis le Tableau de bord ➜ renseignez Nom, Matière et validez.
☐ Ouvrir la classe et vérifier vos informations (modifiables via "Modifier mes informations").
☐ Créer un premier Chapitre, puis ajouter une Section (A, B…).
☐ Insérer des Éléments pédagogiques: Définition, Théorème, Exemple, Exercice, Activité…
☐ Utiliser la Recherche pour retrouver vite un item (mot-clé, date 2025-09-06, numéro).
☐ Laisser la Sauvegarde automatique faire son travail ou cliquer sur « Sauvegarder ».
☐ Exporter la classe (fichier de sauvegarde) pour conserver une copie; Importer un fichier pour restaurer.
☐ Imprimer quand tout est prêt pour un rendu propre et lisible.

## Conseils productivité
⚡ Travaillez par blocs: créez d’abord les chapitres, puis les sections, puis les éléments.
🔎 Utilisez la recherche contextuelle pour filtrer instantanément le tableau.
⌨️ Mémorisez 3 raccourcis: Annuler (Ctrl+Z), Rechercher (/), Enregistrer (clic icône).
🖨️ Avant d’imprimer, jetez un œil aux Options d’impression dans la Configuration.
💾 Pensez à sauvegarder régulièrement votre classe ou toute l’application (fichier).
🛡️ Lors d’une restauration, utilisez un fichier exporté depuis l’application pour éviter les erreurs.

## Aperçu de l'interface

### En-tête (page Éditeur)
- ← Retour: revient au Tableau de bord.
- Nom de la classe: éditable en cliquant dessus (Entrez pour valider, Échap pour annuler).
- Enseignant: mis à jour via la configuration ou directement.

### Barre d'outils (haut de l'Éditeur)
- ↶ Annuler (Ctrl+Z): annule votre dernière action.
- ↷ Rétablir (Ctrl+Y): rétablit l'action annulée.
- 💾 Sauvegarder: force l'enregistrement immédiat. L’application sauvegarde aussi automatiquement après une pause de frappe.
- 🔍 Rechercher (/ ou Ctrl+K/Ctrl+F): ouvre une barre de recherche. Tapez un mot, une date (ex: 2025-09-06) ou un numéro; l’affichage se filtre en temps réel. Échap pour fermer.
- ❓ Aide: accessible via le menu … (élément « Aide »).
- ⋮ Plus d’actions:
  - 📥 Importer un fichier (restaurer) : choisissez un fichier de sauvegarde pour l’ajouter (ajouter à la suite) ou remplacer.
  - 📤 Exporter la classe (sauvegarder) : télécharge un fichier de sauvegarde de la classe.
  - ✏️ Gérer mes leçons: réorganise/supprime les contenus principaux (chapitres, devoirs, évaluations) par glisser-déposer.
  - 🖨️ Imprimer: active un rendu prêt à l’impression; utilisez l’aperçu avant impression de votre navigateur.
  - ❓ Aide: ouvre ce guide.

## Modal d'accueil (première utilisation)
À votre première connexion, un modal d'accueil moderne vous guide :
- **Étape 1 - Établissement** : Saisissez le nom de votre établissement scolaire.
- **Étape 2 - Présentation** : Indiquez votre nom (utilisé par défaut pour les nouvelles classes).
- **Étape 3 - Préférences** : 
  - **Cycles** : Sélectionnez au moins un cycle (Collège, Lycée, Prépa) - **obligatoire**
  - **Matières** : Choisissez vos matières favorites ou laissez vide pour tout afficher
- Navigation : "Précédent" pour revenir, "Suivant" pour continuer, "Terminer" une fois tout complété.
- **Important** : Vous devez sélectionner au moins un cycle pour pouvoir terminer la configuration.

## Tableau de bord
- Carte de classe: affiche le nom de la classe et la dernière date modifiée. Clic pour ouvrir.
- ✖ Supprimer (survol de la carte): supprime la classe après confirmation.
- Créer une classe: grand cadre "+"; renseignez Nom et Matière. Le nom de l'enseignant par défaut vient de la Configuration.
- ⚙️ Configuration:
  - **Modifier mes informations** : Bouton pour rouvrir le modal d'accueil et modifier vos préférences.
  - Descriptions affichées: interface moderne et intelligente avec deux contextes distincts
    - Application (écran): mode (Tout / Aucune / Sélection) + sélection par badges authentiques
    - Impression (PDF): mode (Tout / Aucune / Sélection) + sélection par badges authentiques
    - Actions rapides: Tout sélectionner / Tout désélectionner par contexte
    - Personnalisation indépendante: configurez différemment l'affichage à l'écran et pour l'impression
    - Style visuel amélioré: descriptions encadrées avec fond léger pour une meilleure lisibilité
    - Sections repliables pour une navigation fluide; design responsive mobile/desktop
  - Gestion des données: Exporter tout / Importer une sauvegarde (toutes les classes + réglages).
- ❓ Aide: bouton en haut à droite à côté de Configuration.

## Édition du cahier de textes

### Structure et types
- Contenus principaux: Chapitre, Évaluation diagnostique, Devoir maison, Contrôle continu, Correction DM/CC.
- Niveaux: Section (A, B, …), Sous-section (1, 2, …), Sous-sous-section (i, ii, …), Éléments (définition, théorème, ex., exo., …).

### Colonnes du tableau (mode écran)
- Date: grande typographie centrée; les séances consécutives de même date sont fusionnées en un seul bloc (rail doré).
- Contenu: affichage structuré; double-clic sur un élément pour l’éditer en ligne (formulaire complet, avec alerte de date intelligente).
- Remarque: zone libre éditable (double-clic); visible sous le contenu sur téléphone.

### Barre de sélection (en bas, après un clic sur une ligne)
- L’en-tête indique CE qui est sélectionné (type + titre).
- ⬆⬇ Monter/Descendre: réordonne l’élément parmi ses voisins (sélection conservée).
- ✅ Dater aujourd’hui (bouton orange): un seul clic, avec vérification intelligente de la date.
- 📅 Choisir une date… : ouvre la fenêtre d’affectation (alertes en direct pendant le choix).
- ➕ Ajouter après · ✏️ Modifier · 📄 Description · 🗑 Supprimer · ✖ ou Échap pour fermer.

### Ajouter du contenu (fenêtre)
Sélectionnez le type:
- Contenus principaux: Chapitre / Évaluations / Devoirs / Corrections.
- Section: active si vous avez sélectionné un chapitre/évaluation.
- Élément: activé dans une section/chapitre; champs Type, Numéro, Titre, Description.
- Séparateur: insère une ligne de séparation juste après l’élément sélectionné, avec texte et date optionnelle.

Règles d’insertion utiles:
- Depuis une ligne “chapitre/évaluation”: “Chapitre” crée un nouveau chapitre après; les autres types peuvent s’intégrer comme blocs ou être ajoutés au niveau principal selon le type.
- Depuis une section/sous-section: “Élément” s’ajoute à l’intérieur; “Séparateur” s’insère après l’élément ciblé.

### Badges des éléments (types et couleurs)
- Déf. (Définition): vert clair
- Th. (Théorème): ambre
- Prop. (Proposition): indigo
- Lem. (Lemme): violet
- Cor. (Corollaire): jaune
- Rem. (Remarque): gris
- Prv. (Preuve): gris
- Ex. (Exemple): sarcelle
- Exo. (Exercice): orange
- Act. (Activité): bleu ciel
- Appli. (Application): cyan

Astuce: certains types (exemple, exercice, application) affichent le titre en ligne avec la description pour une lecture compacte.

### Séparateurs
- Ligne horizontale avec texte centré; date modifiable; 🗑 pour supprimer.

### Impression
- Via “Imprimer” dans le menu; les chapitres et évaluations sont centrés, formules MathJax rendues; activez/masquez les descriptions via la Configuration.

### Descriptions visuelles (écran et impression)
- Écran (Application): l'affichage des descriptions suit votre réglage « Descriptions affichées ».
  - Mode « Tout »: toutes les descriptions sont visibles sous leurs titres, avec badges de type.
  - Mode « Aucune »: seules les en-têtes/titres s'affichent; les descriptions sont masquées.
  - Mode « Sélection »: seules les descriptions des types choisis (via badges authentiques) sont visibles.
- Impression (PDF): même principe via le contexte "Impression" dans la Configuration.
- Personnalisation: vous pouvez configurer différemment l'affichage à l'écran et pour l'impression.
- Style des descriptions: encadrées avec un fond léger pour une meilleure lisibilité.
- Lisibilité: style compact et aéré, compatible MathJax; badges colorés pour repérer rapidement les types.
- Séparateurs: apportent une respiration visuelle entre blocs et dates.

## Recherche et raccourcis
- Ouvrir/fermer recherche: /, Ctrl+K, Ctrl+F / Échap.
- Annuler/Rétablir: Ctrl+Z / Ctrl+Y.
- Sauvegarde: auto après 1,5 s d’inactivité; bouton “💾” pour forcer.

## Données et sauvegardes
- Stockage local: vos classes et contenus sont enregistrés dans le navigateur (localStorage) — l'application fonctionne hors connexion.
- Synchronisation cloud: avec un compte connecté, vos cahiers sont poussés automatiquement en ligne (récupérables sur un autre appareil).
- Exporter la classe (sauvegarde de la classe courante): via Plus d’actions.
- Importer une classe (depuis un fichier): ouvrez une sauvegarde; choisissez Remplacer ou Ajouter à la suite.
- Sauvegarder/Restaurer toute l’application (toutes classes + réglages): depuis la Configuration.

## Notifications
Des bulles colorées confirment les actions: succès, info, erreur, etc.

## Dépannage
- Rien ne s’affiche: vérifiez que la classe contient des éléments; utilisez “Créer un chapitre” si vide.
- Icônes d’aide/infobulles absentes: recharger la page peut réinitialiser l’initialisation des infobulles.
- Fichier non valide à l’import: vérifiez que le fichier provient de l’application (non modifié).

## À propos
Créé par Boudouh Abdelmalek (Maroc). Contact: [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;

// دليل كامل بالعربية
export const GUIDE_AR = `# مساعدة شاملة – دفتر النصوص التفاعلي

أهلاً بك! هذا الدليل يشرح باختصار ووضوح كل زر وشارة وقائمة وواجهة في التطبيق.
يوفّر "دفتر النصوص" الرقمي بيئة متكاملة لإعداد الدروس، تنظيم الفصول والأقسام، إضافة الأنشطة والتمارين، البحث السريع، الحفظ التلقائي، والطباعة الجاهزة. حلول ذكية تساعد الأستاذ على تنظيم العمل وتوفير الوقت وتحسين المردودية.

## المزايا باختصار
✅ إدارة مرنة وحديثة لدفتر النصوص.
✅ واجهة ذكية وسلسة لتجربة مستخدم مثالية.
✅ تنظيم هرمي واضح: فصول، أقسام، عناصر تعليمية.
✅ إضافة سريعة للأنشطة، التمارين، الأمثلة والتقييمات.
✅ طباعة عالية الجودة (جاهزة لـ PDF).
✅ بحث فوري في كل المحتوى (كلمة، تاريخ، رقم).
✅ حفظ تلقائي موثوق + حفظ يدوي عند الحاجة.
✅ تخصيص الأوصاف المرئية على الشاشة وعند الطباعة.
💡 تنبيهات ونصائح عملية لرفع الإنتاجية.

## بداية سريعة (قائمة تحقق)
☐ **الإعداد الأولي** : في الاستخدام الأول، أكمل نافذة الترحيب (المؤسسة، الاسم، التفضيلات).
☐ **اختيار الدورات** : اختر دورة واحدة على الأقل (الإعدادية، الثانوية، التحضيرية) - إجباري للمتابعة.
☐ **المواد المفضلة** : اختر موادك المفضلة أو اتركها فارغة لعرض الكل.
☐ أنشئ فصلاً/قسماً جديداً من لوحة التحكم ➜ أدخل الاسم والمادة ثم أكد.
☐ افتح الفصل وتحقق من معلوماتك (قابلة للتعديل عبر "تعديل معلوماتي").
☐ أنشئ فصلاً رئيسياً ثم أضف أقساماً (A، B…) بحسب حاجتك.
☐ أضف عناصر تعليمية: تعريف، نظرية، مثال، تمرين، نشاط…
☐ استخدم البحث للوصول السريع (كلمة مفتاحية، تاريخ 2025-09-06، رقم).
☐ اترك الحفظ التلقائي يعمل، أو اضغط حفظ للحفظ الفوري.
☐ صدّر JSON للاحتفاظ بنسخة؛ واستورد عند الحاجة للاسترجاع.
☐ اطبع عند اكتمال المحتوى للحصول على نسخة ورقية أنيقة.

## نصائح لرفع الإنتاجية
⚡ اعمل على مراحل: فصول ➜ أقسام ➜ عناصر، لتحكم أوضح وتدفق أسرع.
🔎 استفد من البحث الفوري لتصفية الجدول فوراً أثناء الكتابة.
⌨️ ثلاثة اختصارات مهمّة: تراجع (Ctrl+Z)، بحث (/)، حفظ (زر الحفظ).
🖨️ قبل الطباعة، راجع "الأوصاف المعروضة" في الإعدادات.
💾 احرص على التصدير المنتظم لنسخ احتياطية.
🛡️ عند الاستيراد، تأكد من صحة صيغة JSON لتفادي الأخطاء.

## نظرة عامة على الواجهة

### الرأس (في محرر الدفتر)
- ← رجوع: العودة إلى لوحة التحكم.
- اسم الفصل/القسم: قابل للتحرير بالنقر عليه (إدخال للحفظ، هروب للإلغاء).
- اسم الأستاذ: يتم تحديثه من الإعدادات أو يدوياً.

### شريط الأدوات
- ↶ تراجع (Ctrl+Z).
- ↷ إعادة (Ctrl+Y).
- 💾 حفظ: حفظ فوري؛ كما يتم الحفظ تلقائياً بعد التوقف القصير عن الكتابة.
- 🔍 بحث (/ أو Ctrl+K/Ctrl+F): اكتب كلمة أو تاريخاً (مثال: 2025-09-06) أو رقماً لتصفية المحتوى فورياً. هروب لإغلاق.
- ❓ مساعدة: من قائمة … داخل الشريط (عنصر « مساعدة »).
- ⋮ المزيد:
  - 📥 استيراد JSON: اختر ملفاً أو ألصق المحتوى، ثم اختر الاستبدال أو الإضافة.
  - 📤 تصدير JSON: تنزيل ملف .json للفصل الحالي.
  - ✏️ إدارة الدروس: إعادة ترتيب/حذف المحتويات الرئيسية بالسحب والإفلات.
  - 🖨️ طباعة: عرض خاص للطباعة عبر المتصفح.

## نافذة الترحيب (الاستخدام الأول)
عند أول اتصال، تقودك نافذة ترحيب حديثة :
- **الخطوة 1 - المؤسسة** : أدخل اسم مؤسستك التعليمية.
- **الخطوة 2 - التعريف** : أدخل اسمك (يُستخدم افتراضياً للفصول الجديدة).
- **الخطوة 3 - التفضيلات** : 
  - **الدورات** : اختر دورة واحدة على الأقل (الإعدادية، الثانوية، التحضيرية) - **إجباري**
  - **المواد** : اختر موادك المفضلة أو اتركها فارغة لعرض الكل
- التنقل : "السابق" للعودة، "التالي" للمتابعة، "إنهاء" عند الانتهاء.
- **مهم** : يجب اختيار دورة واحدة على الأقل لإنهاء الإعداد.

## لوحة التحكم
- بطاقة الفصل: اسم الفصل وتاريخ آخر تعديل؛ انقر للفتح.
- ✖ حذف (يظهر عند المرور): حذف الفصل بعد التأكيد.
- إنشاء فصل جديد: بطاقة كبيرة بعلامة +؛ أدخل الاسم والمادة. اسم الأستاذ الافتراضي من الإعدادات.
- ⚙️ الإعدادات:
  - **تعديل معلوماتي** : زر لإعادة فتح نافذة الترحيب وتعديل تفضيلاتك.
  - الأوصاف المعروضة (واجهة جديدة وذكية):
    - الشاشة (التطبيق): الوضع (الكل / لا شيء / تحديد) + اختيار حسب النوع عبر الشارات الأصلية.
    - الطباعة (PDF): الوضع (الكل / لا شيء / تحديد) + اختيار حسب النوع عبر الشارات الأصلية.
    - إجراءات سريعة: تحديد الكل / إلغاء التحديد لكل سياق.
    - تخصيص مستقل: يمكنك ضبط إعدادات مختلفة للعرض على الشاشة وللطباعة.
    - نمط مرئي محسّن: أوصاف مؤطرة مع خلفية خفيفة لتحسين القراءة.
    - أقسام قابلة للطي وتصميم متجاوب للشاشات المختلفة.
  - إدارة البيانات: تصدير الكل / استيراد نسخة احتياطية (جميع الفصول + الإعدادات).
- ❓ مساعدة: زر ظاهر أعلى اليمين بجوار الإعدادات.

## تحرير دفتر النصوص

### البنية والأنواع
- المحتويات الرئيسية: فصل، تقييم تشخيصي، فرض منزلي، مراقبة مستمرة، تصحيح الفرض/المراقبة.
- المستويات: قسم (A، B…) ثم فرع (1، 2…) ثم فرع فرعي (i، ii…) ثم العناصر (تعريف، نظرية، مثال، تمرين…).

### أعمدة الجدول (وضع الشاشة)
- التاريخ: انقر للتحرير؛ عند المرور تظهر أيقونات سريعة: 📅 اليوم، ✖ مسح.
- المحتوى: عناوين قابلة للتحرير بالنقر المزدوج؛ خلايا النص قابلة للتحرير كذلك.
- الملاحظة: حقل حر قابل للتحرير.

### أزرار كل سطر (عند المرور يميناً)
- ➕ إضافة بعد: يفتح نافذة إضافة المحتوى.
- ✏️ تعديل: تحرير سريع للعناصر.
- 🗑 حذف: حذف السطر ومحتواه.

### إضافة المحتوى
اختر النوع:
- محتوى رئيسي: فصل / تقييمات / فروض / تصحيحات.
- قسم: متاح إذا كان السطر المحدد فصلًا/تقييماً.
- عنصر: متاح داخل قسم/فصل؛ يحتوي على النوع، الرقم، العنوان، الوصف.
- فاصل: خط فاصل مع نص وتاريخ اختياري يوضع بعد السطر المحدد.

قواعد مفيدة:
- من سطر فصل/تقييم: اختيار "فصل" ينشئ فصلاً بعده مباشرة. الأنواع الأخرى قد تُدمج ككتل داخلية أو كعناصر رئيسية حسب السياق.
- من داخل قسم/فرع: "عنصر" يُضاف داخلياً؛ "فاصل" يُدرج بعد العنصر.

### الشارات (أنواع العناصر وألوانها)
- تعريف: أخضر فاتح (Def.)
- نظرية: كهرماني (Th.)
- مقترح: نيلي (Prop.)
- لمّة: بنفسجي (Lem.)
- نتيجة تابعة: أصفر (Cor.)
- ملاحظة: رمادي (Rem.)
- برهان: رمادي (Prv.)
- مثال: فيروزي (Ex.)
- تمرين: برتقالي (Exo.)
- نشاط: أزرق سماوي (Act.)
- تطبيق: سماوي (Appli.)

معلومة: بعض الأنواع (مثال/تمرين/تطبيق) تعرض العنوان والخلاصة في سطر واحد لتسهيل القراءة.

### الفواصل
- خط أفقي بنص متوسط؛ يمكن تعديل التاريخ؛ حذف عبر 🗑.

### الطباعة
- افتح "طباعة": معاينة جاهزة لـ A4.
- إن احتجت تفاصيل أكثر، استخدم "الأوصاف المعروضة" في الإعدادات لضبط ظهور الوصف عند الطباعة (الكل / لا شيء / تحديد حسب النوع).
- في نافذة المتصفح: الوجهة = حفظ كـ PDF؛ الحجم = A4؛ الرؤوس/التذييلات = معطلة؛ المقياس = 100%.

### الأوصاف المرئية (الشاشة والطباعة)
- الشاشة (التطبيق): يتبع عرض الأوصاف إعدادك في "الأوصاف المعروضة".
  - وضع "الكل": كل الأوصاف مرئية تحت عناوينها مع شارات النوع.
  - وضع "لا شيء": تظهر العناوين فقط بدون الأوصاف.
  - وضع "تحديد": تظهر أوصاف الأنواع المختارة فقط (عبر الشارات الأصلية).
- الطباعة (PDF): نفس المبدأ عبر سياق "الطباعة" داخل الإعدادات.
- التخصيص: يمكنك ضبط إعدادات مختلفة للعرض على الشاشة وللطباعة.
- نمط الأوصاف: مؤطرة مع خلفية خفيفة لتحسين القراءة.
- القابلية للقراءة: أسلوب مدمج ومتوازن متوافق مع MathJax؛ شارات ملوّنة لتحديد الأنواع سريعاً.
- الفواصل: تمنح فواصل بصرية بين الكتل والتواريخ.

## البحث والاختصارات
- فتح/إغلاق البحث: /، Ctrl+K، Ctrl+F / هروب.
- تراجع/إعادة: Ctrl+Z / Ctrl+Y.
- الحفظ: تلقائي بعد 1.5 ثانية؛ زر الحفظ للحفظ الفوري.

## البيانات والنسخ الاحتياطي
- التخزين محلياً في المتصفح (localStorage).
- تصدير/استيراد JSON للفصل الحالي من قائمة المزيد.
- تصدير/استيراد المنصة (كل الفصول + الإعدادات) من "الإعدادات".

## التنبيهات
رسائل صغيرة ملوّنة تؤكد عملياتك: نجاح، معلومات، خطأ، إلخ.

## حل المشاكل
- لا يظهر شيء: أضف فصلاً جديداً عبر "إنشاء فصل" إن كان فارغاً.
- غياب التلميحات: أعد تحميل الصفحة.
- خطأ في JSON: تحقق من صحة الصياغة قبل الاستيراد.

## عن التطبيق
تم التطوير بواسطة بودوح عبد المالك (المغرب). تواصل: [bdh.malek@gmail.com](mailto:bdh.malek@gmail.com).
`;