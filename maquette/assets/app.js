/* ============================================================================
   Maquette — données de démonstration, traduction, rendu et interactions.

   Tout est simulé côté navigateur : aucun serveur, aucune dépendance. Les
   mécanismes réels du cahier (numérotation I / A / 1° / a), compteurs par
   nature, priorité du numéro saisi) sont reproduits pour que la maquette se
   comporte comme l'application.
   ========================================================================== */

const I18N = {
  fr: {
    "app.title": "Cahier de textes",
    "app.establishment": "Lycée Al Massira",
    "nav.classes": "Classes",
    "nav.cahier": "Cahier",
    "nav.emploi": "Emploi du temps",
    "nav.reglages": "Réglages",
    "nav.emploiShort": "Emploi",
    "nav.reglagesShort": "Réglages",
    "nav.aide": "Aide",
    "classes.title": "Mes classes",
    "classes.search": "Rechercher une classe",
    "classes.meta": "{count} classes · {hours} h / semaine · Prochaine séance · {next}",
    "classes.metaEmpty": "Aucune classe",
    "classes.empty.title": "Créez votre première classe",
    "classes.empty.text": "Une classe suffit pour organiser votre progression et remplir votre cahier.",
    "classes.empty.action": "Ajouter une classe",
    "classes.noresult.title": "Aucune classe ne correspond",
    "classes.noresult.text": "Essayez un autre nom, une matière ou un niveau.",
    "classes.now": "En cours",
    "cahier.newSession": "Nouvelle séance",
    "cahier.export": "Exporter en PDF",
    "cahier.sessions": "Séances",
    "cahier.date": "Date",
    "cahier.deleteSession": "Supprimer la séance",
    "cahier.addChapter": "Chapitre",
    "cahier.addSection": "Section",
    "cahier.addSubsection": "Sous-section",
    "cahier.addItem": "Élément",
    "cahier.addEvaluation": "Évaluation",
    "cahier.remove": "Retirer",
    "cahier.remark": "Remarque",
    "cahier.homework": "Travail à faire",
    "cahier.planEmpty.title": "Le plan est vide",
    "cahier.planEmpty.text": "Ajoutez un chapitre, puis ses sections. La numérotation suit toute seule.",
    "cahier.noClass.title": "Aucun cahier ouvert",
    "cahier.noClass.text": "Choisissez une classe pour reprendre la rédaction.",
    "cahier.kind": "Nature",
    "cahier.number": "N°",
    "cahier.content": "Contenu",
    "cahier.toast.pdf": "Export PDF simulé",
    "cahier.toast.session": "Séance créée",
    "cahier.toast.deleted": "Séance supprimée",
    "emploi.title": "Emploi du temps",
    "emploi.morning": "Matin",
    "emploi.afternoon": "Après-midi",
    "emploi.hint": "Cliquez sur une case pour y placer une classe.",
    "emploi.free": "Libre",
    "emploi.assign": "Placer une classe",
    "emploi.clear": "Vider le créneau",
    "emploi.legend": "Une couleur par classe, la même que sur les cartes.",
    "reglages.title": "Réglages",
    "reglages.identity": "Identité",
    "reglages.teacher": "Nom de l'enseignant",
    "reglages.establishment": "Établissement",
    "reglages.academy": "Académie",
    "reglages.province": "Direction provinciale",
    "reglages.subjects": "Matières",
    "reglages.appearance": "Apparence",
    "reglages.theme": "Thème",
    "reglages.theme.light": "Clair",
    "reglages.theme.dark": "Sombre",
    "reglages.theme.system": "Système",
    "reglages.size": "Taille du texte",
    "reglages.size.sm": "Petit",
    "reglages.size.md": "Normal",
    "reglages.size.lg": "Grand",
    "reglages.size.xl": "Très grand",
    "reglages.language": "Langue",
    "reglages.data": "Données",
    "reglages.data.actions": "Sauvegarde",
    "reglages.data.export": "Exporter la sauvegarde",
    "reglages.data.import": "Restaurer une sauvegarde",
    "reglages.data.archive": "Archiver l'année",
    "reglages.schoolYear": "Début de l'année scolaire",
    "reglages.data.location": "Vos données restent sur cet ordinateur.",
    "aide.title": "Aide",
    "aide.intro": "Quelques repères pour tenir votre cahier sans effort.",
    "aide.classes.title": "Créer une classe",
    "aide.classes.text": "Le bouton + ouvre le formulaire : nom, matière, niveau et groupe. La couleur est choisie automatiquement selon la matière et sert de repère partout.",
    "aide.emploi.title": "Remplir l'emploi du temps",
    "aide.emploi.text": "Cliquez sur une case libre pour y placer une classe. Un créneau n'accueille qu'une classe : cliquer sur une case occupée permet de la remplacer ou de la vider.",
    "aide.seance.title": "Rédiger une séance",
    "aide.seance.text": "Une séance correspond à une date. Ajoutez un chapitre, puis ses sections : la numérotation (I, A, 1°, a)) est calculée automatiquement. Un numéro saisi à la main reste prioritaire.",
    "aide.pdf.title": "Exporter en PDF",
    "aide.pdf.text": "Le bouton produit un document A4 identique à l'écran : dates, contenu numéroté et remarques.",
    "aide.sauvegarde.title": "Sauvegarder et archiver",
    "aide.sauvegarde.text": "Tout reste sur cet ordinateur. Exporter écrit un fichier lisible ; archiver garde une copie figée de l'année avant de repartir à zéro.",
    "card.open": "Ouvrir le cahier",
    "card.schedule": "Emploi du temps",
    "card.edit": "Modifier la classe",
    "card.delete": "Supprimer",
    "dialog.newClass": "Nouvelle classe",
    "dialog.editClass": "Modifier la classe",
    "dialog.name": "Nom de la classe",
    "dialog.subject": "Matière",
    "dialog.level": "Niveau",
    "dialog.cycle": "Cycle",
    "dialog.cycle.none": "Non précisé",
    "dialog.group": "Groupe",
    "cycle.college": "Collège",
    "cycle.lycee": "Lycée",
    "cycle.prepa": "Préparation",
    "action.cancel": "Annuler",
    "action.save": "Enregistrer",
    "action.delete": "Supprimer",
    "confirm.class.title": "Supprimer cette classe ?",
    "confirm.class.text": "Le cahier et les séances de cette classe seront retirés. Cette action est définitive.",
    "confirm.session.title": "Supprimer cette séance ?",
    "confirm.session.text": "Le contenu saisi pour cette date sera retiré. Cette action est définitive.",
    "toast.saved": "Modifications enregistrées",
    "toast.deleted": "Classe supprimée",
    "backup.export": "Sauvegarde écrite (simulation)",
    "backup.import": "Sauvegarde restaurée (simulation)",
    "backup.archive": "Année archivée (simulation)",
    "kind.chapter": "Chapitre",
    "kind.section": "Section",
    "kind.subsection": "Sous-section",
    "kind.definition": "Définition",
    "kind.theorem": "Théorème",
    "kind.example": "Exemple",
    "kind.exercise": "Exercice",
    "kind.evaluation": "Évaluation",
    "day.1": "Lundi",
    "day.2": "Mardi",
    "day.3": "Mercredi",
    "day.4": "Jeudi",
    "day.5": "Vendredi",
    "day.6": "Samedi",
  },
  ar: {
    "app.title": "دفتر النصوص",
    "app.establishment": "ثانوية المسيرة",
    "nav.classes": "الأقسام",
    "nav.cahier": "الدفتر",
    "nav.emploi": "استعمال الزمن",
    "nav.reglages": "الإعدادات",
    "nav.emploiShort": "الزمن",
    "nav.reglagesShort": "إعدادات",
    "nav.aide": "المساعدة",
    "classes.title": "أقسامي الدراسية",
    "classes.search": "بحث عن قسم",
    "classes.meta": "{count} أقسام · {hours} سا / أسبوع · الحصة القادمة · {next}",
    "classes.metaEmpty": "لا يوجد قسم",
    "classes.empty.title": "أنشئ قسمك الأول",
    "classes.empty.text": "قسم واحد يكفي لتنظيم تخطيطك وملء دفتر النصوص.",
    "classes.empty.action": "إضافة قسم",
    "classes.noresult.title": "لا يوجد قسم مطابق",
    "classes.noresult.text": "جرّب اسماً أو مادة أو مستوى آخر.",
    "classes.now": "الآن",
    "cahier.newSession": "حصة جديدة",
    "cahier.export": "تصدير PDF",
    "cahier.sessions": "الحصص",
    "cahier.date": "التاريخ",
    "cahier.deleteSession": "حذف الحصة",
    "cahier.addChapter": "درس",
    "cahier.addSection": "فرع",
    "cahier.addSubsection": "فقرة",
    "cahier.addItem": "عنصر",
    "cahier.addEvaluation": "تقويم",
    "cahier.remove": "إزالة",
    "cahier.remark": "ملاحظة",
    "cahier.homework": "العمل المنزلي",
    "cahier.planEmpty.title": "المخطط فارغ",
    "cahier.planEmpty.text": "أضف درساً ثم فروعه، والترقيم يُحسب تلقائياً.",
    "cahier.noClass.title": "لا يوجد دفتر مفتوح",
    "cahier.noClass.text": "اختر قسماً لمتابعة التحرير.",
    "cahier.kind": "النوع",
    "cahier.number": "الرقم",
    "cahier.content": "المحتوى",
    "cahier.toast.pdf": "محاكاة تصدير PDF",
    "cahier.toast.session": "أُنشئت الحصة",
    "cahier.toast.deleted": "حُذفت الحصة",
    "emploi.title": "استعمال الزمن",
    "emploi.morning": "صباحاً",
    "emploi.afternoon": "بعد الزوال",
    "emploi.hint": "اضغط على خانة لتعيين قسم.",
    "emploi.free": "فارغ",
    "emploi.assign": "تعيين قسم",
    "emploi.clear": "إفراغ الخانة",
    "emploi.legend": "لون لكل قسم، وهو نفسه على البطاقات.",
    "reglages.title": "الإعدادات",
    "reglages.identity": "الهوية",
    "reglages.teacher": "اسم الأستاذ",
    "reglages.establishment": "المؤسسة",
    "reglages.academy": "الأكاديمية",
    "reglages.province": "المديرية الإقليمية",
    "reglages.subjects": "المواد الدراسية",
    "reglages.appearance": "المظهر",
    "reglages.theme": "الوضع",
    "reglages.theme.light": "نهاري",
    "reglages.theme.dark": "ليلي",
    "reglages.theme.system": "تلقائي",
    "reglages.size": "حجم النص",
    "reglages.size.sm": "صغير",
    "reglages.size.md": "عادي",
    "reglages.size.lg": "كبير",
    "reglages.size.xl": "كبير جداً",
    "reglages.language": "اللغة",
    "reglages.data": "البيانات",
    "reglages.data.actions": "النسخ الاحتياطي",
    "reglages.data.export": "تصدير نسخة احتياطية",
    "reglages.data.import": "استعادة نسخة احتياطية",
    "reglages.data.archive": "أرشفة السنة",
    "reglages.schoolYear": "بداية السنة الدراسية",
    "reglages.data.location": "بياناتك محفوظة على هذا الحاسوب.",
    "aide.title": "المساعدة",
    "aide.intro": "بضع إشارات لمسك دفترك بسهولة.",
    "aide.classes.title": "أنشئ قسماً",
    "aide.classes.text": "زر + يفتح الاستمارة: الاسم، المادة، المستوى والفوج. يُختار اللون تلقائياً حسب المادة ويُستخدم كعلامة في كل مكان.",
    "aide.emploi.title": "املأ استعمال الزمن",
    "aide.emploi.text": "اضغط على خانة فارغة لتعيين قسم. الخانة الواحدة تقبل قسماً واحداً: الضغط على خانة مملوءة يتيح استبدالها أو إفراغها.",
    "aide.seance.title": "حرّر حصة",
    "aide.seance.text": "الحصة مرتبطة بتاريخ. أضف درساً ثم فروعه: يُحسب الترقيم (I, A, 1°, a)) آلياً. الرقم المكتوب يدوياً تبقى له الأولوية.",
    "aide.pdf.title": "تصدير PDF",
    "aide.pdf.text": "الزر يُنتج وثيقة A4 مطابقة لما تراه: التواريخ، المحتوى المرقّم والملاحظات.",
    "aide.sauvegarde.title": "النسخ الاحتياطي والأرشفة",
    "aide.sauvegarde.text": "كل شيء يبقى على هذا الحاسوب. التصدير يكتب ملفاً قابلاً للقراءة، والأرشفة تحفظ نسخة ثابتة قبل البدء من جديد.",
    "card.open": "افتح الدفتر",
    "card.schedule": "استعمال الزمن",
    "card.edit": "تعديل القسم",
    "card.delete": "حذف",
    "dialog.newClass": "قسم جديد",
    "dialog.editClass": "تعديل القسم",
    "dialog.name": "اسم القسم",
    "dialog.subject": "المادة",
    "dialog.level": "المستوى",
    "dialog.cycle": "السلك",
    "dialog.cycle.none": "غير محدد",
    "dialog.group": "الفوج",
    "cycle.college": "الإعدادي",
    "cycle.lycee": "الثانوي",
    "cycle.prepa": "الأقسام التحضيرية",
    "action.cancel": "إلغاء",
    "action.save": "حفظ",
    "action.delete": "حذف",
    "confirm.class.title": "حذف هذا القسم؟",
    "confirm.class.text": "سيُحذف دفتر هذا القسم وحصصه. هذا الإجراء نهائي.",
    "confirm.session.title": "حذف هذه الحصة؟",
    "confirm.session.text": "سيُحذف المحتوى المسجّل في هذا التاريخ. هذا الإجراء نهائي.",
    "toast.saved": "تم حفظ التعديلات",
    "toast.deleted": "حُذف القسم",
    "backup.export": "تمت كتابة النسخة (محاكاة)",
    "backup.import": "تمت الاستعادة (محاكاة)",
    "backup.archive": "تمت الأرشفة (محاكاة)",
    "kind.chapter": "درس",
    "kind.section": "فرع",
    "kind.subsection": "فقرة",
    "kind.definition": "تعريف",
    "kind.theorem": "مبرهنة",
    "kind.example": "مثال",
    "kind.exercise": "تمرين",
    "kind.evaluation": "تقويم",
    "day.1": "الاثنين",
    "day.2": "الثلاثاء",
    "day.3": "الأربعاء",
    "day.4": "الخميس",
    "day.5": "الجمعة",
    "day.6": "السبت",
  },
  en: {
    "app.title": "Lesson notebook",
    "app.establishment": "Al Massira High School",
    "nav.classes": "Classes",
    "nav.cahier": "Notebook",
    "nav.emploi": "Timetable",
    "nav.reglages": "Settings",
    "nav.emploiShort": "Timetable",
    "nav.reglagesShort": "Settings",
    "nav.aide": "Help",
    "classes.title": "My classes",
    "classes.search": "Search a class",
    "classes.meta": "{count} classes · {hours} h / week · Next lesson · {next}",
    "classes.metaEmpty": "No class yet",
    "classes.empty.title": "Create your first class",
    "classes.empty.text": "One class is enough to organise your progress and fill the notebook.",
    "classes.empty.action": "Add a class",
    "classes.noresult.title": "No class matches",
    "classes.noresult.text": "Try another name, subject or level.",
    "classes.now": "Now",
    "cahier.newSession": "New lesson",
    "cahier.export": "Export as PDF",
    "cahier.sessions": "Lessons",
    "cahier.date": "Date",
    "cahier.deleteSession": "Delete lesson",
    "cahier.addChapter": "Chapter",
    "cahier.addSection": "Section",
    "cahier.addSubsection": "Sub-section",
    "cahier.addItem": "Item",
    "cahier.addEvaluation": "Assessment",
    "cahier.remove": "Remove",
    "cahier.remark": "Remark",
    "cahier.homework": "Homework",
    "cahier.planEmpty.title": "The outline is empty",
    "cahier.planEmpty.text": "Add a chapter, then its sections. Numbering follows automatically.",
    "cahier.noClass.title": "No notebook open",
    "cahier.noClass.text": "Pick a class to resume writing.",
    "cahier.kind": "Kind",
    "cahier.number": "No.",
    "cahier.content": "Content",
    "cahier.toast.pdf": "PDF export simulated",
    "cahier.toast.session": "Lesson created",
    "cahier.toast.deleted": "Lesson deleted",
    "emploi.title": "Timetable",
    "emploi.morning": "Morning",
    "emploi.afternoon": "Afternoon",
    "emploi.hint": "Click a cell to place a class.",
    "emploi.free": "Free",
    "emploi.assign": "Place a class",
    "emploi.clear": "Clear the slot",
    "emploi.legend": "One colour per class, the same as on the cards.",
    "reglages.title": "Settings",
    "reglages.identity": "Identity",
    "reglages.teacher": "Teacher name",
    "reglages.establishment": "School",
    "reglages.academy": "Academy",
    "reglages.province": "Provincial direction",
    "reglages.subjects": "Subjects",
    "reglages.appearance": "Appearance",
    "reglages.theme": "Theme",
    "reglages.theme.light": "Light",
    "reglages.theme.dark": "Dark",
    "reglages.theme.system": "System",
    "reglages.size": "Text size",
    "reglages.size.sm": "Small",
    "reglages.size.md": "Normal",
    "reglages.size.lg": "Large",
    "reglages.size.xl": "Extra large",
    "reglages.language": "Language",
    "reglages.data": "Data",
    "reglages.data.actions": "Backup",
    "reglages.data.export": "Export backup",
    "reglages.data.import": "Restore a backup",
    "reglages.data.archive": "Archive the year",
    "reglages.schoolYear": "School year start",
    "reglages.data.location": "Your data stays on this computer.",
    "aide.title": "Help",
    "aide.intro": "A few landmarks to keep your notebook effortlessly.",
    "aide.classes.title": "Create a class",
    "aide.classes.text": "The + button opens the form: name, subject, level and group. The colour follows the subject and becomes the class marker everywhere.",
    "aide.emploi.title": "Fill the timetable",
    "aide.emploi.text": "Click a free cell to place a class. A slot holds a single class: clicking an occupied cell lets you replace or clear it.",
    "aide.seance.title": "Write a lesson",
    "aide.seance.text": "A lesson is a date. Add a chapter, then sections: numbering (I, A, 1°, a)) is computed automatically. A hand-typed number always wins.",
    "aide.pdf.title": "Export as PDF",
    "aide.pdf.text": "The button produces an A4 document identical to the screen: dates, numbered content and remarks.",
    "aide.sauvegarde.title": "Back up and archive",
    "aide.sauvegarde.text": "Everything stays on this computer. Export writes a readable file; archiving keeps a frozen copy of the year before starting fresh.",
    "card.open": "Open the notebook",
    "card.schedule": "Timetable",
    "card.edit": "Edit the class",
    "card.delete": "Delete",
    "dialog.newClass": "New class",
    "dialog.editClass": "Edit the class",
    "dialog.name": "Class name",
    "dialog.subject": "Subject",
    "dialog.level": "Level",
    "dialog.cycle": "Cycle",
    "dialog.cycle.none": "Not specified",
    "dialog.group": "Group",
    "cycle.college": "Middle school",
    "cycle.lycee": "High school",
    "cycle.prepa": "Preparatory",
    "action.cancel": "Cancel",
    "action.save": "Save",
    "action.delete": "Delete",
    "confirm.class.title": "Delete this class?",
    "confirm.class.text": "The notebook and lessons of this class will be removed. This cannot be undone.",
    "confirm.session.title": "Delete this lesson?",
    "confirm.session.text": "The content recorded for this date will be removed. This cannot be undone.",
    "toast.saved": "Changes saved",
    "toast.deleted": "Class deleted",
    "backup.export": "Backup written (simulated)",
    "backup.import": "Backup restored (simulated)",
    "backup.archive": "Year archived (simulated)",
    "kind.chapter": "Chapter",
    "kind.section": "Section",
    "kind.subsection": "Sub-section",
    "kind.definition": "Definition",
    "kind.theorem": "Theorem",
    "kind.example": "Example",
    "kind.exercise": "Exercise",
    "kind.evaluation": "Assessment",
    "day.1": "Monday",
    "day.2": "Tuesday",
    "day.3": "Wednesday",
    "day.4": "Thursday",
    "day.5": "Friday",
    "day.6": "Saturday",
  },
};

