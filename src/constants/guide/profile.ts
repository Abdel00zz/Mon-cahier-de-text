import { chapter } from './model';

export const profile = chapter('profile', ['schedule', 'classes', 'appearance'], {
    title: 'Profil, matières et cycles',
    summary: 'Renseignez les informations de vos en-têtes et choisissez les cycles que vous enseignez.',
    keywords: 'profil enseignant collège lycée prépa matière AREF direction provinciale établissement cycle langue',
    sections: [
      {
        title: 'Renseigner les informations officielles',
        steps: [
          'Ouvrez Paramètres → Profil. Saisissez votre nom complet, la matière enseignée, le nom de l’établissement, ainsi que la Direction provinciale et l’Académie (AREF) de rattachement.',
          'Sélectionnez vos cycles d’intervention : Enseignement secondaire collégial, Enseignement secondaire qualifiant ou Classes préparatoires (CPGE). Plusieurs choix sont possibles.',
          'Sur mobile, les changements sont enregistrés automatiquement. Sur ordinateur, cliquez sur « Enregistrer le profil ». Ces informations apparaissent dans les en-têtes et à l’impression.',
        ],
      },
      {
        title: 'Impact du cycle sur les cahiers',
        body: 'La sélection des cycles filtre les niveaux, filières et programmes officiels suggérés lors de la création d’une classe. Modifier vos cycles n’altère en rien les cahiers de textes existants ni leurs progressions déjà enregistrées.',
      },
      {
        title: 'Bilinguisme et prise en main de l’interface',
        body: 'La langue adapte l’interface et son sens de lecture sans modifier vos cours. Sur mobile, tous les réglages sont regroupés sur une page et s’enregistrent au fil des changements. Sur ordinateur, le profil conserve son bouton de validation.',
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
          'على الهاتف، تُحفظ التغييرات تلقائياً. على الحاسوب، اضغط على «حفظ الملف الشخصي». تظهر هذه المعطيات في ترويسات الدفاتر وعند الطباعة.',
        ],
      },
      {
        title: 'أثر تغيير السلك على الأقسام',
        body: 'يتحكم اختيار السلك في ترشيح المستويات والمسالك والشعب الرسمية المقترحة عند إنشاء قسم جديد. تغيير السلك في الملف الشخصي لا يُلغي دفاتر النصوص الحالية ولا يُغيّر محتوياتها المسجلة.',
      },
      {
        title: 'لغة الواجهة والخصوصية التحريرية',
        body: 'تكيّف اللغة الواجهة واتجاه القراءة دون تغيير نصوص دروسك. على الهاتف، تظهر الإعدادات في صفحة واحدة وتُحفظ التغييرات تلقائياً. على الحاسوب، يُحفظ الملف الشخصي بزر التأكيد.',
      },
    ],
  });
