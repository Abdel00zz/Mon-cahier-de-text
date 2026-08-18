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
      maxWidth="lg"
      hideClose={false}
      className="border border-slate-200/90 dark:border-white/[0.08] bg-card/95 backdrop-blur-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.3)] sm:max-w-[42rem] sm:rounded-[32px] overflow-hidden"
      headerClassName="border-b border-slate-200/70 dark:border-white/[0.08] bg-card/70 backdrop-blur-md px-5 pb-3.5 pt-5 sm:px-7 sm:pt-6 sm:pb-4"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="border-t border-slate-200/70 dark:border-white/[0.08] bg-card/70 backdrop-blur-md px-5 py-3.5 sm:px-7 sm:py-4"
      title={(
        <div className={cn('flex min-w-0 items-center gap-3 text-foreground', isRtl && 'font-bold tracking-normal')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
            <Info className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold text-foreground sm:text-lg">
              {t('notifications.classSummaryTitle', { className: displayName })}
            </span>
            <span className="block truncate text-xs font-medium text-muted-foreground">
              {classInfo.subject ? `${classInfo.subject} · ` : ''}{t('notifications.classStatusLabel')}
            </span>
          </div>
        </div>
      )}
      description={<span className="sr-only">{t('notifications.classSummaryDescription')}</span>}
      footer={(
        <div className={cn("flex w-full items-center justify-between gap-3", isRtl && "flex-row-reverse")}>
          <button
            type="button"
            onClick={openClass}
            className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-violet-700 active:scale-[0.98] sm:h-11 sm:text-sm border border-white/15 cursor-pointer"
          >
            {t('notifications.action.openClass')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-background/80 px-4 text-xs font-semibold text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground active:scale-[0.98] sm:h-11 sm:text-sm cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        {/* ── Cartes de statut de continuité pédagogique ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Dernière séance */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-card p-4 shadow-xs transition-shadow hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('dashboard.lastLesson')}
              </span>
              {sessionIndex?.previous?.date && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-foreground">
                  {formatLastLesson(sessionIndex.previous.date, locale, t('dashboard.none'))}
                </span>
              )}
            </div>
            <div className="mt-2.5 min-w-0">
              <div className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                <MathText source={sessionIndex?.previous?.lastTitle} inline>
                  {sessionIndex?.previous?.lastTitle ?? t('dashboard.none')}
                </MathText>
              </div>
            </div>
          </div>

          {/* Prochaine séance */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-indigo-500/30 dark:border-indigo-500/25 bg-indigo-500/[0.04] p-4 shadow-xs transition-shadow hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t('dashboard.nextSessionStatus')}
              </span>
              {nextSession?.label && (
                <span className="inline-flex items-center rounded-md bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                  {nextSession.label}
                </span>
              )}
            </div>
            <div className="mt-2.5 min-w-0">
              <div className="line-clamp-2 text-sm font-bold leading-snug text-indigo-700 dark:text-indigo-300">
                <MathText source={nextLessonTitle} inline>
                  {nextLessonTitle ?? t('dashboard.none')}
                </MathText>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bannières de synthèse / alertes d'action ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => prioritySignals[0] && resolveSignal(prioritySignals[0])}
            disabled={prioritySignals.length === 0}
            className={cn(
              'group relative flex min-h-[56px] min-w-0 items-center justify-between gap-3 rounded-2xl border p-3.5 text-start transition-all duration-200 active:scale-[0.99]',
              prioritySignals.length > 0
                ? 'border-rose-500/30 bg-rose-500/[0.07] hover:bg-rose-500/[0.12] text-rose-900 dark:text-rose-100'
                : 'border-border/60 bg-card/60 text-muted-foreground opacity-75',
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                prioritySignals.length > 0 ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-muted text-muted-foreground'
              )}>
                <CircleAlert className="h-4.5 w-4.5" />
              </div>
              <span className="truncate text-xs font-bold leading-tight">
                {t('notifications.classNeedsAction')}
              </span>
            </div>
            <span className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-2xs',
              prioritySignals.length > 0 ? 'bg-rose-600 text-white dark:bg-rose-500' : 'bg-muted text-muted-foreground'
            )}>
              {prioritySignals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={openUpcoming}
            disabled={deadlineCount === 0 || (!onOpenNotifications && summary.assessments.length === 0 && summary.pedagogicalEvents.length === 0)}
            className={cn(
              'group relative flex min-h-[56px] min-w-0 items-center justify-between gap-3 rounded-2xl border p-3.5 text-start transition-all duration-200 active:scale-[0.99]',
              deadlineCount > 0
                ? 'border-emerald-500/30 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-100'
                : 'border-border/60 bg-card/60 text-muted-foreground opacity-75',
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                deadlineCount > 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
              )}>
                <CalendarCheck className="h-4.5 w-4.5" />
              </div>
              <span className="truncate text-xs font-bold leading-tight">
                {t('notifications.classUpcoming')}
              </span>
            </div>
            <span className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-2xs',
              deadlineCount > 0 ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-muted text-muted-foreground'
            )}>
              {deadlineCount}
            </span>
          </button>
        </div>

        {/* ── Signaux prioritaires à traiter ── */}
        {prioritySignals.length > 0 && (
          <section aria-label={t('notifications.priorities')} className="space-y-2">
            <h3 className="text-xs font-bold text-foreground">
              {t('notifications.priorities')}
            </h3>
            <div className="max-h-[min(32dvh,16rem)] space-y-2 overflow-y-auto pe-1 overscroll-contain">
              {prioritySignals.map(signal => (
                <article
                  key={signal.id}
                  className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-xs transition-all hover:border-border hover:shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => resolveSignal(signal)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/60 text-foreground">
                      {signal.kind === 'schedule' ? <CalendarRange className="h-4.5 w-4.5" /> : <CircleAlert className="h-4.5 w-4.5 text-rose-500" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold leading-snug text-foreground">{signal.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium leading-snug text-muted-foreground">
                        {signal.detail}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {signal.dismissible ? (
                      <button
                        type="button"
                        onClick={() => ignoreSignal(signal)}
                        className="inline-flex h-8 items-center rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {t('notifications.ignore')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => resolveSignal(signal)}
                        aria-label={`${signal.title} : ${actionLabels[signal.action]}`}
                        className="flex h-8 items-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90 active:scale-95"
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

        {/* ── Tout est à jour ── */}
        {isEmpty ? (
          <div className="flex flex-col items-center rounded-2xl border border-border/60 bg-card/60 px-5 py-6 text-center shadow-xs">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Check className="h-5 w-5 stroke-[2.5]" />
            </span>
            <h3 className="mt-2.5 text-sm font-bold text-foreground">{t('notifications.classUpToDateTitle')}</h3>
            <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-muted-foreground">{t('notifications.classUpToDateDescription')}</p>
          </div>
        ) : deadlineCount > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-foreground">{t('notifications.deadlines')}</h3>
            <div className="max-h-[min(28dvh,14rem)] space-y-1.5 overflow-y-auto pe-1 overscroll-contain">
              {summary.assessments.map(item => (
                <button
                  type="button"
                  onClick={openEvaluations}
                  key={`${item.classId}-${item.id}-${item.dateISO}`}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-2 text-start transition-all hover:bg-muted/50 hover:shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate text-xs font-bold text-foreground">
                      {t(item.type === 'controle' ? 'notifications.assessment.control' : 'notifications.assessment.homework', { number: item.num })}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-medium text-muted-foreground">
                    {formatDate(item.dateISO, locale)}
                  </span>
                </button>
              ))}
              {summary.pedagogicalEvents.map(item => (
                <button
                  type="button"
                  onClick={openEvaluations}
                  key={`pedagogical-${item.classId}-${item.event.id}`}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-2 text-start transition-all hover:bg-muted/50 hover:shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-xs font-bold text-foreground">{item.event.title}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-medium text-muted-foreground">
                    {formatDate(item.event.date, locale)}
                  </span>
                </button>
              ))}
              {summary.officialEvents.map(item => (
                <button
                  type="button"
                  onClick={openDeadlines}
                  disabled={!onOpenNotifications}
                  key={item.event.id}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-2 text-start transition-all hover:bg-muted/50 hover:shadow-xs disabled:cursor-default"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs font-bold text-foreground">{getLocalizedEventTitle(item.event, locale)}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-medium text-muted-foreground">
                    {formatDate(item.event.start, locale)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Signaux ignorés ── */}
        {summary.ignoredCorrections.length > 0 && (
          <details className="rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2 transition-colors">
            <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground hover:text-foreground">
              {t('notifications.classIgnoredCount', { count: summary.ignoredCorrections.length })}
            </summary>
            <div className="mt-2 space-y-1.5 pt-1">
              {summary.ignoredCorrections.map(signal => (
                <div key={signal.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-1.5 shadow-2xs">
                  <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{signal.title}</span>
                  <button
                    type="button"
                    onClick={() => restoreSignal(signal)}
                    className="min-h-7 shrink-0 rounded-md px-2 text-xs font-bold text-primary hover:bg-primary/10"
                  >
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