const SUBJECTS = [
  { fr: "Mathématiques", ar: "الرياضيات", tone: "lavender" },
  { fr: "Physique — Chimie", ar: "الفيزياء والكيمياء", tone: "peach" },
  { fr: "Sciences de la vie et de la Terre", ar: "علوم الحياة والأرض", tone: "green" },
  { fr: "Sciences de l'ingénieur", ar: "علوم المهندس", tone: "sand" },
  { fr: "Informatique", ar: "المعلوميات", tone: "sky" },
  { fr: "Français", ar: "الفرنسية", tone: "rose" },
  { fr: "Arabe", ar: "العربية", tone: "peach" },
  { fr: "Anglais", ar: "الإنجليزية", tone: "sky" },
  { fr: "Philosophie", ar: "الفلسفة", tone: "sand" },
  { fr: "Éducation islamique", ar: "التربية الإسلامية", tone: "green" },
  { fr: "Histoire — Géographie", ar: "التاريخ والجغرافيا", tone: "lavender" },
  { fr: "Éducation physique", ar: "التربية البدنية", tone: "rose" },
];

const SLOTS = {
  morning: [
    { index: 0, label: "08:00 – 09:00" },
    { index: 1, label: "09:00 – 10:00" },
    { index: 2, label: "10:00 – 11:00" },
    { index: 3, label: "11:00 – 12:00" },
  ],
  afternoon: [
    { index: 4, label: "14:00 – 15:00" },
    { index: 5, label: "15:00 – 16:00" },
    { index: 6, label: "16:00 – 17:00" },
    { index: 7, label: "17:00 – 18:00" },
  ],
};

