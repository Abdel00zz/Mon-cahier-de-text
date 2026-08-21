export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: 'handwriting' | 'sans' | 'serif';
  descriptionFr: string;
  descriptionAr: string;
  sampleFr: string;
  sampleAr: string;
}

export const LATIN_FONTS: FontOption[] = [
  {
    id: 'itim',
    name: 'Itim',
    family: "'Itim', cursive, sans-serif",
    category: 'handwriting',
    descriptionFr: 'Manuscrit moderne & chaleureux (idéal cahier de textes)',
    descriptionAr: 'خط يدوي حديث ودافئ',
    sampleFr: 'Théorème de Pythagore : a² + b² = c²',
    sampleAr: 'مبرهنة فيتاغورس',
  },
  {
    id: 'kalam',
    name: 'Kalam',
    family: "'Kalam', cursive, sans-serif",
    category: 'handwriting',
    descriptionFr: 'Écriture manuscrite au feutre, claire et expressive',
    descriptionAr: 'خط قلم مدرسي واضح ومرن',
    sampleFr: 'Activité 1 : Dérivation et sens de variation',
    sampleAr: 'نشاط 1: الاشتقاق ورتابة الدوال',
  },
  {
    id: 'caveat',
    name: 'Caveat',
    family: "'Caveat', cursive, sans-serif",
    category: 'handwriting',
    descriptionFr: 'Écriture manuscrite vive, spontanée et dynamique',
    descriptionAr: 'خط يدوي عفوي وديناميكي',
    sampleFr: 'Remarque : f(x) est continue sur [0, 1]',
    sampleAr: 'ملاحظة: الدالة متصلة على المجال',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', sans-serif",
    category: 'sans',
    descriptionFr: 'Géométrique moderne, épuré et ultra-lisible',
    descriptionAr: 'هندسي عصري عالي الوضوح',
    sampleFr: 'Chapitre 4 : Calcul intégral et primitives',
    sampleAr: 'الفصل 4: الحساب التكاملي والدوال الأصلية',
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    category: 'sans',
    descriptionFr: 'Design contemporain haut de gamme, équilibre parfait',
    descriptionAr: 'تصميم واجهات معاصر فائق الدقة',
    sampleFr: 'Évaluation diagnostique : Équations différentielles',
    sampleAr: 'تقويم تشخيصي: المعادلات التفاضلية',
  },
  {
    id: 'fira',
    name: 'Fira Sans',
    family: "'Fira Sans', sans-serif",
    category: 'sans',
    descriptionFr: 'Clarté pédagogique rigoureuse pour les sciences',
    descriptionAr: 'وضوح تعليمي دقيق ومناسب للعلوم',
    sampleFr: 'Définition : Limite finie en un point',
    sampleAr: 'تعريف: نهاية منتهية عند نقطة',
  },
  {
    id: 'roboto-slab',
    name: 'Roboto Slab',
    family: "'Roboto Slab', serif",
    category: 'serif',
    descriptionFr: 'Sérif moderne solide et structuré',
    descriptionAr: 'خط ذو حواف عصري وواضح',
    sampleFr: 'Devoir surveillé N°2 : Géométrie dans l’espace',
    sampleAr: 'فرض محروس رقم 2: الهندسة الفضائية',
  },
  {
    id: 'newsreader',
    name: 'Newsreader',
    family: "'Newsreader', serif",
    category: 'serif',
    descriptionFr: 'Typographie éditoriale littéraire et académique',
    descriptionAr: 'طباعة أكاديمية أنيقة ومريحة للعين',
    sampleFr: 'Proposition : Toute fonction dérivable est continue',
    sampleAr: 'خاصية: كل دالة قابلة للاشتقاق هي متصلة',
  },
  {
    id: 'lexend',
    name: 'Lexend',
    family: "'Lexend', sans-serif",
    category: 'sans',
    descriptionFr: 'Optimisé scientifiquement pour la rapidité de lecture',
    descriptionAr: 'مصمم خصيصاً لتسهيل وتسريع القراءة',
    sampleFr: 'Exercice d’application : Matrices et systèmes',
    sampleAr: 'تمرين تطبيقي: المصفوفات والأنظمة',
  },
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', sans-serif",
    category: 'sans',
    descriptionFr: 'Standard international de précision et neutralité',
    descriptionAr: 'معيار دولي في الدقة والحياد',
    sampleFr: 'Bilan de la séance : Synthèse des acquis',
    sampleAr: 'حصيلة الحصة: تركيب المكتسبات',
  },
];

