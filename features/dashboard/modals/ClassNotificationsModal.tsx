import React, { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarCheck, CalendarRange, Check, CircleAlert, CircleCheck, Clock, Info } from '@/components/ui/icons';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotificationFeed, notificationFeedForClass } from '@/hooks/useNotificationFeed';
import { AppConfig, ClassInfo } from '@/types';
import { NextSessionInfo } from '@/utils/timetable';
import { computeClassHoursInsight } from '@/utils/scheduleInsights';
import { cn } from '@/lib/utils';
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
  const actionLabel = (signal: ClassSignal): string => {
    if (signal.action === 'timetable') return t('notifications.action.schedule');
    if (signal.action === 'evaluations') return t('notifications.action.evaluations');
    return t('notifications.action.openClass');
  };
  const openEvaluations = () => {
    requestEditorModal({ classId: classInfo.id, modal: 'evaluations', expiresAt: Date.now() + 120_000 });
    onClose();
    onSelectClass(classInfo);
  };
  const resolveSignal = (signal: ClassSignal) => {
    if (signal.action === 'timetable') {
      onClose();
      onOpenSchedule?.();
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
    onClose();
    onSelectClass(classInfo);
  };
  const ignoreSignal = (signal: ClassSignal) => {
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
      className="border-border/80 bg-card/98 sm:max-w-[29rem] sm:rounded-2xl"
      headerClassName="bg-card/95 px-4 pb-2 pt-4 sm:px-5 sm:pt-5"
      bodyClassName="bg-background/45 px-4 py-2.5 sm:px-5 sm:py-3"
      footerClassName="!flex-row gap-2 bg-card/95 px-4 py-2.5 sm:px-5 sm:py-3"
      title={(
        <span className={cn('flex min-w-0 items-center gap-2.5', isRtl && 'font-ar-display text-xl tracking-normal')}>
          <Info className="h-4.5 w-4.5 shrink-0 text-primary" />
          <span className="truncate">{t('notifications.classSummaryTitle', { className: displayName })}</span>
        </span>
      )}
      description={<span className="sr-only">{t('notifications.classSummaryDescription')}</span>}
      footer={(
        <button
          type="button"
          onClick={onClose}
          className="!h-11 w-full rounded-xl border border-border/80 bg-card px-4 text-xs font-bold text-foreground transition-colors hover:border-primary/25 sm:!h-9 sm:w-auto"
        >
          {t('common.close')}
        </button>
      )}
    >
      <div className="space-y-2">
        {prioritySignals.length > 0 && (
          <section aria-label={t('notifications.priorities')}>
            <div className="max-h-[min(31dvh,15rem)] space-y-1.5 overflow-y-auto pe-1 overscroll-contain">
              {prioritySignals.map(signal => (
                <article
                  key={signal.id}
                  className={cn(
                    'grid grid-cols-[2rem_minmax(0,1fr)] gap-2.5 rounded-xl border px-3 py-2.5 shadow-2xs',
                    signal.kind === 'schedule'
                      ? 'border-warning/30 bg-gradient-to-br from-warning/14 via-warning/8 to-card'
                      : 'border-border/70 bg-card/85',
                  )}
                >
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-card/90', signal.kind === 'schedule' ? 'text-warning-strong' : 'text-red-500')}>
                    {signal.kind === 'schedule' ? <CalendarRange className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold leading-snug text-foreground">{signal.title}</h4>
                    <p className="mt-0.5 text-[10px] font-medium leading-snug text-muted-foreground">{signal.detail}</p>
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => ignoreSignal(signal)}
                        className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground sm:min-h-8"
                      >
                        {t('notifications.ignore')}
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveSignal(signal)}
                        className="inline-flex min-h-9 items-center rounded-lg bg-primary px-2.5 text-[10px] font-extrabold text-primary-foreground sm:min-h-8"
                      >
                        {actionLabel(signal)}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <dl className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card/75" aria-label={t('notifications.classStatusLabel')}>
          <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
            <dt className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold leading-tight text-muted-foreground">
              <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              {t('dashboard.nextSessionStatus')}
            </dt>
            <dd className={`min-w-0 text-end text-[11px] font-extrabold leading-snug ${nextSession?.kind === 'now' ? 'text-emerald-600 dark:text-emerald-400' : nextSession ? 'text-primary' : 'text-muted-foreground'}`}>
              {nextSession?.label ?? t('dashboard.toSchedule')}
            </dd>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
            <dt className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold leading-tight text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              {t('dashboard.lastLesson')}
            </dt>
            <dd className="min-w-0 truncate text-end font-mono text-[11px] font-bold leading-snug text-foreground">
              {formatLastLesson(lastModified, locale, t('dashboard.none'))}
            </dd>
          </div>
          {scheduleIsConform && (
            <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
              <dt className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold leading-tight text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5 shrink-0 text-success" />
                {t('schedule.statusTitle')}
              </dt>
              <dd className="flex min-w-0 items-center gap-1 text-end text-[11px] font-extrabold leading-snug text-success-strong">
                <CircleCheck className="h-3.5 w-3.5 shrink-0" />
                {t('schedule.statusMatch')}
              </dd>
            </div>
          )}
        </dl>

        <dl className="grid grid-cols-2 divide-x divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card/75">
          <div className={cn(
            'min-w-0 px-3 py-2',
            prioritySignals.length > 0
              ? 'bg-red-50/65 dark:bg-red-950/25'
              : '',
          )}>
            <dt className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold leading-tight text-muted-foreground">
              <CircleAlert className={cn('h-3.5 w-3.5', prioritySignals.length > 0 ? 'text-red-500' : 'text-primary/60')} />
              {t('notifications.classNeedsAction')}
            </dt>
            <dd className="mt-1 text-base font-extrabold leading-none text-foreground">{prioritySignals.length}</dd>
          </div>
          <div className="min-w-0 px-3 py-2">
            <dt className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold leading-tight text-muted-foreground">
              <CalendarCheck className="h-3.5 w-3.5 text-primary/70" />
              {t('notifications.classUpcoming')}
            </dt>
            <dd className="mt-1 text-base font-extrabold leading-none text-foreground">{deadlineCount}</dd>
          </div>
        </dl>

        {isEmpty ? (
          <div className="flex flex-col items-center rounded-2xl border border-border/65 bg-card/75 px-5 py-4 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </span>
            <h3 className="mt-2.5 text-sm font-extrabold text-foreground">{t('notifications.classUpToDateTitle')}</h3>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">{t('notifications.classUpToDateDescription')}</p>
          </div>
        ) : deadlineCount > 0 ? (
          <section className="max-h-[min(30dvh,15rem)] overflow-y-auto pe-1">
            <h3 className="mb-1.5 text-[11px] font-extrabold text-foreground">{t('notifications.deadlines')}</h3>
            <div className="space-y-1.5">
                  {summary.assessments.map(item => (
                    <button type="button" onClick={openEvaluations} key={`${item.classId}-${item.id}-${item.dateISO}`} className="flex w-full items-start gap-2 rounded-xl border border-border/70 bg-card/85 px-3 py-2 text-start hover:border-primary/30">
                      <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-foreground">
                          {t(item.type === 'controle' ? 'notifications.assessment.control' : 'notifications.assessment.homework', { number: item.num })}
                        </h4>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{t('notifications.plannedDate', { date: formatDate(item.dateISO, locale) })}</p>
                      </div>
                    </button>
                  ))}
                  {summary.pedagogicalEvents.map(item => (
                    <button type="button" onClick={openEvaluations} key={`pedagogical-${item.classId}-${item.event.id}`} className="flex w-full items-start gap-2 rounded-xl border border-border/70 bg-card/85 px-3 py-2 text-start hover:border-primary/30">
                      <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-foreground">{item.event.title}</h4>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{t('notifications.plannedDate', { date: formatDate(item.event.date, locale) })}</p>
                      </div>
                    </button>
                  ))}
                  {summary.officialEvents.map(item => (
                    <article key={item.event.id} className="flex items-start gap-2 rounded-xl border border-border/70 bg-card/85 px-3 py-2">
                      <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-foreground">{item.event.title}</h4>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{t('notifications.plannedDate', { date: formatDate(item.event.start, locale) })}</p>
                      </div>
                    </article>
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
                  <button type="button" onClick={() => restoreSignal(signal)} className="min-h-8 shrink-0 rounded-lg px-2 text-[10px] font-extrabold text-primary hover:bg-primary/8">
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