const DAYS = [1, 2, 3, 4, 5, 6];

const item = (kind, text, children = []) => ({ id: uid(), kind, text, children });

let seq = 0;
function uid() {
  seq += 1;
  return `n${seq}`;
}

function demoData() {
  const classes = [
    { id: "c1", name: "1 PCSI", subject: "Mathématiques", level: "Prépa", group: "2", cycle: "prepa", tone: "lavender" },
    { id: "c2", name: "2 TSI", subject: "Physique — Chimie", level: "Prépa", group: "", cycle: "prepa", tone: "peach" },
    { id: "c3", name: "3 TCO", subject: "Informatique", level: "Tronc commun", group: "B", cycle: "lycee", tone: "sky" },
    { id: "c4", name: "1 BAC SM", subject: "Mathématiques", level: "1er Bac", group: "", cycle: "lycee", tone: "green" },
    { id: "c5", name: "2 BAC PC", subject: "Sciences de l'ingénieur", level: "2e Bac", group: "", cycle: "lycee", tone: "sand" },
    { id: "c6", name: "TCS — Français", subject: "Français", level: "Tronc commun", group: "A", cycle: "lycee", tone: "rose" },
  ];

  const timetable = {
    "1-0": "c2",
    "1-2": "c1",
    "1-5": "c3",
    "2-1": "c4",
    "2-6": "c6",
    "3-0": "c1",
    "3-3": "c5",
    "3-4": "c2",
    "4-2": "c6",
    "4-7": "c3",
    "5-1": "c1",
    "5-5": "c4",
    "6-0": "c5",
    "6-3": "c2",
  };

  const suites = item("chapter", "Suites numériques", [
    item("section", "Limites d'une suite", [
      item("definition", "On dit qu'une suite (uₙ) converge vers ℓ si tout intervalle ouvert contenant ℓ contient tous les termes à partir d'un certain rang."),
      item("theorem", "Toute suite convergente est bornée."),
      item("example", "uₙ = 1/n tend vers 0."),
    ]),
    item("section", "Opérations sur les limites", [
      item("exercise", "Calculer la limite de uₙ = (3n² + 2n)/(n² − 1)."),
      item("exercise", "Étudier la convergence de vₙ = (−1)ⁿ / n."),
    ]),
  ]);

  const derivation = item("chapter", "Dérivation", [
    item("section", "Nombre dérivé", [
      item("definition", "f est dérivable en a si le taux d'accroissement admet une limite finie en a."),
      item("exercise", "Dériver f(x) = x³ − 3x + 1."),
    ]),
  ]);

  const sessions = {
    c1: [
      {
        id: "s1",
        date: "2025-09-15",
        remark: "Rappel sur la notion de limite finie.",
        homework: "Exercices 12 et 13 p. 24.",
        items: [suites, derivation],
      },
      {
        id: "s2",
        date: "2025-09-22",
        remark: "Séance de consolidation.",
        homework: "Revoir la démonstration du théorème.",
        items: [
          item("chapter", "Fonctions continues", [
            item("section", "Théorème des valeurs intermédiaires", [
              item("theorem", "Si f est continue sur [a, b] et si f(a)·f(b) < 0, l'équation f(x) = 0 admet une solution dans ]a, b[."),
              item("evaluation", "Contrôle continu n° 1", []),
            ]),
          ]),
        ],
      },
      { id: "s3", date: "2025-09-29", remark: "", homework: "", items: [] },
    ],
    c2: [
      {
        id: "s4",
        date: "2025-09-16",
        remark: "Matériel de mesure distribué.",
        homework: "Compte rendu du TP 1.",
        items: [
          item("chapter", "Ondes mécaniques", [
            item("section", "Célérité", [item("definition", "La célérité d'une onde dépend du milieu de propagation.")]),
          ]),
        ],
      },
    ],
    c3: [{ id: "s5", date: "2025-09-17", remark: "", homework: "Installer l'éditeur.", items: [] }],
    c4: [], c5: [], c6: [],
  };

  return { classes, timetable, sessions };
}

