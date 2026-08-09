import { useEffect, useMemo, useState } from 'react';
import { AppConfig, AppLocale, ClassInfo, PedagogicalEvent } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { translateLocaleMessage } from '@/i18n/LocaleProvider';
import { useRecentPastAssessments, useUpcomingAssessments } from '@/hooks/useAssessments';
import { useUpcomingOfficialStudentEvents, UpcomingOfficialStudentEvent } from '@/hooks/useOfficialStudentEvents';
import { daysBetweenISO, UpcomingAssessment } from '@/utils/assessments';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
import {
  ClassSignal,
  collectClassSignals,
  collectCrossClassSignals,
  formatDateFR,
  readIgnoredActionIds,
  sortSignals,
} from '@/utils/notificationSignals';
import { subscribe } from '@/utils/syncBus';

export interface NotificationFeed {
  /** Alertes opérationnelles, propriétaires d'une classe et affichées dans son modal i. */
  corrections: ClassSignal[];
  ignoredCorrections: ClassSignal[];
  /** Informations transversales, propriétaires du centre global. */
  insights: ClassSignal[];
  ignoredInsights: ClassSignal[];
  assessments: UpcomingAssessment[];
  pedagogicalEvents: UpcomingPedagogicalEvent[];
  officialEvents: UpcomingOfficialStudentEvent[];
  attentionCount: number;
}

export interface UpcomingPedagogicalEvent {
  classId: string;
  className: string;
  event: PedagogicalEvent;
  inDays: number;
}

export interface ClassNotificationFeed extends NotificationFeed {
  totalCount: number;
}

/**
 * Projection canonique d'une classe. Le modal i et son badge consomment cette
 * vue ; le centre global consomme séparément `insights` et `officialEvents`.
 * Une donnée peut informer deux vues, mais une alerte n'a qu'un propriétaire.
 */
export const notificationFeedForClass = (
  feed: NotificationFeed,
  classInfo: Pick<ClassInfo, 'id'>,
): ClassNotificationFeed => {
  const corrections = feed.corrections.filter(signal => signal.classId === classInfo.id);
  const ignoredCorrections = feed.ignoredCorrections.filter(signal => signal.classId === classInfo.id);
  const assessments = feed.assessments.filter(item => item.classId === classInfo.id);
  const pedagogicalEvents = feed.pedagogicalEvents.filter(item => item.classId === classInfo.id);
  const officialEvents = feed.officialEvents.filter(item => item.classIds.includes(classInfo.id));

  return {
    corrections,
    ignoredCorrections,
    insights: [],
    ignoredInsights: [],
    assessments,
    pedagogicalEvents,
    officialEvents,
    // Le badge de la carte compte uniquement les actions, jamais les simples
    // échéances : le chiffre reste petit et correspond à « À traiter ».
    attentionCount: corrections.length,
    totalCount: corrections.length + assessments.length + pedagogicalEvents.length + officialEvents.length,
  };
};

export const useNotificationFeed = (
  classes: ClassInfo[],
  config: AppConfig,
  locale: AppLocale,
): NotificationFeed => {
  const [storageVersion, setStorageVersion] = useState(0);
  const assessments = useUpcomingAssessments(classes, config, 14);
  const pastAssessments = useRecentPastAssessments(classes, config, 10);
  const officialEvents = useUpcomingOfficialStudentEvents(classes, 30);

  useEffect(() => {
    const refresh = () => setStorageVersion(version => version + 1);
    const unsubDirty = subscribe('dirty', refresh);
    const unsubPull = subscribe('pull-applied', refresh);
    const unsubNotifications = subscribe('notifications-changed', refresh);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('classData_v1_') || event.key.startsWith('editor_actions_ignored_v1_') || event.key.startsWith('editJournal_v1_') || event.key.startsWith('printMeta_v1_')) refresh();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubDirty();
      unsubPull();
      unsubNotifications();
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return useMemo(() => {
    const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);
    const classNameById = new Map(classes.map(c => [c.id, formatLocalizedClassDisplayName(c.name, locale)]));
    const today = todayInMorocco(new Date(), getBundledCalendar());
    const assessmentLabel = (item: Pick<UpcomingAssessment, 'type' | 'num'>): string => t(
      item.type === 'controle' ? 'notifications.assessment.control' : 'notifications.assessment.homework',
      { number: item.num },
    );
    const classSignals: ClassSignal[] = classes.flatMap(classInfo => collectClassSignals(classInfo, config, locale));
    const globalSignals = collectCrossClassSignals(classes, locale);

    for (const item of pastAssessments.filter(a => a.type === 'controle')) {
      const saisi = config.assessmentAbsences?.[item.classId]?.[item.id];
      if (saisi) continue;
      const id = `absences:${item.classId}:${item.id}:${item.dateISO}`;
      const whenLabel = item.daysAgo === 0
        ? t('notifications.signal.today')
        : item.daysAgo === 1
          ? t('notifications.signal.yesterday')
          : t('notifications.signal.daysAgo', { count: item.daysAgo });
      classSignals.push({
        id,
        kind: 'absences',
        action: 'evaluations',
        scope: 'class',
        classId: item.classId,
        className: classNameById.get(item.classId) ?? formatLocalizedClassDisplayName(item.className, locale),
        title: item.daysAgo === 0 ? t('notifications.signal.absenceToday') : t('notifications.signal.absencePending'),
        detail: t('notifications.signal.absenceDetail', {
          label: assessmentLabel(item),
          when: whenLabel,
          date: formatDateFR(item.dateISO),
        }),
        date: item.dateISO,
        ignored: readIgnoredActionIds(item.classId).has(id),
      });
    }

    const corrections = sortSignals(classSignals.filter(signal => !signal.ignored));
    const ignoredCorrections = sortSignals(classSignals.filter(signal => signal.ignored));
    const insights = sortSignals(globalSignals.filter(signal => !signal.ignored));
    const ignoredInsights = sortSignals(globalSignals.filter(signal => signal.ignored));
    const urgentOfficial = officialEvents.filter(item => item.inDays <= 3).length;
    const pedagogicalEvents: UpcomingPedagogicalEvent[] = classes
      .flatMap(classInfo => (config.pedagogicalEvents?.[classInfo.id] ?? []).map(event => ({ classInfo, event })))
      .filter(({ event }) => event.status === 'planned' && (event.endDate ?? event.date) >= today)
      .map(({ classInfo, event }) => ({
        classId: classInfo.id,
        className: classNameById.get(classInfo.id) ?? classInfo.name,
        event,
        inDays: Math.max(0, daysBetweenISO(today, event.date)),
      }))
      .filter(item => item.inDays <= 30)
      .sort((a, b) => a.inDays - b.inDays || a.event.title.localeCompare(b.event.title));
    return {
      corrections,
      ignoredCorrections,
      insights,
      ignoredInsights,
      assessments,
      pedagogicalEvents,
      officialEvents,
      attentionCount: insights.length + urgentOfficial,
    };
  }, [classes, config, assessments, pastAssessments, officialEvents, locale, storageVersion]);
};
