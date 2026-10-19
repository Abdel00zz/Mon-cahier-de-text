import { chapter } from './model';

export const backup = chapter('backup', ['devices', 'print', 'content'], {
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
  });