/* ── Numérotation : mêmes règles que l'application ───────────────────────── */
const ROMAN = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function roman(value) {
  let rest = value;
  let out = "";
  for (const [amount, symbol] of ROMAN) {
    while (rest >= amount) {
      out += symbol;
      rest -= amount;
    }
  }
  return out || String(value);
}

function letters(value) {
  let current = value;
  let out = "";
  while (current > 0) {
    const rest = (current - 1) % 26;
    out = String.fromCharCode(65 + rest) + out;
    current = Math.floor((current - 1) / 26);
  }
  return out;
}

const STRUCTURAL = { chapter: 0, section: 1, subsection: 2 };
const COURSE_KINDS = ["definition", "theorem", "example", "exercise", "evaluation"];

function planNumbers(session) {
  const numbers = new Map();
  if (!session) return numbers;
  const counters = [0, 0, 0];

  const visit = (items) => {
    for (const node of items) {
      if (node.kind in STRUCTURAL) {
        const depth = STRUCTURAL[node.kind];
        counters[depth] += 1;
        for (let deeper = depth + 1; deeper < counters.length; deeper += 1) counters[deeper] = 0;
        const position = counters[depth];
        const label =
          depth === 0 ? roman(position) : depth === 1 ? letters(position) : `${position}°`;
        numbers.set(node.id, label);
      }
      visit(node.children);
    }
  };
  visit(session.items);

  let chapter = 0;
  const byKind = new Map();
  const walk = (items) => {
    for (const node of items) {
      if (node.kind === "chapter") chapter += 1;
      if (COURSE_KINDS.includes(node.kind)) {
        const key = `${chapter}:${node.kind}`;
        const next = (byKind.get(key) ?? 0) + 1;
        byKind.set(key, next);
        numbers.set(node.id, String(next));
      }
      walk(node.children);
    }
  };
  walk(session.items);
  return numbers;
}

