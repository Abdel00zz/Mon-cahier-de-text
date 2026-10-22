import { chapter } from './model';

export const content = chapter('content', ['editor', 'curriculum', 'backup'], {
    title: 'Préparer le contenu du cahier',
    summary: 'Importez un programme, rédigez vos cours ou contactez le service de préparation sur mesure.',
    keywords: 'programme officiel curriculum import progression pédagogique rédaction libre service préparation cahier de textes WhatsApp cours personnels diagnostic',
    sections: [
      {
        id: 'prepare', title: 'Trois démarches de planification',
        steps: [
          'Import du programme officiel : À l’ouverture d’un nouveau cahier de textes, l’application vous propose d’importer le référentiel officiel correspondant à votre cycle, niveau et matière, intégrant l’évaluation diagnostique de rentrée.',
          'Rédaction libre : Concevez et saisissez directement vos propres chapitres, notions et activités selon votre démarche didactique et le rythme de vos élèves.',
          'Service sur mesure à partir de vos cours : Si vous préférez partir de vos documents de cours existants, contactez directement notre service d’assistance par WhatsApp pour préparer et organiser votre cahier de textes numérique sur mesure.',
          'Vérifiez la concordance des séances et datez uniquement le travail effectivement réalisé en classe au fur et à mesure de l’année.',
        ],
      },
      {
        id: 'transfer', title: 'Gestion des fichiers de progression (JSON)',
        body: 'Vous pouvez importer vos propres fiches de progression via l’outil de transfert de cours. Veillez à distinguer l’ajout de chapitres complémentaires du remplacement complet du cahier ouvert. Exportez la version actuelle avant tout remplacement.',
      },
    ],
    tip: 'Que vous choisissiez l’import officiel, la rédaction libre ou l’accompagnement par notre service à partir de vos cours, seules les séances effectivement dispensées en classe doivent recevoir une date de réalisation.',
  }, {
    title: 'إعداد محتوى الدفتر',
    summary: 'استورد برنامجاً، اكتب دروسك، أو تواصل مع خدمة إعداد الدفتر من وثائقك.',
    keywords: 'منهاج رسمي توزيع سنوي توجيهات تربوية استيراد تدرج بيداغوجي تحرير حر خدمة إعداد دفاتر النصوص جذاذات دروس خاصة واتساب تقويم تشخيصي',
    sections: [
      {
        id: 'prepare', title: 'ثلاثة مسارات مرنة لتخطيط وتجهيز الدفتر',
        steps: [
          'استيراد المنهاج الرسمي: عند فتح دفتر نصوص فارغ، يقترح التطبيق بنقرة واحدة استيراد التوزيع السنوي الرسمي المعتمد من وزارة التربية الوطنية لمادتك وسلكك الدراسي، مع إدراج مرحلة التقويم التشخيصي والدعم في مستهل البرنامج.',
          'التحرير الحر: يمكنك الشروع مباشرة في إنشاء وحدات وفصول ودروس خاصة بك، وضبط الأنشطة والتمارين وصيغ التقويم وفق هندستك البيداغوجية المستقلة.',
          'خدمة تحرير الدفتر انطلاقاً من دروسك الخاصة: إذا كانت لديك جذاذات أو ملخصات دروس أو دفاتر سابقة، تواصل مباشرة مع خدمة إعداد دفاتر النصوص عبر واتساب لنُعدّ لك دفتر نصوصك الرقمي من محتوى دروسك الخاصة، جاهزاً ومنسقاً للاستخدام الفوري.',
          'تحقق من تسلسل الدروس ومحاورها، والتزم بعدم تأريخ أي عنصر إلا بعد إنجازه الفعلي داخل الحجرة الدراسية.',
        ],
      },
      {
        id: 'transfer', title: 'استيراد التدرجات الخاصة (ملفات JSON)',
        body: 'يمكنك تصدير واستيراد تخطيطك الدراسي المخصص عبر نافذة نقل البيانات. انتبه للاختيار بين «إضافة عناصر» و«استبدال شامل» للدفتر، واحتفظ بنسخة احتياطية قبل أي عملية استبدال.',
      },
    ],
    tip: 'استيراد المنهاج، التحرير الحر، أو إعداد الدفتر من دروسك يوفر قاعدة عمل متكاملة، ولا يُعد إنجازاً للحصص إلا بعد التأريخ الفعلي لكل نشاط صفي منجز.',
  });
