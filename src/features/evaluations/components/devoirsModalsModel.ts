import type { AppConfig, AppLocale, ClassInfo } from '@/types';
import type { AssessmentLink } from '@/domain/evaluations/assessmentSync';
import type { useEvaluationActions } from '../hooks/useEvaluationActions';
import type { useEvaluationModals } from '../hooks/useEvaluationModals';

export const formatLongDate = (iso: string, locale: AppLocale): string => {
  if (!iso) return '—';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
};

export interface DevoirsModalsProps {
  classInfo: ClassInfo;
  classDisplayName: string;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  modals: ReturnType<typeof useEvaluationModals>;
  actions: ReturnType<typeof useEvaluationActions>;
  deletePedagogicalEvent: (id: string) => void;
  deleteAssessment: (id: string) => void;
  deleteHomeworkCorrection: (link: AssessmentLink) => void;
}
