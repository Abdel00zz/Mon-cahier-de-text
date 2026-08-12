import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { useLocale } from '@/i18n/LocaleProvider';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CircleAlert,
  Clock,
  Database,
  GraduationCap,
  History,
  PieChart,
  Undo2,
  User,
  Users,
  ChevronRight,
  ArrowLeft,
} from '@/components/ui/icons';
import { computeProgressionStats } from '@/utils/progression';
import { getNewDates, readPrintMeta } from '@/utils/printMeta';
import { JournalEntry, opLabel, readJournal, timeAgo } from '@/utils/journal';
import {
  ClassSignal,
  readClassLessons,
  readIgnoredActionIds,
  requestEditorModal,
  requestSessionFocus,
  writeIgnoredActionIds,
} from '@/utils/notificationSignals';
import { consumeNotificationsAxis, type NotificationsAxisId } from '@/utils/notificationNavigation';
import { NotificationCalendar } from './NotificationCalendar';
import { NotificationFeed } from '@/hooks/useNotificationFeed';

const SIGNAL_FALLBACK_ICON: Record<ClassSignal['kind'], React.ComponentType<{ className?: string }>> = {
  'date': CalendarCheck,
  'missed-session': Clock,
  'assessment-week': CalendarCheck,
  'absences': User,
  'never-started': BookOpen,
  'schedule': CalendarRange,
  'progress-gap': PieChart,
  'backup': Database,
};

const ClassIdentityIcon: React.FC<{
  classInfo?: ClassInfo;
  fallback: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}> = ({ classInfo, fallback: FallbackIcon, compact = false }) => {
  const visual = classInfo ? getClassVisual(classInfo.name) : null;
  const Icon = classInfo ? Users : FallbackIcon;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        compact ? 'h-7 w-7' : 'h-9 w-9',
        visual?.iconSurfaceClass ?? 'bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300'
      )}
      aria-hidden
    >
      <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </span>
  );
};

