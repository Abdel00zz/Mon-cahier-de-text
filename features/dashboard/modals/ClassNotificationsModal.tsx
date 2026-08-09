import React, { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Bell, CalendarCheck, CalendarRange, Check, CircleAlert, CircleCheck, Clock, Info } from '@/components/ui/icons';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotificationFeed, notificationFeedForClass } from '@/hooks/useNotificationFeed';
import { AppConfig, ClassInfo } from '@/types';
import { NextSessionInfo } from '@/utils/timetable';
import { computeClassHoursInsight } from '@/utils/scheduleInsights';
import { cn } from '@/lib/utils';

interface ClassNotificationsModalProps {
  isOpen: boolean;
  classInfo: ClassInfo | null;
  config: AppConfig;
  feed: NotificationFeed;
  lastModified: string | null | undefined;
  nextSession?: NextSessionInfo | null;
  onClose: () => void;
  onOpenCenter: (classInfo: ClassInfo) => void;
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
  onOpenCenter,
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
  const deadlineCount = summary.assessments.length + summary.officialEvents.length;
  const scheduleSignals = summary.corrections.filter(signal => signal.kind === 'schedule');
  const otherPriorities = summary.corrections.filter(signal => signal.kind !== 'schedule');
  const prioritySignals = [...scheduleSignals, ...otherPriorities];
  const isEmpty = prioritySignals.length === 0 && deadlineCount === 0;
  const scheduleIsConform = timetableInsight.deviation === 'match' && timetableInsight.officialHours !== null;

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
        <>
          <button
            type="button"
            onClick={onClose}
            className="!h-11 shrink-0 rounded-xl border border-border/80 bg-card px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground sm:!h-9 sm:px-4"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCenter(classInfo);
            }}
            className="inline-flex !h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-extrabold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:!h-9 sm:flex-none sm:px-4"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="truncate">{t('notifications.openFilteredCenter')}</span>
          </button>
        </>
      )}
    >
      <div className="space-y-2">
        {prioritySignals.length > 0 && (
          <section aria-label={t('notifications.priorities')}>
            <div className="max-h-[min(31dvh,15rem)] space-y-1.5 overflow-y-auto pe-1 overscroll-contain">
              {prioritySignals.map(signal => signal.kind === 'schedule' ? (
                <article key={signal.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-warning/30 bg-gradient-to-br from-warning/14 via-warning/8 to-card px-3 py-2.5 shadow-[0_6px_18px_rgba(180,83,9,0.08)]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/90 text-warning-strong shadow-2xs">
                    <CalendarRange className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-foreground">{signal.title}</h4>
                    <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug text-muted-foreground">{signal.detail}</p>
                  </div>
                  {onOpenSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSchedule();
                      }}
                      className="inline-flex !h-10 shrink-0 items-center gap-1.5 rounded-xl border border-warning/30 bg-card/90 px-2.5 text-[11px] font-extrabold text-warning-strong shadow-2xs transition-colors hover:border-warning/55 hover:bg-card sm:!h-8"
                      aria-label={t('schedule.openPlanner')}
                      title={t('schedule.openPlanner')}
                    >
                      <CalendarRange className="h-3 w-3" />
                      {t('schedule.complete')}
                    </button>
                  )}
                </article>
              ) : (
                <article key={signal.id} className="rounded-xl border border-border/70 bg-card/85 px-3 py-2 shadow-2xs">
                  <div className="flex items-start gap-2">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <div className="min-w-0">
                      <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-foreground">{signal.title}</h4>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{signal.detail}</p>
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
                    <article key={`${item.classId}-${item.id}-${item.dateISO}`} className="flex items-start gap-2 rounded-xl border border-border/70 bg-card/85 px-3 py-2">
                      <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-foreground">
                          {t(item.type === 'controle' ? 'notifications.assessment.control' : 'notifications.assessment.homework', { number: item.num })}
                        </h4>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{t('notifications.plannedDate', { date: formatDate(item.dateISO, locale) })}</p>
                      </div>
                    </article>
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
          <p className="rounded-xl bg-muted/55 px-3 py-2 text-[10px] font-medium text-muted-foreground">
            {t('notifications.classIgnoredCount', { count: summary.ignoredCorrections.length })}
          </p>
        )}
      </div>
    </Modal>
  );
};