/* ── État ────────────────────────────────────────────────────────────────── */
const state = {
  locale: "fr",
  theme: "light",
  size: "md",
  screen: "classes",
  dataSet: "full",
  search: "",
  openClassId: "c1",
  sessionId: null,
  period: "morning",
  selectedItemId: null,
  menuClassId: null,
  menuSlot: null,
  editingClassId: null,
  confirmKind: null,
};

const data = demoData();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function t(key, values = {}) {
  const dictionary = I18N[state.locale] ?? I18N.fr;
  let text = dictionary[key] ?? I18N.fr[key] ?? key;
  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

function classById(id) {
  return data.classes.find((entry) => entry.id === id) ?? null;
}

function sessionsOf(classId) {
  return data.sessions[classId] ?? [];
}

function currentSession() {
  return sessionsOf(state.openClassId).find((entry) => entry.id === state.sessionId) ?? null;
}

function shortDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function toneOf(classId) {
  return classById(classId)?.tone ?? "lavender";
}

/* ── Traduction ──────────────────────────────────────────────────────────── */
function applyTranslations() {
  const root = document.documentElement;
  root.lang = state.locale;
  root.dir = state.locale === "ar" ? "rtl" : "ltr";

  for (const node of $$("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of $$("[data-i18n-placeholder]")) node.placeholder = t(node.dataset.i18nPlaceholder);
}

/* ── Rendu : classes ─────────────────────────────────────────────────────── */
function renderClasses() {
  const grid = $("#class-grid");
  const empty = $("#classes-empty");
  const noresult = $("#classes-noresult");
  const meta = $("#classes-meta");

  const hasData = state.dataSet !== "empty";
  const classes = hasData ? data.classes : [];
  const query = state.search.trim().toLowerCase();
  const visible = query
    ? classes.filter((entry) =>
        `${entry.name} ${entry.subject} ${entry.level}`.toLowerCase().includes(query),
      )
    : classes;

  grid.replaceChildren();
  const showEmpty = !hasData || (state.dataSet === "noresult" && classes.length === 0);
  const showNoResult = visible.length === 0 && !showEmpty;

  empty.hidden = !showEmpty;
  noresult.hidden = !showNoResult;

  if (visible.length) {
    for (const entry of visible) {
      const card = document.createElement("article");
      card.className = "class-card";
      card.dataset.tone = entry.tone;
      card.dataset.classId = entry.id;

      const isNow = entry.id === currentClassId();
      const title = document.createElement("h2");
      title.className = "class-name";
      title.textContent = entry.group ? `${entry.name} · Groupe ${entry.group}` : entry.name;

      const metaLine = document.createElement("p");
      metaLine.className = "class-meta";
      metaLine.textContent = [entry.level, entry.subject].filter(Boolean).join(" · ");

      const menu = document.createElement("button");
      menu.className = "class-menu";
      menu.type = "button";
      menu.dataset.menuFor = entry.id;
      menu.setAttribute("aria-label", t("card.open"));
      menu.innerHTML = '<svg class="icon"><use href="#i-menu" /></svg>';

      card.append(title, metaLine);

      if (isNow) {
        const chip = document.createElement("span");
        chip.className = "class-chip";
        chip.innerHTML = `<svg class="icon" style="width:14px;height:14px"><use href="#i-clock" /></svg>${t("classes.now")}`;
        card.append(chip);
      }

      card.append(menu);
      grid.append(card);
    }
  }

  const hours = Object.keys(data.timetable).length;
  meta.textContent = hasData
    ? t("classes.meta", { count: data.classes.length, hours, next: nextLessonLabel() })
    : t("classes.metaEmpty");
}

function currentClassId() {
  // Séance « en cours » figée pour la démonstration : lundi 10:00–11:00.
  return data.timetable["1-2"] ?? null;
}

function nextLessonLabel() {
  const slot = SLOTS.morning[3];
  return `${t("day.2")} ${slot.label.split(" – ")[0]}`;
}

/* ── Rendu : cahier ──────────────────────────────────────────────────────── */
function renderCahier() {
  const workspace = $("#cahier-workspace");
  const emptyState = $("#cahier-empty");
  const title = $("#cahier-title");
  const sub = $("#cahier-sub");
  const entry = classById(state.openClassId);

  if (!entry || state.dataSet === "empty") {
    workspace.hidden = true;
    emptyState.hidden = false;
    title.textContent = t("nav.cahier");
    sub.textContent = "";
    return;
  }

  workspace.hidden = false;
  emptyState.hidden = true;
  title.textContent = entry.name;
  sub.textContent = [entry.subject, entry.level].filter(Boolean).join(" · ");

  const sessions = sessionsOf(entry.id);
  if (!sessions.some((session) => session.id === state.sessionId)) {
    state.sessionId = sessions.at(-1)?.id ?? null;
  }

  const list = $("#session-list");
  list.replaceChildren();
  for (const session of sessions) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `session-item${session.id === state.sessionId ? " is-active" : ""}`;
    button.dataset.sessionId = session.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(session.id === state.sessionId));

    const date = document.createElement("span");
    date.className = "session-date";
    date.textContent = shortDate(session.date);

    const heading = document.createElement("span");
    heading.className = "session-title";
    heading.textContent = session.items[0]?.text || t("cahier.planEmpty.title");

    button.append(date, heading);
    item.append(button);
    list.append(item);
  }

  const session = currentSession();
  $("#session-date").value = session?.date ?? "";
  $("#session-date").disabled = !session;
  $("#session-delete").disabled = !session;
  $("#session-pdf").disabled = !session;
  $("#session-remark").value = session?.remark ?? "";
  $("#session-homework").value = session?.homework ?? "";
  $("#session-remark").disabled = !session;
  $("#session-homework").disabled = !session;

  renderPlan(session);
}

function renderPlan(session) {
  const tree = $("#plan-tree");
  const empty = $("#plan-empty");
  tree.replaceChildren();

  const rows = [];
  const numbers = planNumbers(session);
  const walk = (items, depth) => {
    for (const node of items) {
      rows.push({ node, depth, number: numbers.get(node.id) ?? "" });
      walk(node.children, depth + 1);
    }
  };
  if (session) walk(session.items, 0);

  empty.hidden = !session || rows.length > 0;
  tree.hidden = !session || rows.length === 0;

  if (!session || rows.length === 0) return;

  const head = document.createElement("div");
  head.className = "tree-head";
  head.innerHTML = `<span>${t("cahier.kind")}</span><span>${t("cahier.number")}</span><span>${t("cahier.content")}</span>`;
  tree.append(head);

  for (const row of rows) {
    const line = document.createElement("div");
    line.className = "tree-row";
    if (row.node.kind in STRUCTURAL) line.classList.add("is-structural");
    if (row.node.id === state.selectedItemId) line.classList.add("is-selected");
    line.dataset.itemId = row.node.id;
    line.style.paddingInlineStart = `${12 + row.depth * 16}px`;

    const kind = document.createElement("span");
    kind.className = "tree-kind";
    kind.textContent = t(`kind.${row.node.kind}`);

    const number = document.createElement("span");
    number.className = "tree-number";
    number.textContent = row.number;

    const text = document.createElement("span");
    text.className = "tree-text";
    text.textContent = row.node.text || "…";
    text.title = row.node.text;

    line.append(kind, number, text);
    tree.append(line);
  }
}

/* ── Rendu : emploi du temps ─────────────────────────────────────────────── */
function renderTimetable() {
  const head = $("#timetable-head");
  const body = $("#timetable-body");
  const slots = SLOTS[state.period];

  head.replaceChildren();
  const headRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.scope = "col";
  corner.textContent = "";
  headRow.append(corner);
  for (const slot of slots) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = slot.label;
    headRow.append(cell);
  }
  head.append(headRow);

  body.replaceChildren();
  for (const day of DAYS) {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.className = "day";
    label.textContent = t(`day.${day}`);
    row.append(label);

    for (const slot of slots) {
      const cell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.dataset.day = String(day);
      button.dataset.slot = String(slot.index);

      const classId = state.dataSet === "empty" ? null : data.timetable[`${day}-${slot.index}`];

      if (classId && classById(classId)) {
        const entry = classById(classId);
        button.classList.add("is-filled");
        button.dataset.tone = toneOf(classId);
        button.innerHTML = `<span>${entry.name}</span><small>${entry.subject}</small>`;
        button.setAttribute("aria-label", `${entry.name} — ${t(`day.${day}`)} ${slot.label}`);
      } else {
        button.textContent = t("emploi.free");
        button.setAttribute("aria-label", `${t("emploi.free")} — ${t(`day.${day}`)} ${slot.label}`);
      }

      cell.append(button);
      row.append(cell);
    }
    body.append(row);
  }

  const legend = $("#timetable-legend");
  legend.replaceChildren();
  for (const entry of state.dataSet === "empty" ? [] : data.classes) {
    const wrap = document.createElement("span");
    const swatch = document.createElement("i");
    swatch.style.background = `var(--${entry.tone}-b)`;
    wrap.append(swatch, document.createTextNode(entry.name));
    legend.append(wrap);
  }
  if (!legend.children.length) legend.textContent = t("emploi.legend");
}

