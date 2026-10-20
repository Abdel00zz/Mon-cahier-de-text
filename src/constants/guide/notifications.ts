import { chapter } from './model';

export const notifications = chapter('notifications', ['schedule', 'devices'], {
    title: 'Activer les rappels et notifications',
    summary: 'Paramétrer les rappels de fin de séance, les alertes d’oubli de datation et les notifications système.',
    keywords: 'notifications alertes rappels fin de séance oubli de datation seuils de retard vibration push PWA',
    image: { key: 'notifications', caption: 'Gestion des rappels et autorisations de notifications.' },
    sections: [
      {
        title: 'Activer les notifications sur votre appareil',
        steps: [
          'Depuis l’appareil utilisé en classe (smartphone, tablette ou ordinateur portable), ouvrez Paramètres → Notifications.',
          'Activez les rappels puis les notifications disponibles sur votre appareil. Autorisez la demande du système Android ou du navigateur, selon la version utilisée.',
          'Vérifiez le bon fonctionnement immédiat grâce au bouton de test d’envoi. Répétez l’opération sur vos autres appareils personnels si nécessaire.',
          'En cas de blocage, vérifiez les autorisations de notification dans les paramètres de votre système d’exploitation ou du navigateur.',
        ],
      },
      {
        title: 'Personnaliser les seuils et alertes pédagogiques',
        items: [
          { term: 'Avertisseur de fin de cours', detail: 'Par défaut, le rappel arrive 5 minutes avant la fin prévue : pour 14 h–16 h, il arrive à 15 h 55. Ce délai reste réglable dans les notifications ; il ne change pas le créneau enregistré.' },
          { term: 'Rappel de datation de séance', detail: 'Notification programmée après la fin du cours (ex. après 5 ou 15 minutes) si les contenus n’ont pas encore été datés.' },
          { term: 'Surveillance de retard et inactivité', detail: 'Alerte contextuelle lorsque plusieurs séances prévues à l’emploi du temps demeurent sans trace écrite dans le cahier.' },
          { term: 'Suspension pendant les vacances', detail: 'Mise en veille automatique des rappels durant les périodes de congés scolaires et d’absences déclarées.' },
          { term: 'Vibration et retours haptiques', detail: 'Signal tactile discret adapté à la présence en classe (selon compatibilité de l’appareil).' },
        ],
      },
      {
        title: 'Recommandations d’usage',
        body: 'Pour garantir la réception des rappels en classe, désactivez les restrictions d’économie d’énergie sur votre navigateur. Les alertes constituent une aide au quotidien, sans se substituer à votre rigueur professionnelle.',
      },
    ],
  }, {
    title: 'تفعيل التذكيرات والإشعارات',
    summary: 'ضبط تذكيرات اختتام الحصة، تنبيهات استدراك التدوين، وإشعارات النظام على الهواتف واللوحات.',
    keywords: 'إشعارات تنبيهات تذكير اختتام الحصة تأريخ الحصص تدوين إشعار فوري اهتزاز هاتف PWA',
    image: { key: 'notifications', caption: 'تدبير التذكيرات وتراخيص الإشعارات.' },
    sections: [
      {
        title: 'تفعيل الإشعارات على جهازك المستخدم',
        steps: [
          'من الجهاز المستعمل داخل الفصل (هاتف ذكي أو لوحة إلكترونية أو حاسوب)، ادخل إلى «الإعدادات» ثم «الإشعارات».',
          'فعّل التذكيرات ثم الإشعارات المتاحة على جهازك. امنح إذن نظام أندرويد أو المتصفح حسب النسخة المستعملة.',
          'انتظر تأكيد نجاح الاشتراك ثم اضغط على «إرسال إشعار تجريبي» للتحقق من وصول التنبيهات. كرر الخطوة على أي جهاز شخصي آخر ترغب في استخدامه.',
          'في حال تعذر التشغيل، راجع إعدادات الإشعارات والأذونات في المتصفح أو نظام تشغيل الجهاز.',
        ],
      },
      {
        title: 'تخصيص مواقيت وعتبات التذكير البيداغوجي',
        items: [
          { term: 'التنبيه بقرب نهاية الحصة', detail: 'يصل التذكير افتراضياً قبل النهاية المبرمجة بخمس دقائق: لحصة من 14:00 إلى 16:00، يصل عند 15:55. يمكن تعديل المهلة في إعدادات الإشعارات دون تغيير الفترة المسجلة.' },
          { term: 'التذكير بتأريخ الحصة المنجزة', detail: 'تنبيه يصدر بعد انقضاء الحصة (5 أو 15 دقيقة) في حال عدم إسناد التاريخ لعناصر الدرس التي تم إنجازها.' },
          { term: 'رصد التراكم والانقطاع', detail: 'تنبيه ذكي عند استمرار عدة حصص مبرمجة في استعمال الزمن دون مسك في دفتر النصوص.' },
          { term: 'هدوء العطل والرخص المبرمجة', detail: 'إيقاف التنبيهات تلقائياً خلال العطل المدرسية المحددة في المقرر الوزاري والرخص الخاصة بالأستاذ.' },
          { term: 'التنبيه بالاهتزاز الخفيف', detail: 'إشعار حركي غير ملفت ملائم لجو الحجرة الدراسية (وفق دعم نظام تشغيل الهاتف).' },
        ],
      },
      {
        title: 'إرشادات لضمان وصول التنبيهات',
        body: 'لضمان اشتغال التنبيهات بدقة، يُستحسن استثناء التطبيق من برامج توفير طاقة البطارية الصارمة. تظل التنبيهات وسيلة مساعدة ذكية تعزز حرص الأستاذ على انتظام مسك الوثائق التربوية.',
      },
    ],
  });
