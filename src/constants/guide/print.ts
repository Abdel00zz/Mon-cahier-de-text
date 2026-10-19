import { chapter } from './model';

export const print = chapter('print', ['dates', 'appearance', 'backup'], {
    title: 'Imprimer ou exporter en PDF',
    summary: 'Génération des états d’impression du cahier de textes conformes aux exigences administratives et d’inspection.',
    keywords: 'impression cahier de textes PDF visa administratif inspection contrôle signature directeur censeur marges',
    sections: [
      {
        title: 'Préparer le document d’impression',
        steps: [
          'Ouvrez la fonction d’impression directement depuis la barre d’outils du cahier de textes concerné.',
          'Sélectionnez la période voulue : uniquement les nouvelles séances non encore imprimées, l’intégralité du cahier depuis la rentrée, ou un intervalle de dates personnalisé.',
          'Vérifiez les mentions administratives de l’en-tête (Académie, Direction provinciale, Établissement, Enseignant, Classe, Matière) et la pagination.',
          'Contrôlez l’aperçu avant impression pour vous assurer de la bonne disposition des formules mathématiques et des sauts de page.',
          'Lancez l’impression papier pour la remise au visa administratif (Direction / Censure) ou exportez le document au format PDF pour archivage.',
        ],
      },
      {
        title: 'Principe du suivi des séances imprimées',
        body: 'L’option « Nouvelles dates » s’appuie sur le journal des impressions précédentes pour identifier les séances ajoutées depuis votre dernier tirage. Vous pouvez à tout moment forcer la réimpression d’une période précise.',
      },
      {
        title: 'Valeur légale et conservation numérique',
        body: 'L’export PDF certifie l’état du cahier à un instant donné pour l’administration. Pour préserver les données modifiables et garantir la continuité pédagogique, réalisez également une sauvegarde numérique (JSON).',
      },
    ],
  }, {
    title: 'الطباعة والتصدير بصيغة PDF',
    summary: 'استخراج وثيقة دفتر النصوص الورقية مطابقة للمواصفات الرسمية لغايات التأشير الإداري والمراقبة التربوية.',
    keywords: 'طباعة دفتر النصوص تصدير PDF تأشير إداري تفتيش تربوي توقيع المدير الناظر المفتش ترويسة رسمية',
    sections: [
      {
        title: 'إعداد وتجهيز وثيقة الطباعة الرسمية',
        steps: [
          'افتح خيار الطباعة مباشرة من شريط أدوات دفتر نصوص القسم المعني.',
          'حدّد نطاق الطباعة المطلوب: الحصص الجديدة المنجزة منذ آخر طباعة، كامل دفتر النصوص منذ بداية الموسم، أو حيز زمني محدد.',
          'تأكد من اكتمال الترويسة الرسمية (الأكاديمية الجهوية، المديرية الإقليمية، اسم المؤسسة، اسم الأستاذ، المادة، والمستوى الدراسي) وسلامة الترقيم.',
          'عاين صفحات الوثيقة في نافذة المعاينة للتحقق من وضوح الجداول، المعادلات الرياضية، وفواصل الصفحات المنتظمة.',
          'اضغط أمر الطباعة لاستخراج النسخة الورقية الموجهة للتأشير الإداري من إدارة المؤسسة (المدير أو الناظر) ولجان التفتيش التربوي، أو احفظها بصيغة PDF.',
        ],
      },
      {
        title: 'آلية تتبع الحصص المؤرخة الجديدة',
        body: 'يرصد خيار «التواريخ الجديدة» الحصص المنجزة حديثاً التي لم يشملها أمر الطباعة السابق، مما يجنبك إعادة طباعة الصفحات المؤشرة مسبقاً من طرف إدارة المؤسسة.',
      },
      {
        title: 'الوثيقة الرسمية وحفظ البيانات',
        body: 'يُعد ملف PDF المخرَج وثيقة إثبات إدارية رسمية لسير الدروس. ولضمان إمكانية التعديل واسترجاع المعطيات مستقبلاً، احرص على تصدير ملف النسخ الاحتياطي (JSON) بانتظام.',
      },
    ],
  });