/* ── Rendu : réglages ────────────────────────────────────────────────────── */
function renderSubjects() {
  const grid = $("#subjects-grid");
  grid.replaceChildren();
  SUBJECTS.forEach((subject, index) => {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = index < 4;
    const text = document.createElement("span");
    text.textContent = state.locale === "ar" ? subject.ar : subject.fr;
    label.append(input, text);
    grid.append(label);
  });
}

function renderSubjectOptions() {
  const select = $("#dialog-subject");
  const current = select.value;
  select.replaceChildren();
  for (const subject of SUBJECTS) {
    const option = document.createElement("option");
    option.value = subject.fr;
    option.textContent = state.locale === "ar" ? subject.ar : subject.fr;
    option.dataset.tone = subject.tone;
    select.append(option);
  }
  if (current) select.value = current;
}

/* ── Navigation & apparence ──────────────────────────────────────────────── */
function showScreen(name) {
  state.screen = name;
  for (const page of $$(".page")) page.classList.toggle("is-active", page.id === `screen-${name}`);
  for (const button of $$(".rail-item")) button.classList.toggle("is-active", button.dataset.screen === name);
  if (name === "cahier") renderCahier();
  if (name === "emploi") renderTimetable();
  if (name === "reglages") {
    syncSegments();
    renderSubjects();
  }
}

function setTheme(theme) {
  state.theme = theme;
  const effective =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = effective;
  $("#theme-toggle").innerHTML = `<svg class="icon"><use href="#i-${effective === "dark" ? "sun" : "moon"}" /></svg>`;
  syncSegments();
}

function setSize(size) {
  state.size = size;
  document.documentElement.dataset.size = size;
  syncSegments();
}

