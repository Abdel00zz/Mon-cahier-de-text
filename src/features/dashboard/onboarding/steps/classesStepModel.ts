import { formatLocalizedClassDisplayName, type ClassLevelGroupKey } from '@/constants';
import type { ClassInfo, Cycle } from '@/types';
import type { ModalLang, OnboardingCopy } from '../types';

export interface ClassesStepProps {
  classes: ClassInfo[];
  lang: ModalLang;
  copy: OnboardingCopy;
  teacherCycles?: Cycle[];
  teacherSubjects?: string[];
  onCreateClass: (details: {
    name: string;
    subject: string;
    cycle?: Cycle;
    color?: string;
  }) => unknown;
  onRemove: (classInfo: ClassInfo) => void;
  onAdvance?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}

/** Libellés courts officiels pour les puces de filières sur mobile et formulaires */
export function getShortBranchLabel(level: string, isAr: boolean): string {
  // Tronc commun
  if (level.includes('Scientifique')) return isAr ? 'ج.م.ع (TCS)' : 'TCS';
  if (level.includes('Lettres')) return isAr ? 'ج.م.آ (TCL)' : 'TCL';
  if (level.includes('Technologique')) return isAr ? 'ج.م.ت (TCT)' : 'TCT';

  // 1er Bac
  if (level === '1er Bac Sciences Expérimentales') return isAr ? 'ع. تجريبية (Sc. Exp.)' : 'Sc. Exp.';
  if (level === '1er Bac Sciences Mathématiques') return isAr ? 'ع. رياضية (SM)' : 'SM';
  if (level.includes('Lettres') || level.includes('Sciences Humaines')) return isAr ? 'آداب وع.إ (LSH)' : 'LSH';
  if (level.includes('Économiques')) return isAr ? 'ع. اقتصاد وتدبير (SEG)' : 'SEG';

  // 2ème Bac
  if (level.includes('Physiques')) return isAr ? 'ع. فيزيائية (P.C)' : 'P.C';
  if (level.includes('Vie et de la Terre')) return isAr ? 'ع.ح.أ (S.VT)' : 'S.VT';
  if (level.includes('Mathématiques A')) return isAr ? 'ع. رياضية أ (SM-A)' : 'SM-A';
  if (level.includes('Mathématiques B')) return isAr ? 'ع. رياضية ب (SM-B)' : 'SM-B';
  if (level === '2ème Bac Sciences Économiques') return isAr ? 'ع. اقتصادية (Sc. Éco)' : 'Sc. Éco';
  if (level.includes('Gestion Comptable')) return isAr ? 'تدبير محاسباتي (SGC)' : 'SGC';
  if (level === '2ème Bac Lettres') return isAr ? 'آداب' : 'Lettres';
  if (level.includes('Sciences Humaines')) return isAr ? 'ع. إنسانية (LSH)' : 'LSH';

  // Prépa
  if (level.includes('MPSI')) return 'MPSI';
  if (level.includes('PCSI')) return 'PCSI';
  if (level.includes('TSI')) return 'TSI';
  if (level.includes('ECS')) return 'ECS';
  if (level.includes('ECT')) return 'ECT';
  if (level.includes('MP')) return 'MP';
  if (level.includes('PSI')) return 'PSI';

  return formatLocalizedClassDisplayName(level, isAr ? 'ar' : 'fr');
}

export function shortBadgeFor(key: ClassLevelGroupKey): string {
  if (key === 'common') return 'TC';
  if (key === 'firstBac') return '1BAC';
  if (key === 'secondBac') return '2BAC';
  if (key === 'prepaFirst') return '1CPGE';
  return '2CPGE';
}

