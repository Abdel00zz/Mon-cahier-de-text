import { chapter } from './model';

export const about = chapter('about', ['start', 'classes', 'devices', 'backup'], {
  title: 'À propos de l’application',
  summary: 'Découvrez Mon cahier de textes, un outil numérique conçu pour accompagner le travail des enseignants.',
  keywords: 'à propos qui sommes nous application équipe auteur conception réalisation enseignant cahier de textes',
  sections: [
    {
      title: 'Notre objectif',
      body: 'Mon cahier de textes aide les enseignants à organiser leurs classes, préparer les contenus pédagogiques et garder une trace claire du travail réalisé.',
    },
    {
      title: 'Un espace de travail réuni',
      items: [
        { term: 'Classes et élèves', detail: 'Retrouvez les informations de chaque classe et gérez les listes d’élèves.' },
        { term: 'Cours et séances', detail: 'Préparez vos contenus, associez-les à une séance et consignez le travail effectivement réalisé.' },
        { term: 'Organisation pédagogique', detail: 'Organisez l’emploi du temps, les devoirs et les évaluations, puis consultez ou imprimez votre cahier.' },
      ],
    },
    {
      title: 'Conception et réalisation',
      body: 'Application conçue et réalisée par BOUDOUH ABDELMALEK.',
    },
  ],
}, {
  title: 'من نحن',
  summary: 'تعرّف على تطبيق دفتر نصوصي والغاية من تطويره لمواكبة عمل الأستاذ.',
  keywords: 'من نحن عن التطبيق فريق المؤلف التصميم الإنجاز الأستاذ دفتر النصوص',
  sections: [
    {
      title: 'هدفنا',
      body: 'يساعد تطبيق دفتر نصوصي الأستاذ على تنظيم أقسامه، وإعداد المحتويات التربوية، وتوثيق العمل المنجز بوضوح.',
    },
    {
      title: 'فضاء عمل متكامل',
      items: [
        { term: 'الأقسام والتلاميذ', detail: 'يمكنك الاطلاع على بيانات كل قسم وتدبير لوائح التلاميذ.' },
        { term: 'الدروس والحصص', detail: 'أعدّ المحتويات، واربطها بالحصة، وسجّل العمل الذي أُنجز فعلياً.' },
        { term: 'التتبع التربوي', detail: 'نظّم استعمال الزمن والفروض والتقويمات، ثم تصفّح دفتر النصوص أو اطبعه.' },
      ],
    },
    {
      title: 'التصميم والإنجاز',
      body: 'تصميم وإنجاز التطبيق: BOUDOUH ABDELMALEK.',
    },
  ],
});
