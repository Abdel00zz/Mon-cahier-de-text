import { chapter } from './model';

export const math = chapter('math', ['types', 'appearance', 'troubleshooting'], {
    title: 'Écrire des formules et rechercher',
    summary: 'Saisissez vos formules en LaTeX, vérifiez leur rendu et retrouvez rapidement un contenu.',
    keywords: 'LaTeX KaTeX mathématiques formules scientifiques équations fractions bilingue RTL LTR recherche',
    sections: [
      {
        id: 'formulas', title: 'Saisie rigoureuse des expressions mathématiques',
        steps: [
          'Pour insérer une formule dans le flux du texte, encadrez-la par des dollars simples : $f(x) = ax^2 + bx + c$.',
          'Pour une formule mise en valeur centrée, utilisez des doubles dollars : $$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$.',
          'Pour les structures élaborées (systèmes, matrices, tableaux de variations), vérifiez l’équilibrage des accolades \\{...\\} et des délimiteurs.',
          'Prévisualisez le rendu avant validation pour vous assurer que les symboles s’affichent correctement à l’écran et à l’impression.',
        ],
      },
      {
        title: 'Harmonie bilingue (arabe / français)',
        body: 'Dans une interface en arabe, les énoncés scientifiques et formules en français conservent rigoureusement leur sens naturel de gauche à droite (LTR). Le moteur d’affichage garantit l’alignement typographique sans altérer les symboles scientifiques universels.',
      },
      {
        title: 'Recherche rapide de notions',
        body: 'Le champ de recherche intégré au cahier filtre instantanément les cours pour retrouver un chapitre, une formule ou un intitulé spécifique. Pensez à vider le filtre de recherche avant d’exécuter une action globale sur le cahier.',
      },
    ],
    tip: 'En cas de formule non interprétée, vérifiez l’absence d’accolade manquante et attendez le chargement complet du moteur de rendu KaTeX.',
  }, {
    title: 'كتابة الصيغ الرياضية والبحث',
    summary: 'كتابة المعادلات والرموز العلمية بدقة، التوافق بين اللغات والاتجاهات (RTL/LTR)، والبحث السريع.',
    keywords: 'رياضيات ترميز علمي معادلات صيغ LaTeX KaTeX لاتكس ماثجاكس كسور نهايات متجهات بحث',
    sections: [
      {
        id: 'formulas', title: 'كتابة الصيغ والرموز الرياضية',
        steps: [
          'لكتابة صيغة رياضية مدمجة في السطر، ضع التعبير بين علامتي دولار: $f(x) = ax^2 + bx + c$.',
          'للصيغ الرياضية المستقلة في سطر منفصل، استخدم علامتي دولار مضاعفتين: $$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$.',
          'عند كتابة الكسور والجذور والمتجهات والنظمات، تأكد من إغلاق الحاضنات \\{...\\} وتوازن المحددات الرياضية.',
          'عاين النتيجة في جدول الدفتر وفي نافذة الطباعة للتأكد من وضوح الخطوط والرموز الديداكتيكية.',
        ],
      },
      {
        title: 'التوافق اللغوي والاتجاه المزدوج (العربية والفرنسية)',
        body: 'يراعي التطبيق طبيعة تدريس المواد العلمية بالمسالك الدولية والوطنية: تظل النصوص والصيغ المكتوبة بالفرنسية من اليسار إلى اليمين (LTR) حتى في الواجهة العربية، دون أي تشويه في الرموز أو ترتيب العمليات الرياضية.',
      },
      {
        title: 'البحث والتصفية الديداكتيكية',
        body: 'يتيح محرك البحث الداخلي تصفية فورية لعناصر الدفتر بالكلمات المفتاحية (مبرهنة، نشاط، دالة...). احرص على تفريغ شريط البحث قبل تطبيق إجراءات التأريخ الجماعي لإظهار كافة عناصر المقرر.',
      },
    ],
    tip: 'إذا ظهرت الصيغة كنص خام، تأكد من سلامة صياغة أوامر LaTeX واكتمال تحميل محرك العرض الرياضي على المتصفح.',
  });
