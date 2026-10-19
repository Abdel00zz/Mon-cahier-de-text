import { chapter } from './model';

export const legal = chapter('legal', ['curriculum', 'editor', 'dates', 'assessments'], {
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
  });
