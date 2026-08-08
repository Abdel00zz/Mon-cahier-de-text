import { useMemo } from 'react';
import { AppConfig, AppLocale, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { translateLocaleMessage } from '@/i18n/LocaleProvider';
import { useRecentPastAssessments, useUpcomingAssessments } from '@/hooks/useAssessments';
import { useUpcomingOfficialStudentEvents, UpcomingOfficialStudentEvent } from '@/hooks/useOfficialStudentEvents';
import { UpcomingAssessment } from '@/utils/assessments';
import {
  ClassSignal,
  collectClassSignals,
  collectCrossClassSignals,
  formatDateFR,
  readIgnoredActionIds,
  sortSignals,
} from '@/utils/notificationSignals';

export interface NotificationFeed {
  corrections: ClassSignal[];
  ignoredCorrections: ClassSignal[];
  assessments: UpcomingAssessment[];
  officialEvents: UpcomingOfficialStudentEvent[];
  attentionCount: number;
}

export const useNotificationFeed = (
  classes: ClassInfo[],
  config: AppConfig,
  locale: AppLocale,
  refreshKey = 0,
): NotificationFeed => {
  const assessments = useUpcomingAssessments(classes, config, 14);
  const pastAssessments = useRecentPastAssessments(classes, config, 10);
  const officialEvents = useUpcomingOfficialStudentEvents(classes, 30);

  return useMemo(() => {
    const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);
    const classNameById = new Map(classes.map(c => [c.id, formatClassDisplayName(c.name)]));
    const all: ClassSignal[] = [
      ...classes.flatMap(classInfo => collectClassSignals(classInfo, config, locale)),
      ...collectCrossClassSignals(classes, locale),
    ];

    for (const item of assessments.filter(a => a.inDays <= 7)) {
      const id = `dsweek:${item.classId}:${item.id}:${item.dateISO}`;
      all.push({
        id,
        kind: 'assessment-week',
        action: 'evaluations',
        classId: item.classId,
        className: classNameById.get(item.classId) ?? formatClassDisplayName(item.className),
        title: item.inDays <= 0
          ? t('notifications.signal.assessmentToday', { label: item.label.split(', Semestre ')[0] })
          : t('notifications.signal.assessmentFuture', { label: item.label.split(', Semestre ')[0], count: item.inDays }),
        detail: t('notifications.signal.assessmentDetail', { date: formatDateFR(item.dateISO) }),
        date: item.dateISO,
        ignored: readIgnoredActionIds(item.classId).has(id),
      });
    }

    for (const item of pastAssessments.filter(a => a.type === 'controle')) {
      const saisi = config.assessmentAbsences?.[item.classId]?.[item.id];
      if (saisi) continue;
      const id = `absences:${item.classId}:${item.id}:${item.dateISO}`;
      const whenLabel = item.daysAgo === 0
        ? t('notifications.signal.today')
        : item.daysAgo === 1
          ? t('notifications.signal.yesterday')
          : t('notifications.signal.daysAgo', { count: item.daysAgo });
      all.push({
        id,
        kind: 'absences',
        action: 'evaluations',
        classId: item.classId,
        className: classNameById.get(item.classId) ?? formatClassDisplayName(item.className),
        title: item.daysAgo === 0 ? t('notifications.signal.absenceToday') : t('notifications.signal.absencePending'),
        detail: t('notifications.signal.absenceDetail', {
          label: item.label.split(', Semestre ')[0],
          when: whenLabel,
          date: formatDateFR(item.dateISO),
        }),
        date: item.dateISO,
        ignored: readIgnoredActionIds(item.classId).has(id),
      });
    }

    const corrections = sortSignals(all.filter(signal => !signal.ignored));
    const ignoredCorrections = sortSignals(all.filter(signal => signal.ignored));
    const urgentOfficial = officialEvents.filter(item => item.inDays <= 3).length;
    return {
      corrections,
      ignoredCorrections,
      assessments,
      officialEvents,
      attentionCount: corrections.length + urgentOfficial,
    };
  }, [classes, config, assessments, pastAssessments, officialEvents, locale, refreshKey]);
};
