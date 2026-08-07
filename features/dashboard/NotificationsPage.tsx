import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell,
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
  X,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Search,
} from '@/components/ui/icons';
import { UpcomingAssessment } from '@/utils/assessments';
import { UpcomingOfficialStudentEvent } from '@/hooks/useOfficialStudentEvents';
import { computeProgressionStats } from '@/utils/progression';
import { getNewDates, readPrintMeta } from '@/utils/printMeta';
import { JournalEntry, opLabel, readJournal, timeAgoFr } from '@/utils/journal';
import {
  ClassSignal,
  readClassLessons,
  readIgnoredActionIds,
  requestEditorModal,
  requestSessionFocus,
  writeIgnoredActionIds,
  formatDateFR,
} from '@/utils/notificationSignals';
import { NotificationCalendar } from './NotificationCalendar';
import { NotificationFeed } from '@/hooks/useNotificationFeed';

type Tone = 'blue' | 'red' | 'green' | 'gold' | 'default';

const KIND_VISUAL: Record<ClassSignal['kind'], { icon: React.ComponentType<{ className?: string }>; tone: Tone }> = {
  'date': { icon: CalendarCheck, tone: 'blue' },
  'missed-session': { icon: Clock, tone: 'gold' },
  'assessment-week': { icon: CalendarCheck, tone: 'gold' },
  'absences': { icon: User, tone: 'red' },
  'never-started': { icon: BookOpen, tone: 'blue' },
  'schedule': { icon: CalendarRange, tone: 'blue' },
  'progress-gap': { icon: PieChart, tone: 'gold' },
  'backup': { icon: Database, tone: 'default' },
};

const ACTION_LABEL: Record<ClassSignal['action'], string> = {
  class: 'Ouvrir le cahier',
  timetable: 'Emploi du temps',
  evaluations: 'Évaluations',
  export: 'Exporter une copie',
};

const EmptyState: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">
      <Check className="h-6 w-6" />
    </div>
    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
    <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
  </div>
);

type AxisId = 'priorites' | 'echeances' | 'calendrier' | 'classes' | 'activite' | 'ignores';

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

const dayLabel = (iso: string): string => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Aujourd’hui";
  if (sameDay(date, yesterday)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const groupActivityEntries = (entries: ActivityEntry[]): GroupedActivityEntry[] => {
  const groups: GroupedActivityEntry[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    const closeInTime = last && Math.abs(new Date(last.oldestAt).getTime() - new Date(entry.at).getTime()) <= 5 * 60_000;
    if (last && last.op === entry.op && last.classId === entry.classId && dayLabel(last.at) === dayLabel(entry.at) && closeInTime) {
      last.count += 1;
      last.oldestAt = entry.at;
    } else {
      groups.push({ ...entry, oldestAt: entry.at, count: 1 });
    }
  }
  return groups;
};

const timeRangeLabel = (entry: GroupedActivityEntry): string => {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const latest = new Date(entry.at).toLocaleTimeString('fr-FR', options);
  if (entry.count === 1) return latest;
  const oldest = new Date(entry.oldestAt).toLocaleTimeString('fr-FR', options);
  return `${oldest}–${latest}`;
};

const ACTIVITY_FILTERS: Array<{ id: ActivityFilter; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'content', label: 'Contenu' },
  { id: 'dates', label: 'Dates' },
  { id: 'structure', label: 'Structure' },
];

const delayLabel = (inDays: number): string => {
  if (inDays <= 0) return "aujourd'hui";
  if (inDays === 1) return 'demain';
  return `dans ${inDays} jours`;
};

