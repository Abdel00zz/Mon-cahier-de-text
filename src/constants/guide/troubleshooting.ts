import { chapter } from './model';

export const troubleshooting = chapter('troubleshooting', ['notifications', 'devices', 'profile'], {
    title: 'Résoudre un problème ou demander de l’aide',
    summary: 'Vérifications méthodiques pour résoudre les anomalies courantes et contacter l’équipe d’assistance.',
    keywords: 'assistance aide support contact WhatsApp problème formule affichage synchronisation bug diagnostic',
    sections: [
      {
        title: 'Diagnostics et résolutions rapides',
        items: [
          { term: 'Une classe n’apparaît pas', detail: 'Vérifiez le compte connecté, les filtres de cycle ou de niveau actifs, et lancez une synchronisation manuelle.' },
          { term: 'La séance en cours ne correspond pas', detail: 'Contrôlez la date et l’heure système de votre appareil, ainsi que la conformité de votre grille d’emploi du temps.' },
          { term: 'Les rappels ou notifications ne sonnent pas', detail: 'Contrôlez les autorisations du navigateur, les restrictions de batterie et envoyez un test depuis les paramètres de notification.' },
          { term: 'Formule mathématique ou texte invisible', detail: 'Assurez-vous que la recherche est vide, vérifiez la syntaxe LaTeX et patientez le temps du chargement de KaTeX.' },
          { term: 'Le profil ne change pas', detail: 'Cliquez sur « Enregistrer le profil » avant de fermer l’écran des paramètres.' },
          { term: 'Les données diffèrent entre deux appareils', detail: 'Vérifiez que la synchronisation est achevée sur le premier appareil avant d’ouvrir le cahier sur le second.' },
        ],
      },
      {
        id: 'support', title: 'Solliciter l’assistance technique et pédagogique',
        steps: [
          'Lorsque la situation demande une explication, le compagnon propose « Comment faire ? ». Le guide complet reste accessible depuis « Aide » dans la navigation.',
          'Pour une question ou une correction de contenu, choisissez « Contacter l’équipe », sélectionnez la classe concernée ou « Question générale », puis décrivez la difficulté. Le compagnon vous signalera la réponse.',
          'Pour faire préparer un cours personnalisé, utilisez le bouton WhatsApp. L’ouverture de WhatsApp ne confirme pas l’envoi : envoyez votre message dans WhatsApp.',
          'Indiquez l’action tentée et votre appareil. Masquez les noms des élèves et les données confidentielles dans les captures transmises.',
        ],
      },
    ],
    tip: 'Avant de réinitialiser vos paramètres, testez une action simple et vérifiez votre connexion Internet : la majorité des anomalies sont temporaires.',
  }, {
    title: 'معالجة الصعوبات والدعم الفني والتربوي',
    summary: 'خطوات عملية لتشخيص وحل الإشكالات الشائعة، وقنوات التواصل المباشر مع فريق الدعم والمساعدة.',
    keywords: 'دعم فني مساعدة واتساب مشكلة خطأ استفسار تفتيش صيغة رياضية مزامنة حل الصعوبات',
    sections: [
      {
        title: 'إجراءات الفحص والحل السريع',
        items: [
          { term: 'عدم ظهور قسم في القائمة', detail: 'تحقق من الحساب المسجل، ومن مرشحات السلك والمستوى المفعلة، وأجرِ مزامنة يدوية للبيانات.' },
          { term: 'عدم تطابق الحصة الجارية', detail: 'تأكد من صحة توقيت وتاريخ جهازك، وطابق جدول استعمال الزمن المسجل مع التوقيت الفعلي للحصة.' },
          { term: 'عدم وصول التنبيهات أو الإشعارات', detail: 'تأكد من منح أذونات المتصفح، وتعطيل قيود توفير الطاقة الصارمة، واختبر الإشعار من شاشة الإعدادات.' },
          { term: 'صيغة رياضية أو نص غير ظاهر', detail: 'امسح حقل البحث للتأكد من عدم تصفية الجدول، وراجع صياغة أوامر LaTeX وتوفر الاتصال لتحميل محرك الرموز.' },
          { term: 'الملف الشخصي لا يتغير', detail: 'اضغط على «حفظ الملف الشخصي» قبل إغلاق النافذة؛ فالمعطيات الإدارية تتطلب حفظاً صريحاً.' },
          { term: 'تباين المعطيات بين جهازين', detail: 'تأكد من اكتمال المزامنة السحابية على الجهاز الأول قبل فتح الدفتر على الجهاز الثاني.' },
        ],
      },
      {
        id: 'support', title: 'التواصل الفعال مع فريق الدعم',
        steps: [
          'عندما يتطلب الوضع شرحاً، يقترح الرفيق «كيف أفعل ذلك؟». يظل دليل الاستخدام الكامل متاحاً من زر المساعدة في شريط التنقل.',
          'لسؤال أو تعديل في المحتوى، اختر «التواصل مع الفريق» وحدّد القسم المعني أو «سؤال عام»، ثم اشرح الصعوبة. سيُعلمك الرفيق بوصول الردّ.',
          'لإعداد دروس مخصصة، استخدم زر واتساب. فتح واتساب لا يعني إرسال الرسالة؛ أرسلها بنفسك داخل واتساب.',
          'اذكر الإجراء الذي جرّبته ونوع جهازك، واحجب أسماء التلاميذ والمعطيات الشخصية في الصور المرسلة.',
        ],
      },
    ],
    tip: 'قبل الشروع في إعادة تثبيت التطبيق، افحص نقطة واحدة بهدوء؛ فمعظم الصعوبات ترتبط باتصال الشبكة أو بحاجة المتصفح للتحديث.',
  });
