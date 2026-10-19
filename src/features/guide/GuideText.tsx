/** Emphasise actionable terms without interpreting user-visible text as HTML. */
const terms = [
  'Enregistrer le profil', 'Évaluation diagnostique 1', 'Paramètres → Profil',
  'Paramètres → Emploi du temps', 'Paramètres → Notifications', 'Paramètres → Apparence',
  'Paramètres → Données', 'Paramètres → Archives', 'Paramètres → Assistance',
  'emploi du temps', 'notifications système', 'synchronisation',
  'sauvegarde globale', 'remplacement', 'Élèves de la classe', 'Ajouter ou gérer les élèves',
  'Évaluations', 'Cyber Tech & Clean', 'JSON', 'LaTeX', 'KaTeX', 'PDF',
  'حفظ الملف الشخصي', 'التقويم التشخيصي 1', 'استعمال الزمن',
  'إشعارات النظام', 'المزامنة', 'النسخة الشاملة', 'الاستبدال',
  'لائحة التلاميذ', 'الإعدادات', 'الملف الشخصي',
];
const pattern = new RegExp(`(\\$\\$?[^$]+\\$\\$?|${terms.sort((a, b) => b.length - a.length)
  .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

export function GuideText({ children }: { children: string }) {
  return <>{children.split(pattern).map((part, i) => i % 2 === 0 ? part
    : part.startsWith('$') ? <code key={i} dir="ltr">{part}</code>
      : <strong key={i}>{part}</strong>)}</>;
}
