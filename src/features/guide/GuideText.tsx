/** Emphasise actionable terms without interpreting user-visible text as HTML. */
const terms = [
  'Enregistrer le profil', 'Évaluation diagnostique 1', 'Paramètres → Profil',
  'Paramètres → Emploi du temps', 'Paramètres → Notifications', 'Paramètres → Apparence',
  'Paramètres → Données', 'Paramètres → Archives', 'Paramètres → Assistance',
  'emploi du temps', 'notifications système', 'synchronisation',
  'sauvegarde globale', 'remplacement', 'Élèves de la classe', 'Ajouter ou gérer les élèves',
  'Évaluations', 'Cyber Tech & Clean', 'JSON', 'LaTeX', 'KaTeX', 'PDF',
  'cahier de textes numérique', 'progression',
  'حفظ الملف الشخصي', 'التقويم التشخيصي 1', 'استعمال الزمن',
  'إشعارات النظام', 'المزامنة', 'النسخة الشاملة', 'الاستبدال',
  'لائحة التلاميذ', 'الإعدادات', 'الملف الشخصي',
  'دفتر نصوصك الرقمي', 'تقدّم التعلمات', 'تقدم التعلمات',
  'التفتيش التربوي', 'نسخة احتياطية',
];
const escapedTerms = terms
  .sort((a, b) => b.length - a.length)
  .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const pattern = new RegExp(`(\\$\\$?[^$]+\\$\\$?|\\*\\*[^*]+\\*\\*|${escapedTerms})`, 'gi');

export function GuideText({ children }: { children: string }) {
  return (
    <>
      {children.split(pattern).map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith('$')) return <code key={i} dir="ltr">{part}</code>;
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        return <strong key={i}>{part}</strong>;
      })}
    </>
  );
}
