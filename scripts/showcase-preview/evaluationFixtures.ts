import type { AppConfig, AppLocale, DevoirType, PedagogicalEventType } from '../../src/types';
import { DEVOIR_KIND_CONFIG, PEDAGOGICAL_EVENT_CONFIG } from '../../src/features/evaluations/kindCatalog';
import { translateLocaleMessage } from '../../src/i18n/messages';

/** Synthetic examples for the real tracking components, including every date state. */
export function evaluationFixtures(classId: string, locale: AppLocale): Partial<AppConfig> {
  return {
    manualAssessments: { [classId]: (Object.keys(DEVOIR_KIND_CONFIG) as DevoirType[]).map((type, index) => ({
      id: `preview-${type}`, type, num: 1, semestre: 1, schoolYear: '2026-2027',
      dateISO: index === 0 ? '' : '2026-11-06',
      ...(type === 'maison' ? { dueDateISO: '2026-11-13', correctionDateISO: '2026-11-16' } : {}),
    })) },
    pedagogicalEvents: { [classId]: (Object.keys(PEDAGOGICAL_EVENT_CONFIG) as PedagogicalEventType[]).map((type, index) => ({
      id: `preview-${type}`, type, title: translateLocaleMessage(locale, PEDAGOGICAL_EVENT_CONFIG[type].labelKey),
      date: index === 0 ? '' : '2026-11-06', endDate: type === 'soutien' ? '2026-12-04' : undefined,
      status: 'planned', createdAt: '2026-11-06T08:00:00Z',
    })) },
  };
}
