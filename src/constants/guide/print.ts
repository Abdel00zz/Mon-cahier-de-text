import { chapter } from './model';

export const print = chapter('print', ['dates', 'appearance', 'backup'], {
    title: 'Imprimer ou exporter en PDF',
    summary: 'Choisissez les séances, la mise en page et les couleurs du document à imprimer ou à enregistrer en PDF.',
    image: { key: 'print', caption: 'Options d’impression et d’export PDF du cahier.' },
    keywords: 'impression cahier de textes PDF visa administratif inspection contrôle signature directeur censeur marges',
    sections: [
      {
        title: 'Préparer le document d’impression',
        steps: [
          'Ouvrez la fonction d’impression directement depuis la barre d’outils du cahier de textes concerné.',
          'Choisissez les nouvelles séances, le cahier complet ou les dates de séances à imprimer.',
          'Vérifiez les mentions administratives de l’en-tête (Académie, Direction provinciale, Établissement, Enseignant, Classe, Matière) et la pagination.',
          'Contrôlez l’aperçu avant impression pour vous assurer de la bonne disposition des formules mathématiques et des sauts de page.',
          'Lancez l’impression papier pour la remise au visa administratif (Direction / Censure) ou exportez le document au format PDF pour archivage.',
        ],
      },
      {
        title: 'Couleurs et lisibilité',
        items: [
          { term: 'Couleurs du contenu', detail: 'Activez cette option pour conserver les couleurs des badges et repères. Désactivez-la pour une version monochrome. Le choix est mémorisé sur cet appareil pour chaque classe.' },
          { term: 'Polices du PDF', detail: 'Le latin utilise Latin Modern et l’arabe SamsungOne Arabic. Ces polices sont embarquées ; leur chargement se termine avant la préparation de l’impression.' },
          { term: 'Mise en page', detail: 'Adaptez la taille du texte, l’espacement, les descriptions, l’en-tête et la pagination avant de lancer l’impression.' },
        ],
      },
      {
        title: 'Principe du suivi des séances imprimées',
        body: 'L’option « Nouvelles dates » s’appuie sur le journal des impressions précédentes pour identifier les séances ajoutées depuis votre dernier tirage. Vous pouvez à tout moment forcer la réimpression d’une période précise.',
      },
      {
        title: 'Conserver votre travail',
        body: 'Le PDF conserve une version à consulter ou à partager. Exportez aussi une sauvegarde JSON pour pouvoir restaurer les données modifiables du cahier.',
      },
    ],
  }, {
    title: 'الطباعة والتصدير بصيغة PDF',
    summary: 'اختر الحصص وتنسيق الصفحات وألوان الوثيقة لطباعتها أو حفظها بصيغة PDF.',
    image: { key: 'print', caption: 'خيارات طباعة الدفتر وحفظه بصيغة PDF.' },
    keywords: 'طباعة دفتر النصوص تصدير PDF تأشير إداري تفتيش تربوي توقيع المدير الناظر المفتش ترويسة رسمية',
    sections: [
      {
        title: 'إعداد وتجهيز وثيقة الطباعة الرسمية',
        steps: [
          'افتح خيار الطباعة مباشرة من شريط أدوات دفتر نصوص القسم المعني.',
          'اختر الحصص الجديدة، أو كامل الدفتر، أو تواريخ الحصص التي تريد طباعتها.',
          'تأكد من اكتمال الترويسة الرسمية (الأكاديمية الجهوية، المديرية الإقليمية، اسم المؤسسة، اسم الأستاذ، المادة، والمستوى الدراسي) وسلامة الترقيم.',
          'عاين صفحات الوثيقة في نافذة المعاينة للتحقق من وضوح الجداول، المعادلات الرياضية، وفواصل الصفحات المنتظمة.',
          'اضغط أمر الطباعة لاستخراج النسخة الورقية الموجهة للتأشير الإداري من إدارة المؤسسة (المدير أو الناظر) ولجان التفتيش التربوي، أو احفظها بصيغة PDF.',
        ],
      },
      {
        title: 'الألوان ووضوح القراءة',
        items: [
          { term: 'ألوان المحتوى', detail: 'فعّل هذا الخيار للحفاظ على ألوان الشارات والعلامات، أو عطّله لنسخة أحادية اللون. يُحفظ الاختيار على هذا الجهاز لكل قسم.' },
          { term: 'خطوط PDF', detail: 'تُستخدم Latin Modern للنص اللاتيني وSamsungOne Arabic للعربية. الخطوط مضمّنة، ويكتمل تحميلها قبل تجهيز الطباعة.' },
          { term: 'تنسيق الصفحات', detail: 'اضبط حجم النص والتباعد والوصف ورأس الوثيقة وترقيم الصفحات قبل بدء الطباعة.' },
        ],
      },
      {
        title: 'آلية تتبع الحصص المؤرخة الجديدة',
        body: 'يرصد خيار «التواريخ الجديدة» الحصص المنجزة حديثاً التي لم يشملها أمر الطباعة السابق، مما يجنبك إعادة طباعة الصفحات المؤشرة مسبقاً من طرف إدارة المؤسسة.',
      },
      {
        title: 'الاحتفاظ بعملك',
        body: 'يحفظ ملف PDF نسخة للقراءة أو المشاركة. صدّر أيضاً نسخة احتياطية بصيغة JSON لاسترجاع بيانات الدفتر القابلة للتعديل.',
      },
    ],
  });
