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
  /** Alertes opérationnelles rattachées à une classe, reprises par les cartes et le bandeau du tableau de bord. */
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

interface UpcomingPedagogicalEvent {
  classId: string;
  className: string;
  event: PedagogicalEvent;
  inDays: number;
}

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
    const unsubConfig = subscribe('config-changed', refresh);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'appConfig_v1' || event.key.startsWith('classData_v1_') || event.key.startsWith('editor_actions_ignored_v1_') || event.key.startsWith('editJournal_v1_') || event.key.startsWith('printMeta_v1_')) refresh();
    };
    /*
     * Le retour au premier plan ne modifie rien par lui-même : les écritures
     * locales passent par le syncBus et celles d'un autre onglet par `storage`.
     * Seul le changement de JOUR peut invalider le calcul (séances manquées,
     * devoirs à venir, dates dépassées). On ne recalcule donc que dans ce cas,
     * au lieu de reparser tous les cahiers à chaque bascule d'application.
     */
    let lastComputedDay = todayInMorocco(new Date(), getBundledCalendar());
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const today = todayInMorocco(new Date(), getBundledCalendar());
      if (today === lastComputedDay) return;
      lastComputedDay = today;
      refresh();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubDirty();
      unsubPull();
      unsubNotifications();
      unsubConfig();
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return useMemo(() => {
    const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);
    const classNameById = new Map(classes.map(c => [c.id, formatLocalizedClassDisplayName(c.name, locale)]));
    const today = todayInMorocco(new Date(), getBundledCalendar());
    const inAppEnabled = config.notificationSettings?.enabled ?? true;
    const assessmentLabel = (item: Pick<UpcomingAssessment, 'type' | 'num'>): string => t(
      item.type === 'controle' ? 'notifications.assessment.control' : 'notifications.assessment.homework',
      { number: item.num },
    );
    // Le réglage « Alertes dans l'application » coupe réellement les signaux
    // et leur badge d'attention. Le calendrier et les échéances restent
    // consultables : ce sont des données, pas des interruptions.
    const classSignals: ClassSignal[] = inAppEnabled
      ? classes.flatMap(classInfo => collectClassSignals(classInfo, config, locale))
      : [];
    const globalSignals = inAppEnabled ? collectCrossClassSignals(classes, locale) : [];

    // Un seul Set par classe : plusieurs devoirs d'une même classe partageaient
    // la même mémoire « ignoré », reconstruite à chaque itération.
    const ignoredByClass = new Map<string, Set<string>>();
    const ignoredFor = (classId: string): Set<string> => {
      let set = ignoredByClass.get(classId);
      if (!set) {
        set = readIgnoredActionIds(classId);
        ignoredByClass.set(classId, set);
      }
      return set;
    };

    for (const item of (inAppEnabled ? pastAssessments : []).filter(a => a.type === 'controle')) {
      const saisi = config.assessmentAbsences?.[item.classId]?.[item.id]
        ?? (item.legacyId ? config.assessmentAbsences?.[item.classId]?.[item.legacyId] : undefined);
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
        dismissible: true,
        ignored: ignoredFor(item.classId).has(id),
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
      attentionCount: inAppEnabled ? insights.length + urgentOfficial : 0,
    };
  }, [classes, config, assessments, pastAssessments, officialEvents, locale, storageVersion]);
};
