import React, { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarCheck, CalendarRange, Check, CircleAlert, CircleCheck, Clock, Info } from '@/components/ui/icons';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotificationFeed, notificationFeedForClass } from '@/hooks/useNotificationFeed';
import { AppConfig, ClassInfo } from '@/types';
import { NextSessionInfo } from '@/utils/timetable';
import { computeClassHoursInsight } from '@/utils/scheduleInsights';
import { getLocalizedEventTitle } from '@/utils/officialStudentEvents';
import { cn } from '@/lib/utils';
import { requestNotificationsAxis } from '@/utils/notificationNavigation';
import {
  ClassSignal,
  readIgnoredActionIds,
  requestEditorModal,
  requestSessionFocus,
  writeIgnoredActionIds,
} from '@/utils/notificationSignals';

interface ClassNotificationsModalProps {
  isOpen: boolean;
  classInfo: ClassInfo | null;
  config: AppConfig;
  feed: NotificationFeed;
  lastModified: string | null | undefined;
  nextSession?: NextSessionInfo | null;
  onClose: () => void;
  onSelectClass: (classInfo: ClassInfo) => void;
  onOpenSchedule?: () => void;
  onOpenNotifications?: () => void;
}

const dateLocale = (locale: string): string => locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR';

const formatDate = (iso: string, locale: string): string => {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(dateLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const formatLastLesson = (dateString: string | null | undefined, locale: string, emptyLabel: string): string => {
  if (!dateString) return emptyLabel;
  try {
    const date = new Date(dateString);
    const corrected = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return corrected.toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' });
  } catch {
    return '---';
  }
};

export const ClassNotificationsModal: React.FC<ClassNotificationsModalProps> = ({
  isOpen,
  classInfo,
  config,
  feed,
  lastModified,
  nextSession,
  onClose,
  onSelectClass,
  onOpenSchedule,
  onOpenNotifications,
}) => {
  const { locale, t, isRtl } = useLocale();
  const summary = useMemo(
    () => classInfo ? notificationFeedForClass(feed, classInfo) : null,
    [classInfo, feed],
  );
  const timetableInsight = useMemo(
    () => classInfo ? computeClassHoursInsight(classInfo, config.timetable) : null,
    [classInfo, config.timetable],
  );

  if (!classInfo || !summary || !timetableInsight) return null;

  const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
  const deadlineCount = summary.assessments.length + summary.pedagogicalEvents.length + summary.officialEvents.length;
  const scheduleSignals = summary.corrections.filter(signal => signal.kind === 'schedule');
  const otherPriorities = summary.corrections.filter(signal => signal.kind !== 'schedule');
  const prioritySignals = [...scheduleSignals, ...otherPriorities];
  const isEmpty = prioritySignals.length === 0 && deadlineCount === 0;
  const scheduleIsConform = timetableInsight.deviation === 'match' && timetableInsight.officialHours !== null;
  const actionLabels: Record<ClassSignal['action'], string> = {
    class: t('notifications.action.openClass'),
    timetable: t('notifications.action.schedule'),
    evaluations: t('notifications.action.evaluations'),
    export: t('notifications.action.export'),
  };

  const openEvaluations = () => {
    requestEditorModal({ classId: classInfo.id, modal: 'evaluations', expiresAt: Date.now() + 120_000 });
    onClose();
    onSelectClass(classInfo);
  };
  const openClass = () => {
    onClose();
    onSelectClass(classInfo);
  };
  const openSchedule = () => {
    if (!onOpenSchedule) return;
    onClose();
    onOpenSchedule();
  };
  const openDeadlines = () => {
    if (!onOpenNotifications) return;
    requestNotificationsAxis('echeances');
    onClose();
    onOpenNotifications();
  };
  const openUpcoming = () => {
    if (summary.assessments.length > 0 || summary.pedagogicalEvents.length > 0) {
      openEvaluations();
      return;
    }
    openDeadlines();
  };
  const resolveSignal = (signal: ClassSignal) => {
    if (signal.action === 'timetable') {
      openSchedule();
      return;
    }
    if (signal.action === 'evaluations') {
      openEvaluations();
      return;
    } else if (signal.kind === 'date' && signal.targetIndices && signal.date) {
      requestSessionFocus({
        classId: classInfo.id,
        targetIndices: signal.targetIndices,
        expiresAt: Date.now() + 120_000,
        message: t('notifications.focusDate', { date: formatDate(signal.date, locale) }),
      });
    }
    openClass();
  };
  const ignoreSignal = (signal: ClassSignal) => {
    if (!signal.dismissible) return;
    const ids = readIgnoredActionIds(classInfo.id);
    ids.add(signal.id);
    writeIgnoredActionIds(classInfo.id, ids);
  };
  const restoreSignal = (signal: ClassSignal) => {
    const ids = readIgnoredActionIds(classInfo.id);
    ids.delete(signal.id);
    writeIgnoredActionIds(classInfo.id, ids);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      hideClose={true}
      className="border-border bg-card shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)] sm:max-w-[29rem] sm:rounded-[28px]"
      headerClassName="border-b border-border bg-muted/50 px-5 pb-3 pt-8 sm:pt-5"
      bodyClassName="px-5 py-4"
      footerClassName="border-t border-border bg-muted/50 px-5 py-3"
      title={(
        <span className={cn('flex min-w-0 items-center gap-3 text-foreground', isRtl && 'font-bold tracking-normal text-xl')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#eeaaff] text-[#423ed8] shadow-sm">
            <Info className="h-5 w-5" />
          </div>
          <span className="truncate text-base font-bold sm:text-lg">{t('notifications.classSummaryTitle', { className: displayName })}</span>
        </span>
      )}
      description={<span className="sr-only">{t('notifications.classSummaryDescription')}</span>}
      footer={(
        <div className={cn("flex w-full items-center justify-end gap-2", isRtl && "justify-start")}>
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-full border border-border bg-muted px-6 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-secondary active:scale-95"
          >
            {t('common.close')}
          </button>
        </div>
      )}
    >
      <div className="space-y-3">
        {prioritySignals.length > 0 && (
          <section aria-label={t('notifications.priorities')}>
            <div className="max-h-[min(31dvh,15rem)] space-y-2 overflow-y-auto pe-1 overscroll-contain">
              {prioritySignals.map(signal => (
                <article
                  key={signal.id}
                  className={cn(
                    'grid grid-cols-[minmax(0,1fr)_auto] items-stretch overflow-hidden rounded-[20px] border border-white/55 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md dark:border-white/10',
                    signal.kind === 'schedule'
                      ? 'bg-amber-50/65 dark:bg-amber-950/35'
                      : 'bg-white/[0.52] dark:bg-slate-900/[0.52]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => resolveSignal(signal)}
                    className="grid min-w-0 w-full grid-cols-[2rem_minmax(0,1fr)] items-center gap-2.5 px-3 py-2.5 text-start transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                  >
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', signal.kind === 'schedule' ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300')}>
                      {signal.kind === 'schedule' ? <CalendarRange className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold leading-snug text-foreground">{signal.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        {signal.detail}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center px-2">
                    {signal.dismissible ? (
                      <button
                        type="button"
                        onClick={() => ignoreSignal(signal)}
                        className="inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        {t('notifications.ignore')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => resolveSignal(signal)}
                        aria-label={`${signal.title} : ${actionLabels[signal.action]}`}
                        className="flex min-h-9 items-center rounded-full bg-amber-500 px-3 text-xs font-bold text-white transition-all hover:bg-amber-600 active:scale-95"
                      >
                        {actionLabels[signal.action]}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {nextSession === null ? (
          /* Emploi du temps à compléter : volontairement SANS cadre ni fond. */
          <p
            className="flex min-h-11 w-full items-center justify-between gap-3 px-1 text-start text-xs font-bold text-muted-foreground"
            aria-label={t('dashboard.nextSessionStatus')}
          >
            <span className="flex shrink-0 items-center gap-2">
              <CalendarCheck className="h-4 w-4 shrink-0 text-[#423ed8]" />
              {t('dashboard.nextSessionStatus')}
            </span>
            <span className="min-w-0 text-end font-extrabold text-warning-strong">
              {t('dashboard.toSchedule')}
            </span>
          </p>
        ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-[20px] border border-border/60 bg-muted/20 text-slate-900 shadow-sm dark:text-slate-100" aria-label={t('notifications.classStatusLabel')}>
          <div className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-start">
            <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <CalendarCheck className="h-4 w-4 shrink-0 text-[#423ed8]" />
              {t('dashboard.nextSessionStatus')}
            </span>
            <span className={`min-w-0 text-end text-xs font-extrabold ${nextSession?.kind === 'now' ? 'text-[#423ed8]' : 'text-[#423ed8]'}`}>
              {nextSession?.label}
            </span>
          </div>
          <div className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-start">
            <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Clock className="h-4 w-4 shrink-0 text-[#423ed8]" />
              {t('dashboard.lastLesson')}
            </span>
            <span className="min-w-0 truncate text-end font-mono text-xs font-bold text-foreground">
              {formatLastLesson(lastModified, locale, t('dashboard.none'))}
            </span>
          </div>
          {scheduleIsConform && (
            <div className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-start">
              <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                <CalendarRange className="h-4 w-4 shrink-0 text-[#423ed8] dark:text-[#98e3ff]" />
                {t('schedule.statusTitle')}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-end text-xs font-extrabold text-[#423ed8] dark:text-[#98e3ff]">
                <CircleCheck className="h-4 w-4 shrink-0" />
                {t('schedule.statusMatch')}
              </span>
            </div>
          )}
        </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => prioritySignals[0] && resolveSignal(prioritySignals[0])} disabled={prioritySignals.length === 0} className={cn(
            'flex min-h-[52px] min-w-0 items-center justify-between gap-2.5 rounded-2xl border p-3 text-start transition-all duration-200 disabled:cursor-default disabled:opacity-80',
            prioritySignals.length > 0
              ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 hover:bg-red-100/70'
              : 'border-white/60 bg-white/[0.5] text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/[0.5] dark:text-slate-300',
          )}>
            <span className="flex min-w-0 items-center gap-2 text-xs font-bold">
              <CircleAlert className={cn('h-4 w-4 shrink-0', prioritySignals.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400')} />
              <span className="truncate">{t('notifications.classNeedsAction')}</span>
            </span>
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/60 dark:text-red-200">{prioritySignals.length}</span>
          </button>
          <button type="button" onClick={openUpcoming} disabled={deadlineCount === 0 || (!onOpenNotifications && summary.assessments.length === 0 && summary.pedagogicalEvents.length === 0)} className="flex min-h-[52px] min-w-0 items-center justify-between gap-2.5 rounded-2xl border border-white/60 bg-white/[0.5] p-3 text-start shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/75 dark:border-white/10 dark:bg-slate-900/[0.5] dark:text-slate-300 disabled:cursor-default disabled:opacity-80">
            <span className="flex min-w-0 items-center gap-2 text-xs font-bold">
              <CalendarCheck className="h-4 w-4 shrink-0 text-[#423ed8]" />
              <span className="truncate">{t('notifications.classUpcoming')}</span>
            </span>
            <span className="shrink-0 rounded-full bg-[#eeaaff] px-2 py-0.5 text-xs font-bold text-[#423ed8]">{deadlineCount}</span>
          </button>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center rounded-[20px] border border-white/60 bg-white/[0.52] px-5 py-4 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/[0.5]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeaaff] text-[#423ed8] dark:bg-[#423ed8]/20 dark:text-[#98e3ff]">
              <Check className="h-5 w-5" />
            </span>
            <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{t('notifications.classUpToDateTitle')}</h3>
            <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('notifications.classUpToDateDescription')}</p>
          </div>
        ) : deadlineCount > 0 ? (
          <section className="max-h-[min(30dvh,15rem)] overflow-y-auto pe-1">
            <h3 className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">{t('notifications.deadlines')}</h3>
            <div className="space-y-1.5">
                  {summary.assessments.map(item => (
                    <button type="button" onClick={openEvaluations} key={`${item.classId}-${item.id}-${item.dateISO}`} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-white/60 bg-white/[0.52] px-3.5 py-2 text-start shadow-sm backdrop-blur-xl transition-all hover:border-sky-500/40 hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/[0.5] dark:hover:bg-slate-800/65">
                      <CalendarCheck className="h-4 w-4 shrink-0 text-[#423ed8]" />
                      <h4 className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {t(item.type === 'controle' ? 'notifications.assessment.control' : 'notifications.assessment.homework', { number: item.num })}
                        <span className="font-medium text-slate-500 dark:text-slate-400"> : {formatDate(item.dateISO, locale)}</span>
                      </h4>
                    </button>
                  ))}
                  {summary.pedagogicalEvents.map(item => (
                    <button type="button" onClick={openEvaluations} key={`pedagogical-${item.classId}-${item.event.id}`} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-white/60 bg-white/[0.52] px-3.5 py-2 text-start shadow-sm backdrop-blur-xl transition-all hover:border-sky-500/40 hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/[0.5] dark:hover:bg-slate-800/65">
                      <CalendarCheck className="h-4 w-4 shrink-0 text-[#423ed8]" />
                      <h4 className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.event.title}<span className="font-medium text-slate-500 dark:text-slate-400"> : {formatDate(item.event.date, locale)}</span>
                      </h4>
                    </button>
                  ))}
                  {summary.officialEvents.map(item => (
                    <button type="button" onClick={openDeadlines} disabled={!onOpenNotifications} key={item.event.id} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-white/60 bg-white/[0.52] px-3.5 py-2 text-start shadow-sm backdrop-blur-xl transition-all hover:border-sky-500/40 hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/[0.5] dark:hover:bg-slate-800/65 disabled:cursor-default">
                      <CalendarCheck className="h-4 w-4 shrink-0 text-[#423ed8]" />
                      <h4 className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {getLocalizedEventTitle(item.event, locale)}<span className="font-medium text-slate-500 dark:text-slate-400"> : {formatDate(item.event.start, locale)}</span>
                      </h4>
                    </button>
                  ))}
            </div>
          </section>
        ) : null}

        {summary.ignoredCorrections.length > 0 && (
          <details className="rounded-xl border border-border/65 bg-muted/35 px-3 py-2">
            <summary className="cursor-pointer text-[10px] font-bold text-muted-foreground">
              {t('notifications.classIgnoredCount', { count: summary.ignoredCorrections.length })}
            </summary>
            <div className="mt-2 space-y-1.5">
              {summary.ignoredCorrections.map(signal => (
                <div key={signal.id} className="flex items-center justify-between gap-2 rounded-lg bg-card/80 px-2.5 py-2">
                  <span className="min-w-0 truncate text-[10px] font-semibold text-muted-foreground">{signal.title}</span>
                  <button type="button" onClick={() => restoreSignal(signal)} className="min-h-8 shrink-0 rounded-lg px-2 text-[10px] font-extrabold text-[#423ed8] hover:bg-[#eeaaff]/50">
                    {t('notifications.restore')}
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </Modal>
  );
};