export const ARABIC_FONTS: FontOption[] = [
  {
    id: 'ibm-plex',
    name: 'IBM Plex Sans Arabic',
    family: "'IBM Plex Sans Arabic', sans-serif",
    category: 'sans',
    descriptionFr: 'Moderne, équilibré et rigoureux pour les sciences',
    descriptionAr: 'عصري، متوازن ودقيق للمواد العلمية والتربوية',
    sampleFr: 'الدوال العددية والنهايات',
    sampleAr: 'مبرهنة القيم الوسيطية وحساب النهايات',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    family: "'Cairo', sans-serif",
    category: 'sans',
    descriptionFr: 'Moderne géométrique, excellente visibilité',
    descriptionAr: 'هندسي عصري وواضح جداً على الشاشات',
    sampleFr: 'الحساب التكاملي',
    sampleAr: 'الفصل 3: الحساب التكاملي والدوال اللوغاريتمية',
  },
  {
    id: 'tajawal',
    name: 'Tajawal',
    family: "'Tajawal', sans-serif",
    category: 'sans',
    descriptionFr: 'Épuré, contemporain et fluide',
    descriptionAr: 'أنيق وانسيابي للقراءة المريحة',
    sampleFr: 'المتتاليات العددية',
    sampleAr: 'تعريف: المتتالية الحسابية والمتتالية الهندسية',
  },
  {
    id: 'amiri',
    name: 'Amiri',
    family: "'Amiri', serif",
    category: 'serif',
    descriptionFr: 'Naskh calligraphique classique et noble',
    descriptionAr: 'نسخي أصيل وأنيق مقتبس من المطبعة الأميرية',
    sampleFr: 'الهندسة الفضائية',
    sampleAr: 'خاصية: الجداء السلمي وتطبيقاته في الفضاء',
  },
  {
    id: 'alexandria',
    name: 'Alexandria',
    family: "'Alexandria', sans-serif",
    category: 'sans',
    descriptionFr: 'Design moderne géométrique arabe',
    descriptionAr: 'تصميم هندسي حديث ذو أبعاد متناسقة',
    sampleFr: 'الاحتمالات والإحصاء',
    sampleAr: 'نشاط: المتغيرات العشوائية وقانون الاحتمال',
  },
  {
    id: 'readex',
    name: 'Readex Pro',
    family: "'Readex Pro', sans-serif",
    category: 'sans',
    descriptionFr: 'Typographie ergonomique à fort contraste',
    descriptionAr: 'خط عصري مريح ومصمم للعين',
    sampleFr: 'الأعداد العقدية',
    sampleAr: 'تمرين تطبيقي: التمثيل الهندسي للأعداد العقدية',
  },
  {
    id: 'almarai',
    name: 'Almarai',
    family: "'Almarai', sans-serif",
    category: 'sans',
    descriptionFr: 'Professionnel, net et compact',
    descriptionAr: 'خط مهني رصين وواضح جداً في الجداول',
    sampleFr: 'التقويم التشخيصي',
    sampleAr: 'تقويم تشخيصي: مراجعة المكتسبات القبلية',
  },
  {
    id: 'lateef',
    name: 'Lateef',
    family: "'Lateef', serif",
    category: 'serif',
    descriptionFr: 'Style calligraphique manuscrit traditionnel',
    descriptionAr: 'خط كتابي عربي تقليدي انسيابي',
    sampleFr: 'توجيهات تربوية',
    sampleAr: 'ملاحظة للأستاذ: التركيز على العمل الجماعي',
  },
  {
    id: 'marhey',
    name: 'Marhey',
    family: "'Marhey', cursive, sans-serif",
    category: 'handwriting',
    descriptionFr: 'Style manuscrit arabe moderne et décontracté',
    descriptionAr: 'خط يدوي عربي عصري ودود',
    sampleFr: 'دفتر النصوص التفاعلي',
    sampleAr: 'فرض منزلي رقم 1: مسائل تطبيقية في الهندسة',
  },
  {
    id: 'changa',
    name: 'Changa',
    family: "'Changa', sans-serif",
    category: 'sans',
    descriptionFr: 'Design arabe contemporain à fort impact',
    descriptionAr: 'خط عربي حديث وبارز للعناوين والمحتوى',
    sampleFr: 'فرض محروس شامل',
    sampleAr: 'فرض محروس رقم 2: الجبر والتحليل',
  },
];

export const getLatinFontFamily = (id?: string): string => {
  const font = LATIN_FONTS.find(f => f.id === id);
  return font ? font.family : "'Fira Sans', sans-serif";
};

export const getArabicFontFamily = (id?: string): string => {
  const font = ARABIC_FONTS.find(f => f.id === id);
  return font ? font.family : "'IBM Plex Sans Arabic', sans-serif";
};
