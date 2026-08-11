/* ── Matières enseignées ──────────────────────────────────────────────────── */

import type { AppLocale } from '../types';

export const SUBJECTS = [
  'Mathématiques',
  'Physique-Chimie',
  'Sciences de la Vie et de la Terre',
  'Sciences Économiques',
  'Français',
  'Arabe',
  'Anglais',
  'Philosophie',
  'Histoire-Géographie',
  'Éducation Islamique',
  'Informatique',
  'EPS',
] as const;

const SUBJECT_DISPLAY_NAMES_AR: Readonly<Record<string, string>> = {
  'Mathématiques': 'الرياضيات',
  'Physique-Chimie': 'الفيزياء والكيمياء',
  'Sciences de la Vie et de la Terre': 'علوم الحياة والأرض',
  'Sciences Économiques': 'العلوم الاقتصادية',
  'Français': 'اللغة الفرنسية',
  'Arabe': 'اللغة العربية',
  'Anglais': 'اللغة الإنجليزية',
  'Philosophie': 'الفلسفة',
  'Histoire-Géographie': 'التاريخ والجغرافيا',
  'Éducation Islamique': 'التربية الإسلامية',
  'Informatique': 'المعلوميات',
  'EPS': 'التربية البدنية',
};

export const formatLocalizedSubjectDisplayName = (subject: string, locale: AppLocale): string => (
  locale === 'ar' ? (SUBJECT_DISPLAY_NAMES_AR[subject] ?? subject) : subject
);