interface NotificationsPageProps {
  classes: ClassInfo[];
  config: AppConfig;
  feed: NotificationFeed;
  onSelectClass: (classInfo: ClassInfo) => void;
  onOpenSettings: () => void;
  onMutate: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  classes,
  config,
  feed,
  onSelectClass,
  onOpenSettings,
  onMutate,
}) => {
  const { t } = useLocale();
  const [activeAxis, setActiveAxis] = useState<AxisId>('priorites');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [mobileSubViewOpen, setMobileSubViewOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    urgent: true,
    normal: true,
    upcoming: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { corrections, ignoredCorrections, assessments, officialEvents, attentionCount } = feed;

  const classOverviews = useMemo<ClassOverview[]>(() => classes.map(classInfo => {
    const lessons = readClassLessons(classInfo.id);
    const stats = computeProgressionStats(lessons);
    const printMeta = readPrintMeta(classInfo.id);
    return {
      classInfo,
      className: formatClassDisplayName(classInfo.name),
      completionRate: stats.completionRate,
      sessionsCount: stats.sessionsCount,
      lastDate: stats.lastDate,
      toPrintCount: getNewDates(lessons, classInfo.id).length,
      lastPrintedAt: printMeta.lastPrintedAt,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [classes, feed]);

  const allActivityEntries = useMemo<ActivityEntry[]>(() => classes
    .flatMap(classInfo => readJournal(classInfo.id).map(entry => ({
      ...entry,
      classId: classInfo.id,
      className: formatClassDisplayName(classInfo.name),
    })))
    .sort((a, b) => b.at.localeCompare(a.at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, feed]);

  const selectedClass = selectedClassId === 'all'
    ? null
    : classes.find(classInfo => classInfo.id === selectedClassId) ?? null;
  const classFilterValue = selectedClass?.id ?? 'all';

  const filteredCorrections = useMemo(() => {
    let list = selectedClass ? corrections.filter(s => s.classId === selectedClass.id) : corrections;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q) || (s.className && s.className.toLowerCase().includes(q)));
    }
    return list;
  }, [corrections, selectedClass, searchQuery]);

  const filteredIgnored = selectedClass ? ignoredCorrections.filter(s => s.classId === selectedClass.id) : ignoredCorrections;
  const filteredAssessments = selectedClass ? assessments.filter(i => i.classId === selectedClass.id) : assessments;
  const filteredOfficial = selectedClass ? officialEvents.filter(i => i.classNames.includes(selectedClass.name)) : officialEvents;
  const filteredOverviews = selectedClass ? classOverviews.filter(o => o.classInfo.id === selectedClass.id) : classOverviews;
  const activitySource = selectedClass
    ? allActivityEntries.filter(entry => entry.classId === selectedClass.id)
    : allActivityEntries.slice(0, 50);
  const filteredActivity = activityFilter === 'all'
    ? activitySource
    : activitySource.filter(entry => activityCategory(entry.op) === activityFilter);
  
  const groupedActivityDays = useMemo(() => {
    const days: Array<{ label: string; entries: GroupedActivityEntry[] }> = [];
    for (const entry of groupActivityEntries(filteredActivity)) {
      const label = dayLabel(entry.at);
      const last = days[days.length - 1];
      if (last?.label === label) last.entries.push(entry);
      else days.push({ label, entries: [entry] });
    }
    return days;
  }, [filteredActivity]);

  const filteredAttention = filteredCorrections.length + filteredOfficial.filter(i => i.inDays <= 3).length;

  const menuItems: AxisMenuItem[] = [
    {
      id: 'priorites',
      label: 'À traiter',
      subtitle: 'Alertes, absents, séances à consigner',
      icon: CircleAlert,
      count: filteredCorrections.length,
      group: 'alerts',
      emphasize: true,
    },
    {
      id: 'echeances',
      label: 'Échéances & Devoirs',
      subtitle: 'Contrôles continus & événements officiels',
      icon: CalendarCheck,
      count: filteredAssessments.length + filteredOfficial.length,
      group: 'alerts',
    },
    {
      id: 'calendrier',
      label: 'Calendrier des séances',
      subtitle: 'Vue d\'ensemble temporelle',
      icon: CalendarDays,
      count: 0,
      group: 'planning',
    },
    {
      id: 'classes',
      label: 'Synthèse par Classe',
      subtitle: 'Avancement & impressions nécessaires',
      icon: GraduationCap,
      count: filteredOverviews.length,
      group: 'planning',
    },
    {
      id: 'activite',
      label: 'Journal d\'activités',
      subtitle: 'Traçabilité des modifications',
      icon: History,
      count: filteredActivity.length,
      group: 'history',
    },
    ...(filteredIgnored.length > 0
      ? [{
          id: 'ignores' as AxisId,
          label: 'Exceptions ignorées',
          subtitle: 'Alertes masquées réactivables',
          icon: Undo2,
          count: filteredIgnored.length,
          group: 'history' as const,
        }]
      : []),
  ];

  useEffect(() => {
    onMutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClassFilterChange = (nextClassId: string) => {
    setSelectedClassId(nextClassId);
  };

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
            message: `Date du ${formatDateFR(signal.date)} à vérifier — ouverte depuis les notifications.`,
          });
        }
        openClassById(signal.classId);
    }
  };

  const ignoreSignal = (signal: ClassSignal) => {
    const ids = readIgnoredActionIds(signal.classId);
    ids.add(signal.id);
    writeIgnoredActionIds(signal.classId, ids);
    onMutate();
    toast.info('Point conservé comme exception — réactivable depuis l’onglet « Exceptions ».');
  };

  const restoreSignal = (signal: ClassSignal) => {
    const ids = readIgnoredActionIds(signal.classId);
    ids.delete(signal.id);
    writeIgnoredActionIds(signal.classId, ids);
    onMutate();
    if (activeAxis === 'ignores' && filteredIgnored.length <= 1) setActiveAxis('priorites');
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Grouping priorities into Urgent vs Standard for collapsible behavior
  const urgentCorrections = useMemo(() => filteredCorrections.filter(s => s.kind === 'absences' || s.kind === 'missed-session'), [filteredCorrections]);
  const standardCorrections = useMemo(() => filteredCorrections.filter(s => s.kind !== 'absences' && s.kind !== 'missed-session'), [filteredCorrections]);

  // Master Sidebar Menu items grouped
  const alertsGroup = menuItems.filter(i => i.group === 'alerts');
  const planningGroup = menuItems.filter(i => i.group === 'planning');
  const historyGroup = menuItems.filter(i => i.group === 'history');

  const isEffectiveCollapsed = isSidebarCollapsed;

  const renderSidebar = (
    <div className="space-y-4 transition-all duration-300">
      {/* Top Toggle Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        {!isEffectiveCollapsed && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 font-mono">
            Notifications
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          className={cn(
            "p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer",
            isEffectiveCollapsed && "mx-auto"
          )}
          title={isSidebarCollapsed ? "Déplier le menu" : "Réduire le menu"}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", !isSidebarCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Section Alerte & Suivi */}
      <div>
        {!isEffectiveCollapsed && (
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 px-2 mb-1.5 font-mono">
            Suivi & Priorités
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
                    : 'gap-2.5 px-2.5 py-2 text-left',
                  isActive
                    ? 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 font-bold'
                    : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors relative',
                    isActive
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60'
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
                        <span className={cn('block text-xs truncate', isActive ? 'font-extrabold text-amber-950 dark:text-amber-100' : 'font-bold text-foreground')}>
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
                      <span className={cn('block text-[10px] truncate font-normal leading-tight', isActive ? 'text-amber-800/80 dark:text-amber-200/80' : 'text-muted-foreground')}>
                        {item.subtitle}
                      </span>
                    </div>
                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', isActive ? 'text-amber-700 dark:text-amber-300 opacity-100' : 'text-zinc-400 opacity-50 group-hover:opacity-100')} />
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
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 px-2 mb-1.5 font-mono">
            Planification
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
                    : 'gap-2.5 px-2.5 py-2 text-left',
                  isActive
                    ? 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 font-bold'
                    : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors relative',
                    isActive
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60'
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
                        <span className={cn('block text-xs truncate', isActive ? 'font-extrabold text-amber-950 dark:text-amber-100' : 'font-bold text-foreground')}>
                          {item.label}
                        </span>
                        {item.count > 0 && (
                          <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold', isActive ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>
                            {item.count}
                          </span>
                        )}
                      </div>
                      <span className={cn('block text-[10px] truncate font-normal leading-tight', isActive ? 'text-amber-800/80 dark:text-amber-200/80' : 'text-muted-foreground')}>
                        {item.subtitle}
                      </span>
                    </div>
                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', isActive ? 'text-amber-700 dark:text-amber-300 opacity-100' : 'text-zinc-400 opacity-50 group-hover:opacity-100')} />
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
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 px-2 mb-1.5 font-mono">
            Historique
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
                    : 'gap-2.5 px-2.5 py-2 text-left',
                  isActive
                    ? 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 font-bold'
                    : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors relative',
                    isActive
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60'
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
                        <span className={cn('block text-xs truncate', isActive ? 'font-extrabold text-amber-950 dark:text-amber-100' : 'font-bold text-foreground')}>
                          {item.label}
                        </span>
                        {item.count > 0 && (
                          <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold', isActive ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>
                            {item.count}
                          </span>
                        )}
                      </div>
                      <span className={cn('block text-[10px] truncate font-normal leading-tight', isActive ? 'text-amber-800/80 dark:text-amber-200/80' : 'text-muted-foreground')}>
                        {item.subtitle}
                      </span>
                    </div>
                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', isActive ? 'text-amber-700 dark:text-amber-300 opacity-100' : 'text-zinc-400 opacity-50 group-hover:opacity-100')} />
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
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-foreground font-display tracking-tight flex items-center gap-2">
                Centre de notifications
                {filteredAttention > 0 && (
                  <span className="rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] font-extrabold px-2 py-0.5 border border-red-200 dark:border-red-900/50">
                    {filteredAttention} urgente{filteredAttention > 1 ? 's' : ''}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedClass ? `Filtre actif : ${formatClassDisplayName(selectedClass.name)}` : 'Toutes les classes d\'enseignement'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter class */}
            <div className="w-full sm:w-60">
              <Select value={classFilterValue} onValueChange={handleClassFilterChange}>
                <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 h-9 text-xs rounded-xl focus:ring-blue-500/20">
                  <SelectValue placeholder={t('notifications.allClasses')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-xl">
                  <SelectItem value="all" className="text-xs rounded-lg">{t('notifications.allClasses')}</SelectItem>
                  {classes.map(classInfo => (
                    <SelectItem key={classInfo.id} value={classInfo.id} className="text-xs rounded-lg">
                      {formatClassDisplayName(classInfo.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout (Master - Detail pattern with 3s auto-collapse) */}
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-5 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Master Sidebar */}
          <div
            className={cn(
              'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-3 shadow-xs transition-all duration-300',
              isEffectiveCollapsed
                ? 'md:col-span-1 lg:col-span-1 xl:col-span-1'
                : 'md:col-span-4 lg:col-span-3.5 xl:col-span-3',
              mobileSubViewOpen ? 'hidden md:block' : 'block'
            )}
          >
            {renderSidebar}
          </div>

          {/* Detail Content */}
          <div
            className={cn(
              'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs min-h-[500px] transition-all duration-300',
              isEffectiveCollapsed
                ? 'md:col-span-11 lg:col-span-11 xl:col-span-11'
                : 'md:col-span-8 lg:col-span-8.5 xl:col-span-9',
              !mobileSubViewOpen ? 'hidden md:block' : 'block'
            )}
          >
            {/* Mobile Back Button */}
            {mobileSubViewOpen && (
              <button
                type="button"
                onClick={() => setMobileSubViewOpen(false)}
                className="md:hidden flex items-center gap-1.5 text-xs font-bold text-primary mb-4 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour au menu</span>
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
                        <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                          <CircleAlert className="h-4 w-4 text-destructive" />
                          Points d'attention & Séances à consigner
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Actions recommandées pour maintenir vos cahiers de textes à jour.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        {filteredCorrections.length} alerte{filteredCorrections.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {filteredCorrections.length === 0 ? (
                      <EmptyState
                        title="Tout est à jour !"
                        description="Aucune séance en retard ni aucune anomalie détectée dans vos cahiers de textes."
                      />
                    ) : (
                      <div className="space-y-4">
                        {/* Group 1: Urgent (Absences & Missed) */}
                        {urgentCorrections.length > 0 && (
                          <div className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleGroup('urgent')}
                              className="w-full px-4 py-2.5 flex items-center justify-between bg-red-100/50 dark:bg-red-900/30 text-red-900 dark:text-red-200 text-xs font-extrabold cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                Urgence élevée & Absences ({urgentCorrections.length})
                              </span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  expandedGroups.urgent ? 'rotate-180' : ''
                                )}
                              />
                            </button>

                            {expandedGroups.urgent && (
                              <div className="p-3 grid gap-3 sm:grid-cols-1">
                                {urgentCorrections.map(signal => {
                                  const visual = KIND_VISUAL[signal.kind];
                                  const Icon = visual.icon;
                                  return (
                                    <div
                                      key={signal.id}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 p-3.5 shadow-2xs border border-zinc-200/80 dark:border-zinc-800"
                                    >
                                      <div className="flex items-start gap-3 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
                                          <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            {signal.className && (
                                              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 text-[9px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                                                {signal.className}
                                              </span>
                                            )}
                                            <span className="text-xs font-bold text-foreground truncate">
                                              {signal.title}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                            {signal.detail}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                                        <button
                                          onClick={() => ignoreSignal(signal)}
                                          className="h-7 px-2.5 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                        >
                                          Ignorer
                                        </button>
                                        <button
                                          onClick={() => resolveSignal(signal)}
                                          className="h-7 px-3 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs cursor-pointer"
                                        >
                                          {ACTION_LABEL[signal.action]}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Group 2: Standard (Progress & Dates) */}
                        {standardCorrections.length > 0 && (
                          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleGroup('normal')}
                              className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-100/70 dark:bg-zinc-800/70 text-foreground text-xs font-extrabold cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                Recommandations de saisie ({standardCorrections.length})
                              </span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  expandedGroups.normal ? 'rotate-180' : ''
                                )}
                              />
                            </button>

                            {expandedGroups.normal && (
                              <div className="p-3 space-y-2.5">
                                {standardCorrections.map(signal => {
                                  const visual = KIND_VISUAL[signal.kind];
                                  const Icon = visual.icon;
                                  return (
                                    <div
                                      key={signal.id}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 p-3.5 shadow-2xs border border-zinc-200/80 dark:border-zinc-800"
                                    >
                                      <div className="flex items-start gap-3 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                          <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            {signal.className && (
                                              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 text-[9px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                                                {signal.className}
                                              </span>
                                            )}
                                            <span className="text-xs font-bold text-foreground truncate">
                                              {signal.title}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-muted-foreground leading-snug">
                                            {signal.detail}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                                        <button
                                          onClick={() => ignoreSignal(signal)}
                                          className="h-7 px-2.5 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                        >
                                          Ignorer
                                        </button>
                                        <button
                                          onClick={() => resolveSignal(signal)}
                                          className="h-7 px-3 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 cursor-pointer"
                                        >
                                          {ACTION_LABEL[signal.action]}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SECTION : ÉCHÉANCES */}
                {activeAxis === 'echeances' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div>
                        <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                          <CalendarCheck className="h-4 w-4 text-blue-600" />
                          Contrôles continu & Devoirs
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Évaluations à venir et dates officielles du calendrier scolaire.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                        {filteredAssessments.length + filteredOfficial.length} événement(s)
                      </span>
                    </div>

                    {filteredAssessments.length === 0 && filteredOfficial.length === 0 ? (
                      <EmptyState
                        title="Aucune évaluation programmée"
                        description="Saisissez des devoirs ou des contrôles continus dans vos fiches de séance pour les voir apparaître ici."
                      />
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredAssessments.map(item => (
                          <button
                            key={`${item.classId}-${item.id}`}
                            onClick={() => openClassById(item.classId)}
                            className="flex flex-col justify-between rounded-xl bg-white dark:bg-zinc-900 p-3.5 text-left border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-blue-300 transition-all cursor-pointer group"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                                  {formatClassDisplayName(item.className)}
                                </span>
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                    item.inDays <= 3
                                      ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                  )}
                                >
                                  {delayLabel(item.inDays)}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                {item.label.split(' — ')[0]}
                              </h3>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Date prévue : <span className="font-semibold text-foreground">{formatDateFR(item.dateISO)}</span>
                              </p>
                            </div>
                          </button>
                        ))}

                        {filteredOfficial.map(item => (
                          <div
                            key={`official-${item.event.id}`}
                            className="flex flex-col justify-between rounded-xl bg-purple-50/40 dark:bg-purple-950/20 p-3.5 text-left border border-purple-200/80 dark:border-purple-900/50 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="rounded bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                                  Événement officiel
                                </span>
                                <span className="rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                                  {delayLabel(item.inDays)}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-purple-950 dark:text-purple-100">
                                {item.event.title}
                              </h3>
                              <p className="mt-1 text-[11px] text-purple-800/80 dark:text-purple-300/80">
                                Concerne : {item.classNames.slice(0, 3).map(formatClassDisplayName).join(', ')}
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
                        <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          Calendrier des séances & événements
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Visualisation globale par date de votre progression.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-2 text-card-foreground">
                      <NotificationCalendar classes={classes} config={config} selectedClassId={classFilterValue} />
                    </div>
                  </div>
                )}

                {/* 4. SECTION : CLASSES */}
                {activeAxis === 'classes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          Synthèse de progression par classe
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          État d'avancement des cahiers et impressions en attente.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredOverviews.map(overview => (
                        <button
                          key={overview.classInfo.id}
                          onClick={() => openClassById(overview.classInfo.id)}
                          className="flex flex-col justify-between rounded-2xl bg-card p-4 border border-border text-card-foreground shadow-2xs hover:border-primary/50 text-left transition-all cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                {overview.className}
                              </h3>
                              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                                {overview.completionRate}%
                              </span>
                            </div>

                            <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-3">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, overview.completionRate))}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{overview.sessionsCount} séance(s)</span>
                              <span>Dernière : {overview.lastDate ? formatDateFR(overview.lastDate) : 'Aucune'}</span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                            <span className={cn('font-semibold', overview.toPrintCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500')}>
                              {overview.toPrintCount > 0 ? `${overview.toPrintCount} à imprimer` : 'Impression à jour'}
                            </span>
                            <span className="text-zinc-400 text-[10px]">
                              {overview.lastPrintedAt ? `Imprimé ${timeAgoFr(overview.lastPrintedAt)}` : 'Non imprimé'}
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
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div>
                        <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                          <History className="h-4 w-4 text-blue-600" />
                          Journal des modifications & Traçabilité
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Historique chronologique des ajouts, modifications de dates et réorganisations.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {ACTIVITY_FILTERS.map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => setActivityFilter(filter.id)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer',
                            activityFilter === filter.id
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {filteredActivity.length === 0 ? (
                      <EmptyState
                        title="Aucun historique"
                        description="Les modifications apportées au cahier de textes apparaîtront ici au fur et à mesure."
                      />
                    ) : (
                      <div className="space-y-3">
                        {groupedActivityDays.map((day, dayIndex) => (
                          <div key={`${day.label}-${dayIndex}`} className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                            <div className="bg-zinc-50 dark:bg-zinc-850 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-zinc-100 dark:border-zinc-800">
                              {day.label}
                            </div>
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {day.entries.map((entry, index) => (
                                <button
                                  key={`${entry.classId}-${entry.at}-${index}`}
                                  onClick={() => openClassById(entry.classId)}
                                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 shrink-0">
                                      <History className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-foreground truncate">
                                          {opLabel(entry.op)}
                                        </span>
                                        {entry.count > 1 && (
                                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 text-[9px] font-bold text-zinc-600 dark:text-zinc-400">
                                            ×{entry.count}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground">
                                        {!selectedClass && <span className="font-semibold text-foreground mr-1.5">{entry.className} •</span>}
                                        {timeAgoFr(entry.at)}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                    {timeRangeLabel(entry)}
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
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div>
                        <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                          <Undo2 className="h-4 w-4 text-blue-600" />
                          Exceptions & Alertes masquées
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Liste des alertes que vous avez choisi d'ignorer temporairement.
                        </p>
                      </div>
                    </div>

                    {filteredIgnored.length === 0 ? (
                      <EmptyState
                        title="Aucune exception masquée"
                        description="Les alertes que vous choisissez d'ignorer apparaîtront ici."
                      />
                    ) : (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                        {filteredIgnored.map(signal => (
                          <div key={signal.id} className="p-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-foreground truncate">
                                {signal.title}
                              </h3>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {signal.className && <span className="font-semibold mr-1">{signal.className} •</span>}
                                {signal.detail}
                              </p>
                            </div>
                            <button
                              onClick={() => restoreSignal(signal)}
                              className="h-7 px-3 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer shrink-0"
                            >
                              Réactiver
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
