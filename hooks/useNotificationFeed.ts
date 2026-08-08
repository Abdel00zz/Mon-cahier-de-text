import { useMemo } from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
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
  refreshKey = 0,
): NotificationFeed => {
  const assessments = useUpcomingAssessments(classes, config, 14);
  const pastAssessments = useRecentPastAssessments(classes, config, 10);
  const officialEvents = useUpcomingOfficialStudentEvents(classes, 30);

  return useMemo(() => {
    const classNameById = new Map(classes.map(c => [c.id, formatClassDisplayName(c.name)]));
    const all: ClassSignal[] = [
      ...classes.flatMap(classInfo => collectClassSignals(classInfo, config)),
      ...collectCrossClassSignals(classes),
    ];

    for (const item of assessments.filter(a => a.inDays <= 7)) {
      const id = `dsweek:${item.classId}:${item.id}:${item.dateISO}`;
      all.push({
        id,
        kind: 'assessment-week',
        action: 'evaluations',
        classId: item.classId,
        className: classNameById.get(item.classId) ?? formatClassDisplayName(item.className),
        title: `${item.label.split(', Semestre ')[0]} ${item.inDays <= 0 ? "aujourd'hui" : item.inDays === 1 ? 'demain' : `dans ${item.inDays} jours`}`,
        detail: `Prévu le ${formatDateFR(item.dateISO)}, préparez le sujet et vérifiez la date depuis les évaluations de la classe.`,
        date: item.dateISO,
        ignored: readIgnoredActionIds(item.classId).has(id),
      });
    }

    for (const item of pastAssessments.filter(a => a.type === 'controle')) {
      const saisi = config.assessmentAbsences?.[item.classId]?.[item.id];
      if (saisi) continue;
      const id = `absences:${item.classId}:${item.id}:${item.dateISO}`;
      const whenLabel = item.daysAgo === 0 ? "aujourd'hui" : item.daysAgo === 1 ? 'hier' : `il y a ${item.daysAgo} jours`;
      all.push({
        id,
        kind: 'absences',
        action: 'evaluations',
        classId: item.classId,
        className: classNameById.get(item.classId) ?? formatClassDisplayName(item.className),
        title: item.daysAgo === 0 ? 'Absents du devoir du jour à consigner' : 'Absents du devoir à consigner',
        detail: `${item.label.split(', Semestre ')[0]} ${whenLabel} (${formatDateFR(item.dateISO)}), saisissez les élèves absents dès la séance, même « aucun absent » compte.`,
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
  }, [classes, config, assessments, pastAssessments, officialEvents, refreshKey]);
};