function setLocale(locale) {
  state.locale = locale;
  applyTranslations();
  renderSubjectOptions();
  renderClasses();
  renderCahier();
  renderTimetable();
  renderSubjects();
  syncSegments();
}

function syncSegments() {
  for (const button of $$("[data-theme-set]")) {
    button.classList.toggle("is-active", button.dataset.themeSet === state.theme);
  }
  for (const button of $$("[data-size-set]")) {
    button.classList.toggle("is-active", button.dataset.sizeSet === state.size);
  }
  for (const button of $$("[data-locale-set]")) {
    button.classList.toggle("is-active", button.dataset.localeSet === state.locale);
  }
  for (const button of $$("[data-state-set]")) {
    button.classList.toggle("is-active", button.dataset.stateSet === state.dataSet);
  }
  for (const button of $$("[data-period]")) {
    button.classList.toggle("is-active", button.dataset.period === state.period);
  }
}

/* ── Interactions ────────────────────────────────────────────────────────── */
function openCardMenu(classId, anchor) {
  state.menuClassId = classId;
  const menu = $("#card-menu");
  const rect = anchor.getBoundingClientRect();
  menu.hidden = false;
  const width = menu.offsetWidth;
  const left = Math.min(rect.left, window.innerWidth - width - 12);
  menu.style.left = `${Math.max(12, left)}px`;
  menu.style.top = `${rect.bottom + 6}px`;
}

function openSlotMenu(day, slot, anchor) {
  state.menuSlot = { day, slot };
  const menu = $("#slot-menu");
  const title = $("#slot-menu-title");
  const items = $("#slot-menu-items");
  const label = SLOTS.morning.concat(SLOTS.afternoon).find((entry) => entry.index === slot);
  title.textContent = `${t(`day.${day}`)} · ${label?.label ?? ""}`;
  items.replaceChildren();

  for (const entry of data.classes) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.slotClass = entry.id;
    button.textContent = entry.name;
    if (data.timetable[`${day}-${slot}`] === entry.id) button.classList.add("is-checked");
    items.append(button);
  }

  if (data.timetable[`${day}-${slot}`]) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.dataset.slotClear = "1";
    clear.className = "danger";
    clear.textContent = t("emploi.clear");
    items.append(clear);
  }

  const rect = anchor.getBoundingClientRect();
  menu.hidden = false;
  menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 12))}px`;
  menu.style.top = `${Math.max(12, Math.min(rect.bottom, window.innerHeight - menu.offsetHeight - 12))}px`;
}

function closeMenus() {
  $("#card-menu").hidden = true;
  $("#slot-menu").hidden = true;
  state.menuClassId = null;
  state.menuSlot = null;
}

let toastTimer = null;
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.hidden = true;
  }, 2400);
}

function openClassDialog(entry = null) {
  state.editingClassId = entry?.id ?? null;
  const dialog = $("#class-dialog");
  $("#class-dialog-title").textContent = t(entry ? "dialog.editClass" : "dialog.newClass");
  const form = $("#class-form");
  form.reset();
  renderSubjectOptions();
  if (entry) {
    form.name.value = entry.name;
    form.subject.value = entry.subject;
    form.level.value = entry.level;
    form.cycle.value = entry.cycle ?? "";
    form.group.value = entry.group ?? "";
  }
  dialog.showModal();
  form.name.focus();
}

function askConfirmation(kind, text, onConfirm) {
  state.confirmKind = kind;
  $("#confirm-title").textContent = t(`confirm.${kind}.title`);
  $("#confirm-text").textContent = text ?? t(`confirm.${kind}.text`);
  const dialog = $("#confirm-dialog");
  const button = $("#confirm-ok");
  const handler = () => {
    button.removeEventListener("click", handler);
    dialog.close();
    onConfirm();
  };
  button.addEventListener("click", handler, { once: true });
  dialog.showModal();
}

/* ── Branchements ────────────────────────────────────────────────────────── */
document.addEventListener("click", (event) => {
  const target = event.target;

  const navButton = target.closest("[data-screen]");
  if (navButton) {
    showScreen(navButton.dataset.screen);
    closeMenus();
    return;
  }

  const goto = target.closest("[data-goto]");
  if (goto) {
    showScreen(goto.dataset.goto);
    return;
  }

  if (target.closest("#theme-toggle")) {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    return;
  }

  const themeSet = target.closest("[data-theme-set]");
  if (themeSet) {
    setTheme(themeSet.dataset.themeSet);
    return;
  }

  const sizeSet = target.closest("[data-size-set]");
  if (sizeSet) {
    setSize(sizeSet.dataset.sizeSet);
    return;
  }

  const localeSet = target.closest("[data-locale-set]");
  if (localeSet) {
    setLocale(localeSet.dataset.localeSet);
    return;
  }

  const stateSet = target.closest("[data-state-set]");
  if (stateSet) {
    state.dataSet = stateSet.dataset.stateSet;
    state.search = "";
    $("#classes-search").value = "";
    syncSegments();
    renderClasses();
    renderCahier();
    renderTimetable();
    return;
  }

  const period = target.closest("[data-period]");
  if (period) {
    state.period = period.dataset.period;
    syncSegments();
    renderTimetable();
    return;
  }

  if (target.closest("#classes-add")) {
    openClassDialog();
    return;
  }

  const openDialog = target.closest("[data-open-dialog]");
  if (openDialog) {
    $(`#${openDialog.dataset.openDialog}`).showModal();
    return;
  }

  const closeDialog = target.closest("[data-close-dialog]");
  if (closeDialog) {
    closeDialog.closest("dialog").close();
    return;
  }

  const menuButton = target.closest("[data-menu-for]");
  if (menuButton) {
    event.stopPropagation();
    openCardMenu(menuButton.dataset.menuFor, menuButton);
    return;
  }

  const cardAction = target.closest("[data-card-action]");
  if (cardAction) {
    const classId = state.menuClassId;
    closeMenus();
    if (cardAction.dataset.cardAction === "open") {
      state.openClassId = classId;
      showScreen("cahier");
    } else if (cardAction.dataset.cardAction === "schedule") {
      showScreen("emploi");
    } else if (cardAction.dataset.cardAction === "edit") {
      openClassDialog(classById(classId));
    } else if (cardAction.dataset.cardAction === "delete") {
      const entry = classById(classId);
      askConfirmation("class", `${entry.name} — ${t("confirm.class.text")}`, () => {
        data.classes = data.classes.filter((row) => row.id !== classId);
        toast(t("toast.deleted"));
        renderClasses();
        renderTimetable();
      });
    }
    return;
  }

  const card = target.closest(".class-card");
  if (card && !target.closest(".class-menu")) {
    state.openClassId = card.dataset.classId;
    showScreen("cahier");
    return;
  }

  const sessionButton = target.closest("[data-session-id]");
  if (sessionButton) {
    state.sessionId = sessionButton.dataset.sessionId;
    renderCahier();
    return;
  }

  const treeRow = target.closest("[data-item-id]");
  if (treeRow) {
    state.selectedItemId = treeRow.dataset.itemId;
    renderPlan(currentSession());
    return;
  }

  const slotCell = target.closest(".slot");
  if (slotCell) {
    openSlotMenu(Number(slotCell.dataset.day), Number(slotCell.dataset.slot), slotCell);
    return;
  }

  const slotClass = target.closest("[data-slot-class]");
  if (slotClass && state.menuSlot) {
    const { day, slot } = state.menuSlot;
    data.timetable[`${day}-${slot}`] = slotClass.dataset.slotClass;
    closeMenus();
    renderTimetable();
    renderClasses();
    toast(t("toast.saved"));
    return;
  }

  const slotClear = target.closest("[data-slot-clear]");
  if (slotClear && state.menuSlot) {
    const { day, slot } = state.menuSlot;
    delete data.timetable[`${day}-${slot}`];
    closeMenus();
    renderTimetable();
    toast(t("toast.saved"));
    return;
  }

  const toastButton = target.closest("[data-toast]");
  if (toastButton) {
    toast(t(toastButton.dataset.toast));
    return;
  }

  if (!target.closest(".menu")) closeMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenus();
});

