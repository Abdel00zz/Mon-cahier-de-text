import { chapter } from './model';

export const schedule = chapter('schedule', ['classes', 'dates', 'notifications'], {
    title: 'Configurer l’emploi du temps',
    summary: 'Placez chaque classe dans la grille pour repérer les séances en cours et vérifier leurs dates.',
    keywords: 'emploi du temps grille horaire créneaux matin après-midi séances hebdomadaires rentrée scolaire décalage',
    image: { key: 'schedule', caption: 'Affectation des classes aux créneaux hebdomadaires de l’emploi du temps.' },
    sections: [
      {
        title: 'Établir la grille hebdomadaire',
        steps: [
          'Dans Paramètres → Emploi du temps, vérifiez la date de début de l’année scolaire conforme au calendrier ministériel.',
          'Affectez chaque classe à ses plages horaires respectives en cliquant à l’intersection du jour et de l’heure (matin ou après-midi).',
          'Pour une séance double (bloc de 2 heures consécutives), sélectionnez la même classe sur les deux créneaux consécutifs : le système les regroupe automatiquement.',
          'Pour libérer un créneau, sélectionnez la case vide. Contrôlez le récapitulatif global de la masse horaire par classe pour vérifier la conformité avec votre emploi du temps officiel.',
        ],
      },
      {
        title: 'Horaires décalés et ajustements administratifs',
        body: 'Les filtres matin, après-midi et journée facilitent la lecture. Le système permet d’appliquer les ajustements horaires officiels (ex. horaires décalés de Ramadan ou dispositions locales de l’établissement) sans modifier la durée pédagogique des séances.',
      },
    ],
    tip: 'Une grille horaire exacte garantit la pertinence des rappels de séance et des contrôles de date.',
  }, {
    title: 'استعمال الزمن الأسبوعي وجدول الحصص',
    summary: 'برمجة الحصص الأسبوعية والفترات الصباحية والمسائية لضمان ضبط التأريخ ومواكبة إنجاز البرامج.',
    keywords: 'استعمال الزمن جدول الحصص حصص أسبوعية توقيت صباح مساء تفويج حصة مزدوجة مقرر وزاري غلاف زمني',
    image: { key: 'schedule', caption: 'توزيع الأقسام على الفترات الأسبوعية لاستعمال الزمن.' },
    sections: [
      {
        title: 'برمجة الحصص على جدول الأسبوع',
        steps: [
          'في «الإعدادات» ثم «استعمال الزمن»، تحقق من تاريخ انطلاق الموسم الدراسي المعتمد في المقرر الوزاري لتنظيم السنة الدراسية.',
          'اضغط على الخانة المتقاطعة بين اليوم وساعة التدريس (صباحاً أو بعد الزوال) لإسناد القسم الدراسي المعني.',
          'لحصة من ساعتين، أسند القسم نفسه إلى الخانتين المتتاليتين؛ سيجمعهما التطبيق في حصة واحدة.',
          'لحذف حصة، اختر الخانة الفارغة. راجع بعد ذلك جدول الحصيلة للتأكد من مطابقة الغلاف الزمني الأسبوعي لحصص المادة المقررة رسمياً.',
        ],
      },
      {
        title: 'التوقيت الإداري وتعديلات التوقيت المدرسي',
        body: 'تتيح المرشحات (الفترة الصباحية، فترة بعد الزوال، اليوم كاملاً) قراءة مريحة للجدول. يراعي النظام فترات التوقيت الخاصة (كتوقيت شهر رمضان أو التوقيت الشتوي المعتمد من قبل إدارة المؤسسة التعليمية) دون المساس بالمدد الديداكتيكية المخصصة للحصص.',
      },
    ],
    tip: 'احرص على مطابقة استعمال الزمن الرقمي مع نسختك الرسمية المصادق عليها من إدارة المؤسسة لتفادي تنبيهات عدم التوافق في التواريخ.',
  });
