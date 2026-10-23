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
        id: 'followup', title: 'Le suivi léger du compagnon',
        body: 'Le compagnon repère une classe sans horaires, un cahier à démarrer ou une longue période sans nouvelle séance datée. Ce dernier rappel utilise le seuil d’inactivité réglé dans les notifications (5 jours de cours par défaut), les jours prévus pour cette classe, la rentrée et la fin des cours. Les vacances, jours fériés et absences justifiées sont exclus du calcul. La journée en cours relève des rappels de séance. Une date commune ne permet pas de distinguer toutes les séances du même jour ; le compagnon invite donc à vérifier, sans affirmer que le travail n’a pas été fait. Les contenus préparés sans date ne constituent pas à eux seuls un retard. Le bouton ouvre le cahier concerné ; le signal disparaît quand la situation évolue.',
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
        id: 'followup', title: 'المتابعة الخفيفة لدى الرفيق',
        body: 'يرصد الرفيق القسم دون استعمال زمن، والدفتر الذي ينتظر محتواه الأول، ومرور مدة طويلة دون تسجيل حصة مؤرخة جديدة. يعتمد هذا التذكير عتبة الانقطاع المضبوطة في الإشعارات (خمسة أيام تدريس افتراضياً)، وأيام حصص القسم وبداية الدراسة ونهايتها، مع استبعاد العطل والأعياد والغيابات المبررة. يترك اليوم الجاري لتذكيرات الحصة. لا يكفي التاريخ المشترك للتمييز بين جميع حصص اليوم نفسه؛ لذلك يدعوك الرفيق إلى المراجعة دون الجزم بعدم إنجاز العمل. لا يُعدّ المحتوى المحضّر دون تاريخ تأخراً في حد ذاته. يفتح الزر الدفتر المعني ويزول التنبيه عند تغيّر الوضع.',
      },
      {
        title: 'إرشادات لضمان وصول التنبيهات',
        body: 'لضمان اشتغال التنبيهات بدقة، يُستحسن استثناء التطبيق من برامج توفير طاقة البطارية الصارمة. تظل التنبيهات وسيلة مساعدة ذكية تعزز حرص الأستاذ على انتظام مسك الوثائق التربوية.',
      },
    ],
  });
