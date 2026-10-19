import { chapter } from './model';

export const curriculum = chapter('curriculum', ['content', 'dates'], {
    title: 'Relier les cours au programme',
    summary: 'Mesurer la réalisation des objectifs pédagogiques et comparer l’avancement réel aux prévisions officielles.',
    keywords: 'programme officiel répartition annuelle périodique couverture programme progression pourcentages inspection',
    sections: [
      {
        title: 'Alignement sur les Orientations Pédagogiques',
        steps: [
          'Accédez à l’écran de suivi du programme officiel depuis le cahier de textes de la classe.',
          'Vérifiez la conformité du référentiel sélectionné (cycle, matière, filière et volume horaire annuel prescrit).',
          'Associez vos chapitres d’enseignement aux modules et compétences officielles du programme ministériel.',
          'Datez régulièrement les apprentissages menés à terme pour mettre à jour les statistiques de couverture pédagogique.',
        ],
      },
      {
        title: 'Interpréter les pourcentages d’avancement',
        body: 'Le taux d’exécution reflète les séances datées par rapport au volume horaire prescrit par le ministère. Importer un programme ne suffit pas à le déclarer réalisé : seul l’enregistrement effectif des séances alimente fidèlement le rapport d’avancement remis à la direction ou au corps d’inspection.',
      },
      {
        title: 'Ajustement en cas de réorganisation de la progression',
        body: 'Si vous modifiez l’ordre des chapitres pour des raisons didactiques, veillez à maintenir la cohérence des correspondances avec le programme pour conserver des statistiques d’avancement fiables.',
      },
    ],
  }, {
    title: 'ربط الدروس بالبرنامج وتتبع التقدم',
    summary: 'مقاربة وتيرة الإنجاز الفعلي بالبرمجة السنوية والتوجيهات التربوية لوزارة التربية الوطنية.',
    keywords: 'منهاج دراسي توزيع سنوي توزيع دوري توجيهات تربوية نسبة الإنجاز تفتيش تربوي كفايات مستهدفة',
    sections: [
      {
        title: 'مطابقة سير الدروس مع المراجع الرسمية',
        steps: [
          'افتح شاشة تتبع المنهاج من داخل دفتر نصوص القسم المعني.',
          'تحقق من اختيار المرجع المعتمد المطابق للمستوى والشعبة والغلاف الزمني السنوي المحدد وزارياً.',
          'اربط فصول ودروس القسم بالوحدات والكفايات المسطرة في التوجيهات التربوية الرسمية للمادة.',
          'داوم على تأريخ الحصص المنجزة لتحديث مؤشرات التغطية ونسب التقدم في تنفيذ المقرر الدراسي.',
        ],
      },
      {
        title: 'قراءة مؤشرات ونسب التغطية البيداغوجية',
        body: 'تُحتسب نسب الإنجاز بناءً على الحصص المؤرخة فعلياً قياساً إلى الحجم الساعي المحدد رسمياً. استيراد المقرر الدراسي يمثل التخطيط القبلي فقط، بينما يشكل التدوين المؤرخ للحصص الإنجاز الفعلي المعتمد لدى الإدارة وهيئة التأطير والمراقبة التربوية.',
      },
      {
        title: 'التعديل في التدرج البيداغوجي',
        body: 'إذا اقتضت المصلحة البيداغوجية تقديم درس أو تأخيره لتثبيت مكتسبات سابقة، تأكد من تحيين الروابط مع المنهاج لضمان مصداقية التقرير الدوري حول سير البرامج التعليمية.',
      },
    ],
  });
