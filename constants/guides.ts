/** Structured bilingual help: plain text only, no HTML injection. */
interface GuideSection {
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
    title: 'Créer votre premier cahier',
    summary: 'Préparez votre profil, ajoutez une classe, puis enregistrez votre première séance.',
    image: { key: 'classes', caption: 'Chaque carte ouvre le cahier de la classe correspondante.' },
    keywords: 'démarrage début cahier de textes professeur classe niveau filière emploi du temps séance inspection pédagogique',
    sections: [
      {
        title: 'Commencez en cinq étapes',
        steps: [
          'Ouvrez Paramètres → Profil. Renseignez vos informations, choisissez vos matières et vos cycles, puis cliquez sur « Enregistrer le profil ».',
          'Ajoutez une classe depuis le tableau de bord. Choisissez son niveau, sa matière et son groupe.',
          'Dans Paramètres → Emploi du temps, affectez la classe à ses créneaux de cours.',
          'Ouvrez sa carte. Importez le programme proposé ou créez vos propres chapitres.',
          'Après le cours, sélectionnez les éléments réalisés, attribuez leur date et notez le travail à faire.',
        ],
      },
      {
        title: 'Un geste simple après chaque cours',
        body: 'Datez uniquement le travail réalisé. En fin de semaine, consultez le centre de pilotage pour repérer les séances à compléter. Vérifiez aussi la synchronisation et conservez une sauvegarde.',
      },
    ],
    tip: 'Une configuration rigoureuse de l’emploi du temps dès la rentrée garantit un suivi fluide et évite tout décalage dans la datation des séances.',
  }, {
    title: 'أنشئ أول دفتر نصوص',
    summary: 'أعدّ ملفك الشخصي، أضف قسماً، ثم سجّل أول حصة.',
    image: { key: 'classes', caption: 'تفتح كل بطاقة دفتر النصوص الخاص بالقسم.' },
    keywords: 'بداية انطلاقة دفتر النصوص أستاذ قسم مستوى سلك مؤسسة تفتيش توجيهات تربوية مقرر وزاري مسك حصة إسناد تاريخ',
    sections: [
      {
        title: 'ابدأ في خمس خطوات',
        steps: [
          'افتح «الإعدادات» ثم «الملف الشخصي». أدخل بياناتك واختر المواد والأسلاك، ثم اضغط على «حفظ الملف الشخصي».',
          'أضف قسماً من لوحة التحكم. حدّد المستوى والمادة ورقم المجموعة.',
          'في «الإعدادات» ثم «استعمال الزمن»، أسند القسم إلى حصصه الأسبوعية.',
          'افتح بطاقة القسم. استورد البرنامج المقترح أو أنشئ فصولك الخاصة.',
          'بعد الحصة، حدّد العناصر المنجزة وأسند إليها تاريخ الإنجاز، ثم دوّن العمل المطلوب.',
        ],
      },
      {
        title: 'خطوة بسيطة بعد كل حصة',
        body: 'أسند التاريخ إلى العمل المنجز فقط. وفي نهاية الأسبوع، راجع مركز القيادة لمعرفة الحصص التي تحتاج إلى إكمال. تحقق أيضاً من المزامنة واحتفظ بنسخة احتياطية.',
      },
    ],
    tip: 'ضبط جدول الحصص الأسبوعي بدقة من بداية الموسم الدراسي يمنع أخطاء تواريخ الحصص ويسهّل التأشير الإداري والمراقبة التربوية.',
  }),

  chapter('profile', ['schedule', 'classes', 'appearance'], {
    title: 'Profil, matières et cycles',
    summary: 'Renseignez les informations de vos en-têtes et choisissez les cycles que vous enseignez.',
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
    title: 'Configurer l’emploi du temps',
    summary: 'Placez chaque classe dans la grille pour repérer les séances en cours et vérifier leurs dates.',
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
          'لحصة من ساعتين، أسند القسم نفسه إلى الخانتين المتتاليتين؛ سيجمعهما التطبيق في حصة واحدة.',
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
    title: 'Retrouver vos classes',
    summary: 'Accès immédiat au cahier de textes, repérage automatique de la classe en cours et gestes mobiles.',
    keywords: 'dashboard tableau de bord séance en cours carte classe appui long tactile raccourci filtres',
    image: { key: 'classes', caption: 'La carte de la séance en cours se distingue des autres classes.' },
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
    title: 'الوصول إلى أقسامك',
    summary: 'الولوج المباشر لدفتر نصوص القسم، الرصد التلقائي للحصة الجارية وفق استعمال الزمن، واختصارات التفاعل السريع.',
    keywords: 'لوحة التحكم حصة جارية بطاقة القسم ضغط مطول تفويج قسم نشط فرز تصفية',
    image: { key: 'classes', caption: 'تتميّز بطاقة القسم الذي تدرّسه الآن عن بقية الأقسام.' },
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
    title: 'Préparer le contenu du cahier',
    summary: 'Importez un programme, rédigez vos cours ou contactez le service de préparation sur mesure.',
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
    title: 'إعداد محتوى الدفتر',
    summary: 'استورد برنامجاً، اكتب دروسك، أو تواصل مع خدمة إعداد الدفتر من وثائقك.',
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
    title: 'Compléter une séance',
    summary: 'Sélectionnez le travail réalisé, attribuez une date et ajoutez vos remarques.',
    keywords: 'éditeur cahier de textes tableau séances datation travail à faire devoirs remarques pédagogiques sélection',
    image: { key: 'editor', caption: 'Le tableau réunit les dates, le contenu et les remarques. Les actions sont en bas.' },
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
    title: 'تسجيل حصة منجزة',
    summary: 'حدّد العمل المنجز، أسند إليه تاريخاً، ثم أضف ملاحظاتك.',
    keywords: 'مسك دفتر النصوص جدول الحصص توثيق إنجاز تأريخ ملاحظات بيداغوجية واجبات منزلية تفتيش تربوي شريط الإجراءات',
    image: { key: 'editor', caption: 'واجهة عربية ودرس بالفرنسية: يبقى نص الدرس وصِيَغه الرياضية من اليسار إلى اليمين.' },
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
    title: 'Ajouter un élément au cours',
    summary: 'Choisissez le type qui décrit votre contenu : définition, propriété, exemple, application…',
    keywords: 'didactique situation problème définition théorème propriété démonstration exemple application activité exercice soutien',
    image: { key: 'add', caption: 'Le bouton « + » propose un chapitre, un élément ou une évaluation selon votre sélection.' },
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
    title: 'إضافة عنصر إلى الدرس',
    summary: 'اختر النوع المناسب للمحتوى: تعريف، خاصية، مثال، تطبيق…',
    keywords: 'ديداكتيك وضعية مشكلة نشاط استكشافي تعريف خاصية مبرهنة برهان مثال تطبيق تمرين توليفي أنشطة الدعم',
    image: { key: 'add', caption: 'يتيح زر «+» إضافة فصل أو عنصر أو تقويم، حسب موضع التحديد.' },
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
    title: 'Choisir et vérifier une date',
    summary: 'Attribuez la date réelle de la séance et vérifiez les éventuels avertissements avant de confirmer.',
    image: { key: 'dates', caption: 'Choisissez la date à appliquer aux éléments sélectionnés, puis confirmez.' },
    keywords: 'calendrier scolaire arrêté ministériel vacances jours fériés dimanche absence contrôle datation séance',
    sections: [
      {
        title: 'Appliquer la date en quatre étapes',
        steps: [
          'Sélectionnez le travail réalisé, puis choisissez « Choisir une date… » dans la barre d’actions.',
          'Saisissez une date ou utilisez « Hier », « Aujourd’hui » ou « Demain ». Vérifiez le jour affiché.',
          'Cliquez sur « Appliquer la date ». Si un avertissement apparaît, vérifiez le motif avant de continuer.',
          '« Ne plus avertir pour cette date » masque les prochains avertissements pour ce jour. Cette option ne modifie pas votre emploi du temps.',
        ],
      },
      {
        title: 'Comprendre les avertissements',
        body: 'L’application peut signaler un dimanche, une période de vacances, un jour férié, une absence enregistrée ou une date incompatible avec votre emploi du temps. Vérifiez la situation réelle : un avertissement vous invite à contrôler, il ne confirme pas qu’un cours a eu lieu.',
      },
      {
        title: 'Deux séances le même jour',
        body: 'Une date déjà présente ne signifie pas que les deux séances sont complètes. Vérifiez séparément le travail réalisé à chaque séance.',
      },
    ],
  }, {
    title: 'اختيار تاريخ الحصة والتحقق منه',
    summary: 'أسند تاريخ الإنجاز الفعلي وراجع أي تنبيه قبل التأكيد.',
    image: { key: 'dates', caption: 'اختر التاريخ الذي سيُطبّق على العناصر المحددة، ثم أكّد الاختيار.' },
    keywords: 'المقرر الوزاري تنظيم السنة الدراسية تقويم مدرسي عطل مدرسية أعياد وطنية دينية رخص غياب حصص استدراكية',
    sections: [
      {
        title: 'طبّق التاريخ في أربع خطوات',
        steps: [
          'حدّد العمل المنجز، ثم اختر «اختيار تاريخ…» من شريط الإجراءات.',
          'أدخل التاريخ أو استخدم «أمس» أو «اليوم» أو «غداً». تحقّق من اليوم الظاهر.',
          'اضغط على «تطبيق التاريخ». إذا ظهر تنبيه، اقرأ السبب وتحقّق منه قبل المتابعة.',
          'يخفي خيار «عدم التنبيه إلى هذا التاريخ مجدداً» التنبيهات المقبلة لهذا اليوم، ولا يغيّر استعمال الزمن.',
        ],
      },
      {
        title: 'ماذا تعني التنبيهات؟',
        body: 'قد ينبهك التطبيق إلى يوم أحد، أو عطلة، أو غياب مسجل، أو تاريخ لا يوافق استعمال الزمن. راجع الوضع الفعلي: التنبيه يدعوك إلى التحقق، ولا يثبت إنجاز الحصة.',
      },
      {
        title: 'حصتان في اليوم نفسه',
        body: 'وجود تاريخ في الدفتر لا يعني اكتمال الحصتين. راجع العمل المنجز في كل حصة على حدة.',
      },
    ],
  }),

  chapter('math', ['types', 'appearance', 'troubleshooting'], {
    title: 'Écrire des formules et rechercher',
    summary: 'Saisissez vos formules en LaTeX, vérifiez leur rendu et retrouvez rapidement un contenu.',
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
    title: 'كتابة الصيغ الرياضية والبحث',
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
    title: 'Utiliser le centre de pilotage',
    summary: 'Repérez les points à vérifier, les prochaines échéances et les classes à compléter.',
    keywords: 'centre de pilotage progression pédagogique tableau de bord cloche échéances devoirs conformité inspection',
    image: { key: 'pilotage', caption: 'Les repères signalent ici un emploi du temps incomplet et proposent une action.' },
    sections: [
      {
        title: 'Savoir quoi vérifier en priorité',
        body: 'Ouvrez la cloche du tableau de bord. Le centre de pilotage rassemble les alertes et les échéances pour vous aider à choisir la prochaine action utile.',
      },
      {
        title: 'À quoi sert chaque rubrique ?',
        items: [
          { term: 'Repères', detail: 'Les points à vérifier : emploi du temps incomplet, séance non datée ou interruption du suivi.' },
          { term: 'Échéances', detail: 'Les prochaines dates à préparer, notamment les évaluations programmées.' },
          { term: 'Calendrier', detail: 'Les événements et périodes disponibles dans le calendrier de l’application.' },
          { term: 'Classes', detail: 'Un résumé du suivi de vos classes et un accès aux cahiers concernés.' },
          { term: 'Activité', detail: 'Les opérations récentes enregistrées dans l’application.' },
          { term: 'Masqués', detail: 'Les alertes que vous avez masquées, lorsque cette rubrique est disponible.' },
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
    title: 'استخدام مركز القيادة',
    summary: 'تعرّف على ما يحتاج إلى مراجعة، والمواعيد المقبلة، والأقسام التي تحتاج إلى إكمال.',
    keywords: 'مركز القيادة تتبع بيداغوجي وتيرة الإنجاز مراقبة مستمرة مؤشرات التفتيش فروض محروسة تنبيهات',
    image: { key: 'pilotage', caption: 'تشير المؤشرات هنا إلى استعمال زمن غير مكتمل وتقترح إجراءً لإكماله.' },
    sections: [
      {
        title: 'اعرف ما يحتاج إلى انتباهك أولاً',
        body: 'افتح أيقونة الجرس من لوحة التحكم. يجمع مركز القيادة التنبيهات والمواعيد ليساعدك على اختيار الخطوة المناسبة.',
      },
      {
        title: 'ما دور كل قسم في هذه الصفحة؟',
        items: [
          { term: 'المؤشرات', detail: 'ما يحتاج إلى مراجعة، مثل استعمال زمن غير مكتمل أو حصة دون تاريخ.' },
          { term: 'المواعيد', detail: 'التواريخ المقبلة التي تستعد لها، ومنها التقويمات المبرمجة.' },
          { term: 'التقويم', detail: 'الأحداث والفترات المتاحة في تقويم التطبيق.' },
          { term: 'أقسامك', detail: 'ملخص لتتبع الأقسام مع إمكانية فتح الدفتر المعني.' },
          { term: 'النشاط', detail: 'العمليات الأخيرة المسجلة في التطبيق.' },
          { term: 'المخفية', detail: 'التنبيهات التي أخفيتها، عندما يكون هذا القسم متاحاً.' },
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
    title: 'Relier les cours au programme',
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
        body: 'Le taux d’exécution reflète les séances datées par rapport au volume horaire prescrit par le ministère. Importer un programme ne suffit pas à le déclarer réalisé : seul l’enregistrement effectif des séances alimente fidèlement le rapport d’avancement remis à la direction ou au corps d’inspection.',
      },
      {
        title: 'Ajustement en cas de réorganisation de la progression',
        body: 'Si vous modifiez l’ordre des chapitres pour des raisons didactiques, veillez à maintenir la cohérence des correspondances avec le programme pour conserver des statistiques d’avancement fiables.',
      },
    ],
  }, {
    title: 'ربط الدروس بالبرنامج وتتبع التقدم',
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

  chapter('legal', ['curriculum', 'editor', 'dates', 'assessments'], {
    title: 'Consulter les références officielles',
    summary: 'Fondements réglementaires (Notes 255 et 175), normes organisationnelles et didactiques, valeur probante et protection de l’enseignant.',
    keywords: 'note 255 note 175 réglementation orientations pédagogiques répartition périodique contrôle continu cadres référence inspection preuve décharge',
    sections: [
      {
        title: '1. Référentiels officiels régissant le contrôle du cahier de textes',
        body: 'Le cahier de textes tire son autorité institutionnelle d’un ensemble cohérent de textes législatifs et didactiques officiels :',
        items: [
          { term: 'Orientations pédagogiques', detail: 'Directives ministérielles et programmes officiels encadrant la discipline.' },
          { term: 'Répartition périodique des cours', detail: 'Progression chronologique et découpage horaire annuel des apprentissages.' },
          { term: 'Notes d’évaluation et cadres de référence', detail: 'Référentiels des examens certificatifs délimitant les domaines notionnels et niveaux taxonomiques d’habileté.' },
          { term: 'Calendrier périodique du contrôle continu', detail: 'Planification officielle des devoirs surveillés et des fenêtres de passation.' },
          { term: 'Note ministérielle n° 255 (23 décembre 1981)', detail: 'Texte fondamental régissant le contrôle rigoureux des documents scolaires par la direction et l’inspection.' },
          { term: 'Note ministérielle n° 175 (19 novembre 2010)', detail: 'Cadre d’encadrement et de suivi des modalités du contrôle continu dans l’enseignement scolaire.' },
        ],
      },
      {
        title: '2. Importance didactique et portée institutionnelle',
        body: 'Pièce maîtresse des documents pédagogiques de l’enseignant, le cahier de textes répond à des fonctions capitales :',
        items: [
          { term: 'Miroir de l’activité en classe', detail: 'Reflète la diversité des situations d’apprentissage, des exercices et le degré d’organisation de l’enseignant.' },
          { term: 'Mesure du rythme de progression', detail: 'Fournit une vue exacte sur la cadence d’achèvement du programme officiel et la pertinence des outils d’évaluation.' },
          { term: 'Conformité aux cadres de référence', detail: 'Garantit le respect des domaines notionnels, des niveaux d’habileté et des critères de notation prescrits.' },
          { term: 'Analyse formative et remédiation', detail: 'Permet d’examiner les barèmes de notation, d’analyser les erreurs fréquentes des élèves et de structurer le soutien didactique.' },
          { term: 'Lien institutionnel permanent', detail: 'Assure la coordination entre l’enseignant, la direction de l’établissement et l’inspecteur pédagogique chargé de l’encadrement.' },
          { term: 'Pièce maîtresse d’arbitrage', detail: 'Document pivot auquel l’administration et l’inspection se réfèrent pour apprécier l’effort didactique et trancher tout litige.' },
        ],
      },
      {
        title: '3. Texte officiel de la Note 255 et critères d’inspection',
        body: 'La Note ministérielle n° 255 du 23 décembre 1981 énonce textuellement :\n\n« Il appartient aux professeurs de renseigner les cahiers de textes avec la plus grande rigueur, soin et de manière régulière. MM. les inspecteurs consacreront au contrôle des cahiers de textes un temps suffisant lors de leurs visites pédagogiques pour les examiner avec attention, formuler leurs remarques et directives sur leur tenue, contrôler avec rigueur le nombre de devoirs corrigés par le professeur, et prendre expressément cet élément en compte dans la notation pédagogique lors de la rédaction de leur rapport consécutif à chaque inspection. »',
      },
      {
        title: '4. Normes organisationnelles de tenue du cahier',
        items: [
          { term: 'Renseignements administratifs', detail: 'Identité complète, cadre, matricule (SOM), matière, établissement et direction provinciale.' },
          { term: 'Structure par niveaux et divisions', detail: 'Organisation distincte et méthodique pour chaque classe et groupe attribué.' },
          { term: 'Documents intégrés obligatoires', detail: 'Intégration de l’emploi du temps, de la liste nominative des élèves, des fiches de notation des activités intégrées et des grilles d’évaluation.' },
          { term: 'Saisie continue et maintien sur place', detail: 'Émargement rigoureux à l’issue de chaque séance et maintien du document dans l’établissement à la disposition des autorités compétentes.' },
        ],
      },
      {
        title: '5. Normes pédagogiques et didactiques',
        items: [
          { term: 'Traduction des activités effectives', detail: 'Consigner fidèlement les situations didactiques, exercices, cours et synthèses conduits en classe.' },
          { term: 'Méthodes et pédagogies actives', detail: 'Rendre compte de la gestion du temps d’apprentissage et de la différenciation pédagogique.' },
          { term: 'Respect du rythme et des directives', detail: 'Attester de la cadence d’avancement par rapport à la répartition périodique et aux orientations de la matière.' },
          { term: 'Exploitation du contrôle continu', detail: 'Tracer la régularité des devoirs surveillés et la mobilisation des résultats dans le soutien et la remédiation.' },
        ],
      },
      {
        title: '6. Protection juridique et valeur probante devant les juridictions',
        body: 'Le cahier de textes constitue une pièce probante essentielle qui protège l’enseignant ou engage sa responsabilité, y compris devant les juridictions, en cas de litige relatif à l’achèvement du programme. Lors des examens certificatifs ou normalisés, face à d’éventuelles réclamations d’élèves ou de parents alléguant la non-dispense d’une notion, le cahier de textes régulièrement émargé et visé constitue le moyen de preuve irréfutable attestant de la dispense effective des cours et dégageant formellement l’enseignant.',
      },
      {
        title: '7. Écueils fréquents et rectifications réglementaires',
        items: [
          { term: 'Défaut de tenue du cahier', detail: 'Négliger la saisie du cahier, quel qu’en soit le motif, expose l’enseignant à une mise en cause administrative et le prive de sa protection probante.' },
          { term: 'Inscriptions non conformes', detail: 'Enregistrer des séances non dispensées ou antidater des cours anéantit la valeur légale et la crédibilité de la pièce.' },
          { term: 'Différer la saisie par souci esthétique', detail: 'Retarder la tenue du cahier en attendant la stabilisation des emplois du temps ou des divisions est une erreur courante. Le cahier doit traduire la réalité vivante : toute modification conjoncturelle se porte simplement en marge (طرة الدفتر) sans interrompre la continuité de la saisie.' },
        ],
      },
    ],
    tip: 'Renseigner le cahier de textes dès la fin de chaque séance, consigner l’ensemble des activités menées en classe et le laisser à la disposition de l’établissement constitue votre garantie juridique et professionnelle absolue.',
  }, {
    title: 'الاطلاع على المرجعيات الرسمية',
    summary: 'المرجعيات الرسمية (المذكرتان 255 و175)، الأدوار البيداغوجية، الضوابط التنظيمية والتربوية، الحماية القانونية والقضائية، والأخطاء الشائعة.',
    keywords: 'المذكرة 255 المذكرة 175 التوجيهات التربوية التوزيع الدوري الأطر المرجعية المراقبة المستمرة وثيقة تربوية حماية قانونية إبراء الذمة تفتيش رئيس المؤسسة القضاء',
    sections: [
      {
        title: '1. المرجعيات المؤطرة لمراقبة دفتر النصوص',
        body: 'يستند تأطير ومراقبة دفتر النصوص إلى منظومة مرجعية رسمية تتكامل فيها الجوانب التشريعية والديداكتيكية :',
        items: [
          { term: 'التوجيهات التربوية', detail: 'التوجيهات والبرامج الرسمية الصادرة عن الوزارة الوصية والخاصة بمادة التدريس.' },
          { term: 'التوزيع الدوري للدروس', detail: 'التخطيط الزمني السنوي والدوري لتدبير وتدرج مفردات البرنامج الدراسي.' },
          { term: 'مذكرات التقويم والأطر المرجعية', detail: 'الأطر المرجعية المنظمة للامتحانات الإشهادية المحددة للمجالات المضامينية والمستويات المهارية.' },
          { term: 'الجدولة الدورية لفروض المراقبة المستمرة', detail: 'البرمجة الرسمية لمحطات وفترات إجراء الفروض المحروسة والمنزلية والأنشطة المدمجة.' },
          { term: 'المذكرة الوزارية 255 (23 دجنبر 1981)', detail: 'المذكرة المرجعية في شأن مراقبة الوثائق التربوية والمدرسية وتحديد التزامات الأستاذ والمفتش.' },
          { term: 'المذكرة الوزارية 175 (19 نونبر 2010)', detail: 'المذكرة المحددة لضوابط وتأطير وتتبع المراقبة المستمرة بالتعليم المدرسي.' },
        ],
      },
      {
        title: '2. أهمية دفتر النصوص وقيمته من خلال المرجعيات المؤطرة',
        body: 'يعتبر دفتر النصوص وثيقة أساسية ضمن الوثائق التربوية للأستاذ، وتكمن أدواره المحورية فيما يلي :',
        items: [
          { term: 'مرآة العمل الصفي', detail: 'مرآة تعكس مختلف الأنشطة الصفية المنجزة من طرف المدرس مع تلامذته، كما تعكس درجة التنظيم في عمل الأستاذ.' },
          { term: 'وتيرة إنجاز البرنامج الدراسي', detail: 'يقدم صورة دقيقة حول وتيرة إنجاز البرنامج الدراسي وعن شكل ومضمون أدوات التقويم المستعملة.' },
          { term: 'احترام المذكرات والأطر المرجعية', detail: 'يسمح بالتأكد من مدى احترامها للمذكرات المنظمة للمراقبة المستمرة وللأطر المرجعية للامتحانات الإشهادية سواء على مستوى المجالات المضامينية أو المستويات المهارية.' },
          { term: 'أساليب التقويم والمعالجة', detail: 'يوفر إمكانية الوقوف عند سلم التنقيط وأساليب تصحيحها مع التلاميذ لتحديد أهم الأخطاء الشائعة، وأساليب الدعم والمعالجة المعتمدة.' },
          { term: 'حلقة وصل وتنسيق', detail: 'صلة وصل بين إدارة المؤسسة والأستاذ من جهة، وبين هذا الأخير والمشرف التربوي (المفتش) من جهة ثانية لتتبع البرامج والتوزيعات.' },
          { term: 'الاحتكام والاستثمار المهني', detail: 'الوثيقة الأساسية التي يتم الاحتكام إليها في حالة حدوث توترات حول إنجاز البرنامج الدراسي من عدمه، ووثيقة أساسية قابلة للاستثمار في تأطير وتقويم عمل المدرس.' },
        ],
      },
      {
        title: '3. نص المذكرة الوزارية رقم 255 الصادرة في 23 دجنبر 1981 وتوجيهات التفتيش',
        body: 'نصت المذكرة الوزارية رقم 255 في شأن مراقبة الوثائق المدرسية حرفياً على ما يلي :\n\n«على السادة الأساتذة أن يقوموا بتعبئة دفاتر النصوص بكل دقة وعناية وبكيفية منتظمة وعلى السادة المفتشين أن يخصصوا لمراقبة دفاتر النصوص وقتا كافيا أثناء زيارتهم للأساتذة يتفحصوها بكل اهتمام، كما عليهم أن يبدوا ملاحظاتهم حولها ويوجهوا تعليماتهم للأساتذة حول كيفية تعبئة دفاتر النصوص، وأن يراقبوا بكيفية جدية عدد الواجبات التي قام بتصحيحها الأستاذ، وأن يعتبروا ذلك في تنقيط الأستاذ أثناء وضع التقرير الذي يحررونه تلو كل تفتيش»',
      },
      {
        title: '4. ضوابط تنظيمية في تعبئة دفتر النصوص',
        items: [
          { term: 'معلومات شخصية وإدارية', detail: 'تضمين الهوية الكاملة للأستاذ، الإطار، المادة، رقم التأجير (SOM)، المؤسسة والمديرية الإقليمية.' },
          { term: 'تقسيم الدفتر بحسب المستويات', detail: 'هيكلة الدفتر وتنظيمه بدقة وفق الفصول والمستويات والمسالك الدراسية المسندة للأستاذ.' },
          { term: 'الوثائق التنظيمية المدمجة', detail: 'تضمينه لجدول الحصص (استعمال الزمن)، لوائح بأسماء التلاميذ، أوراق تنقيط الأنشطة المدمجة، وأوراق التنقيط وشبكات المراقبة المستمرة.' },
          { term: 'التعبئة المستمرة والحفظ بالمؤسسة', detail: 'تعبئته باستمرار عند نهاية كل حصة، وتركه بالمؤسسة رهن إشارة الجهات التربوية والإدارية المختصة (الإدارة وهيئة التفتيش).' },
        ],
      },
      {
        title: '5. ضوابط تربوية وبيداغوجية لمحتوى الحصص',
        items: [
          { term: 'عكس مختلف الأنشطة الصفية', detail: 'توثيق مختلف الوضعيات التعليمية، الأنشطة المنجزة، التمارين، والمفاهيم المقدمة فعلياً في الفصل.' },
          { term: 'طرق وبيداغوجيات التدريس', detail: 'يعكس طرق التدريس المعتمدة والبيداغوجيات الموظفة وصورة دقيقة عن تدبير زمن التعلمات.' },
          { term: 'احترام وتيرة الإنجاز والتوجيهات', detail: 'يعكس وتيرة إنجاز البرنامج الدراسي ومدى احترام التوجيهات التربوية للمادة والتوزيع الدوري.' },
          { term: 'تتبع وتيرة المراقبة المستمرة', detail: 'يعكس وتيرة إنجاز المراقبة المستمرة ومدى احترام مذكرات التقويم، ودرجة استحضار مختلف أشكال التقويم وكيفية استثمارها في الدعم والمعالجة.' },
        ],
      },
      {
        title: '6. خلاصة قانونية وقضائية: الحماية وإبراء الذمة',
        body: 'دفتر النصوص وثيقة أساسية في عمل الأستاذ تحميه أو تدينه أمام القضاء في حالات وجود توترات حول مدى إنجاز البرنامج الدراسي؛ فهو المعيار القانوني المعتمد لدى الإدارة وهيئة التأطير والمراقبة التربوية لحسم التظلمات والشكاوى (خصوصاً أثناء الامتحانات الإشهادية بدعوى عدم إنجاز درس أو محور)، ويشكل دليلاً قاطعاً على إبراء ذمة الأستاذ وإثبات التزامه المهني والتربوي.',
      },
      {
        title: '7. أخطاء شائعة في التعامل مع دفتر النصوص وتصويباتها',
        items: [
          { term: 'عدم تعبئة دفتر النصوص', detail: 'إهمال تعبئة الدفتر لأي سبب يعد إخلالاً بالواجبات والتعليمات الرسمية، ويعرض الأستاذ لمساءلة إدارية وتربوية مباشرة ويفقده حجة حمايته القانونية.' },
          { term: 'الإدلاء بمعلومات غير مطابقة', detail: 'كتسجيل دروس لم تنجز فعلياً في القسم، أو عدم احترام برمجة الدروس وتواريخها الحقيقية، مما يفرغ الوثيقة من مصداقيتها وقيمتها الإثباتية.' },
          { term: 'تأخير التعبئة انتظاراً لاستقرار البنية', detail: 'يتأخر بعض الأساتذة بحسن نية انتظاراً لاستقرار استعمال الزمن أو ثبات الأقسام حفاظاً على جمالية الدفتر؛ والصواب أن الدفتر يعكس العمل اليومي الحقيقي الفعلي للأستاذ، وأي تغيير طارئ يُشار إليه في طرة الدفتر دون تأخير ودون حاجة لتغيير الدفتر.' },
        ],
      },
    ],
    tip: 'دفتر النصوص وثيقة أساسية في عمل الأستاذ تحميه أو تدينه أمام القضاء في حالات وجود توترات حول مدى إنجاز البرنامج الدراسي، يمكن الاعتماد عليه واستثماره في تقييم عمل المدرس، لذا يجب العناية به وتعبئته باستمرار عند نهاية كل حصة وتضمينه لكل الأنشطة المنجزة في الفصل الدراسي مع تركه بالمؤسسة.',
  }),

  chapter('assessments', ['pilotage', 'dates', 'legal', 'backup'], {
    title: 'Organiser les évaluations et le soutien',
    summary: 'Planification des devoirs surveillés, conformité aux cadres de référence, barèmes de notation, remédiation et suivi des absences.',
    keywords: 'contrôle continu note 175 devoir surveillé devoir à domicile évaluation diagnostique cadres référence domaines notionnels niveaux habileté barème soutien remédiation absence élèves examen semestriel',
    sections: [
      {
        title: 'Fondements réglementaires du contrôle continu (Note 175)',
        body: 'Conformément à la Note ministérielle n° 175 du 19 novembre 2010 et aux cadres de référence des examens certificatifs, les outils d’évaluation doivent respecter scrupuleusement les domaines notionnels, les niveaux taxonomiques d’habileté prescrits, ainsi qu’un barème de notation précis et équilibré.',
      },
      {
        title: 'Programmer et consigner une évaluation',
        steps: [
          'Accédez à l’onglet Évaluations / Contrôle continu de la classe concernée.',
          'Créez une évaluation : indiquez la modalité (Devoir surveillé, Devoir à domicile, Activités intégrées / Compétences orales, Évaluation diagnostique), le semestre, le numéro d’ordre et la date de passation.',
          'Précisez la durée, les compétences ciblées et le barème indicatif, puis consignez la liste des élèves absents lors de l’épreuve.',
          'Retrouvez les échéances programmées directement dans votre centre de pilotage pour anticiper la préparation des sujets, des grilles de correction et des fiches d’analyse.',
        ],
      },
      {
        title: 'Exploitation didactique des résultats et remédiation',
        body: 'L’évaluation continue ne se limite pas à l’attribution d’une note chiffrée : l’analyse des copies permet d’identifier les erreurs fréquentes des élèves et d’organiser des séances de soutien et de remédiation ciblées avant les examens certificatifs.',
      },
      {
        title: 'Fiches de notation des activités intégrées et distinction des absences',
        body: 'Les absences consignées dans ce module concernent exclusivement les élèves lors des devoirs surveillés (pour organiser les séances de rattrapage). Les activités intégrées et orales s’appuient sur des fiches d’observation continue conformément aux orientations officielles.',
      },
    ],
  }, {
    title: 'تنظيم التقويمات وأنشطة الدعم',
    summary: 'جدولة الفروض المحروسة والمنزلية، احترام الأطر المرجعية وسلم التنقيط، تشخيص الأخطاء الشائعة، حصص الدعم وتتبع غياب التلاميذ.',
    keywords: 'مراقبة مستمرة المذكرة 175 فرض محروس فرض منزلي تقويم تشخيصي أطر مرجعية مجالات مضامينية مستويات مهارية سلم التنقيط دعم معالجة أخطاء شائعة غياب التلاميذ امتحان تجريبي مسار',
    sections: [
      {
        title: 'المرجعية البيداغوجية لفروض المراقبة المستمرة (المذكرة 175)',
        body: 'استناداً إلى المذكرة الوزارية رقم 175 بتاريخ 19 نونبر 2010 والأطر المرجعية للامتحانات الإشهادية، يجب أن تراعي أدوات المراقبة المستمرة التوازن الدقيق بين المجالات المضامينية والمستويات المهارية للمتعلمين مع تدقيق سلم التنقيط المعتمد.',
      },
      {
        title: 'تنظيم وجدولة محطات التقويم والفروض',
        steps: [
          'افتح نافذة «المراقبة المستمرة والتقويمات» الخاصة بالقسم الدراسي المعني.',
          'أضف تقويماً جديداً: اختر طبيعته (فرض محروس، فرض منزلي، أنشطة مندمجة / شفهية، تقويم تشخيصي)، الأسدوس الدراسي، رقم الفرض، وتاريخ الإنجاز المبرمج.',
          'حدّد المدة الزمنية المخصصة للاختبار وسلّم التنقيط، ودوّن لائحة التلاميذ الغائبين أثناء إجراء الفرض للرجوع إليها عند تنظيم الفروض الاستدراكية.',
          'تابع مواعيد الفروض المقبلة في مركز القيادة للتهيئة المسبقة لمواضيع الاختبارات وعناصر الإجابة وشبكات التنقيط والتصحيح.',
        ],
      },
      {
        title: 'استثمار نتائج التقويم في الدعم والمعالجة وتصويب الأخطاء',
        body: 'يوفر دفتر النصوص إمكانية الوقوف عند سلم التنقيط وأساليب التصحيح مع التلاميذ لتحديد أهم الأخطاء الشائعة، وبلورة أساليب الدعم البيداغوجي وأسابيع المعالجة لتثبيت المكتسبات قبل الاختبارات الإشهادية.',
      },
      {
        title: 'أوراق تنقيط الأنشطة المدمجة وتتبع الغياب',
        body: 'يفرّق النظام بدقة بين توثيق غياب المتعلمين عن الفروض المحروسة (لإعداد الاستدراك)، وبين تنقيط الأنشطة المدمجة والمهارات الشفهية التي تشكل جزءاً عضوياً من التقييم المستمر وفق التوجيهات الرسمية.',
      },
    ],
  }),

  chapter('notifications', ['pilotage', 'schedule', 'devices'], {
    title: 'Activer les rappels et notifications',
    summary: 'Paramétrer les rappels de fin de séance, les alertes d’oubli de datation et les notifications système.',
    keywords: 'notifications alertes rappels fin de séance oubli de datation seuils de retard vibration push PWA',
    image: { key: 'notifications', caption: 'Dans cet exemple, le navigateur bloque les notifications système. Vérifiez son autorisation avant le test.' },
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
    title: 'تفعيل التذكيرات والإشعارات',
    summary: 'ضبط تذكيرات اختتام الحصة، تنبيهات استدراك التدوين، وإشعارات النظام على الهواتف واللوحات.',
    keywords: 'إشعارات تنبيهات تذكير اختتام الحصة تأريخ الحصص تدوين إشعار فوري اهتزاز هاتف PWA',
    image: { key: 'notifications', caption: 'في هذا المثال، يمنع المتصفح إشعارات النظام. تحقّق من الإذن قبل اختبار الإشعار.' },
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
    title: 'Personnaliser l’apparence',
    summary: 'Choisissez un thème et une taille de texte confortables pour votre écran.',
    image: { key: 'appearance', caption: 'Les réglages d’apparence permettent de choisir le thème et la taille du texte.' },
    keywords: 'apparence thème sombre clair taille du texte contraste lisibilité vidéoprojecteur police arabe latin',
    sections: [
      {
        title: 'Configuration de l’environnement de lecture',
        steps: [
          'Dans Paramètres → Apparence, choisissez entre le thème Clair, le thème Sombre (recommandé pour limiter la fatigue oculaire) ou l’adaptation automatique au Système.',
          'Ajustez la taille du texte pour une densité de lecture confortable en classe comme à la maison.',
          'La police n’est plus un réglage : l’interface arabe utilise Arabswell 3 et Maghribi Font 3, l’interface française DM Sans et Rubik. Le contenu du cahier suit toujours la langue de la classe.',
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
    title: 'تخصيص المظهر',
    summary: 'اختر الوضع والألوان والخطوط الأنسب للقراءة على شاشتك.',
    image: { key: 'appearance', caption: 'اختر وضع العرض ولوحة الألوان من إعدادات المظهر.' },
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
    title: 'Imprimer ou exporter en PDF',
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
    title: 'الطباعة والتصدير بصيغة PDF',
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
    title: 'Installer l’application et synchroniser',
    summary: 'Saisie autonome en classe sans connexion Internet et synchronisation sécurisée avec votre espace en ligne.',
    keywords: 'PWA application installer Android iPhone iPad Chrome Samsung écran accueil navigateur hors ligne sans connexion synchronisation compte cloud',
    sections: [
      {
        title: 'Installer l’application sur vos appareils d’enseignement',
        steps: [
          'Accédez à l’application depuis votre navigateur habituel et connectez-vous à votre compte enseignant.',
          'Installez le cahier depuis le navigateur où vos données sont disponibles : sous Android, menu du navigateur → « Installer » ou « Ajouter à l’écran d’accueil » ; sur iPhone / Safari, Partage → « Sur l’écran d’accueil ». Les intitulés varient selon le navigateur.',
          'Ouvrez préalablement vos cahiers de textes en ligne avant de vous rendre en classe : les données et moteurs de calcul scientifique (LaTeX) se mettent en mémoire cache pour fonctionner sans Internet.',
          'Lors d’un changement de matériel, reconnectez-vous simplement à votre compte pour retrouver instantanément l’ensemble de vos classes.',
        ],
      },
      {
        title: 'L’icône demande d’installer Chrome alors qu’il est présent',
        body: 'Sur Android, la PWA utilise un navigateur pour démarrer. Si ce message apparaît avant le cahier, le lanceur peut ne plus retrouver un navigateur utilisable ; le site ne peut ni détecter toutes les applications installées ni réparer ce lien système.',
        steps: [
          'Ouvrez Chrome directement, puis le site du cahier. Vérifiez que vos classes et vos dernières saisies sont présentes.',
          'Dans les paramètres Android → Applications → Chrome, vérifiez qu’il est activé. Utilisez le même profil Android que l’icône du cahier (personnel, professionnel ou dossier sécurisé).',
          'Installez les mises à jour proposées pour Chrome, puis redémarrez le téléphone. Si Android reste en version 8 ou 9, Chrome est limité à la version 138 : une mise à jour plus récente peut ne pas être disponible.',
          'Si seule l’icône reste bloquée, utilisez le site directement dans Chrome. Avant de recréer une installation depuis ce navigateur, confirmez la synchronisation et exportez une sauvegarde JSON. Ne supprimez pas les données du navigateur pour ce dépannage.',
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
    title: 'تثبيت التطبيق ومزامنة البيانات',
    summary: 'مسك دفتر النصوص داخل حجرة الدرس دون اتصال بالشبكة، والمزامنة التلقائية الآمنة فور توفر الإنترنت.',
    keywords: 'تثبيت PWA Chrome كروم سامسونج متصفح الشاشة الرئيسية بدون إنترنت دون اتصال هاتف ذكي لوحة إلكترونية مزامنة سحابية تخزين محلي أمان البيانات',
    sections: [
      {
        title: 'تثبيت دفتر النصوص كبرنامج على أجهزتك',
        steps: [
          'افتح التطبيق عبر المتصفح وسجّل الدخول إلى حسابك الشخصي.',
          'ثبّت الدفتر من المتصفح الذي تظهر فيه بياناتك: على أندرويد افتح قائمة المتصفح ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»، وعلى آيفون من Safari اضغط المشاركة ثم «إضافة إلى الشاشة الرئيسية». قد تختلف التسميات حسب المتصفح.',
          'افتح دفاتر أقسامك مرة واحدة أثناء توفر الاتصال قبل الذهاب إلى المؤسسة؛ لتخزين المنهاج ومحرك الرموز العلمية (LaTeX) محلياً والعمل دون إنترنت.',
          'عند استخدام جهاز جديد، يكفي تسجيل الدخول بالحساب نفسه لاسترجاع كافة الأقسام والحصص والبيانات المزامنة.',
        ],
      },
      {
        title: 'الأيقونة تطلب تثبيت Chrome رغم وجوده',
        body: 'يعتمد تشغيل التطبيق المثبّت على أندرويد على متصفح. إذا ظهرت هذه الرسالة قبل فتح الدفتر، فقد يتعذر على مشغّل التطبيق العثور على متصفح صالح. لا يستطيع الموقع فحص جميع التطبيقات المثبّتة أو إصلاح هذا الربط في النظام.',
        steps: [
          'افتح Chrome مباشرة ثم موقع الدفتر، وتحقق من ظهور أقسامك وآخر تعديلاتك.',
          'في إعدادات أندرويد ← التطبيقات ← Chrome، تحقق من أنه مفعّل. يجب أن يكون المتصفح وأيقونة الدفتر في ملف أندرويد نفسه: الشخصي أو المهني أو المجلد الآمن.',
          'ثبّت تحديثات Chrome المتاحة ثم أعد تشغيل الهاتف. إذا كان أندرويد بالإصدار 8 أو 9، فإن آخر إصدار مدعوم من Chrome هو 138 وقد لا يتوفر تحديث أحدث.',
          'إذا بقيت الأيقونة وحدها معطّلة، استخدم الموقع مباشرة في Chrome. قبل إعادة إنشاء التثبيت من هذا المتصفح، تحقق من نجاح المزامنة وصدّر نسخة احتياطية JSON. لا تمسح بيانات المتصفح لمعالجة هذه المشكلة.',
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
    title: 'Sauvegarder et restaurer vos données',
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
    title: 'Résoudre un problème ou demander de l’aide',
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
