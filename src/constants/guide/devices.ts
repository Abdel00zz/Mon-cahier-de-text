import { chapter } from './model';

export const devices = chapter('devices', ['notifications', 'backup', 'troubleshooting'], {
    title: 'Installer l’application et synchroniser',
    summary: 'Saisie autonome en classe sans connexion Internet et synchronisation sécurisée avec votre espace en ligne.',
    keywords: 'PWA application installer Android iPhone iPad Chrome Samsung écran accueil navigateur hors ligne sans connexion synchronisation compte cloud',
    sections: [
      {
        title: 'Installer depuis le navigateur (PWA)',
        steps: [
          'Accédez à l’application depuis votre navigateur habituel et connectez-vous à votre compte enseignant.',
          'Installez le cahier depuis le navigateur où vos données sont disponibles : sous Android, menu du navigateur → « Installer » ou « Ajouter à l’écran d’accueil » ; sur iPhone / Safari, Partage → « Sur l’écran d’accueil ». Les intitulés varient selon le navigateur.',
          'Ouvrez préalablement vos cahiers de textes en ligne avant de vous rendre en classe : les cahiers déjà chargés et le moteur de formules peuvent ensuite être utilisés hors ligne.',
          'Lors d’un changement de matériel, reconnectez-vous simplement à votre compte pour retrouver vos classes après la synchronisation.',
        ],
      },
      {
        title: 'Application Android installée',
        body: 'Dans la version Android, les autorisations de notification se règlent aussi dans le système. La saisie des notes affiche le clavier numérique. Utilisez le même compte pour synchroniser vos classes et attendez la confirmation de synchronisation avant de changer d’appareil. Ces étapes sont distinctes de l’installation depuis le navigateur.',
      },
      {
        title: 'Une icône PWA demande d’installer Chrome',
        body: 'Sur Android, la PWA utilise un navigateur pour démarrer. Si ce message apparaît avant le cahier, le lanceur peut ne plus retrouver un navigateur utilisable ; le site ne peut ni détecter toutes les applications installées ni réparer ce lien système.',
        steps: [
          'Ouvrez Chrome directement, puis le site du cahier. Vérifiez que vos classes et vos dernières saisies sont présentes.',
          'Dans les paramètres Android → Applications → Chrome, vérifiez qu’il est activé. Utilisez le même profil Android que l’icône du cahier (personnel, professionnel ou dossier sécurisé).',
          'Installez les mises à jour proposées pour votre navigateur puis redémarrez le téléphone. Sur un ancien appareil, certaines mises à jour peuvent ne plus être disponibles.',
          'Si seule l’icône reste bloquée, utilisez le site directement dans Chrome. Avant de recréer une installation depuis ce navigateur, confirmez la synchronisation et exportez une sauvegarde JSON. Ne supprimez pas les données du navigateur pour ce dépannage.',
        ],
      },
      {
        title: 'Suivre le statut de synchronisation',
        items: [
          { term: 'Synchronisé', detail: 'L’ensemble de vos saisies locales est sécurisé et enregistré sur le serveur.' },
          { term: 'En cours / En attente', detail: 'Des séances ou modifications locales sont prêtes à être transmises dès le rétablissement de la connexion.' },
          { term: 'Mode hors ligne', detail: 'L’application fonctionne en toute autonomie sur la mémoire locale de votre appareil.' },
        ],
      },
      {
        title: 'Préserver l’intégrité de vos données de cours',
        body: 'Les données saisies hors ligne sont conservées précieusement sur l’appareil. Ne videz pas le cache du navigateur et ne désinstallez pas l’application tant qu’une synchronisation réussie n’a pas été confirmée. Évitez de modifier simultanément le même cahier sur deux appareils différents avec des modifications en attente.',
      },
    ],
  }, {
    title: 'تثبيت التطبيق ومزامنة البيانات',
    summary: 'مسك دفتر النصوص داخل حجرة الدرس دون اتصال بالشبكة، والمزامنة التلقائية الآمنة فور توفر الإنترنت.',
    keywords: 'تثبيت PWA Chrome كروم سامسونج متصفح الشاشة الرئيسية بدون إنترنت دون اتصال هاتف ذكي لوحة إلكترونية مزامنة سحابية تخزين محلي أمان البيانات',
    sections: [
      {
        title: 'التثبيت من المتصفح (PWA)',
        steps: [
          'افتح التطبيق عبر المتصفح وسجّل الدخول إلى حسابك الشخصي.',
          'ثبّت الدفتر من المتصفح الذي تظهر فيه بياناتك: على أندرويد افتح قائمة المتصفح ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»، وعلى آيفون من Safari اضغط المشاركة ثم «إضافة إلى الشاشة الرئيسية». قد تختلف التسميات حسب المتصفح.',
          'افتح دفاتر أقسامك مرة واحدة أثناء توفر الاتصال قبل الذهاب إلى المؤسسة؛ لتخزين المنهاج ومحرك الرموز العلمية (LaTeX) محلياً والعمل دون إنترنت.',
          'عند استخدام جهاز جديد، يكفي تسجيل الدخول بالحساب نفسه لاسترجاع كافة الأقسام والحصص والبيانات المزامنة.',
        ],
      },
      {
        title: 'نسخة أندرويد المثبّتة',
        body: 'في نسخة أندرويد، تُضبط أذونات الإشعارات أيضاً في إعدادات النظام. تعرض خانة النقط لوحة الأرقام. استخدم الحساب نفسه لمزامنة الأقسام وانتظر تأكيد المزامنة قبل الانتقال إلى جهاز آخر. تختلف هذه الخطوات عن التثبيت من المتصفح.',
      },
      {
        title: 'أيقونة PWA تطلب تثبيت Chrome',
        body: 'يعتمد تشغيل نسخة PWA المثبّتة على أندرويد على متصفح. إذا ظهرت هذه الرسالة قبل فتح الدفتر، فقد يتعذر على مشغّل التطبيق العثور على متصفح صالح. لا يستطيع الموقع فحص جميع التطبيقات المثبّتة أو إصلاح هذا الربط في النظام.',
        steps: [
          'افتح Chrome مباشرة ثم موقع الدفتر، وتحقق من ظهور أقسامك وآخر تعديلاتك.',
          'في إعدادات أندرويد ← التطبيقات ← Chrome، تحقق من أنه مفعّل. يجب أن يكون المتصفح وأيقونة الدفتر في ملف أندرويد نفسه: الشخصي أو المهني أو المجلد الآمن.',
          'ثبّت تحديثات المتصفح المتاحة ثم أعد تشغيل الهاتف. قد لا تتوفر بعض التحديثات على الأجهزة القديمة.',
          'إذا بقيت الأيقونة وحدها معطّلة، استخدم الموقع مباشرة في Chrome. قبل إعادة إنشاء التثبيت من هذا المتصفح، تحقق من نجاح المزامنة وصدّر نسخة احتياطية JSON. لا تمسح بيانات المتصفح لمعالجة هذه المشكلة.',
        ],
      },
      {
        title: 'متابعة حالة المزامنة السحابية',
        items: [
          { term: 'تمت المزامنة بنجاح', detail: 'كافة التعديلات والحصص المدوّنة محفوظة بأمان ومطابقة على السحابة.' },
          { term: 'قيد الإرسال / في الانتظار', detail: 'توجد حصص أو بيانات جديدة بانتظار الإرسال بمجرد استقرار الاتصال بالإنترنت.' },
          { term: 'العمل دون اتصال (Off-line)', detail: 'التطبيق يعمل بكامل كفاءته وسرعته اعتماداً على الذاكرة الآمنة للجهاز.' },
        ],
      },
      {
        title: 'تأمين المعطيات المخزنة محلياً',
        body: 'يضمن النظام حفظ كل كلمة تدونها في الذاكرة المحلية للجهاز أولاً بأول. تجنب مسح بيانات المتصفح أو إزالة التطبيق أثناء وجود تعديلات معلقة قبل تأكيد المزامنة السحابية. تجنب تعديل الدفتر نفسه في الوقت ذاته من جهازين مختلفين.',
      },
    ],
  });
