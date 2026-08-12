/* ── Matières enseignées ──────────────────────────────────────────────────── */

import type { AppLocale } from '../types';

export const SUBJECTS = [
  'Mathématiques',
  'Physique-Chimie',
  'Sciences de la Vie et de la Terre',
  'Sciences de l’Ingénieur',
  'Sciences Économiques et Gestion',
  'Informatique',
  'Français',
  'Arabe',
  'Anglais',
  'Espagnol',
  'Allemand',
  'Philosophie',
  'Histoire-Géographie',
  'Éducation Islamique',
  'Éducation Physique et Sportive',
] as const;

const SUBJECT_DISPLAY_NAMES_AR: Readonly<Record<string, string>> = {
  'Mathématiques': 'الرياضيات',
  'Physique-Chimie': 'الفيزياء والكيمياء',
  'Sciences de la Vie et de la Terre': 'علوم الحياة والأرض',
  'Sciences de l’Ingénieur': 'علوم المهندس',
  'Sciences Économiques et Gestion': 'العلوم الاقتصادية والتدبير',
  'Informatique': 'المعلوميات',
  'Français': 'اللغة الفرنسية',
  'Arabe': 'اللغة العربية',
  'Anglais': 'اللغة الإنجليزية',
  'Espagnol': 'اللغة الإسبانية',
  'Allemand': 'اللغة الألمانية',
  'Philosophie': 'الفلسفة',
  'Histoire-Géographie': 'التاريخ والجغرافيا',
  'Éducation Islamique': 'التربية الإسلامية',
  'Éducation Physique et Sportive': 'التربية البدنية والرياضية',
  // Anciens libellés conservés pour ne pas casser les données existantes
  'Sciences Économiques': 'العلوم الاقتصادية',
  'EPS': 'التربية البدنية',
};

export const formatLocalizedSubjectDisplayName = (subject: string, locale: AppLocale): string => (
  locale === 'ar' ? (SUBJECT_DISPLAY_NAMES_AR[subject] ?? subject) : subject
);
