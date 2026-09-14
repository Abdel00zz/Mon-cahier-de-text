/** Structured bilingual help: plain text only, no HTML injection. */
export interface GuideSection {
  title: string;
  body?: string;
  steps?: string[];
  items?: { term: string; detail: string }[];
}
export interface GuideChapter {
  id: string;
  title: string;
  summary: string;
  keywords: string;
  sections: GuideSection[];
  tip?: string;
  image?: { key: string; caption: string };
  related: string[];
}
type Content = Omit<GuideChapter, 'id' | 'related'>;
const chapter = (id: string, related: string[], fr: Content, ar: Content) => ({
  fr: { id, related, ...fr }, ar: { id, related, ...ar },
});

const chapters = [
  chapter('start', ['profile', 'schedule', 'content'], {
    title: 'Démarrage rapide : votre premier cahier de textes',
    summary: 'Initialisation du profil administratif, création de classe et premier enregistrement de séances selon les directives officielles.',
    keywords: 'démarrage début cahier de textes professeur classe niveau filière emploi du temps séance inspection pédagogique',
    sections: [
      {
        title: 'Initialiser une classe et son emploi du temps',
        steps: [
          'Accédez à Paramètres → Profil pour renseigner votre cadre d’enseignement : nom, établissement, académie (AREF), direction provinciale, matières et cycles (Collège, Lycée qualifiant ou CPGE).',
          'Depuis le tableau de bord, créez votre première division (classe) : indiquez le niveau scolaire, la filière / branche (ex. Sciences Expérimentales, Mathématiques), la matière et le groupe ou فوج.',
          'Renseignez la grille hebdomadaire dans Paramètres → Emploi du temps. Elle sert de repère automatique pour dater vos séances et contrôler la régularité du journal de classe.',
          'Ouvrez le cahier de textes de la classe : importez le programme officiel préconfiguré ou construisez votre progression pédagogique personnalisée.',
          'À l’issue de chaque séance réalisée, sélectionnez les éléments traités, appliquez la date effective et consignez le travail à faire pour la séance suivante.',
        ],
      },
      {
        title: 'Régularité et conformité pédagogique',
        body: 'Le cahier de textes est une pièce maîtresse de liaison administrative et de contrôle pédagogique. Avant le cours : planifiez les situations d’apprentissage. Après le cours : datez les acquis réels et notez les devoirs ou consignes. En fin de semaine : consultez le centre de pilotage pour vérifier le rythme d’avancement et la sauvegarde.',
      },
    ],
    tip: 'Une configuration rigoureuse de l’emploi du temps dès la rentrée garantit un suivi fluide et évite tout décalage dans la datation des séances.',
  }, {
    title: 'الانطلاقة السريعة: إعداد دفتر النصوص الرقمي',
    summary: 'الخطوات المنهجية لتهيئة المعطيات الإدارية، إعداد القسم الدراسي، ومسك الحصص وفق التوجيهات التربوية الرسمية.',
    keywords: 'بداية انطلاقة دفتر النصوص أستاذ قسم مستوى سلك مؤسسة تفتيش توجيهات تربوية مقرر وزاري مسك حصة إسناد تاريخ',
    sections: [
      {
        title: 'تهيئة أول قسم دراسي واستعمال الزمن',
        steps: [
          'ادخل إلى «الإعدادات» ثم «الملف الشخصي» للتحقق من المعطيات الإدارية: الاسم، المؤسسة التعليمية، الأكاديمية الجهوية (AREF)، المديرية الإقليمية، المواد والأسلاك المسندة.',
          'من لوحة التحكم الرئيسية، أضف فصلاً دراسياً: حدّد المستوى الدراسي، الشعبة أو المسلك (مثل: العلوم التجريبية، العلوم الرياضية، الآداب)، المادة، والفوج إن وجد.',
          'اضبط الحصص الأسبوعية في «الإعدادات» ثم «استعمال الزمن». يُعد هذا الجدول الركيزة الأساسية لرصد الحصص والتحقق التلقائي من مطابقة التواريخ.',
          'افتح دفتر نصوص القسم: استورد التوزيع الدوري والمقرر الدراسي الرسمي المعتمد، أو ابنِ تدرجك البيداغوجي ذاتياً.',
          'إثر كل حصة منجزة، حدّد المفاهيم والأنشطة المنجزة فعلياً، أسند تاريخ الحصة، ودوّن الملاحظات والواجبات المنزلية الموجهة للمتعلمين.',
        ],
      },
      {
        title: 'قواعد التوثيق المنتظم والانضباط التربوي',
        body: 'دفتر النصوص وثيقة إدارية وتربوية رسمية تعكس السير الفعلي لتنفيذ المقررات الدراسية، وتخضع لتأشير إدارة المؤسسة وهيئة التفتيش التربوي. قبل الحصة: حضّر الأنشطة التعلمية. إثر الحصة: وثّق المحتويات المنجزة وتاريخها فوراً. نهاية كل أسبوع: راجع مؤشرات مركز القيادة وحالة الحفظ والمزامنة السحابية.',
      },
    ],
    tip: 'ضبط جدول الحصص الأسبوعي بدقة من بداية الموسم الدراسي يمنع أخطاء تواريخ الحصص ويسهّل التأشير الإداري والمراقبة التربوية.',
  }),

  chapter('profile', ['schedule', 'classes', 'appearance'], {
    title: 'Profil enseignant, matières et cycles d’enseignement',
    summary: 'Paramétrage des données administratives, des cycles scolaires et personnalisation des en-têtes officiels.',
    keywords: 'profil enseignant collège lycée prépa matière AREF direction provinciale établissement cycle langue',
    sections: [
      {
        title: 'Renseigner les informations officielles',
        steps: [
          'Ouvrez Paramètres → Profil. Saisissez votre nom complet, la matière enseignée, le nom de l’établissement, ainsi que la Direction provinciale et l’Académie (AREF) de rattachement.',
          'Sélectionnez vos cycles d’intervention : Enseignement secondaire collégial, Enseignement secondaire qualifiant ou Classes préparatoires (CPGE). Plusieurs choix sont possibles.',
          'Cliquez sur « Enregistrer le profil ». Vos coordonnées administratives sont automatiquement intégrées aux cartouches de garde et d’impression officielle.',
        ],
      },
      {
        title: 'Impact du cycle sur les cahiers',
        body: 'La sélection des cycles filtre les niveaux, filières et programmes officiels suggérés lors de la création d’une classe. Modifier vos cycles n’altère en rien les cahiers de textes existants ni leurs progressions déjà enregistrées.',
      },
      {
        title: 'Bilinguisme et prise en main de l’interface',
        body: 'Le choix de la langue (arabe ou français) adapte l’ensemble de l’interface et l’orientation de lecture (RTL / LTR) sans modifier la langue d’origine de vos cours. Langue, apparence, notifications et emploi du temps s’appliquent immédiatement ; le profil se valide séparément.',
      },
    ],
  }, {
    title: 'الملف الشخصي، المواد والأسلاك التعليمية',
    summary: 'ضبط المعطيات الإدارية، إسناد الأسلاك (إعدادي، تأهيلي، أقسام تحضيرية) وتخصيص الترويسات الرسمية لدفاتر النصوص.',
    keywords: 'ملف شخصي أستاذ إعدادي ثانوي تأهيلي أقسام تحضيرية مادة مؤسسة أكاديمية جهوية مديرية إقليمية ترويسة لغة',
    sections: [
      {
        title: 'تحيين المعطيات الإدارية للأستاذ',
        steps: [
          'افتح «الإعدادات» ثم «الملف الشخصي». عبّئ الاسم الكامل للأستاذ، المؤسسة التعليمية، الأكاديمية الجهوية للتربية والتكوين، والمديرية الإقليمية التابع لها.',
          'حدّد السلك التعليمي والمادة المسندة: السلك الثانوي الإعدادي، السلك الثانوي التأهيلي، أو الأقسام التحضيرية (CPGE). يمكنك تحديد أكثر من سلك عند الاقتضاء.',
          'اضغط على «حفظ الملف الشخصي». تُعتمد هذه المعطيات الرسمية مباشرة في ترويسات الدفاتر وصفحات التصدير والطباعة.',
        ],
      },
      {
        title: 'أثر تغيير السلك على الأقسام',
        body: 'يتحكم اختيار السلك في ترشيح المستويات والمسالك والشعب الرسمية المقترحة عند إنشاء قسم جديد. تغيير السلك في الملف الشخصي لا يُلغي دفاتر النصوص الحالية ولا يُغيّر محتوياتها المسجلة.',
      },
      {
        title: 'لغة الواجهة والخصوصية التحريرية',
        body: 'تتيح إعدادات الحساب التبديل السلس بين اللغتين العربية والفرنسية مع ضبط المحاذاة التلقائية (من اليمين إلى اليسار للغة العربية). لا يؤثر تغيير لغة الواجهة على لغة نصوص الدروس والمفاهيم العلمية المدونة داخل الدفاتر.',
      },
    ],
  }),

  chapter('schedule', ['classes', 'dates', 'notifications'], {
    title: 'Emploi du temps hebdomadaire et créneaux de cours',
    summary: 'Structuration de la grille horaire hebdomadaire pour fiabiliser le repérage et la datation des séances.',
    keywords: 'emploi du temps grille horaire créneaux matin après-midi séances hebdomadaires rentrée scolaire décalage',
    image: { key: 'schedule', caption: 'Affectation des classes aux créneaux hebdomadaires de l’emploi du temps.' },
    sections: [
      {
        title: 'Établir la grille hebdomadaire',
        steps: [
          'Dans Paramètres → Emploi du temps, vérifiez la date de début de l’année scolaire conforme au calendrier ministériel.',
          'Affectez chaque classe à ses plages horaires respectives en cliquant à l’intersection du jour et de l’heure (matin ou après-midi).',
          'Pour une séance double (bloc de 2 heures consécutives), sélectionnez la même classe sur les deux créneaux consécutifs : le système les regroupe automatiquement.',
          'Pour libérer un créneau, sélectionnez la case vide. Contrôlez le récapitulatif global de la masse horaire par classe pour vérifier la conformité avec votre emploi du temps officiel.',
        ],
      },
      {
        title: 'Horaires décalés et ajustements administratifs',
        body: 'Les filtres matin, après-midi et journée facilitent la lecture. Le système permet d’appliquer les ajustements horaires officiels (ex. horaires décalés de Ramadan ou dispositions locales de l’établissement) sans modifier la durée pédagogique des séances.',
      },
    ],
    tip: 'Une grille horaire exacte garantit la pertinence des alertes d’oubli de datation et du suivi de progression dans le centre de pilotage.',
  }, {
    title: 'استعمال الزمن الأسبوعي وجدول الحصص',
    summary: 'برمجة الحصص الأسبوعية والفترات الصباحية والمسائية لضمان ضبط التأريخ ومواكبة إنجاز البرامج.',
    keywords: 'استعمال الزمن جدول الحصص حصص أسبوعية توقيت صباح مساء تفويج حصة مزدوجة مقرر وزاري غلاف زمني',
    image: { key: 'schedule', caption: 'برمجة وإسناد الأقسام لفترات جدول الحصص الأسبوعي.' },
    sections: [
      {
        title: 'برمجة الحصص على جدول الأسبوع',
        steps: [
          'في «الإعدادات» ثم «استعمال الزمن»، تحقق من تاريخ انطلاق الموسم الدراسي المعتمد في المقرر الوزاري لتنظيم السنة الدراسية.',
          'اضغط على الخانة المتقاطعة بين اليوم وساعة التدريس (صباحاً أو بعد الزوال) لإسناد القسم الدراسي المعني.',
          'في حالة الحصص المزدوجة (ساعتان متتاليتان)، أسند القسم نفسه للخانcurrentين المتتاليتين؛ حيث يتم دمجهما تلقائياً في حصة تدريسية واحدة.',
          'لحذف حصة، اختر الخانة الفارغة. راجع بعد ذلك جدول الحصيلة للتأكد من مطابقة الغلاف الزمني الأسبوعي لحصص المادة المقررة رسمياً.',
        ],
      },
      {
        title: 'التوقيت الإداري وتعديلات التوقيت المدرسي',
        body: 'تتيح المرشحات (الفترة الصباحية، فترة بعد الزوال، اليوم كاملاً) قراءة مريحة للجدول. يراعي النظام فترات التوقيت الخاصة (كتوقيت شهر رمضان أو التوقيت الشتوي المعتمد من قبل إدارة المؤسسة التعليمية) دون المساس بالمدد الديداكتيكية المخصصة للحصص.',
      },
    ],
    tip: 'احرص على مطابقة استعمال الزمن الرقمي مع نسختك الرسمية المصادق عليها من إدارة المؤسسة لتفادي تنبيهات عدم التوافق في التواريخ.',
  }),

  chapter('classes', ['content', 'schedule', 'pilotage'], {
    title: 'Tableau de bord et gestion de la séance en cours',
    summary: 'Accès immédiat au cahier de textes, repérage automatique de la classe en cours et gestes mobiles.',
    keywords: 'dashboard tableau de bord séance en cours carte classe appui long tactile raccourci filtres',
    image: { key: 'classes', caption: 'Repérage visuel de la classe active et indicateurs de suivi en temps réel.' },
    sections: [
      {
        title: 'Interactions et gestes clés',
        items: [
          { term: 'Accès au cahier de textes', detail: 'Touchez simplement la carte de la classe pour ouvrir son journal de séances.' },
          { term: 'Paramétrage rapide de la classe', detail: 'Sur smartphone ou tablette, effectuez un appui long continu sur la carte. Sur ordinateur, utilisez le bouton de réglages visible au survol.' },
          { term: 'Filtrage et affichage ergonomique', detail: 'Filtrez instantanément vos classes par niveau, cycle ou matière, et basculez entre vue liste, carte unitaire ou grille bento.' },
        ],
      },
      {
        title: 'Détection de la séance active en classe',
        body: 'En conformité avec votre emploi du temps, la classe active remonte automatiquement en tête de liste dès le début de l’heure avec une indication visuelle claire. L’application peut ouvrir directement son cahier de textes dans l’onglet pour consigner immédiatement les acquis.',
      },
      {
        title: 'Sécurité des données de classe',
        body: 'La suppression d’une classe efface l’intégralité de son cahier de textes et de ses évaluations. Veillez à exporter une sauvegarde préalable (JSON) avant toute suppression définitive. Modifier un filtre ou un cycle n’entraîne aucune suppression.',
      },
    ],
  }, {
    title: 'لوحة التحكم وتدبير الحصة التعليمية الجارية',
    summary: 'الولوج المباشر لدفتر نصوص القسم، الرصد التلقائي للحصة الجارية وفق استعمال الزمن، واختصارات التفاعل السريع.',
    keywords: 'لوحة التحكم حصة جارية بطاقة القسم ضغط مطول تفويج قسم نشط فرز تصفية',
    image: { key: 'classes', caption: 'التمييز البصري للحصة التعليمية الجارية ومؤشرات التتبع الفوري.' },
    sections: [
      {
        title: 'العمليات الأساسية على بطاقات الأقسام',
        items: [
          { term: 'فتح دفتر نصوص القسم', detail: 'المس بطاقة القسم للولوج المباشر إلى جدول الدروس والحصص المنجزة.' },
          { term: 'إعدادات وبنية القسم', detail: 'على الهاتف أو اللوحة الإلكترونية، اضغط مطولاً على بطاقة القسم لفتح نافذة التعديل. على الحاسوب، اضغط على زر الإعدادات الظاهر عند تمرير الفأرة.' },
          { term: 'خيارات الفرز والعرض المريح', detail: 'استخدم المرشحات لتصنيف الأقسام حسب المستوى أو السلك أو الفوج، مع إمكانية التبديل بين العرض الشبكي أو القائمة المدمجة.' },
        ],
      },
      {
        title: 'التعرف التلقائي على الحصة في الفصل',
        body: 'بناءً على توقيت استعمال الزمن المبرمج، يرتفع القسم الجاري تدريسه تلقائياً إلى صدارة لوحة التحكم مع شارة بصرية مميزة تفيد بأنك تدرّسه الآن، مما يتيح لك فتح دفتره وتدوين مجريات الحصة الصفية بسلاسة فورية.',
      },
      {
        title: 'الحماية الإدارية قبل الحذف',
        body: 'حذف قسم دراسي يؤدي إلى مسح سجل حصصه وتقويماته بالكامل. احرص دائماً على تصدير نسخة رقمية من دفتر القسم قبل حذفه نهائياً. تغيير مرشح العرض أو السلك ليس حذفاً للبيانات.',
      },
    ],
  }),

  chapter('content', ['editor', 'curriculum', 'backup'], {
    title: 'Programmation pédagogique : import officiel, rédaction libre ou service sur mesure',
    summary: 'Adopter le programme officiel ministériel, concevoir librement votre progression, ou confier la préparation de votre cahier à notre service d’assistance à partir de vos propres cours.',
    keywords: 'programme officiel curriculum import progression pédagogique rédaction libre service préparation cahier de textes WhatsApp cours personnels diagnostic',
    sections: [
      {
        title: 'Trois démarches de planification',
        steps: [
          'Import du programme officiel : À l’ouverture d’un nouveau cahier de textes, l’application vous propose d’importer le référentiel officiel correspondant à votre cycle, niveau et matière, intégrant l’évaluation diagnostique de rentrée.',
          'Rédaction libre : Concevez et saisissez directement vos propres chapitres, notions et activités selon votre démarche didactique et le rythme de vos élèves.',
          'Service sur mesure à partir de vos cours : Si vous préférez partir de vos documents de cours existants, contactez directement notre service d’assistance par WhatsApp pour préparer et organiser votre cahier de textes numérique sur mesure.',
          'Vérifiez la concordance des séances et datez uniquement le travail effectivement réalisé en classe au fur et à mesure de l’année.',
        ],
      },
      {
        title: 'Gestion des fichiers de progression (JSON)',
        body: 'Vous pouvez importer vos propres fiches de progression via l’outil de transfert de cours. Veillez à distinguer l’ajout de chapitres complémentaires du remplacement complet du cahier ouvert. Exportez la version actuelle avant tout remplacement.',
      },
    ],
    tip: 'Que vous choisissiez l’import officiel, la rédaction libre ou l’accompagnement par notre service à partir de vos cours, seules les séances effectivement dispensées en classe doivent recevoir une date de réalisation.',
  }, {
    title: 'التخطيط البيداغوجي: استيراد المنهاج الرسمي، التحرير الحر أو إعداد الدفتر من دروسك الخاصة',
    summary: 'ثلاثة خيارات مرنة لتنظيم دفتر النصوص: اعتماد المنهاج والتوزيع السنوي الرسمي، البناء والتحرير الحر لتدرجك الخاص، أو التواصل مع خدمة تحرير ورقمنة الدفتر انطلاقاً من محتوى دروسك.',
    keywords: 'منهاج رسمي توزيع سنوي توجيهات تربوية استيراد تدرج بيداغوجي تحرير حر خدمة إعداد دفاتر النصوص جذاذات دروس خاصة واتساب تقويم تشخيصي',
    sections: [
      {
        title: 'ثلاثة مسارات مرنة لتخطيط وتجهيز الدفتر',
        steps: [
          'استيراد المنهاج الرسمي: عند فتح دفتر نصوص فارغ، يقترح التطبيق بنقرة واحدة استيراد التوزيع السنوي الرسمي المعتمد من وزارة التربية الوطنية لمادتك وسلكك الدراسي، مع إدراج مرحلة التقويم التشخيصي والدعم في مستهل البرنامج.',
          'التحرير الحر: يمكنك الشروع مباشرة في إنشاء وحدات وفصول ودروس خاصة بك، وضبط الأنشطة والتمارين وصيغ التقويم وفق هندستك البيداغوجية المستقلة.',
          'خدمة تحرير الدفتر انطلاقاً من دروسك الخاصة: إذا كانت لديك جذاذات أو ملخصات دروس أو دفاتر سابقة، تواصل مباشرة مع خدمة إعداد دفاتر النصوص عبر واتساب لنُعدّ لك دفتر نصوصك الرقمي من محتوى دروسك الخاصة، جاهزاً ومنسقاً للاستخدام الفوري.',
          'تحقق من تسلسل الدروس ومحاورها، والتزم بعدم تأريخ أي عنصر إلا بعد إنجازه الفعلي داخل الحجرة الدراسية.',
        ],
      },
      {
        title: 'استيراد التدرجات الخاصة (ملفات JSON)',
        body: 'يمكنك تصدير واستيراد تخطيطك الدراسي المخصص عبر نافذة نقل البيانات. انتبه للاختيار بين «إضافة عناصر» و«استبدال شامل» للدفتر، واحتفظ بنسخة احتياطية قبل أي عملية استبدال.',
      },
    ],
    tip: 'استيراد المنهاج، التحرير الحر، أو إعداد الدفتر من دروسك يوفر قاعدة عمل متكاملة، ولا يُعد إنجازاً للحصص إلا بعد التأريخ الفعلي لكل نشاط صفي منجز.',
  }),

  chapter('editor', ['types', 'dates', 'math'], {
    title: 'Tenue quotidienne du cahier de textes numérique',
    summary: 'Sélection des apprentissages réalisés, datation rigoureuse et consignation des remarques pédagogiques.',
    keywords: 'éditeur cahier de textes tableau séances datation travail à faire devoirs remarques pédagogiques sélection',
    image: { key: 'editor', caption: 'Tableau de bord du cahier de textes et barre d’actions de datation des séances.' },
    sections: [
      {
        title: 'Enregistrement d’une séance d’enseignement',
        steps: [
          'Repérez le chapitre en cours d’étude et cochez les lignes d’activités, de théorèmes ou d’exercices effectivement traités lors de la séance.',
          'Dans la barre d’action contextuelle, activez la commande « Assigner une date ». Le système vérifie la concordance avec votre emploi du temps.',
          'Renseignez la case « Remarques / Travail à faire » : notez les exercices d’application, lectures ou devoirs préparatoires assignés aux élèves pour la séance suivante.',
          'Désélectionnez les lignes : vérifiez le regroupement visuel de la séance et la lisibilité du journal de classe.',
        ],
      },
      {
        title: 'Organisation et enrichissement du contenu',
        body: 'Le bouton « + » permet d’insérer à tout moment une notion, une démonstration ou une activité d’approfondissement. La barre de sélection vous permet de réorganiser l’ordre des éléments (monter/descendre), de modifier un intitulé ou de rectifier une date.',
      },
      {
        title: 'Lecture des cellules fusionnées et traçabilité',
        body: 'Toutes les notions abordées au cours d’une même séance partagent la même cellule de date. Ce découpage clair matérialise l’unité de la séance pour l’administration et l’inspection pédagogique.',
      },
    ],
    tip: 'Sur smartphone, basculez l’appareil en mode paysage pour bénéficier d’une visibilité optimale sur l’ensemble des colonnes du cahier.',
  }, {
    title: 'مسك دفتر النصوص وتوثيق الحصص الصفية',
    summary: 'تأشير الأنشطة المنجزة، إسناد تاريخ الحصة، وتدوين الملاحظات البيداغوجية والواجبات المنزلية بدقة.',
    keywords: 'مسك دفتر النصوص جدول الحصص توثيق إنجاز تأريخ ملاحظات بيداغوجية واجبات منزلية تفتيش تربوي شريط الإجراءات',
    image: { key: 'editor', caption: 'جدول مسك الحصص وشريط الإجراءات لتأريخ التعلمات والأنشطة.' },
    sections: [
      {
        title: 'خطوات تدوين الحصة الدراسية بعد إنجازها',
        steps: [
          'حدّد الفصل أو الوحدة الدراسية الجارية، وظلل سطور الأنشطة أو التعاريف أو التمارين المنجزة فعلياً خلال الحصة.',
          'من شريط الإجراءات السفلي، اختر «إسناد التاريخ». يتحقق النظام تلقائياً من موافقة التاريخ للحصص المبرمجة في استعمال الزمن.',
          'دوّن في خانة «الملاحظات والعمل المطلوب» التطبيقات الصفية، التوجيهات البيداغوجية، أو التمارين المنزلية الموجهة للمتعلمين.',
          'ألغِ التحديد وعاين اندماج عناصر الحصة في خانة تاريخية موحدة تعكس بدقة مسار العمل الصفي.',
        ],
      },
      {
        title: 'إدارة وتنظيم المحتوى الديداكتيكي',
        body: 'يتيح زر «+» إدراج أنشطة جديدة أو خاصيات إضافية في أي موضع من الدرس. يوفر شريط الإجراءات إمكانية تحريك العناصر لأعلى أو لأسفل، وتعديل النصوص، أو مسح تواريخ الحصص عند الحاجة إلى إعادة البرمجة.',
      },
      {
        title: 'الخانات المدمجة والمعاينة الرسمية',
        body: 'تندمج الأنشطة والمفاهيم المنتمية للحصة نفسها في خانة تاريخ واحدة، مما يمنح دفتر النصوص مظهراً احترافياً يسهّل المراقبة الإدارية من قِبل مدير المؤسسة وهيئة التفتيش التربوي الدوري.',
      },
    ],
    tip: 'عند العمل عبر الهاتف المحمول، استخدم الوضع الأفقي لمنحك مساحة أوسع لقراءة جدول الحصص وتحرير الملاحظات بارتياح.',
  }),

  chapter('types', ['editor', 'math', 'content'], {
    title: 'Typologie didactique des contenus d’enseignement',
    summary: 'Structurer la démarche pédagogique en distinguant situations de recherche, notions institutionnalisées et phases d’entraînement.',
    keywords: 'didactique situation problème définition théorème propriété démonstration exemple application activité exercice soutien',
    image: { key: 'add', caption: 'Palette didactique pour l’insertion d’activités, définitions et théorèmes.' },
    sections: [
      {
        title: 'Articuler les moments didactiques',
        body: 'Le cahier de textes ne se réduit pas à une liste de titres : chaque type matérialise une fonction d’apprentissage précise (découverte, institutionnalisation, consolidation, remédiation).',
      },
      {
        title: 'Guide des catégories didactiques',
        items: [
          { term: 'Activité / Situation-problème', detail: 'Phase de découverte, d’émergence des représentations ou d’introduction d’un concept nouveau.' },
          { term: 'Définition, Propriété, Théorème', detail: 'Institutionnalisation des savoirs fondamentaux et énoncés scientifiques majeurs selon le programme.' },
          { term: 'Démonstration / Preuve', detail: 'Démarche explicative, rigueur déductive et justification mathématique.' },
          { term: 'Exemple / Remarque', detail: 'Illustration immédiate, levée d’obstacles épistémologiques et précisions méthodologiques.' },
          { term: 'Application directe / Exercice', detail: 'Mise en œuvre des acquis, entraînement guidé puis travail autonome des élèves.' },
        ],
      },
      {
        title: 'Insertion rigoureuse',
        steps: [
          'Positionnez-vous dans l’arborescence du cours et cliquez sur le bouton « + ».',
          'Sélectionnez la catégorie didactique appropriée à l’objectif pédagogique de la séance.',
          'Complétez les champs, relisez puis confirmez. Vérifiez l’emplacement dans le tableau.',
        ],
      },
    ],
  }, {
    title: 'التصنيف الديداكتيكي لعناصر المحتوى الدراسي',
    summary: 'هيكلة مسار التعلمات: التمييز بين الأنشطة الاستكشافية، مأسسة المعارف، والتطبيقات الداعمة.',
    keywords: 'ديداكتيك وضعية مشكلة نشاط استكشافي تعريف خاصية مبرهنة برهان مثال تطبيق تمرين توليفي أنشطة الدعم',
    image: { key: 'add', caption: 'القائمة الديداكتيكية لإدراج الأنشطة والتعاريف والمبرهنات والتمارين.' },
    sections: [
      {
        title: 'الهيكلة الديداكتيكية للدرس',
        body: 'دفتر النصوص الرقمي ليس مجرد عناوين مجردة؛ بل يعكس مسار البناء الديداكتيكي للمفاهيم عبر التمييز بين وضعيات الاستكشاف، مأسسة المعارف والقوانين، ومراحل التدريب والتقويم التكويني.',
      },
      {
        title: 'دليل المكونات والمفاهيم التربوية',
        items: [
          { term: 'الأنشطة الاستكشافية والوضعيات المشكلة', detail: 'إثارة حافزية المتعلم، تشخيص المكتسبات السابقة، وبناء المفهوم الجديد تدرجياً.' },
          { term: 'التعاريف، الخاصيات والمبرهنات', detail: 'مأسسة القواعد العلمية وصياغة النتائج الأساسية المستهدفة في المنهاج الرسمي.' },
          { term: 'البراهين والاستدلال الرياضي', detail: 'تنمية التفكير المنطقي وتقديم الحجج والبراهين العلمية المدعمة للنتائج.' },
          { term: 'الأمثلة التوضيحية والملاحظات', detail: 'ترسيخ الفهم، إزالة اللبس المفاهيمي، وتوضيح شروط تطبيق القواعد.' },
          { term: 'التطبيقات المباشرة والتمارين التوليفية', detail: 'إرساء التعلمات، استثمار القواعد في حل وضعيات مسألة، وتثبيت المكتسبات.' },
        ],
      },
      {
        title: 'إدراج عنصر جديد في الدرس',
        steps: [
          'اختر الموضع المناسب في مسار الدرس ثم اضغط على زر «+».',
          'حدّد الصنف الديداكتيكي المناسب لطبيعة المحتوى والهدف التعلمي للحصة.',
          'أدخل عنوان العنصر ومحتواه العلمي بدقة، ثم صادق على الإدراج ليظهر مباشرة في جدول الدفتر.',
        ],
      },
    ],
  }),

  chapter('dates', ['schedule', 'notifications', 'pilotage'], {
    title: 'Calendrier scolaire officiel, datation et jours chômés',
    summary: 'Conformité des dates de séances avec l’Arrêté ministériel d’organisation de l’année scolaire et gestion des vacances.',
    keywords: 'calendrier scolaire arrêté ministériel vacances jours fériés dimanche absence contrôle datation séance',
    sections: [
      {
        title: 'Fiabiliser la datation des séances',
        steps: [
          'Sélectionnez les notions abordées et ouvrez le calendrier de saisie de la date.',
          'Prenez connaissance des alertes automatiques : dimanche (jour de repos hebdomadaire), vacances scolaires officielles, jours fériés nationaux ou religieux, ou absence préalablement déclarée.',
          'En cas de séance exceptionnelle de rattrapage (validée par l’administration de l’établissement), confirmez la date après vérification.',
          'L’option « Ne plus avertir pour cette date » mémorise la dérogation sans dispenser d’une vigilance pédagogique.',
        ],
      },
      {
        title: 'Respect du calendrier officiel du Ministère (MEN)',
        body: 'Le calendrier intégré prend en compte la programmation officielle des vacances scolaires et des fêtes nationales. Il respecte les découpages semestriels et périodiques officiels. Veillez à actualiser vos dates en cas de circulaire ministérielle modificative.',
      },
      {
        title: 'Cas des séances dédoublées ou multiples',
        body: 'La présence d’une date sur un cours n’implique pas automatiquement que toutes les séances du jour ont été enregistrées pour cette classe. Vérifiez systématiquement le nombre d’heures déclarées face à votre quota hebdomadaire.',
      },
    ],
  }, {
    title: 'التقويم المدرسي الرسمي، التأريخ وأيام التوقف',
    summary: 'ملاءمة تواريخ الحصص مع المقرر الوزاري لتنظيم السنة الدراسية وتدبير العطل والرخص الإدارية.',
    keywords: 'المقرر الوزاري تنظيم السنة الدراسية تقويم مدرسي عطل مدرسية أعياد وطنية دينية رخص غياب حصص استدراكية',
    sections: [
      {
        title: 'تدقيق تواريخ الإنجاز الفعلي للحصص',
        steps: [
          'حدّد عناصر الدرس المنجزة ثم افتح نافذة إسناد التاريخ لاختيار يوم الحصة الفعلي.',
          'انتبه للتنبيهات الآلية الصادرة عن النظام: يوم الأحد (راحة أسبوعية)، فترات العطل المدرسية الرسمية، الأعياد الوطنية والدينية، أو رخص الغياب المسجلة للأستاذ.',
          'في حال برمجة حصة دعم أو حصة استدراكية مرخصة من إدارة المؤسسة في يوم عطلة، أكد إسناد التاريخ بوعي كامل بالاستثناء.',
          'يُستخدم خيار «عدم التنبيه لهذا التاريخ مجدداً» فقط لتسجيل هذا الاستثناء الرسمي في أرشيف الدفتر.',
        ],
      },
      {
        title: 'التطابق مع المقرر الوزاري لوزارة التربية الوطنية',
        body: 'يعتمد النظام جدول العطل المدرسية الموحد الصادر عن وزارة التربية الوطنية والتعليم الأولي والرياضة. تظل المذكرات الوزارية الدورية والجهوية المرجع الأساسي لأي طارئ أو تعديل في المواقيت.',
      },
      {
        title: 'تدبير الحصص المزدوجة وفترات التفويج',
        body: 'تسجيل تاريخ لحصة صباحية لا يعني تلقائياً تدوين الحصة المسائية إن كان للقسم حصتان في اليوم نفسه. تأكد دائماً من تسجيل وتوثيق كل فترة دراسية مستقلة استيفاءً للغلاف الزمني القانوني للمادة.',
      },
    ],
  }),

  chapter('math', ['types', 'appearance', 'troubleshooting'], {
    title: 'Formules mathématiques (LaTeX), bilinguisme et recherche',
    summary: 'Régularité des écritures scientifiques, respect de la typographie mathématique et recherche textuelle.',
    keywords: 'LaTeX MathJax mathématiques formules scientifiques équations fractions bilingue RTL LTR recherche',
    sections: [
      {
        title: 'Saisie rigoureuse des expressions mathématiques',
        steps: [
          'Pour insérer une formule dans le flux du texte, encadrez-la par des dollars simples : $f(x) = ax^2 + bx + c$.',
          'Pour une formule mise en valeur centrée, utilisez des doubles dollars : $$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$.',
          'Pour les structures élaborées (systèmes, matrices, tableaux de variations), vérifiez l’équilibrage des accolades \\{...\\} et des délimiteurs.',
          'Prévisualisez le rendu avant validation pour vous assurer que les symboles s’affichent correctement à l’écran et à l’impression.',
        ],
      },
      {
        title: 'Harmonie bilingue (arabe / français)',
        body: 'Dans une interface en arabe, les énoncés scientifiques et formules en français conservent rigoureusement leur sens naturel de gauche à droite (LTR). Le moteur d’affichage garantit l’alignement typographique sans altérer les symboles scientifiques universels.',
      },
      {
        title: 'Recherche rapide de notions',
        body: 'Le champ de recherche intégré au cahier filtre instantanément les cours pour retrouver un chapitre, une formule ou un intitulé spécifique. Pensez à vider le filtre de recherche avant d’exécuter une action globale sur le cahier.',
      },
    ],
    tip: 'En cas de formule non interprétée, vérifiez l’absence d’accolade manquante et attendez le chargement complet du moteur de rendu MathJax.',
  }, {
    title: 'الصياغة الرياضية والترميز العلمي (LaTeX) والبحث',
    summary: 'كتابة المعادلات والرموز العلمية بدقة، التوافق بين اللغات والاتجاهات (RTL/LTR)، والبحث السريع.',
    keywords: 'رياضيات ترميز علمي معادلات صيغ LaTeX MathJax لاتكس ماثجاكس كسور نهايات متجهات بحث',
    sections: [
      {
        title: 'كتابة الصيغ والرموز الرياضية',
        steps: [
          'لكتابة صيغة رياضية مدمجة في السطر، ضع التعبير بين علامتي دولار: $f(x) = ax^2 + bx + c$.',
          'للصيغ الرياضية المستقلة في سطر منفصل، استخدم علامتي دولار مضاعفتين: $$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$.',
          'عند كتابة الكسور والجذور والمتجهات والنظمات، تأكد من إغلاق الحاضنات \\{...\\} وتوازن المحددات الرياضية.',
          'عاين النتيجة في جدول الدفتر وفي نافذة الطباعة للتأكد من وضوح الخطوط والرموز الديداكتيكية.',
        ],
      },
      {
        title: 'التوافق اللغوي والاتجاه المزدوج (العربية والفرنسية)',
        body: 'يراعي التطبيق طبيعة تدريس المواد العلمية بالمسالك الدولية والوطنية: تظل النصوص والصيغ المكتوبة بالفرنسية من اليسار إلى اليمين (LTR) حتى في الواجهة العربية، دون أي تشويه في الرموز أو ترتيب العمليات الرياضية.',
      },
      {
        title: 'البحث والتصفية الديداكتيكية',
        body: 'يتيح محرك البحث الداخلي تصفية فورية لعناصر الدفتر بالكلمات المفتاحية (مبرهنة، نشاط، دالة...). احرص على تفريغ شريط البحث قبل تطبيق إجراءات التأريخ الجماعي لإظهار كافة عناصر المقرر.',
      },
    ],
    tip: 'إذا ظهرت الصيغة كنص خام، تأكد من سلامة صياغة أوامر LaTeX واكتمال تحميل محرك العرض الرياضي على المتصفح.',
  }),

  chapter('pilotage', ['curriculum', 'assessments', 'notifications'], {
    title: 'Centre de pilotage et suivi de progression pédagogique',
    summary: 'Tableau de bord stratégique pour le contrôle de l’avancement des programmes, des échéances et de la régularité du cahier.',
    keywords: 'centre de pilotage progression pédagogique tableau de bord cloche échéances devoirs conformité inspection',
    image: { key: 'pilotage', caption: 'Indicateurs de conformité et de rythme de progression dans le centre de pilotage.' },
    sections: [
      {
        title: 'Votre tour de contrôle pédagogique',
        body: 'Accessible via la cloche du tableau de bord, le centre de pilotage centralise l’analyse continue de vos enseignements : rythme de progression par rapport au calendrier officiel, séances en attente de datation et prévision des contrôles continus.',
      },
      {
        title: 'Rubriques d’analyse et indicateurs de conformité',
        items: [
          { term: 'Repères de vigilance', detail: 'Signalement immédiat des anomalies : grille horaire incomplète, séances non datées, décalage avec le calendrier officiel ou absence prolongée d’activité.' },
          { term: 'Échéances de contrôle continu', detail: 'Rappel des dates prévues pour les devoirs surveillés, devoirs à domicile et activités d’évaluation diagnostique ou sommative.' },
          { term: 'Calendrier et périodes ministérielles', detail: 'Repérage des étapes clés de l’année scolaire : fin de période, arrêts des notes et vacances officielles.' },
          { term: 'Suivi synthétique des classes', detail: 'Vue panoramique sur le taux de complétion des cahiers, la date de dernière séance enregistrée et le statut d’impression.' },
          { term: 'Journal d’activité pédagogique', detail: 'Historique chronologique des modifications et opérations de saisie effectuées sur vos cahiers.' },
        ],
      },
      {
        title: 'Traitement méthodique des alertes',
        steps: [
          'Consultez le motif de l’alerte et identifiez la classe concernée.',
          'Cliquez sur l’action proposée pour accéder directement à l’écran de rectification (cahier de textes, emploi du temps ou évaluations).',
          'Une fois les données actualisées, revenez au centre de pilotage pour constater l’actualisation des indicateurs de conformité.',
        ],
      },
    ],
  }, {
    title: 'مركز القيادة والتتبع البيداغوجي',
    summary: 'لوحة تتبع استراتيجية لقياس وتيرة تنفيذ المقررات، مواعيد المراقبة المستمرة، والانضباط التوثيقي.',
    keywords: 'مركز القيادة تتبع بيداغوجي وتيرة الإنجاز مراقبة مستمرة مؤشرات التفتيش فروض محروسة تنبيهات',
    image: { key: 'pilotage', caption: 'مؤشرات الانضباط وتتبع وتيرة إنجاز المقررات بمركز القيادة.' },
    sections: [
      {
        title: 'غرفة المتابعة التربوية والتدبيرية',
        body: 'يُفتح مركز القيادة عبر أيقونة الجرس في لوحة التحكم، ويشكل فضاءً تحليلياً متكاملاً يتيح للأستاذ استباق الإجراءات الإدارية والتربوية، وضبط وتيرة تقدم الدروس مقارنة مع التوزيع السنوي الرسمي.',
      },
      {
        title: 'مكونات لوحة التتبع والمؤشرات المعتمدة',
        items: [
          { term: 'مؤشرات اليقظة والانتظام', detail: 'رصد الثغرات الإجرائية: استعمال زمن غير مكتمل، حصص منجزة غير مؤرخة، أو انقطاع غير معتاد في التدوين.' },
          { term: 'محطات المراقبة المستمرة', detail: 'جدولة استحقاقات الفروض المحروسة والمنزلية والتقويم التشخيصي وأنشطة الدعم المبرمجة.' },
          { term: 'المحطات الرسمية والمقرر الوزاري', detail: 'متابعة الفترات الدراسية، تواريخ توقف الدروس، العطل المدرسية، وفترات مسك النقط في منظومة مسار.' },
          { term: 'وضعية الأقسام ونسب الإنجاز', detail: 'حوصلة إحصائية لحالة كل قسم: نسبة تغطية المنهاج، تاريخ آخر حصة موثقة، وجاهزية سجل الحصص للطباعة.' },
          { term: 'سجل العمليات والأنشطة', detail: 'توثيق زمني دقيق لكافة التعديلات والإضافات المنجزة على الدفاتر لضمان سلامة المعطيات.' },
        ],
      },
      {
        title: 'معالجة التنبيهات التربوية',
        steps: [
          'اطّلع على مضمون التنبيه وحدّد القسم الدراسي المعني بالتدقيق.',
          'استخدم زر الإجراء الفوري للانتقال مباشرة إلى دفتر النصوص أو جدول الحصص لإصلاح المعطيات.',
          'عُد إلى مركز القيادة لمعاينة تحيين المؤشرات واختفاء التنبيه بعد إتمام التوثيق.',
        ],
      },
    ],
  }),

  chapter('curriculum', ['content', 'pilotage', 'dates'], {
    title: 'Suivi du programme officiel et répartitions périodiques',
    summary: 'Mesurer la réalisation des objectifs pédagogiques et comparer l’avancement réel aux prévisions officielles.',
    keywords: 'programme officiel répartition annuelle périodique couverture programme progression pourcentages inspection',
    sections: [
      {
        title: 'Alignement sur les Orientations Pédagogiques',
        steps: [
          'Accédez à l’écran de suivi du programme officiel depuis le cahier de textes de la classe.',
          'Vérifiez la conformité du référentiel sélectionné (cycle, matière, filière et volume horaire annuel prescrit).',
          'Associez vos chapitres d’enseignement aux modules et compétences officielles du programme ministériel.',
          'Datez régulièrement les apprentissages menés à terme pour mettre à jour les statistiques de couverture pédagogique.',
        ],
      },
      {
        title: 'Interpréter les pourcentages d’avancement',
        body: 'Le taux d’exécution reflète les séances datées par rapport au volume horaire prescrit par le ministère. Importer un programme ne suffit pas à le déclarer réalisé : seul le مسك des séances effectives alimente fidèlement le rapport d’avancement remis à la direction ou au corps d’inspection.',
      },
      {
        title: 'Ajustement en cas de réorganisation de la progression',
        body: 'Si vous modifiez l’ordre des chapitres pour des raisons didactiques, veillez à maintenir la cohérence des correspondances avec le programme pour conserver des statistiques d’avancement fiables.',
      },
    ],
  }, {
    title: 'تتبع تنفيذ المنهاج الدراسي والتوزيع الدوري الرسمي',
    summary: 'مقاربة وتيرة الإنجاز الفعلي بالبرمجة السنوية والتوجيهات التربوية لوزارة التربية الوطنية.',
    keywords: 'منهاج دراسي توزيع سنوي توزيع دوري توجيهات تربوية نسبة الإنجاز تفتيش تربوي كفايات مستهدفة',
    sections: [
      {
        title: 'مطابقة سير الدروس مع المراجع الرسمية',
        steps: [
          'افتح شاشة تتبع المنهاج من داخل دفتر نصوص القسم المعني.',
          'تحقق من اختيار المرجع المعتمد المطابق للمستوى والشعبة والغلاف الزمني السنوي المحدد وزارياً.',
          'اربط فصول ودروس القسم بالوحدات والكفايات المسطرة في التوجيهات التربوية الرسمية للمادة.',
          'داوم على تأريخ الحصص المنجزة لتحديث مؤشرات التغطية ونسب التقدم في تنفيذ المقرر الدراسي.',
        ],
      },
      {
        title: 'قراءة مؤشرات ونسب التغطية البيداغوجية',
        body: 'تُحتسب نسب الإنجاز بناءً على الحصص المؤرخة فعلياً قياساً إلى الحجم الساعي المحدد رسمياً. استيراد المقرر الدراسي يمثل التخطيط القبلي فقط، بينما يشكل التدوين المؤرخ للحصص الإنجاز الفعلي المعتمد لدى الإدارة وهيئة التأطير والمراقبة التربوية.',
      },
      {
        title: 'التعديل في التدرج البيداغوجي',
        body: 'إذا اقتضت المصلحة البيداغوجية تقديم درس أو تأخيره لتثبيت مكتسبات سابقة، تأكد من تحيين الروابط مع المنهاج لضمان مصداقية التقرير الدوري حول سير البرامج التعليمية.',
      },
    ],
  }),

  chapter('assessments', ['pilotage', 'dates', 'backup'], {
    title: 'Contrôle continu, évaluations et activités de remédiation',
    summary: 'Planification des devoirs surveillés, évaluations diagnostiques, soutien pédagogique et suivi des absences des élèves.',
    keywords: 'contrôle continu devoir surveillé devoir à domicile évaluation diagnostique soutien remédiation absence élèves examen semestriel',
    sections: [
      {
        title: 'Programmer et consigner une évaluation',
        steps: [
          'Accédez à l’onglet Évaluations de la classe concernée.',
          'Créez une évaluation : indiquez la modalité (Devoir surveillé, Devoir à domicile, Contrôle oral, Évaluation diagnostique), le semestre, le numéro d’ordre et la date de passation.',
          'Précisez la durée et le barème indicatif, puis consignez la liste des élèves absents lors de l’épreuve.',
          'Retrouvez les échéances programmées directement dans votre centre de pilotage pour anticiper la préparation des sujets et des corrigés.',
        ],
      },
      {
        title: 'Diversité des situations d’évaluation',
        body: 'L’application permet de distinguer clairement les devoirs comptant pour le contrôle continu officiel (consignés ensuite dans Massar) des activités pédagogiques spécifiques : séances de soutien scolaire, remédiation ciblée, examens blancs ou concours blancs.',
      },
      {
        title: 'Distinction rigoureuse des absences',
        body: 'Les absences renseignées dans le module d’évaluation concernent exclusivement les élèves lors des devoirs. Vos propres autorisations d’absence ou congés se déclarent dans Paramètres → Notifications.',
      },
    ],
  }, {
    title: 'المراقبة المستمرة، الفروض والأنشطة التقويمية والداعمة',
    summary: 'جدولة الفروض المحروسة والمنزلية، التقويم التشخيصي، حصص الدعم وتثبيت المكتسبات، وتتبع غياب التلاميذ.',
    keywords: 'مراقبة مستمرة فرض محروس فرض منزلي تقويم تشخيصي دعم معالجة غياب التلاميذ امتحان تجريبي مسار',
    sections: [
      {
        title: 'تنظيم وجدولة محطات التقويم',
        steps: [
          'افتح نافذة «التقويمات» الخاصة بالقسم الدراسي المعني.',
          'أضف تقويماً جديداً: اختر طبيعته (فرض محروس، فرض منزلي، نشاط مندمج، تقويم تشخيصي)، الأسدوس الدراسي، رقم الفرض، وتاريخ الإنجاز المبرمج.',
          'حدّد المدة الزمنية المخصصة للاختبار، ودوّن لائحة التلاميذ الغائبين أثناء إجراء الفرض للرجوع إليها عند تنظيم حصص الاستدراك.',
          'تابع مواعيد الفروض المقبلة في مركز القيادة للتهيئة المسبقة لمواضيع الاختبارات وعناصر الإجابة وسلم التنقيط.',
        ],
      },
      {
        title: 'التمايز بين محطات التقويم والدعم',
        body: 'يفرّق النظام بدقة بين فروض المراقبة المستمرة المقررة رسمياً والمحتسبة في نتائج منظومة «مسار»، وبين الأنشطة التربوية الموازية: حصص الدعم البيداغوجي، أسابيع المعالجة المركزة، الامتحانات التجريبية، والأنشطة المندمجة.',
      },
      {
        title: 'التفريق المنهجي بين أصناف الغياب',
        body: 'يقتصر تسجيل الغياب في شاشة التقويمات على غياب المتعلمين عن موعد الاختبار. أما رخص غياب الأستاذ أو الانقطاعات الإدارية فتُسجل في «الإعدادات» ثم «الإشعارات» لتكييف حساب حصص العمل.',
      },
    ],
  }),

  chapter('notifications', ['pilotage', 'schedule', 'devices'], {
    title: 'Alertes en classe, rappels de saisie et notifications',
    summary: 'Paramétrer les rappels de fin de séance, les alertes d’oubli de datation et les notifications système.',
    keywords: 'notifications alertes rappels fin de séance oubli de datation seuils de retard vibration push PWA',
    image: { key: 'notifications', caption: 'Paramétrage des alertes de fin de cours et de rappel de datation.' },
    sections: [
      {
        title: 'Activer les notifications sur votre appareil',
        steps: [
          'Depuis l’appareil utilisé en classe (smartphone, tablette ou ordinateur portable), ouvrez Paramètres → Notifications.',
          'Cliquez sur « Activer les notifications push » et validez impérativement l’autorisation demandée par votre navigateur internet.',
          'Vérifiez le bon fonctionnement immédiat grâce au bouton de test d’envoi. Répétez l’opération sur vos autres appareils personnels si nécessaire.',
          'En cas de blocage, vérifiez les autorisations de notification dans les paramètres de votre système d’exploitation ou du navigateur.',
        ],
      },
      {
        title: 'Personnaliser les seuils et alertes pédagogiques',
        items: [
          { term: 'Avertisseur de fin de cours', detail: 'Rappel discret 1, 2, 5 ou 10 minutes avant la fin de l’heure pour conclure la séance et noter les devoirs.' },
          { term: 'Rappel de datation de séance', detail: 'Notification programmée après la fin du cours (ex. après 5 ou 15 minutes) si les contenus n’ont pas encore été datés.' },
          { term: 'Surveillance de retard et inactivité', detail: 'Alerte contextuelle lorsque plusieurs séances prévues à l’emploi du temps demeurent sans trace écrite dans le cahier.' },
          { term: 'Suspension pendant les vacances', detail: 'Mise en veille automatique des rappels durant les périodes de congés scolaires et d’absences déclarées.' },
          { term: 'Vibration et retours haptiques', detail: 'Signal tactile discret adapté à la présence en classe (selon compatibilité de l’appareil).' },
        ],
      },
      {
        title: 'Recommandations d’usage',
        body: 'Pour garantir la réception des rappels en classe, désactivez les restrictions d’économie d’énergie sur votre navigateur. Les alertes constituent une aide au quotidien, sans se substituer à votre rigueur professionnelle.',
      },
    ],
  }, {
    title: 'التنبيهات التلقائية والإشعارات اللحظية أثناء الحصة',
    summary: 'ضبط تذكيرات اختتام الحصة، تنبيهات استدراك التدوين، وإشعارات النظام على الهواتف واللوحات.',
    keywords: 'إشعارات تنبيهات تذكير اختتام الحصة تأريخ الحصص تدوين إشعار فوري اهتزاز هاتف PWA',
    image: { key: 'notifications', caption: 'ضبط تنبيهات اختتام الحصة والتذكير بمسك الحصص غير المؤرخة.' },
    sections: [
      {
        title: 'تفعيل الإشعارات على جهازك المستخدم',
        steps: [
          'من الجهاز المستعمل داخل الفصل (هاتف ذكي أو لوحة إلكترونية أو حاسوب)، ادخل إلى «الإعدادات» ثم «الإشعارات».',
          'اضغط على «تفعيل إشعارات النظام» ثم وافق فوراً على إذن المتصفح بالسماح بالإشعارات.',
          'انتظر تأكيد نجاح الاشتراك ثم اضغط على «إرسال إشعار تجريبي» للتحقق من وصول التنبيهات. كرر الخطوة على أي جهاز شخصي آخر ترغب في استخدامه.',
          'في حال تعذر التشغيل، راجع إعدادات الإشعارات والأذونات في المتصفح أو نظام تشغيل الجهاز.',
        ],
      },
      {
        title: 'تخصيص مواقيت وعتبات التذكير البيداغوجي',
        items: [
          { term: 'التنبيه بقرب نهاية الحصة', detail: 'إشعار هادئ قبل انتهاء وقت الدرس بدقيقة أو دقيقتين أو 5 دقائق، لتخصيص الدقائق الأخيرة لتسجيل الواجب المنزلي وتدوين الخلاصة.' },
          { term: 'التذكير بتأريخ الحصة المنجزة', detail: 'تنبيه يصدر بعد انقضاء الحصة (5 أو 15 دقيقة) في حال عدم إسناد التاريخ لعناصر الدرس التي تم إنجازها.' },
          { term: 'رصد التراكم والانقطاع', detail: 'تنبيه ذكي عند استمرار عدة حصص مبرمجة في استعمال الزمن دون مسك في دفتر النصوص.' },
          { term: 'هدوء العطل والرخص المبرمجة', detail: 'إيقاف التنبيهات تلقائياً خلال العطل المدرسية المحددة في المقرر الوزاري والرخص الخاصة بالأستاذ.' },
          { term: 'التنبيه بالاهتزاز الخفيف', detail: 'إشعار حركي غير ملفت ملائم لجو الحجرة الدراسية (وفق دعم نظام تشغيل الهاتف).' },
        ],
      },
      {
        title: 'إرشادات لضمان وصول التنبيهات',
        body: 'لضمان اشتغال التنبيهات بدقة، يُستحسن استثناء التطبيق من برامج توفير طاقة البطارية الصارمة. تظل التنبيهات وسيلة مساعدة ذكية تعزز حرص الأستاذ على انتظام مسك الوثائق التربوية.',
      },
    ],
  }),

  chapter('appearance', ['profile', 'math', 'print'], {
    title: 'Confort visuel, typographie et personnalisation de l’interface',
    summary: 'Optimisation de la lisibilité pour l’affichage en classe, sur vidéoprojecteur et sur écran mobile.',
    keywords: 'apparence thème sombre clair police arabe latin contraste lisibilité vidéoprojecteur Cyber Tech Clean',
    sections: [
      {
        title: 'Configuration de l’environnement de lecture',
        steps: [
          'Dans Paramètres → Apparence, choisissez entre le thème Clair, le thème Sombre (recommandé pour limiter la fatigue oculaire) ou l’adaptation automatique au Système.',
          'Ajustez la couleur d’accentuation, le rayon des bordures et la densité d’affichage du tableau des séances.',
          'Sélectionnez la typographie de l’interface ainsi que les polices dédiées aux contenus en français et en arabe pour une lecture fluide en classe.',
          'Consultez immédiatement le rendu dans un vrai cahier de textes. Toute modification esthétique s’applique instantanément.',
        ],
      },
      {
        title: 'Visibilité des descriptions et détails didactiques',
        body: 'Les réglages de description à l’écran et à l’impression sont distincts : tout, aucun ou certains types. Masquer une description allège la consultation visuelle sans supprimer son contenu.',
      },
      {
        title: 'Utilisation sur smartphone et tablette',
        body: 'La largeur d’écran, le zoom du navigateur et la taille de texte du système influencent le rendu. Privilégiez le confort visuel : un contraste conforme aux normes WCAG garantit une lecture aisée en classe.',
      },
    ],
  }, {
    title: 'التخصيص البصري، الخطوط وراحة القراءة',
    summary: 'ملاءمة واجهة العرض لبيئة الحجرة الدراسية، شاشات الهواتف وأجهزة العرض الضوئي (Data Show).',
    keywords: 'مظهر مريح مظهر داكن فاتح خط عربي أصيل تباين خط لاتيني مسلاط ضوئي هواتف ذكية وضوح القراءة',
    sections: [
      {
        title: 'ضبط بيئة العرض المريحة',
        steps: [
          'من «الإعدادات» ثم «المظهر»، اختر بين المظهر الفاتح، المظهر الداكن (لراحة العين أثناء الإعداد الليلي)، أو التوافق التلقائي مع نظام الجهاز.',
          'حدّد لون التمييز الإجرائي، درجة استدارة الحواف، ونمط عرض بطاقات الأقسام وجدول الحصص.',
          'اختر خطوط الواجهة والخط العربي الأصيل والخط اللاتيني العلمي لضمان وضوح فائق للمصطلحات والمعادلات داخل الفصل.',
          'عاين التغييرات فوراً على دفتر نصوص حقيقي للتأكد من راحة وتناسق القراءة.',
        ],
      },
      {
        title: 'خيارات إظهار وتضمين الأوصاف والتفاصيل',
        body: 'يمكنك ضبط إظهار أو إخفاء نصوص الأوصاف والأنشطة المفصلة على الشاشة أو أثناء الطباعة دون حذف محتواها. يُسهم إخفاء التفاصيل في إعطاء نظرة شمولية سريعة لجدول الحصص مع الاحتفاظ بكافة المعطيات.',
      },
      {
        title: 'الملاءمة مع أجهزة العرض والشاشات الصغيرة',
        body: 'صُممت الواجهة لتلبي متطلبات العرض الصفي عبر المسلاط الضوئي (Data Show) واستعمال الهواتف المحمولة؛ حيث تضمن التباينات المعتمدة قراءة مريحة ودقيقة لجميع عناصر الدفتر.',
      },
    ],
  }),

  chapter('print', ['dates', 'appearance', 'backup'], {
    title: 'Édition papier, visa administratif et export PDF officiel',
    summary: 'Génération des états d’impression du cahier de textes conformes aux exigences administratives et d’inspection.',
    keywords: 'impression cahier de textes PDF visa administratif inspection contrôle signature directeur censeur marges',
    sections: [
      {
        title: 'Préparer le document d’impression',
        steps: [
          'Ouvrez la fonction d’impression directement depuis la barre d’outils du cahier de textes concerné.',
          'Sélectionnez la période voulue : uniquement les nouvelles séances non encore imprimées, l’intégralité du cahier depuis la rentrée, ou un intervalle de dates personnalisé.',
          'Vérifiez les mentions administratives de l’en-tête (Académie, Direction provinciale, Établissement, Enseignant, Classe, Matière) et la pagination.',
          'Contrôlez l’aperçu avant impression pour vous assurer de la bonne disposition des formules mathématiques et des sauts de page.',
          'Lancez l’impression papier pour la remise au visa administratif (Direction / Censure) ou exportez le document au format PDF pour archivage.',
        ],
      },
      {
        title: 'Principe du suivi des séances imprimées',
        body: 'L’option « Nouvelles dates » s’appuie sur le journal des impressions précédentes pour identifier les séances ajoutées depuis votre dernier tirage. Vous pouvez à tout moment forcer la réimpression d’une période précise.',
      },
      {
        title: 'Valeur légale et conservation numérique',
        body: 'L’export PDF certifie l’état du cahier à un instant donné pour l’administration. Pour préserver les données modifiables et garantir la continuité pédagogique, réalisez également une sauvegarde numérique (JSON).',
      },
    ],
  }, {
    title: 'الطباعة الرسمية، التأشير الإداري والتصدير بصيغة PDF',
    summary: 'استخراج وثيقة دفتر النصوص الورقية مطابقة للمواصفات الرسمية لغايات التأشير الإداري والمراقبة التربوية.',
    keywords: 'طباعة دفتر النصوص تصدير PDF تأشير إداري تفتيش تربوي توقيع المدير الناظر المفتش ترويسة رسمية',
    sections: [
      {
        title: 'إعداد وتجهيز وثيقة الطباعة الرسمية',
        steps: [
          'افتح خيار الطباعة مباشرة من شريط أدوات دفتر نصوص القسم المعني.',
          'حدّد نطاق الطباعة المطلوب: الحصص الجديدة المنجزة منذ آخر طباعة، كامل دفتر النصوص منذ بداية الموسم، أو حيز زمني محدد.',
          'تأكد من اكتمال الترويسة الرسمية (الأكاديمية الجهوية، المديرية الإقليمية، اسم المؤسسة، اسم الأستاذ، المادة، والمستوى الدراسي) وسلامة الترقيم.',
          'عاين صفحات الوثيقة في نافذة المعاينة للتحقق من وضوح الجداول، المعادلات الرياضية، وفواصل الصفحات المنتظمة.',
          'اضغط أمر الطباعة لاستخراج النسخة الورقية الموجهة للتأشير الإداري من إدارة المؤسسة (المدير أو الناظر) ولجان التفتيش التربوي، أو احفظها بصيغة PDF.',
        ],
      },
      {
        title: 'آلية تتبع الحصص المؤرخة الجديدة',
        body: 'يرصد خيار «التواريخ الجديدة» الحصص المنجزة حديثاً التي لم يشملها أمر الطباعة السابق، مما يجنبك إعادة طباعة الصفحات المؤشرة مسبقاً من طرف إدارة المؤسسة.',
      },
      {
        title: 'الوثيقة الرسمية وحفظ البيانات',
        body: 'يُعد ملف PDF المخرَج وثيقة إثبات إدارية رسمية لسير الدروس. ولضمان إمكانية التعديل واسترجاع المعطيات مستقبلاً، احرص على تصدير ملف النسخ الاحتياطي (JSON) بانتظام.',
      },
    ],
  }),

  chapter('devices', ['notifications', 'backup', 'troubleshooting'], {
    title: 'Installation PWA, utilisation hors ligne et synchronisation',
    summary: 'Saisie autonome en classe sans connexion Internet et synchronisation sécurisée avec votre espace en ligne.',
    keywords: 'PWA application installer Android iPhone iPad hors ligne sans connexion synchronisation compte cloud',
    sections: [
      {
        title: 'Installer l’application sur vos appareils d’enseignement',
        steps: [
          'Accédez à l’application depuis votre navigateur habituel et connectez-vous à votre compte enseignant.',
          'Installez l’application (PWA) : sous Android / Chrome via l’invite « Installer », ou sous iOS / Safari via le menu Partage → « Sur l’écran d’accueil ».',
          'Ouvrez préalablement vos cahiers de textes en ligne avant de vous rendre en classe : les données et moteurs de calcul scientifique (LaTeX) se mettent en mémoire cache pour fonctionner sans Internet.',
          'Lors d’un changement de matériel, reconnectez-vous simplement à votre compte pour retrouver instantanément l’ensemble de vos classes.',
        ],
      },
      {
        title: 'Suivre le statut de synchronisation',
        items: [
          { term: 'Synchronisé', detail: 'L’ensemble de vos saisies locales est sécurisé et enregistré sur le serveur.' },
          { term: 'En cours / En attente', detail: 'Des séances ou modifications locales sont prêtes à être transmises dès le rétablissement de la connexion.' },
          { term: 'Mode hors ligne', detail: 'L’application fonctionne en toute autonomie sur la mémoire locale de votre appareil.' },
        ],
      },
      {
        title: 'Préserver l’intégrité de vos données de cours',
        body: 'Les données saisies hors ligne sont conservées précieusement sur l’appareil. Ne videz pas le cache du navigateur et ne désinstallez pas l’application tant qu’une synchronisation réussie n’a pas été confirmée. Évitez de modifier simultanément le même cahier sur deux appareils différents avec des modifications en attente.',
      },
    ],
  }, {
    title: 'تثبيت التطبيق (PWA)، العمل دون إنترنت والمزامنة السحابية',
    summary: 'مسك دفتر النصوص داخل حجرة الدرس دون اتصال بالشبكة، والمزامنة التلقائية الآمنة فور توفر الإنترنت.',
    keywords: 'تثبيت PWA بدون إنترنت دون اتصال هاتف ذكي لوحة إلكترونية مزامنة سحابية تخزين محلي أمان البيانات',
    sections: [
      {
        title: 'تثبيت دفتر النصوص كبرنامج على أجهزتك',
        steps: [
          'افتح التطبيق عبر المتصفح وسجّل الدخول إلى حسابك الشخصي.',
          'ثبّت التطبيق (PWA): على أجهزة أندرويد عبر رسالة «تثبيت التطبيق»، وعلى أجهزة آيفون وآيباد بالضغط على زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».',
          'افتح دفاتر أقسامك مرة واحدة أثناء توفر الاتصال قبل الذهاب إلى المؤسسة؛ لتخزين المنهاج ومحرك الرموز العلمية (LaTeX) محلياً والعمل دون إنترنت.',
          'عند استخدام جهاز جديد، يكفي تسجيل الدخول بالحساب نفسه لاسترجاع كافة الأقسام والحصص والبيانات المزامنة.',
        ],
      },
      {
        title: 'متابعة حالة المزامنة السحابية',
        items: [
          { term: 'تمت المزامنة بنجاح', detail: 'كافة التعديلات والحصص المدوّنة محفوظة بأمان ومطابقة على السحابة.' },
          { term: 'قيد الإرسال / في الانتظار', detail: 'توجد حصص أو بيانات جديدة بانتظار الإرسال بمجرد استقرار الاتصال بالإنترنت.' },
          { term: 'العمل دون اتصال (Off-line)', detail: 'التطبيق يعمل بكامل كفاءته وسرعته اعتماداً على الذاكرة الآمنة للجهاز.' },
        ],
      },
      {
        title: 'تأمين المعطيات المخزنة محلياً',
        body: 'يضمن النظام حفظ كل كلمة تدونها في الذاكرة المحلية للجهاز أولاً بأول. تجنب مسح بيانات المتصفح أو إزالة التطبيق أثناء وجود تعديلات معلقة قبل تأكيد المزامنة السحابية. تجنب تعديل الدفتر نفسه في الوقت ذاته من جهازين مختلفين.',
      },
    ],
  }),

  chapter('backup', ['devices', 'print', 'content'], {
    title: 'Sauvegardes sécurisées, restauration et archivage annuel',
    summary: 'Préservation de vos données pédagogiques, transferts de cahiers et archivage à la fin de l’année scolaire.',
    keywords: 'sauvegarde restauration JSON données exporter importer archive fin d’année sécurité',
    sections: [
      {
        title: 'Les trois niveaux de protection des données',
        items: [
          { term: 'Exportation unitaire d’un cahier', detail: 'Sauvegarder ou transférer la progression et les séances d’une seule classe via l’éditeur de cours.' },
          { term: 'Sauvegarde globale du compte', detail: 'Dans Paramètres → Données : exporter un fichier JSON complet réunissant l’ensemble de vos classes, emplois du temps et réglages.' },
          { term: 'Instantané d’archives annuelles', detail: 'Dans Paramètres → Archives : figer l’état définitif des cahiers en fin d’année scolaire pour archivage et consultation ultérieure.' },
        ],
      },
      {
        title: 'Règles de précaution lors d’une restauration',
        steps: [
          'Téléchargez toujours une copie de sauvegarde récente de vos données actuelles avant de restaurer un fichier antérieur.',
          'Utilisez l’import des Paramètres pour une sauvegarde globale, ou l’outil de transfert du cahier pour une progression isolée.',
          'Vérifiez la nature du fichier et l’avertissement de remplacement : une restauration écrase les données existantes du cahier concerné.',
          'Après chargement, contrôlez la bonne conformité de vos classes, séances datées et emplois du temps.',
        ],
      },
    ],
    tip: 'Conservez une copie périodique de votre sauvegarde globale sur un support de stockage externe sécurisé.',
  }, {
    title: 'النسخ الاحتياطي، الاسترجاع والأرشفة السنوية',
    summary: 'حماية المعطيات البيداغوجية، تصدير واستيراد الدفاتر، وأرشفة سجلات الحصص عند متم السنة الدراسية.',
    keywords: 'نسخ احتياطي استرجاع أرشيف سنوي تصدير استيراد ملف JSON أمان البيانات نهاية الموسم الدراسي',
    sections: [
      {
        title: 'المستويات الثلاثة لحماية وتأمين الدفاتر',
        items: [
          { term: 'تصدير دفتر نصوص فردي', detail: 'حفظ أو نقل محتوى وحصص قسم دراسي واحد عبر أداة نقل البيانات في محرر الدفتر.' },
          { term: 'نسخة احتياطية شاملة للحساب', detail: 'من «الإعدادات» ثم «البيانات»: استخراج ملف شامل بصيغة JSON يضم كافة الأقسام والجداول والإعدادات الشخصية.' },
          { term: 'الأرشيف الرقمي السنوي', detail: 'من «الإعدادات» ثم «الأرشيف»: إنشاء نسخة مؤرشفة ثابتة لدفاتر الموسم الدراسي لحفظها والرجوع إليها عند الحاجة.' },
        ],
      },
      {
        title: 'ضوابط الاسترجاع الآمن للمعطيات',
        steps: [
          'صدّر نسخة احتياطية حديثة من وضعك الحالي واحتفظ بالملف خارج المتصفح قبل مباشرة أي عملية استرجاع.',
          'استخدم خاصية الاستيراد في «الإعدادات» للنسخة الشاملة، وخاصية الاستيراد في محرر الدفتر للدروس المفردة.',
          'راجع نطاق الملف وتأكيدات العملية بعناية؛ إذ تؤدي الاستعادة إلى استبدال البيانات المسجلة بالبيانات المستوردة.',
          'بعد اكتمال الاسترجاع، تفقد أقسامك وتواريخ الحصص المسجلة للتأكد من تمام مطابقتها.',
        ],
      },
    ],
    tip: 'احرص دورياً على تخزين نسخة من ملفك الاحتياطي الشامل في مساحة تخزين شخصية آمنة لحماية مجهودك التوثيقي على مدار السنة.',
  }),

  chapter('troubleshooting', ['notifications', 'devices', 'profile'], {
    title: 'Diagnostic des difficultés, assistance et support technique',
    summary: 'Vérifications méthodiques pour résoudre les anomalies courantes et contacter l’équipe d’assistance.',
    keywords: 'assistance aide support contact WhatsApp problème formule affichage synchronisation bug diagnostic',
    sections: [
      {
        title: 'Diagnostics et résolutions rapides',
        items: [
          { term: 'Une classe n’apparaît pas', detail: 'Vérifiez le compte connecté, les filtres de cycle ou de niveau actifs, et lancez une synchronisation manuelle.' },
          { term: 'La séance en cours ne correspond pas', detail: 'Contrôlez la date et l’heure système de votre appareil, ainsi que la conformité de votre grille d’emploi du temps.' },
          { term: 'Les rappels ou notifications ne sonnent pas', detail: 'Contrôlez les autorisations du navigateur, les restrictions de batterie et envoyez un test depuis les paramètres de notification.' },
          { term: 'Formule mathématique ou texte invisible', detail: 'Assurez-vous que la recherche est vide, vérifiez la syntaxe LaTeX et patientez le temps du chargement de MathJax.' },
          { term: 'Le profil ne change pas', detail: 'Cliquez sur « Enregistrer le profil » avant de fermer l’écran des paramètres.' },
          { term: 'Les données diffèrent entre deux appareils', detail: 'Vérifiez que la synchronisation est achevée sur le premier appareil avant d’ouvrir le cahier sur le second.' },
        ],
      },
      {
        title: 'Solliciter l’assistance technique et pédagogique',
        steps: [
          'Ouvrez Paramètres → Assistance pour accéder aux ressources d’aide ou contacter le service support.',
          'En cas de message via WhatsApp ou courriel, décrivez précisément l’action tentée, le résultat observé et le résultat attendu.',
          'Précisez votre matériel (modèle d’appareil, version du navigateur et langue utilisée).',
          'Veillez à masquer systématiquement les noms des élèves et toute donnée confidentielle sur les captures d’écran transmises.',
        ],
      },
    ],
    tip: 'Avant de réinitialiser vos paramètres, testez une action simple et vérifiez votre connexion Internet : la majorité des anomalies sont temporaires.',
  }, {
    title: 'معالجة الصعوبات والدعم الفني والتربوي',
    summary: 'خطوات عملية لتشخيص وحل الإشكالات الشائعة، وقنوات التواصل المباشر مع فريق الدعم والمساعدة.',
    keywords: 'دعم فني مساعدة واتساب مشكلة خطأ استفسار تفتيش صيغة رياضية مزامنة حل الصعوبات',
    sections: [
      {
        title: 'إجراءات الفحص والحل السريع',
        items: [
          { term: 'عدم ظهور قسم في القائمة', detail: 'تحقق من الحساب المسجل، ومن مرشحات السلك والمستوى المفعلة، وأجرِ مزامنة يدوية للبيانات.' },
          { term: 'عدم تطابق الحصة الجارية', detail: 'تأكد من صحة توقيت وتاريخ جهازك، وطابق جدول استعمال الزمن المسجل مع التوقيت الفعلي للحصة.' },
          { term: 'عدم وصول التنبيهات أو الإشعارات', detail: 'تأكد من منح أذونات المتصفح، وتعطيل قيود توفير الطاقة الصارمة، واختبر الإشعار من شاشة الإعدادات.' },
          { term: 'صيغة رياضية أو نص غير ظاهر', detail: 'امسح حقل البحث للتأكد من عدم تصفية الجدول، وراجع صياغة أوامر LaTeX وتوفر الاتصال لتحميل محرك الرموز.' },
          { term: 'الملف الشخصي لا يتغير', detail: 'اضغط على «حفظ الملف الشخصي» قبل إغلاق النافذة؛ فالمعطيات الإدارية تتطلب حفظاً صريحاً.' },
          { term: 'تباين المعطيات بين جهازين', detail: 'تأكد من اكتمال المزامنة السحابية على الجهاز الأول قبل فتح الدفتر على الجهاز الثاني.' },
        ],
      },
      {
        title: 'التواصل الفعال مع فريق الدعم',
        steps: [
          'ادخل إلى «الإعدادات» ثم «المساعدة والدعم» لاختيار وسيلة التواصل المتاحة (عبر واتساب أو البريد الإلكتروني).',
          'اشرح الصعوبة بإيجاز: الشاشة المعنية، الخطوة التي قمت بها، النتيجة المتوقعة، وما حدث فعلياً.',
          'حدّد نوع الجهاز (هاتف، لوحة، حاسوب)، نوع المتصفح ولغة الاستعمال المعتمدة.',
          'احرص التزاماً بالسرية المهنية على حجب أسماء التلاميذ وأي معطيات شخصية عند إرسال لقطات الشاشة.',
        ],
      },
    ],
    tip: 'قبل الشروع في إعادة تثبيت التطبيق، افحص نقطة واحدة بهدوء؛ فمعظم الصعوبات ترتبط باتصال الشبكة أو بحاجة المتصفح للتحديث.',
  }),
];

export const GUIDE_FR: GuideChapter[] = chapters.map(entry => entry.fr);
export const GUIDE_AR: GuideChapter[] = chapters.map(entry => entry.ar);

export const normalizeGuideSearch = (text: string): string => text.normalize('NFD')
  .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ـ/g, '').toLowerCase();

/** Every query word must occur; accents and Arabic harakat do not block matches. */
export function searchGuide(entries: GuideChapter[], query: string): GuideChapter[] {
  const words = normalizeGuideSearch(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return entries;
  return entries.filter(entry => {
    const text = normalizeGuideSearch([
      entry.title, entry.summary, entry.keywords, entry.tip,
      ...entry.sections.flatMap(section => [section.title, section.body, ...(section.steps ?? []),
        ...(section.items ?? []).flatMap(item => [item.term, item.detail])]),
    ].filter(Boolean).join(' '));
    return words.every(word => text.includes(word));
  });
}
