import { chapter } from './model';

export const types = chapter('types', ['editor', 'math', 'content'], {
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
  });
