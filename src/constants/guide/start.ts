import { chapter } from './model';

export const start = chapter('start', ['profile', 'schedule', 'content'], {
    title: 'Créer votre premier cahier',
    summary: 'Préparez votre profil, ajoutez une classe, puis enregistrez votre première séance.',
    image: { key: 'classes', caption: 'Les cartes ouvrent le cahier de chaque classe. Capture d’une version antérieure.' },
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
        body: 'Datez uniquement le travail réalisé. En fin de semaine, relisez les séances de chaque cahier pour compléter leur contenu. Vérifiez aussi la synchronisation et conservez une sauvegarde.',
      },
    ],
    tip: 'Une configuration rigoureuse de l’emploi du temps dès la rentrée garantit un suivi fluide et évite tout décalage dans la datation des séances.',
  }, {
    title: 'أنشئ أول دفتر نصوص',
    summary: 'أعدّ ملفك الشخصي، أضف قسماً، ثم سجّل أول حصة.',
    image: { key: 'classes', caption: 'تفتح البطاقات دفاتر الأقسام. لقطة من إصدار سابق.' },
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
        body: 'أسند التاريخ إلى العمل المنجز فقط. وفي نهاية الأسبوع، راجع حصص كل دفتر وأكمل محتواها. تحقق أيضاً من المزامنة واحتفظ بنسخة احتياطية.',
      },
    ],
    tip: 'ضبط جدول الحصص الأسبوعي بدقة من بداية الموسم الدراسي يمنع أخطاء تواريخ الحصص ويسهّل التأشير الإداري والمراقبة التربوية.',
  });
