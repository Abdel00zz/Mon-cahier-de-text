import { chapter } from './model';

export const start = chapter('start', ['profile', 'schedule', 'content'], {
    title: 'Votre cahier de textes numérique',
    summary: 'Un espace pour préparer vos cours, garder la trace du travail réalisé et retrouver la progression de chaque classe.',
    image: { key: 'classes', caption: 'Les cartes ouvrent le cahier de chaque classe.' },
    keywords: 'cahier de textes numérique professeur enseignant inspection pédagogique programme progression préparation classe niveau emploi du temps séance organisation début démarrage',
    sections: [
      {
        title: 'Un cahier de textes pensé pour l’enseignant marocain',
        body: 'Mon cahier de textes réunit **vos classes, leurs contenus et vos séances** dans un même espace. Vous préparez votre travail, puis vous sélectionnez les éléments réellement traités pour **leur attribuer une date**.',
      },
      {
        title: 'Les rôles que remplit votre cahier',
        items: [
          { term: 'Un repère pour votre progression', detail: 'Retrouvez ce qui a été réalisé et ce qui reste à aborder pour préparer la suite et ajuster le **rythme de chaque classe**.' },
          { term: 'Une mémoire pédagogique', detail: 'Conservez le lien entre **cours, exercices, devoirs, corrections et évaluations**. Les dates rendent le déroulement des apprentissages lisible.' },
          { term: 'Un support de dialogue', detail: 'Présentez un **cahier structuré** à la direction ou à l’inspection pour expliquer vos choix, vos activités et **l’avancement du programme**.' },
        ],
      },
      {
        title: 'Ce que vous pouvez faire concrètement',
        items: [
          { term: 'Organiser', detail: 'Retrouvez **vos classes et leurs élèves**, préparez les contenus et associez les séances à votre **emploi du temps**.' },
          { term: 'Renseigner', detail: 'Sélectionnez le **travail réalisé**, attribuez ses dates et complétez les **devoirs ou évaluations** liés à la classe.' },
          { term: 'Retrouver et partager', detail: 'Consultez votre cahier, imprimez les séances souhaitées ou enregistrez-les en **PDF**. Avec votre compte, retrouvez vos **données synchronisées** sur vos appareils.' },
        ],
      },
      {
        title: 'Votre routine en trois temps',
        steps: [
          'Avant le cours : ouvrez la classe et préparez les **contenus à traiter**.',
          'Après le cours : sélectionnez les **éléments réalisés** et attribuez leur date.',
          'Pour la suite : relisez la dernière séance et adaptez le **travail à venir**.',
        ],
      },
      {
        title: 'Un geste simple après chaque cours',
        body: 'Datez uniquement le **travail réalisé**. En fin de semaine, relisez les séances de chaque cahier pour compléter leur contenu. Vérifiez aussi la **synchronisation** et conservez une **sauvegarde**.',
      },
    ],
    tip: 'Pour votre première utilisation, poursuivez avec les rubriques Profil, Emploi du temps et Contenu proposées ci-dessous.',
  }, {
    title: 'دفتر نصوصك الرقمي',
    summary: 'فضاء لإعداد دروسك، وتوثيق العمل المنجز، والرجوع إلى تقدّم التعلمات في كل قسم.',
    image: { key: 'classes', caption: 'بطاقات الأقسام لفتح دفاتر النصوص.' },
    keywords: 'دفتر النصوص الرقمي أستاذ مدرس تفتيش تربوي برنامج تقدم تعلمات إعداد تنظيم تتبع قسم مستوى سلك استعمال الزمن حصة مؤسسة بداية',
    sections: [
      {
        title: 'دفتر نصوص مصمّم للأستاذ المغربي',
        body: 'يجمع التطبيق **أقسامك ومحتوياتها وحصصك** في فضاء واحد. تُعدّ العمل مسبقاً، ثم تحدّد العناصر التي أُنجزت فعلاً **لإسناد تاريخها**.',
      },
      {
        title: 'الأدوار التي يؤديها دفتر نصوصك',
        items: [
          { term: 'مرجع لتقدّم التعلمات', detail: 'تعرّف ما أُنجز وما تبقّى لتُعدّ **الحصص المقبلة** وتكيّف **وتيرة العمل** مع كل قسم.' },
          { term: 'ذاكرة للعمل التربوي', detail: 'احتفظ بالترابط بين **الدروس والتمارين والفروض وتصحيحها والتقويمات**، حيث تُوضح التواريخ تسلسل التعلمات.' },
          { term: 'سند للتواصل التربوي', detail: 'قدّم **دفتراً منظماً** للإدارة أو **التفتيش التربوي** لعرض اختياراتك وأنشطتك ومدى **تقدّم البرنامج**.' },
        ],
      },
      {
        title: 'ما يمكنك فعله عملياً',
        items: [
          { term: 'التنظيم', detail: 'ارجع إلى **أقسامك** ولوائح تلاميذها، وأعدّ **المحتويات**، واربط الحصص **باستعمال الزمن**.' },
          { term: 'التوثيق', detail: 'حدّد **العمل المنجز** وأسند تواريخه، ثم أكمل **الفروض والتقويمات** المرتبطة بالقسم.' },
          { term: 'الرجوع والمشاركة', detail: 'تصفّح دفترك، واطبع **الحصص المطلوبة** أو احفظها بصيغة **PDF**. يتيح حسابك الرجوع إلى **بياناتك المتزامنة** بين أجهزتك.' },
        ],
      },
      {
        title: 'عملك اليومي في ثلاث خطوات',
        steps: [
          'قبل الحصة: افتح القسم وأعدّ **المحتويات** التي ستتناولها.',
          'بعد الحصة: حدّد **العناصر المنجزة** وأسند إليها **تاريخ الإنجاز**.',
          'للحصة المقبلة: راجع **آخر حصة** وكيّف العمل القادم.',
        ],
      },
      {
        title: 'خطوة بسيطة بعد كل حصة',
        body: 'أسند التاريخ إلى **العمل المنجز فقط**. وفي نهاية الأسبوع، راجع حصص كل دفتر وأكمل محتواها. تحقق أيضاً من **المزامنة** واحتفظ **بنسخة احتياطية**.',
      },
    ],
    tip: 'عند أول استعمال، تابع مع محاور الملف الشخصي واستعمال الزمن والمحتوى المقترحة أسفله.',
  });