$("#classes-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderClasses();
});

$("#review-toggle").addEventListener("click", (event) => {
  const bar = $("#review");
  const open = bar.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

$("#class-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  if (!name) {
    form.name.focus();
    return;
  }

  const tone = form.subject.selectedOptions[0]?.dataset.tone ?? "lavender";
  if (state.editingClassId) {
    const entry = classById(state.editingClassId);
    Object.assign(entry, {
      name,
      subject: form.subject.value,
      level: form.level.value.trim(),
      cycle: form.cycle.value || null,
      group: form.group.value.trim(),
      tone,
    });
  } else {
    data.classes.push({
      id: uid(),
      name,
      subject: form.subject.value,
      level: form.level.value.trim(),
      cycle: form.cycle.value || null,
      group: form.group.value.trim(),
      tone,
    });
    data.sessions[data.classes.at(-1).id] = [];
  }

  $("#class-dialog").close();
  state.dataSet = "full";
  syncSegments();
  renderClasses();
  renderTimetable();
  renderCahier();
  toast(t("toast.saved"));
});

$("#session-new").addEventListener("click", () => {
  const sessions = sessionsOf(state.openClassId);
  const last = sessions.at(-1);
  const next = new Date(last ? `${last.date}T00:00:00` : "2025-09-01T00:00:00");
  next.setDate(next.getDate() + 7);
  const iso = next.toISOString().slice(0, 10);
  const session = { id: uid(), date: iso, remark: "", homework: "", items: [] };
  sessions.push(session);
  state.sessionId = session.id;
  renderCahier();
  toast(t("cahier.toast.session"));
});

$("#session-pdf").addEventListener("click", () => toast(t("cahier.toast.pdf")));

$("#session-delete").addEventListener("click", () => {
  const session = currentSession();
  if (!session) return;
  askConfirmation("session", `${shortDate(session.date)} — ${t("confirm.session.text")}`, () => {
    data.sessions[state.openClassId] = sessionsOf(state.openClassId).filter((row) => row.id !== session.id);
    state.sessionId = null;
    renderCahier();
    toast(t("cahier.toast.deleted"));
  });
});

$("#session-date").addEventListener("change", (event) => {
  const session = currentSession();
  if (session) {
    session.date = event.target.value;
    renderCahier();
  }
});

$("#session-remark").addEventListener("input", (event) => {
  const session = currentSession();
  if (session) session.remark = event.target.value;
});

$("#session-homework").addEventListener("input", (event) => {
  const session = currentSession();
  if (session) session.homework = event.target.value;
});

for (const button of $$("[data-add]")) {
  button.addEventListener("click", () => {
    const session = currentSession();
    if (!session) return;
    const kind = button.dataset.add;
    const node = { id: uid(), kind, text: t(`kind.${kind}`), children: [] };
    if (kind === "chapter") {
      session.items.push(node);
    } else if (kind === "section") {
      const chapter =
        [...session.items].reverse().find((entry) => entry.kind === "chapter") ?? null;
      (chapter ? chapter.children : session.items).push(node);
    } else if (kind === "subsection") {
      const chapters = session.items.filter((entry) => entry.kind === "chapter");
      const chapter = chapters.at(-1) ?? null;
      const sections = chapter ? chapter.children.filter((entry) => entry.kind === "section") : [];
      const parent = sections.at(-1) ?? chapter;
      (parent ? parent.children : session.items).push(node);
    } else {
      const chapters = session.items.filter((entry) => entry.kind === "chapter");
      const chapter = chapters.at(-1) ?? null;
      const sections = chapter ? chapter.children.filter((entry) => entry.kind === "section") : [];
      const parent = sections.at(-1) ?? chapter;
      (parent ? parent.children : session.items).push(node);
    }
    state.selectedItemId = node.id;
    renderCahier();
  });
}

function findItem(id, items = currentSession()?.items ?? [], parent = null) {
  for (const node of items) {
    if (node.id === id) return { node, items, parent };
    const found = findItem(id, node.children, node);
    if (found) return found;
  }
  return null;
}

$("#item-remove").addEventListener("click", () => {
  const found = findItem(state.selectedItemId);
  if (!found) return;
  found.items.splice(found.items.indexOf(found.node), 1);
  state.selectedItemId = null;
  renderCahier();
});

function moveItem(direction) {
  const found = findItem(state.selectedItemId);
  if (!found) return;
  const index = found.items.indexOf(found.node);
  const target = index + direction;
  if (target < 0 || target >= found.items.length) return;
  found.items.splice(index, 1);
  found.items.splice(target, 0, found.node);
  renderCahier();
}

$("#item-up").addEventListener("click", () => moveItem(-1));
$("#item-down").addEventListener("click", () => moveItem(1));

$("#cahier-back").addEventListener("click", () => showScreen("classes"));

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.theme === "system") setTheme("system");
});

/* ── Démarrage ───────────────────────────────────────────────────────────── */
applyTranslations();
renderSubjectOptions();
setTheme("light");
syncSegments();
renderClasses();
renderCahier();
renderTimetable();
renderSubjects();
