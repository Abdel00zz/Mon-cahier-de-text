import { chapter } from './model';

export const start = chapter('start', ['profile', 'schedule', 'content'], {
    title: 'Votre cahier de textes numérique',
    summary: 'Ce que fait l’application, pourquoi elle est indispensable et comment démarrer en cinq minutes.',
    image: { key: 'classes', caption: 'Les cartes ouvrent le cahier de chaque classe.' },
    keywords: 'cahier de textes numérique professeur enseignant inspection pédagogique programme officiel suivi classe niveau emploi du temps séance preuve décharge protection début démarrage',
    sections: [
      {
        title: 'Un cahier de textes pensé pour l’enseignant marocain',
        body: 'Cette application remplace le cahier de textes papier par un espace numérique conçu autour du quotidien de l’enseignant. Elle s’adresse aux professeurs du secondaire collégial, du secondaire qualifiant et des classes préparatoires (CPGE), quelle que soit la matière enseignée.',
      },
      {
        title: 'Les rôles que remplit votre cahier',
        items: [
          { term: 'Document pédagogique officiel', detail: 'Le cahier de textes est la pièce maîtresse exigée par les Notes ministérielles 255 et 175. Il atteste de l’avancement du programme, des activités menées en classe et du rythme de la progression.' },
          { term: 'Outil de suivi du programme', detail: 'Chapitres, cours, exercices, devoirs et évaluations sont organisés dans un cahier structuré. Chaque élément est daté, ce qui permet de mesurer la cadence d’achèvement par rapport à la répartition périodique.' },
          { term: 'Preuve juridique et protection de l’enseignant', detail: 'En cas de litige sur la dispense d’un cours ou d’un examen, le cahier de textes régulièrement renseigné constitue la preuve irréfutable protégeant l’enseignant devant l’administration et les juridictions.' },
          { term: 'Lien avec l’inspection et la direction', detail: 'L’inspecteur pédagogique et le chef d’établissement consultent le cahier lors de leurs visites. Un cahier bien tenu facilite l’encadrement, améliore la note pédagogique et valorise le travail de l’enseignant.' },
          { term: 'Gain de temps au quotidien', detail: 'L’emploi du temps intégré, l’importation des programmes officiels, la datation assistée et l’impression normalisée éliminent les tâches répétitives et permettent de se concentrer sur l’enseignement.' },
        ],
      },
      {
        title: 'Ce que vous pouvez faire concrètement',
        items: [
          { term: 'Créer et gérer vos classes', detail: 'Ajoutez autant de classes que nécessaire, chacune avec son niveau, sa matière et ses élèves.' },
          { term: 'Rédiger et organiser le contenu', detail: 'Chapitres, cours, propriétés, théorèmes, exercices, activités et devoirs : tout se structure dans un cahier clair et navigable.' },
          { term: 'Dater les séances réalisées', detail: 'Après chaque cours, sélectionnez les éléments traités et attribuez-leur la date du jour. Les séances non datées sont repérées automatiquement.' },
          { term: 'Suivre les évaluations', detail: 'Contrôles, devoirs à la maison, interrogations orales, activités intégrées et événements pédagogiques sont planifiés et liés au cahier.' },
          { term: 'Imprimer et exporter', detail: 'Générez un document normalisé prêt pour le visa de l’administration, avec en-têtes officiels, pagination et liste des élèves.' },
          { term: 'Travailler hors connexion', detail: 'L’application fonctionne sans internet. Vos données se synchronisent automatiquement dès le retour de la connexion.' },
        ],
      },
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
        body: 'Datez uniquement le travail réalisé. En fin de semaine, relisez les séances de chaque cahier pour compléter leur contenu. Vérifiez aussi la synchronisation et conservez une sauvegarde.',
      },
    ],
    tip: 'Renseigner le cahier dès la fin de chaque séance est le geste le plus important. C’est ce qui garantit un suivi fiable du programme, une note pédagogique valorisée et une protection juridique complète.',
  }, {
    title: 'دفتر نصوصك الرقمي',
    summary: 'ما يقدمه التطبيق، أهميته التربوية والإدارية، وكيفية البدء في خمس دقائق.',
    image: { key: 'classes', caption: 'تفتح البطاقات دفاتر الأقسام.' },
    keywords: 'دفتر النصوص الرقمي أستاذ مدرّس تفتيش تربوي برنامج رسمي تتبع قسم مستوى سلك استعمال الزمن حصة إثبات إبراء الذمة حماية قانونية مؤسسة',
    sections: [
      {
        title: 'دفتر نصوص مصمّم للأستاذ المغربي',
        body: 'يعوّض هذا التطبيق دفتر النصوص الورقي بفضاء رقمي مبني حول عمل الأستاذ اليومي. يستهدف أساتذة السلك الثانوي الإعدادي والتأهيلي والأقسام التحضيرية (CPGE)، في جميع المواد الدراسية.',
      },
      {
        title: 'الأدوار التي يؤديها دفتر نصوصك',
        items: [
          { term: 'وثيقة تربوية رسمية', detail: 'دفتر النصوص هو الوثيقة الأساسية المطلوبة بموجب المذكرتين الوزاريتين 255 و175. يوثّق تقدم البرنامج الدراسي والأنشطة المنجزة في الفصل ووتيرة الإنجاز.' },
          { term: 'أداة لتتبع البرنامج الدراسي', detail: 'يتم تنظيم الفصول والدروس والتمارين والفروض والتقويمات في دفتر مهيكل. كل عنصر يُؤرّخ، مما يسمح بقياس وتيرة الإنجاز مقارنة بالتوزيع الدوري الرسمي.' },
          { term: 'حجة قانونية وحماية للأستاذ', detail: 'في حالة نزاع حول إنجاز درس أو امتحان، يشكّل دفتر النصوص المعبّأ بانتظام الدليل القاطع الذي يحمي الأستاذ أمام الإدارة والقضاء.' },
          { term: 'حلقة وصل مع التفتيش والإدارة', detail: 'يطّلع المفتش التربوي ورئيس المؤسسة على الدفتر أثناء زياراتهم. دفتر نصوص محكم يسهّل التأطير ويحسّن التنقيط التربوي ويبرز جهد الأستاذ.' },
          { term: 'ربح الوقت في العمل اليومي', detail: 'استعمال الزمن المدمج، استيراد البرامج الرسمية، المساعدة في إسناد التواريخ والطباعة الموحدة تلغي المهام المتكررة وتتيح التركيز على التدريس.' },
        ],
      },
      {
        title: 'ما يمكنك فعله عملياً',
        items: [
          { term: 'إنشاء أقسامك وتدبيرها', detail: 'أضف ما تشاء من الأقسام، لكل منها مستواه ومادته ولائحة تلاميذه.' },
          { term: 'تحرير المحتوى وتنظيمه', detail: 'فصول، دروس، خاصيات، مبرهنات، تمارين، أنشطة وفروض: كل شيء يُهيكل في دفتر واضح وسهل التصفح.' },
          { term: 'تأريخ الحصص المنجزة', detail: 'بعد كل حصة، حدّد العناصر المنجزة وأسند إليها تاريخ اليوم. العناصر غير المؤرخة تُرصد تلقائياً.' },
          { term: 'تتبع التقويمات', detail: 'الفروض المحروسة، الفروض المنزلية، الاستجوابات الشفهية، الأنشطة المدمجة والأحداث التربوية تُبرمج وتُربط بالدفتر.' },
          { term: 'الطباعة والتصدير', detail: 'أنتج وثيقة موحدة جاهزة لتأشيرة الإدارة، بترويسات رسمية وترقيم ولوائح التلاميذ.' },
          { term: 'العمل دون اتصال', detail: 'يشتغل التطبيق بدون إنترنت. تتم المزامنة تلقائياً عند عودة الاتصال.' },
        ],
      },
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
        body: 'أسند التاريخ إلى العمل المنجز فقط. وفي نهاية الأسبوع، راجع حصص كل دفتر وأكمل محتواها. تحقق أيضاً من المزامنة واحتفظ بنسخة احتياطية.',
      },
    ],
    tip: 'تعبئة الدفتر فور انتهاء كل حصة هو أهم إجراء. هذا ما يضمن تتبعاً موثوقاً للبرنامج، وتنقيطاً تربوياً مُثمّناً، وحماية قانونية كاملة.',
  });
