import React, { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarCheck, CalendarRange, Check, CircleAlert, Info } from '@/components/ui/icons';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotificationFeed, notificationFeedForClass } from '@/hooks/useNotificationFeed';
import { AppConfig, ClassInfo } from '@/types';
import { NextSessionInfo } from '@/utils/timetable';
import { computeClassHoursInsight } from '@/utils/scheduleInsights';
import { getLocalizedEventTitle } from '@/utils/officialStudentEvents';
import { cn } from '@/lib/utils';
import { MathText } from '@/components/ui/math-text';
import { SessionIndex } from '@/utils/sessionIndex';
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
  sessionIndex?: SessionIndex;
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
  sessionIndex,
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
  // Pour le résumé, seule la continuité pédagogique compte : le premier
  // contenu non daté est prioritaire, puis le premier contenu futur sert de
  // repli. La distinction technique « à planifier / planifié » reste cachée.
  const nextLessonTitle = sessionIndex?.toSchedule?.nextTitle
    ?? sessionIndex?.nextPlanned?.lastTitle
    ?? null;
  const isEmpty = prioritySignals.length === 0 && deadlineCount === 0;
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
      maxWidth="xl"
      hideClose={true}
      className="border-border/60 bg-background shadow-[0_24px_80px_-24px_rgba(0,0,0,0.32)] sm:max-w-[38rem] sm:rounded-[1.25rem]"
      headerClassName="border-0 bg-background px-5 pb-2 pt-8 sm:px-6 sm:pt-6"
      bodyClassName="px-5 py-3 sm:px-6"
      footerClassName="border-0 bg-background px-5 pb-5 pt-2 sm:px-6"
      title={(
        <span className={cn('flex min-w-0 items-center gap-3 text-foreground', isRtl && 'font-bold tracking-normal text-xl')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
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
            className="h-9 cursor-pointer rounded-lg bg-foreground px-5 text-xs font-semibold text-background shadow-sm transition-all hover:-translate-y-px hover:opacity-90"
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
                    'grid grid-cols-[minmax(0,1fr)_auto] items-stretch overflow-hidden rounded-xl border border-border bg-background transition-colors hover:bg-muted/50',
                    signal.kind === 'schedule'
                      ? 'border-foreground/25'
                      : 'border-border',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => resolveSignal(signal)}
                    className="grid min-w-0 w-full grid-cols-[2rem_minmax(0,1fr)] items-center gap-2.5 px-3 py-2.5 text-start transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
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
                        className="flex min-h-9 items-center rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-80"
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

        <div className="grid gap-1.5 rounded-2xl bg-muted/55 p-1.5" aria-label={t('notifications.classStatusLabel')}>
          <article className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl bg-background px-3.5 py-3 text-start shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:grid-cols-[8.75rem_minmax(0,1fr)]">
            <div className="flex items-center gap-2 pt-0.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('dashboard.lastLesson')}</span>
            </div>
            <div className="min-w-0 text-end text-[13px] leading-relaxed">
              <span className="break-words font-semibold text-foreground">
                <MathText source={sessionIndex?.previous?.lastTitle} inline>
                  {sessionIndex?.previous?.lastTitle ?? t('dashboard.none')}
                </MathText>
              </span>
              {sessionIndex?.previous?.date ? (
                <span className="ms-1.5 inline whitespace-nowrap font-mono text-[10px] font-medium text-muted-foreground">
                  · {t('dashboard.doneOn', { date: formatLastLesson(sessionIndex.previous.date, locale, t('dashboard.none')) })}
                </span>
              ) : null}
            </div>
          </article>

          <article className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl bg-background px-3.5 py-3 text-start shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:grid-cols-[8.75rem_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="flex items-center gap-2 pt-0.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('dashboard.nextSessionStatus')}</span>
              </div>
              <div className="mt-1 truncate ps-3.5 font-mono text-[9px] font-medium text-muted-foreground">
                {nextSession?.label ?? t('dashboard.none')}
              </div>
            </div>
            <div className="min-w-0 text-end text-[13px] font-semibold leading-relaxed text-foreground">
              <MathText source={nextLessonTitle} inline>
                {nextLessonTitle ?? t('dashboard.none')}
              </MathText>
            </div>
          </article>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => prioritySignals[0] && resolveSignal(prioritySignals[0])} disabled={prioritySignals.length === 0} className={cn(
            'flex min-h-[52px] min-w-0 items-center justify-between gap-2.5 rounded-xl border p-3 text-start transition-colors disabled:cursor-default disabled:opacity-70',
            prioritySignals.length > 0
              ? 'border-red-700 bg-red-600 text-white shadow-sm hover:bg-red-700 dark:border-red-500 dark:bg-red-700 dark:hover:bg-red-600'
              : 'border-border bg-background text-muted-foreground',
          )}>
            <span className="flex min-w-0 items-center gap-2 text-xs font-bold">
              <CircleAlert className="h-4 w-4 shrink-0" />
              <span className={cn('truncate', prioritySignals.length > 0 && 'animate-advanced-blink')}>{t('notifications.classNeedsAction')}</span>
            </span>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', prioritySignals.length > 0 ? 'bg-white text-red-700' : 'bg-foreground text-background')}>{prioritySignals.length}</span>
          </button>
          <button type="button" onClick={openUpcoming} disabled={deadlineCount === 0 || (!onOpenNotifications && summary.assessments.length === 0 && summary.pedagogicalEvents.length === 0)} className="flex min-h-[52px] min-w-0 items-center justify-between gap-2.5 rounded-xl border border-border bg-background p-3 text-start transition-colors hover:bg-muted/50 disabled:cursor-default disabled:opacity-70">
            <span className="flex min-w-0 items-center gap-2 text-xs font-bold">
              <CalendarCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('notifications.classUpcoming')}</span>
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{deadlineCount}</span>
          </button>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center rounded-xl border border-border bg-background px-5 py-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground">
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
                    <button type="button" onClick={openEvaluations} key={`${item.classId}-${item.id}-${item.dateISO}`} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2 text-start transition-colors hover:bg-muted/50">
                      <CalendarCheck className="h-4 w-4 shrink-0" />
                      <h4 className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {t(item.type === 'controle' ? 'notifications.assessment.control' : 'notifications.assessment.homework', { number: item.num })}
                        <span className="font-medium text-slate-500 dark:text-slate-400"> : {formatDate(item.dateISO, locale)}</span>
                      </h4>
                    </button>
                  ))}
                  {summary.pedagogicalEvents.map(item => (
                    <button type="button" onClick={openEvaluations} key={`pedagogical-${item.classId}-${item.event.id}`} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2 text-start transition-colors hover:bg-muted/50">
                      <CalendarCheck className="h-4 w-4 shrink-0" />
                      <h4 className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.event.title}<span className="font-medium text-slate-500 dark:text-slate-400"> : {formatDate(item.event.date, locale)}</span>
                      </h4>
                    </button>
                  ))}
                  {summary.officialEvents.map(item => (
                    <button type="button" onClick={openDeadlines} disabled={!onOpenNotifications} key={item.event.id} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2 text-start transition-colors hover:bg-muted/50 disabled:cursor-default">
                      <CalendarCheck className="h-4 w-4 shrink-0" />
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
                  <button type="button" onClick={() => restoreSignal(signal)} className="min-h-8 shrink-0 rounded-lg px-2 text-[10px] font-semibold text-foreground hover:bg-muted">
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