const SignalCard: React.FC<{
  signal: ClassSignal;
  classInfo?: ClassInfo;
  actionLabel: string;
  ignoreLabel: string;
  mustResolveLabel: string;
  onIgnore: () => void;
  onResolve: () => void;
}> = ({ signal, classInfo, actionLabel, ignoreLabel, mustResolveLabel, onIgnore, onResolve }) => {
  const visual = classInfo ? getClassVisual(classInfo.name) : null;

  return (
    <article className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-3.5 text-card-foreground shadow-2xs transition-colors hover:border-[#423ed8]/35 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <ClassIdentityIcon classInfo={classInfo} fallback={SIGNAL_FALLBACK_ICON[signal.kind]} />
        <div className="min-w-0">
          {signal.className && (
            <p className={cn('mb-0.5 text-[10px] font-bold uppercase tracking-wide', visual?.iconClass ?? 'text-muted-foreground')}>
              {signal.className}
            </p>
          )}
          <h3 className="truncate text-xs font-bold text-foreground">{signal.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{signal.detail}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 pt-2 sm:pt-0">
        {signal.dismissible && (
          <button type="button" onClick={onIgnore} className="h-7 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
            {ignoreLabel}
          </button>
        )}
        <button type="button" onClick={onResolve} className="h-7 rounded-lg bg-[#423ed8] px-3 text-xs font-bold text-[#423ed8]-foreground transition-colors hover:bg-[#322ebd]">
          {actionLabel}
        </button>
      </div>
    </article>
  );
};

const EmptyState: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#eeaaff]/50 text-[#423ed8]/65">
      <Check className="h-6 w-6" />
    </div>
    <h3 className="text-sm font-bold text-foreground">{title}</h3>
    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
  </div>
);

type AxisId = NotificationsAxisId;

interface AxisMenuItem {
  id: AxisId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  group: 'alerts' | 'planning' | 'history';
  emphasize?: boolean;
}

interface ClassOverview {
  classInfo: ClassInfo;
  className: string;
  completionRate: number;
  sessionsCount: number;
  lastDate: string | null;
  toPrintCount: number;
  lastPrintedAt: string | null;
}

interface ActivityEntry extends JournalEntry {
  classId: string;
  className: string;
}

type ActivityFilter = 'all' | 'content' | 'dates' | 'structure';

interface GroupedActivityEntry extends ActivityEntry {
  oldestAt: string;
  count: number;
}

const activityCategory = (op: string): Exclude<ActivityFilter, 'all'> => {
  if (op.includes('date')) return 'dates';
  if (/add-|delete|reorder|manage|import|export/.test(op)) return 'structure';
  return 'content';
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

const localeCode = (locale: AppLocale): string => locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR';

const formatLocalizedDate = (iso: string, locale: AppLocale): string => {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeCode(locale), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const dayLabel = (iso: string, locale: AppLocale, t: Translate): string => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return t('notifications.signal.today');
  if (sameDay(date, yesterday)) return t('notifications.signal.yesterday');
  return date.toLocaleDateString(localeCode(locale), { weekday: 'long', day: 'numeric', month: 'long' });
};

const groupActivityEntries = (entries: ActivityEntry[]): GroupedActivityEntry[] => {
  const groups: GroupedActivityEntry[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    const closeInTime = last && Math.abs(new Date(last.oldestAt).getTime() - new Date(entry.at).getTime()) <= 5 * 60_000;
    if (last && last.op === entry.op && last.classId === entry.classId && new Date(last.at).toDateString() === new Date(entry.at).toDateString() && closeInTime) {
      last.count += 1;
      last.oldestAt = entry.at;
    } else {
      groups.push({ ...entry, oldestAt: entry.at, count: 1 });
    }
  }
  return groups;
};

const timeRangeLabel = (entry: GroupedActivityEntry, locale: AppLocale): string => {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const latest = new Date(entry.at).toLocaleTimeString(localeCode(locale), options);
  if (entry.count === 1) return latest;
  const oldest = new Date(entry.oldestAt).toLocaleTimeString(localeCode(locale), options);
  return `${oldest}–${latest}`;
};

const ACTIVITY_FILTERS: ActivityFilter[] = ['all', 'content', 'dates', 'structure'];

const delayLabel = (inDays: number, t: Translate): string => {
  if (inDays <= 0) return t('notifications.relative.today');
  if (inDays === 1) return t('notifications.relative.tomorrow');
  return t('notifications.relative.inDays', { count: inDays });
};

interface NotificationsPageProps {
  classes: ClassInfo[];
  config: AppConfig;
  feed: NotificationFeed;
  onSelectClass: (classInfo: ClassInfo) => void;
  onOpenSettings: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  classes,
  config,
  feed,
  onSelectClass,
  onOpenSettings,
}) => {
  const { locale, t, isRtl } = useLocale();
  const titleFontClass = isRtl ? 'font-bold tracking-normal text-xl leading-tight' : 'font-bold tracking-tight';
  const [requestedAxis] = useState<AxisId | null>(() => consumeNotificationsAxis());
  const [activeAxis, setActiveAxis] = useState<AxisId>(() => requestedAxis ?? 'priorites');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [mobileSubViewOpen, setMobileSubViewOpen] = useState(requestedAxis !== null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Le centre global ne consomme que les insights transversaux. Les alertes
  // opérationnelles et les évaluations d'une classe appartiennent à son modal i.
  const corrections = feed.insights;
  const ignoredCorrections = feed.ignoredInsights;
  const officialEvents = feed.officialEvents;
  const classById = useMemo(() => new Map(classes.map((classInfo) => [classInfo.id, classInfo])), [classes]);
  const actionLabels: Record<ClassSignal['action'], string> = {
    class: t('notifications.action.openClass'),
    timetable: t('notifications.action.schedule'),
    evaluations: t('notifications.action.evaluations'),
    export: t('notifications.action.export'),
  };

  const classOverviews = useMemo<ClassOverview[]>(() => classes.map(classInfo => {
    const lessons = readClassLessons(classInfo.id);
    const stats = computeProgressionStats(lessons);
    const printMeta = readPrintMeta(classInfo.id);
    return {
      classInfo,
      className: formatLocalizedClassDisplayName(classInfo.name, locale),
      completionRate: stats.completionRate,
      sessionsCount: stats.sessionsCount,
      lastDate: stats.lastDate,
      toPrintCount: getNewDates(lessons, classInfo.id).length,
      lastPrintedAt: printMeta.lastPrintedAt,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [classes, feed, locale]);

  const allActivityEntries = useMemo<ActivityEntry[]>(() => classes
    .flatMap(classInfo => readJournal(classInfo.id).map(entry => ({
      ...entry,
      classId: classInfo.id,
      className: formatLocalizedClassDisplayName(classInfo.name, locale),
    })))
    .sort((a, b) => b.at.localeCompare(a.at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, feed, locale]);

  const filteredCorrections = corrections;
  const filteredIgnored = ignoredCorrections;
  const filteredOfficial = officialEvents;
  const filteredOverviews = classOverviews;
  const activitySource = allActivityEntries.slice(0, 50);
  const filteredActivity = activityFilter === 'all'
    ? activitySource
    : activitySource.filter(entry => activityCategory(entry.op) === activityFilter);
  
  const groupedActivityDays = useMemo(() => {
    const days: Array<{ label: string; entries: GroupedActivityEntry[] }> = [];
    for (const entry of groupActivityEntries(filteredActivity)) {
      const label = dayLabel(entry.at, locale, t);
      const last = days[days.length - 1];
      if (last?.label === label) last.entries.push(entry);
      else days.push({ label, entries: [entry] });
    }
    return days;
  }, [filteredActivity, locale, t]);

  const filteredAttention = feed.attentionCount;

  const menuItems: AxisMenuItem[] = [
    {
      id: 'priorites',
      label: t('notifications.priorities'),
      subtitle: t('notifications.prioritySubtitle'),
      icon: CircleAlert,
      count: filteredCorrections.length,
      group: 'alerts',
      emphasize: true,
    },
    {
      id: 'echeances',
      label: t('notifications.deadlines'),
      subtitle: t('notifications.deadlineSubtitle'),
      icon: CalendarCheck,
      count: filteredOfficial.length,
      group: 'alerts',
    },
    {
      id: 'calendrier',
      label: t('notifications.calendar'),
      subtitle: t('notifications.calendarSubtitle'),
      icon: CalendarDays,
      count: 0,
      group: 'planning',
    },
    {
      id: 'classes',
      label: t('notifications.classes'),
      subtitle: t('notifications.classesSubtitle'),
      icon: GraduationCap,
      count: filteredOverviews.length,
      group: 'planning',
    },
    {
      id: 'activite',
      label: t('notifications.activity'),
      subtitle: t('notifications.activitySubtitle'),
      icon: History,
      count: filteredActivity.length,
      group: 'history',
    },
    ...(filteredIgnored.length > 0
      ? [{
          id: 'ignores' as AxisId,
          label: t('notifications.ignored'),
          subtitle: t('notifications.ignoredSubtitle'),
          icon: Undo2,
          count: filteredIgnored.length,
          group: 'history' as const,
        }]
      : []),
  ];

  const openClassById = (classId: string) => {
    const classInfo = classes.find(item => item.id === classId);
    if (!classInfo) return;
    onSelectClass(classInfo);
  };

  const mostActiveClassId = (): string | null => {
    let best: { classId: string; at: string } | null = null;
    for (const classInfo of classes) {
      const last = readJournal(classInfo.id)[0];
      if (last && (!best || last.at > best.at)) best = { classId: classInfo.id, at: last.at };
    }
    return best?.classId ?? classes[0]?.id ?? null;
  };

  const resolveSignal = (signal: ClassSignal) => {
    switch (signal.action) {
      case 'timetable':
        try { sessionStorage.setItem('config_initial_tab_v1', 'emploi'); } catch { /* ignore */ }
        onOpenSettings();
        return;
      case 'evaluations':
        requestEditorModal({ classId: signal.classId, modal: 'evaluations', expiresAt: Date.now() + 120_000 });
        openClassById(signal.classId);
        return;
      case 'export': {
        const classId = signal.classId || mostActiveClassId();
        if (!classId) return;
        requestEditorModal({ classId, modal: 'dataTransfer', expiresAt: Date.now() + 120_000 });
        openClassById(classId);
        return;
      }
      default:
        if (signal.kind === 'date' && signal.targetIndices && signal.date) {
          requestSessionFocus({
            classId: signal.classId,
            targetIndices: signal.targetIndices,
            expiresAt: Date.now() + 120_000,
            message: t('notifications.focusDate', { date: formatLocalizedDate(signal.date, locale) }),
          });
        }
        openClassById(signal.classId);
    }
  };

  const ignoreSignal = (signal: ClassSignal) => {
    if (!signal.dismissible) return;
    const storageScope = signal.scope === 'global' ? '' : signal.classId;
    const ids = readIgnoredActionIds(storageScope);
    ids.add(signal.id);
    writeIgnoredActionIds(storageScope, ids);
    toast.info(t('notifications.ignoredToast'));
  };

  const restoreSignal = (signal: ClassSignal) => {
    const storageScope = signal.scope === 'global' ? '' : signal.classId;
    const ids = readIgnoredActionIds(storageScope);
    ids.delete(signal.id);
    writeIgnoredActionIds(storageScope, ids);
    if (activeAxis === 'ignores' && filteredIgnored.length <= 1) setActiveAxis('priorites');
  };

  // Master Sidebar Menu items grouped
  const alertsGroup = menuItems.filter(i => i.group === 'alerts');
  const planningGroup = menuItems.filter(i => i.group === 'planning');
  const historyGroup = menuItems.filter(i => i.group === 'history');

  const isEffectiveCollapsed = isSidebarCollapsed;

  const renderSidebar = (
    <div className="space-y-4 transition-all duration-300">
      {/* Top Toggle Header */}
      <div className={cn("flex items-center px-1 mb-1", isEffectiveCollapsed ? "justify-center" : "justify-between")}>
        {!isEffectiveCollapsed && (
          <span className={cn('font-extrabold text-muted-foreground/80', isRtl ? 'text-xs tracking-normal' : 'font-mono text-[10px] uppercase tracking-wider')}>
            {t('notifications.sidebarLabel')}
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-[#423ed8] transition-colors cursor-pointer focus:outline-none flex shrink-0 items-center justify-center"
          title={isSidebarCollapsed ? t('notifications.expandMenu') : t('notifications.collapseMenu')}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", (isRtl ? isSidebarCollapsed : !isSidebarCollapsed) && "rotate-180")} />
        </button>
      </div>

      {/* Section Alerte & Suivi */}
      <div>
        {!isEffectiveCollapsed && (
          <h3 className={cn('mb-1.5 px-2 font-extrabold text-muted-foreground/80', isRtl ? 'text-xs tracking-normal' : 'font-mono text-[10px] uppercase tracking-wider')}>
            {t('notifications.sidebarTracking')}
          </h3>
        )}
        <div className="space-y-1">
          {alertsGroup.map(item => {
            const isActive = activeAxis === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveAxis(item.id);
                  setMobileSubViewOpen(true);
                }}
                title={item.label}
                className={cn(
                  'w-full flex items-center transition-all cursor-pointer group rounded-xl',
                  isEffectiveCollapsed
                    ? 'justify-center p-2 relative'
                    : 'gap-2.5 px-2.5 py-2 text-start',
                  isActive
                    ? 'text-[#423ed8] font-bold'
                    : 'text-muted-foreground hover:text-[#423ed8]'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors relative',
                    isActive
                      ? 'text-[#423ed8] scale-105'
                      : 'bg-[#eeaaff]/50 text-[#423ed8]/75 group-hover:text-[#423ed8]'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                  {isEffectiveCollapsed && item.count > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-bold border border-white dark:border-zinc-900',
                        item.emphasize
                          ? 'bg-red-500 text-white'
                          : 'bg-amber-500 text-zinc-950'
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
                {!isEffectiveCollapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn('block text-xs truncate', isActive ? 'font-extrabold text-[#423ed8]' : 'font-bold text-foreground')}>
                          {item.label}
                        </span>
                        {item.count > 0 && (
                          <span
                            className={cn(
                              'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold',
                              item.emphasize
                                ? 'bg-red-500 text-white'
                                : isActive
                                  ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                                  : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                            )}
                          >
                            {item.count}
                          </span>
                        )}
                      </div>
                      <span className={cn('block text-[10px] truncate font-normal leading-tight', isActive ? 'text-[#423ed8]/70' : 'text-muted-foreground')}>
                        {item.subtitle}
                      </span>
                    </div>
                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', isRtl && 'rotate-180', isActive ? 'text-[#423ed8] opacity-100' : 'text-muted-foreground opacity-50 group-hover:opacity-100')} />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Planification */}
      <div>
        {!isEffectiveCollapsed && (
          <h3 className={cn('mb-1.5 px-2 font-extrabold text-muted-foreground/80', isRtl ? 'text-xs tracking-normal' : 'font-mono text-[10px] uppercase tracking-wider')}>
            {t('notifications.sidebarPlanning')}
          </h3>
        )}
        <div className="space-y-1">
          {planningGroup.map(item => {
            const isActive = activeAxis === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveAxis(item.id);
                  setMobileSubViewOpen(true);
                }}
                title={item.label}
                className={cn(
                  'w-full flex items-center transition-all cursor-pointer group rounded-xl',
                  isEffectiveCollapsed
                    ? 'justify-center p-2 relative'
                    : 'gap-2.5 px-2.5 py-2 text-start',
                  isActive
                    ? 'text-[#423ed8] font-bold'
                    : 'text-muted-foreground hover:text-[#423ed8]'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors relative',
                    isActive
                      ? 'text-[#423ed8] scale-105'
                      : 'bg-[#eeaaff]/50 text-[#423ed8]/75 group-hover:text-[#423ed8]'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                  {isEffectiveCollapsed && item.count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-zinc-950 px-1 text-[8px] font-bold border border-white dark:border-zinc-900">
                      {item.count}
                    </span>
                  )}
                </div>
                {!isEffectiveCollapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn('block text-xs truncate', isActive ? 'font-extrabold text-[#423ed8]' : 'font-bold text-foreground')}>
                          {item.label}
                        </span>
                        {item.count > 0 && (
                          <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold', isActive ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200' : 'bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-muted-foreground')}>
                            {item.count}
                          </span>
                        )}
                      </div>
                      <span className={cn('block text-[10px] truncate font-normal leading-tight', isActive ? 'text-[#423ed8]/70' : 'text-muted-foreground')}>
                        {item.subtitle}
                      </span>
                    </div>
                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', isRtl && 'rotate-180', isActive ? 'text-[#423ed8] opacity-100' : 'text-muted-foreground opacity-50 group-hover:opacity-100')} />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Historique */}
      <div>
        {!isEffectiveCollapsed && (
          <h3 className={cn('mb-1.5 px-2 font-extrabold text-muted-foreground/80', isRtl ? 'text-xs tracking-normal' : 'font-mono text-[10px] uppercase tracking-wider')}>
            {t('notifications.sidebarHistory')}
          </h3>
        )}
        <div className="space-y-1">
          {historyGroup.map(item => {
            const isActive = activeAxis === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveAxis(item.id);
                  setMobileSubViewOpen(true);
                }}
                title={item.label}
                className={cn(
                  'w-full flex items-center transition-all cursor-pointer group rounded-xl',
                  isEffectiveCollapsed
                    ? 'justify-center p-2 relative'
                    : 'gap-2.5 px-2.5 py-2 text-start',
                  isActive
                    ? 'text-[#423ed8] font-bold'
                    : 'text-muted-foreground hover:text-[#423ed8]'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors relative',
                    isActive
                      ? 'text-[#423ed8] scale-105'
                      : 'bg-[#eeaaff]/50 text-[#423ed8]/75 group-hover:text-[#423ed8]'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                  {isEffectiveCollapsed && item.count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-zinc-950 px-1 text-[8px] font-bold border border-white dark:border-zinc-900">
                      {item.count}
                    </span>
                  )}
                </div>
                {!isEffectiveCollapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn('block text-xs truncate', isActive ? 'font-extrabold text-[#423ed8]' : 'font-bold text-foreground')}>
                          {item.label}
                        </span>
                        {item.count > 0 && (
                          <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold', isActive ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200' : 'bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-muted-foreground')}>
                            {item.count}
                          </span>
                        )}
                      </div>
                      <span className={cn('block text-[10px] truncate font-normal leading-tight', isActive ? 'text-[#423ed8]/70' : 'text-muted-foreground')}>
                        {item.subtitle}
                      </span>
                    </div>
                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', isRtl && 'rotate-180', isActive ? 'text-[#423ed8] opacity-100' : 'text-muted-foreground opacity-50 group-hover:opacity-100')} />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn('min-h-screen text-foreground', isRtl ? 'font-sans' : 'font-sans')}>
      <main className="mx-auto max-w-6xl px-3 py-4 pb-24 sm:px-6 sm:py-5">
        <div className="mb-4 flex items-end justify-between gap-3 px-1 sm:mb-5">
          <div className="flex items-center gap-3">
            <PieChart className="h-5 w-5 shrink-0 text-[#423ed8]" />
            <div>
              <h1 className={cn('flex items-center gap-2 font-extrabold text-foreground', titleFontClass)}>
                {t('notifications.centerTitle')}
                {filteredAttention > 0 && (
                  <span className="rounded-full border border-red-200/80 bg-red-50/80 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:border-red-900/50 dark:bg-red-950/45 dark:text-red-400">
                    {t('notifications.attentionCount', { count: filteredAttention })}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">{t('notifications.allTeachingClasses')}</p>
            </div>
          </div>
        </div>

        {/* Main Content Layout (Master - Detail pattern with 3s auto-collapse) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Master Sidebar */}
          <div
            className={cn(
              'bg-card/88 border border-border/70 rounded-2xl p-3 shadow-[0_12px_32px_rgba(30,64,110,0.05)] backdrop-blur-sm transition-all duration-300 overflow-hidden flex flex-col',
              isEffectiveCollapsed
                ? 'md:col-span-1 lg:col-span-1 xl:col-span-1'
                : 'md:col-span-4 lg:col-span-3 xl:col-span-3',
              mobileSubViewOpen ? 'hidden md:block' : 'block'
            )}
          >
            {renderSidebar}
          </div>

          {/* Detail Content */}
          <div
            className={cn(
              'bg-card/92 border border-border/70 rounded-2xl p-4 sm:p-5 shadow-[0_12px_32px_rgba(30,64,110,0.05)] backdrop-blur-sm min-h-[500px] transition-all duration-300',
              isEffectiveCollapsed
                ? 'md:col-span-11 lg:col-span-11 xl:col-span-11'
                : 'md:col-span-8 lg:col-span-9 xl:col-span-9',
              !mobileSubViewOpen ? 'hidden md:block' : 'block'
            )}
          >
            {/* Mobile Back Button */}
            {mobileSubViewOpen && (
              <button
                type="button"
                onClick={() => setMobileSubViewOpen(false)}
                className="md:hidden flex items-center gap-1.5 text-xs font-bold text-[#423ed8] mb-4 cursor-pointer"
              >
                <ArrowLeft className={cn('h-4 w-4', isRtl && 'rotate-180')} />
                <span>{t('notifications.backToMenu')}</span>
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeAxis}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                {/* 1. SECTION : À TRAITER */}
                {activeAxis === 'priorites' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <h2 className={cn('flex items-center gap-2 text-base font-bold text-foreground', titleFontClass)}>
                          <PieChart className={cn('h-4 w-4', filteredCorrections.length > 0 ? 'text-amber-600' : 'text-[#423ed8]')} />
                          {t('notifications.toHandle', { count: filteredCorrections.length })}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('notifications.priorityHint')}
                        </p>
                      </div>
                    </div>

                    {filteredCorrections.length === 0 ? (
                      <EmptyState
                        title={t('notifications.emptyUpToDateTitle')}
                        description={t('notifications.emptyUpToDateDescription')}
                      />
                    ) : (
                      <div className="grid gap-2.5">
                        {filteredCorrections.map(signal => (
                          <SignalCard
                            key={signal.id}
                            signal={signal}
                            classInfo={classById.get(signal.classId)}
                            actionLabel={actionLabels[signal.action]}
                            ignoreLabel={t('notifications.ignore')}
                            mustResolveLabel={t('notifications.mustResolve')}
                            onIgnore={() => ignoreSignal(signal)}
                            onResolve={() => resolveSignal(signal)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SECTION : ÉCHÉANCES */}
                {activeAxis === 'echeances' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3">
                      <div>
                        <h2 className={cn('flex items-center gap-2 text-base font-bold text-foreground', titleFontClass)}>
                          <CalendarCheck className="h-4 w-4 text-blue-600" />
                          {t('notifications.deadlines')}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('notifications.deadlineHint')}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground bg-muted dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                        {t('notifications.eventCount', { count: filteredOfficial.length })}
                      </span>
                    </div>

                    {filteredOfficial.length === 0 ? (
                      <EmptyState
                        title={t('notifications.noAssessmentTitle')}
                        description={t('notifications.noAssessmentDescription')}
                      />
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredOfficial.map(item => (
                          <div
                            key={`official-${item.event.id}`}
                            className="flex flex-col justify-between rounded-xl bg-purple-50/40 dark:bg-purple-950/20 p-3.5 text-start border border-purple-200/80 dark:border-purple-900/50 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="rounded bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                                  {t('notifications.officialEvent')}
                                </span>
                                <span className="rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                                  {delayLabel(item.inDays, t)}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-purple-950 dark:text-purple-100">
                                {item.event.title}
                              </h3>
                              <p className="mt-1 text-[11px] text-purple-800/80 dark:text-purple-300/80">
                                {t('notifications.concerns', { classes: item.classNames.slice(0, 3).map(name => formatLocalizedClassDisplayName(name, locale)).join(', ') })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SECTION : CALENDRIER */}
                {activeAxis === 'calendrier' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <h2 className={cn('flex items-center gap-2 text-base font-bold text-foreground', titleFontClass)}>
                          <CalendarDays className="h-4 w-4 text-[#423ed8]" />
                          {t('notifications.calendar')}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('notifications.calendarHint')}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-2 text-card-foreground">
                      <NotificationCalendar classes={classes} config={config} selectedClassId="all" />
                    </div>
                  </div>
                )}

                {/* 4. SECTION : CLASSES */}
                {activeAxis === 'classes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <h2 className={cn('flex items-center gap-2 text-base font-bold text-foreground', titleFontClass)}>
                          <GraduationCap className="h-4 w-4 text-[#423ed8]" />
                          {t('notifications.classes')}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('notifications.classesHint')}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredOverviews.map(overview => (
                        <button
                          key={overview.classInfo.id}
                          onClick={() => openClassById(overview.classInfo.id)}
                          className="flex flex-col justify-between rounded-2xl bg-card p-4 border border-border text-card-foreground shadow-2xs hover:border-[#423ed8]/50 text-start transition-all cursor-pointer group"
                        >
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <ClassIdentityIcon classInfo={overview.classInfo} fallback={GraduationCap} compact />
                                <h3 className="truncate text-xs font-bold text-foreground transition-colors group-hover:text-[#423ed8]">
                                  {overview.className}
                                </h3>
                              </div>
                              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                                {overview.completionRate}%
                              </span>
                            </div>

                            <div className="h-1.5 w-full rounded-full bg-muted dark:bg-zinc-800 overflow-hidden mb-3">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, overview.completionRate))}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{t('notifications.sessionCount', { count: overview.sessionsCount })}</span>
                              <span>{t('notifications.lastSession', { date: overview.lastDate ? formatLocalizedDate(overview.lastDate, locale) : '—' })}</span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 flex items-center justify-between text-[11px]">
                            <span className={cn('font-semibold', overview.toPrintCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                              {overview.toPrintCount > 0 ? t('notifications.toPrint', { count: overview.toPrintCount }) : t('notifications.printUpToDate')}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {overview.lastPrintedAt ? t('notifications.printedAgo', { when: timeAgo(overview.lastPrintedAt, locale) }) : t('notifications.notPrinted')}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. SECTION : HISTORIQUE */}
                {activeAxis === 'activite' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3">
                      <div>
                        <h2 className={cn('flex items-center gap-2 text-base font-bold text-foreground', titleFontClass)}>
                          <History className="h-4 w-4 text-blue-600" />
                          {t('notifications.activity')}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('notifications.activityHint')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {ACTIVITY_FILTERS.map(filter => (
                        <button
                          key={filter}
                          onClick={() => setActivityFilter(filter)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer',
                            activityFilter === filter
                              ? 'bg-foreground text-background dark:text-zinc-900 shadow-2xs'
                              : 'bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {t(`notifications.activityFilter.${filter}`)}
                        </button>
                      ))}
                    </div>

                    {filteredActivity.length === 0 ? (
                      <EmptyState
                        title={t('notifications.noActivityTitle')}
                        description={t('notifications.noActivityDescription')}
                      />
                    ) : (
                      <div className="space-y-3">
                        {groupedActivityDays.map((day, dayIndex) => (
                          <div key={`${day.label}-${dayIndex}`} className="overflow-hidden rounded-xl border border-border/70 bg-card/86">
                            <div className="border-b border-border/55 bg-secondary/45 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                              {day.label}
                            </div>
                            <div className="divide-y divide-border/70">
                              {day.entries.map((entry, index) => (
                                <button
                                  key={`${entry.classId}-${entry.at}-${index}`}
                                  onClick={() => openClassById(entry.classId)}
                                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-start hover:bg-muted dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <ClassIdentityIcon classInfo={classById.get(entry.classId)} fallback={History} compact />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-foreground truncate">
                                          {opLabel(entry.op, locale)}
                                        </span>
                                        {entry.count > 1 && (
                                          <span className="rounded bg-muted dark:bg-zinc-800 px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground dark:text-muted-foreground">
                                            ×{entry.count}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground">
                                        <span className="font-semibold text-foreground me-1.5">{entry.className} •</span>
                                        {timeAgo(entry.at, locale)}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                    {timeRangeLabel(entry, locale)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. SECTION : EXCEPTIONS IGNORÉES */}
                {activeAxis === 'ignores' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3">
                      <div>
                        <h2 className={cn('flex items-center gap-2 text-base font-bold text-foreground', titleFontClass)}>
                          <Undo2 className="h-4 w-4 text-blue-600" />
                          {t('notifications.ignored')}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('notifications.ignoredHint')}
                        </p>
                      </div>
                    </div>

                    {filteredIgnored.length === 0 ? (
                      <EmptyState
                        title={t('notifications.noIgnoredTitle')}
                        description={t('notifications.noIgnoredDescription')}
                      />
                    ) : (
                      <div className="divide-y divide-border/55 overflow-hidden rounded-2xl border border-border/70 bg-card/86">
                        {filteredIgnored.map(signal => (
                          <div key={signal.id} className="flex items-center justify-between gap-3 p-3.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <ClassIdentityIcon classInfo={classById.get(signal.classId)} fallback={SIGNAL_FALLBACK_ICON[signal.kind]} compact />
                              <div className="min-w-0">
                              <h3 className="text-xs font-bold text-foreground truncate">
                                {signal.title}
                              </h3>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {signal.className && <span className="font-semibold me-1">{signal.className} •</span>}
                                {signal.detail}
                              </p>
                              </div>
                            </div>
                            <button
                              onClick={() => restoreSignal(signal)}
                              className="h-7 px-3 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer shrink-0"
                            >
                              {t('notifications.restore')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};
