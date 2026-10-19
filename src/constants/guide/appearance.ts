import { chapter } from './model';

export const appearance = chapter('appearance', ['profile', 'math', 'print'], {
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
  });
