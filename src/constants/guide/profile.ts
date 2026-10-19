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
  });
