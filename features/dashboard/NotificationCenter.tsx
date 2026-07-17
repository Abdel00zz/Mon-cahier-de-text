import React, { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell, BookOpen, CalendarCheck, CalendarRange, Check, CircleAlert, Clock, Database,
  GraduationCap, History, PieChart, Undo2, User, X,
} from '@/components/ui/icons';
import { useRecentPastAssessments, useUpcomingAssessments } from '@/hooks/useAssessments';
import { useUpcomingOfficialStudentEvents, UpcomingOfficialStudentEvent } from '@/hooks/useOfficialStudentEvents';
import { UpcomingAssessment } from '@/utils/assessments';
import { computeProgressionStats } from '@/utils/progression';
import { getNewDates, readPrintMeta } from '@/utils/printMeta';
import { JournalEntry, opLabel, readJournal, timeAgoFr } from '@/utils/journal';
import {
  ClassSignal,
  collectClassSignals,
  collectCrossClassSignals,
  formatDateFR,
  readClassLessons,
  readIgnoredActionIds,
  requestEditorModal,
  requestSessionFocus,
  sortSignals,
  writeIgnoredActionIds,
} from '@/utils/notificationSignals';

/**
 * Centre de notifications — reconstruit dans le langage visuel Ant Design 5
 * (jetons AntD : bleu #1677ff, rayons 6/8, densité « compact », List/Tag/
 * Segmented/Empty, ombres de dropdown/modal). Compact, flexible (rail + menu
 * sur desktop, segmented sur mobile) et robuste (troncatures, états vides,
 * scroll interne, gestion clavier via Radix). Le moteur de données
 * `useNotificationFeed` reste inchangé ; seule la couche visuelle est refaite.
 */

/* ------------------------------------------------------------------ */
/*  Données (moteur inchangé)                                          */
/* ------------------------------------------------------------------ */

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

    // Semaine de devoir imminente (≤ 7 jours) — préparation du sujet et de la salle
    for (const item of assessments.filter(a => a.inDays <= 7)) {
      const id = `dsweek:${item.classId}:${item.id}:${item.dateISO}`;
      all.push({
        id,
        kind: 'assessment-week',
        action: 'evaluations',
        classId: item.classId,
        className: classNameById.get(item.classId) ?? formatClassDisplayName(item.className),
        title: `${item.label.split(' — ')[0]} ${item.inDays <= 0 ? "aujourd'hui" : item.inDays === 1 ? 'demain' : `dans ${item.inDays} jours`}`,
        detail: `Prévu le ${formatDateFR(item.dateISO)} — préparez le sujet et vérifiez la date depuis les évaluations de la classe.`,
        date: item.dateISO,
        ignored: readIgnoredActionIds(item.classId).has(id),
      });
    }

    // Devoir surveillé du jour ou passé sans liste d'absents consignée
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
        detail: `${item.label.split(' — ')[0]} ${whenLabel} (${formatDateFR(item.dateISO)}) — saisissez les élèves absents dès la séance, même « aucun absent » compte.`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, config, assessments, pastAssessments, officialEvents, refreshKey]);
};

/* ------------------------------------------------------------------ */
/*  Jetons Ant Design 5 & primitives visuelles                         */
/* ------------------------------------------------------------------ */

const ANT = {
  primary: '#1677ff',
  primaryHover: '#4096ff',
  primaryActive: '#0958d9',
  error: '#ff4d4f',
  text: 'rgba(0,0,0,0.88)',
  textSec: 'rgba(0,0,0,0.65)',
  textTer: 'rgba(0,0,0,0.45)',
  border: '#d9d9d9',
  borderSec: '#f0f0f0',
  fill: 'rgba(0,0,0,0.04)',
  layout: '#fafafa',
} as const;

type Tone = 'blue' | 'red' | 'green' | 'gold' | 'default';
const TAG: Record<Tone, { bg: string; border: string; text: string }> = {
  blue: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
  red: { bg: '#fff2f0', border: '#ffccc7', text: '#cf1322' },
  green: { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d' },
  gold: { bg: '#fffbe6', border: '#ffe58f', text: '#d48806' },
  default: { bg: 'rgba(0,0,0,0.02)', border: ANT.border, text: ANT.textSec },
};

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

/** Bouton Ant Design (taille small, 24 px), variantes primary / default / text. */
const AntBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'default' | 'text' }
> = ({ variant = 'default', className, children, ...props }) => {
  const styles: Record<string, string> = {
    primary: 'bg-[#1677ff] text-white shadow-[0_2px_0_rgba(5,145,255,0.1)] hover:bg-[#4096ff] active:bg-[#0958d9]',
    default: 'border border-[#d9d9d9] bg-white text-[rgba(0,0,0,0.88)] hover:border-[#4096ff] hover:text-[#1677ff]',
    text: 'text-[rgba(0,0,0,0.65)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[rgba(0,0,0,0.88)]',
  };
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2.5 text-[12px] font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677ff]/25 disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const AntTag: React.FC<{ tone?: Tone; className?: string; children: React.ReactNode }> = ({ tone = 'default', className, children }) => {
  const p = TAG[tone];
  return (
    <span
      className={cn('inline-flex items-center rounded px-1.5 text-[11px] font-medium leading-[18px]', className)}
      style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.text }}
    >
      {children}
    </span>
  );
};

const AntEmpty: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(0,0,0,0.03)] text-[rgba(0,0,0,0.2)]">
      <Check className="h-5 w-5" />
    </span>
    <p className="text-[13px] font-semibold text-[rgba(0,0,0,0.65)]">{title}</p>
    <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-[rgba(0,0,0,0.45)]">{description}</p>
  </div>
);

/** cartouche numérique d'un axe (rouge = attention, gris sinon). */
const AxisCount: React.FC<{ value: number; emphasize?: boolean; active?: boolean }> = ({ value, emphasize, active }) => (
  <span
    className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none"
    style={
      emphasize
        ? { background: ANT.error, color: '#fff' }
        : active
          ? { background: '#fff', color: ANT.primary, border: `1px solid ${TAG.blue.border}` }
          : { background: 'rgba(0,0,0,0.06)', color: ANT.textSec }
    }
  >
    {value > 99 ? '99+' : value}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Types internes de vue                                              */
/* ------------------------------------------------------------------ */

type AxisId = 'priorites' | 'echeances' | 'classes' | 'activite' | 'ignores';

interface AxisDef {
  id: AxisId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
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

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

interface NotificationCenterProps {
  classes: ClassInfo[];
  feed: NotificationFeed;
  onSelectClass: (classInfo: ClassInfo) => void;
  onOpenSettings: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** demande une relecture du flux (après ignorer/réactiver) */
  onMutate: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  classes,
  feed,
  onSelectClass,
  onOpenSettings,
  isOpen,
  onOpenChange,
  onMutate,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeAxis, setActiveAxis] = useState<AxisId>('priorites');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const open = isOpen ?? internalOpen;
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

  const filteredCorrections = selectedClass ? corrections.filter(s => s.classId === selectedClass.id) : corrections;
  const filteredIgnored = selectedClass ? ignoredCorrections.filter(s => s.classId === selectedClass.id) : ignoredCorrections;
  const filteredAssessments = selectedClass ? assessments.filter(i => i.classId === selectedClass.id) : assessments;
  const filteredOfficial = selectedClass ? officialEvents.filter(i => i.classNames.includes(selectedClass.name)) : officialEvents;
  const filteredOverviews = selectedClass ? classOverviews.filter(o => o.classInfo.id === selectedClass.id) : classOverviews;
  // Vue globale volontairement courte ; une classe sélectionnée ouvre son journal complet (60 actions max).
  const activitySource = selectedClass
    ? allActivityEntries.filter(entry => entry.classId === selectedClass.id)
    : allActivityEntries.slice(0, 25);
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

  const axes: AxisDef[] = [
    { id: 'priorites', label: 'Priorités', icon: CircleAlert, count: filteredCorrections.length, emphasize: true },
    { id: 'echeances', label: 'Échéances', icon: CalendarCheck, count: filteredAssessments.length + filteredOfficial.length },
    { id: 'classes', label: 'Classes', icon: GraduationCap, count: filteredOverviews.length },
    { id: 'activite', label: 'Activité', icon: History, count: filteredActivity.length },
    ...(filteredIgnored.length > 0
      ? [{ id: 'ignores' as AxisId, label: 'Ignorés', icon: Undo2, count: filteredIgnored.length }]
      : []),
  ];
  const activeAxisDef = axes.find(axis => axis.id === activeAxis) ?? axes[0];

  const updateOpen = (next: boolean) => {
    if (isOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Effets d'ouverture (déclenchés par le trigger ET par une ouverture externe) :
  // relecture du stockage + sélection de l'axe le plus pertinent.
  useEffect(() => {
    if (!open) return;
    onMutate();
    setActiveAxis(
      corrections.length > 0
        ? 'priorites'
        : assessments.length + officialEvents.length > 0
          ? 'echeances'
          : 'classes',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClassFilterChange = (nextClassId: string) => {
    setSelectedClassId(nextClassId);
    if (nextClassId === 'all') return;
    const nextClass = classes.find(c => c.id === nextClassId);
    if (!nextClass) return;
    const available: Record<AxisId, boolean> = {
      priorites: corrections.some(s => s.classId === nextClass.id),
      echeances: assessments.some(i => i.classId === nextClass.id) || officialEvents.some(i => i.classNames.includes(nextClass.name)),
      classes: true,
      activite: allActivityEntries.some(e => e.classId === nextClass.id),
      ignores: ignoredCorrections.some(s => s.classId === nextClass.id),
    };
    if (!available[activeAxis]) {
      setActiveAxis(available.priorites ? 'priorites' : available.echeances ? 'echeances' : 'classes');
    }
  };

  const openClassById = (classId: string) => {
    const classInfo = classes.find(item => item.id === classId);
    if (!classInfo) return;
    updateOpen(false);
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
        try { sessionStorage.setItem('config_initial_tab_v1', 'emploi'); } catch { /* stockage indisponible */ }
        updateOpen(false);
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
    toast.info('Point conservé comme exception — réactivable depuis l’axe « Ignorés ».');
  };

  const restoreSignal = (signal: ClassSignal) => {
    const ids = readIgnoredActionIds(signal.classId);
    ids.delete(signal.id);
    writeIgnoredActionIds(signal.classId, ids);
    onMutate();
    if (activeAxis === 'ignores' && filteredIgnored.length <= 1) setActiveAxis('priorites');
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={updateOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={attentionCount > 0 ? `Notifications, ${attentionCount} à traiter` : 'Notifications'}
          data-tippy-content={attentionCount > 0 ? `${attentionCount} notification${attentionCount > 1 ? 's' : ''}` : 'Notifications'}
          className={cn(
            'group relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 sm:h-9 sm:w-9',
            attentionCount > 0
              ? 'bg-[#e6f4ff] text-[#1677ff] hover:bg-[#bae0ff]'
              : 'text-[rgba(0,0,0,0.55)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1677ff]',
          )}
        >
          <Bell className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
          {attentionCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white"
              style={{ background: ANT.error, boxShadow: '0 0 0 1.5px #fff' }}
            >
              {attentionCount > 99 ? '99+' : attentionCount}
            </span>
          )}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={event => event.preventDefault()}
          className={cn(
            // Desktop : modale AntD centrée, compacte. Mobile : quasi plein écran, ancrée en bas.
            'mobile-modal-content fixed z-50 flex flex-col overflow-hidden bg-white outline-none',
            'left-1/2 top-1/2 w-[min(680px,calc(100vw-24px))] max-h-[min(680px,calc(100vh-48px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#f0f0f0]',
            'shadow-[0_6px_16px_rgba(0,0,0,0.08),0_3px_6px_-4px_rgba(0,0,0,0.12),0_9px_28px_8px_rgba(0,0,0,0.05)]',
            'max-md:inset-x-2 max-md:bottom-[max(0.5rem,env(safe-area-inset-bottom))] max-md:left-2 max-md:top-auto max-md:max-h-[94dvh] max-md:w-auto max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          )}
        >
          {/* En-tête AntD Modal */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0f0f0] px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="flex items-center gap-2 text-[15px] font-semibold leading-tight text-[rgba(0,0,0,0.88)]">
                <Bell className="h-4 w-4 text-[#1677ff]" />
                Notifications
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-[12px] leading-tight text-[rgba(0,0,0,0.45)]">
                {filteredAttention > 0
                  ? `${filteredAttention} à traiter${selectedClass ? ` · ${formatClassDisplayName(selectedClass.name)}` : ''}`
                  : 'Tout est à jour'}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Fermer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[rgba(0,0,0,0.45)] transition-colors hover:bg-[rgba(0,0,0,0.06)] hover:text-[rgba(0,0,0,0.88)] md:h-7 md:w-7 md:rounded-md"
            >
              <X className="h-3.5 w-3.5" />
            </DialogPrimitive.Close>
          </div>

          {/* Corps : rail (desktop) + colonne de contenu */}
          <div className="rtl-notifications flex min-h-0 flex-1 md:flex-row">
            {/* Rail vertical type Menu AntD (desktop) */}
            <nav className="hidden w-[168px] shrink-0 flex-col gap-0.5 border-r border-[#f0f0f0] bg-[#fafafa] p-2 md:flex" aria-label="Axes">
              {axes.map(axis => {
                const active = axis.id === activeAxis;
                return (
                  <button
                    key={axis.id}
                    type="button"
                    onClick={() => setActiveAxis(axis.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors',
                      active
                        ? 'bg-[#e6f4ff] font-semibold text-[#1677ff]'
                        : 'text-[rgba(0,0,0,0.65)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[rgba(0,0,0,0.88)]',
                    )}
                  >
                    <axis.icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-[#1677ff]' : 'text-[rgba(0,0,0,0.4)]')} />
                    <span className="flex-1 truncate text-left">{axis.label}</span>
                    {axis.count > 0 && <AxisCount value={axis.count} emphasize={axis.emphasize} active={active} />}
                  </button>
                );
              })}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Onglets Segmented AntD (mobile) */}
              <div className="shrink-0 overflow-x-auto border-b border-[#f0f0f0] px-2 py-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="inline-flex min-w-full gap-1 rounded-lg bg-[#f5f5f5] p-1">
                  {axes.map(axis => {
                    const active = axis.id === activeAxis;
                    return (
                      <button
                        key={axis.id}
                        type="button"
                        onClick={() => setActiveAxis(axis.id)}
                        className={cn(
                          'flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-all active:scale-[0.98] md:h-7 md:px-2.5',
                          active ? 'bg-white text-[rgba(0,0,0,0.88)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]' : 'text-[rgba(0,0,0,0.6)]',
                        )}
                      >
                        {axis.label}
                        {axis.count > 0 && <AxisCount value={axis.count} emphasize={axis.emphasize} active={active} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Barre d'outils : titre d'axe (desktop) + filtre classe */}
              <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[#f0f0f0] px-3">
                <span className="hidden items-center gap-2 text-[13px] font-semibold text-[rgba(0,0,0,0.88)] md:flex">
                  {activeAxisDef.label}
                  {activeAxisDef.count > 0 && <AntTag tone={activeAxisDef.emphasize ? 'red' : 'default'}>{activeAxisDef.count}</AntTag>}
                </span>
                <Select value={classFilterValue} onValueChange={handleClassFilterChange}>
                  <SelectTrigger
                    aria-label="Filtrer par classe"
                    className="ml-auto h-9 w-[min(15rem,68vw)] rounded-lg border-[#d9d9d9] bg-white px-3 text-[12px] font-medium text-[rgba(0,0,0,0.88)] shadow-none focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/10 md:h-7 md:w-[210px] md:rounded-md md:px-2.5"
                  >
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent className="z-[80] rounded-lg border-[#f0f0f0] shadow-[0_6px_16px_rgba(0,0,0,0.08),0_3px_6px_-4px_rgba(0,0,0,0.12),0_9px_28px_8px_rgba(0,0,0,0.05)]">
                    <SelectItem value="all" className="text-[12px]">Toutes les classes</SelectItem>
                    {classes.map(classInfo => (
                      <SelectItem key={classInfo.id} value={classInfo.id} className="text-[12px]">
                        {formatClassDisplayName(classInfo.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeAxis === 'activite' && (
                <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[#f0f0f0] px-3 py-1.5" aria-label="Filtres de l’activité">
                  <span className="shrink-0 text-[10px] font-medium text-[rgba(0,0,0,0.45)]">
                    {selectedClass
                      ? `${activitySource.length} action${activitySource.length > 1 ? 's' : ''} · journal de classe`
                      : `${activitySource.length} actions récentes`}
                  </span>
                  <div className="ml-auto inline-flex shrink-0 rounded-md bg-[#f5f5f5] p-0.5" role="tablist" aria-label="Catégories d’activité">
                    {ACTIVITY_FILTERS.map(filter => (
                      <button
                        key={filter.id}
                        type="button"
                        role="tab"
                        aria-selected={activityFilter === filter.id}
                        onClick={() => setActivityFilter(filter.id)}
                        className={cn(
                          'h-8 rounded px-2.5 text-[10px] font-medium transition-colors active:scale-[0.98] md:h-6 md:px-2',
                          activityFilter === filter.id
                            ? 'bg-white text-[rgba(0,0,0,0.88)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                            : 'text-[rgba(0,0,0,0.55)] hover:text-[rgba(0,0,0,0.88)]',
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone défilable */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                {activeAxis === 'priorites' && (
                  filteredCorrections.length === 0
                    ? <AntEmpty title="Aucune priorité en attente" description="Séances non consignées, dates à vérifier, devoirs imminents, absents à saisir apparaîtront ici, reliés à leur source." />
                    : (
                      <ul className="divide-y divide-[#f0f0f0]">
                        {filteredCorrections.map(signal => {
                          const visual = KIND_VISUAL[signal.kind];
                          const Icon = visual.icon;
                          const tone = TAG[visual.tone];
                          return (
                            <li key={signal.id} className="flex gap-3 py-3">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: tone.bg, color: tone.text }}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h3 className="min-w-0 break-words text-[13px] font-semibold leading-snug text-[rgba(0,0,0,0.88)]">{signal.title}</h3>
                                  {signal.className && <AntTag tone="blue">{signal.className}</AntTag>}
                                </div>
                                <p className="mt-0.5 text-[12px] leading-relaxed text-[rgba(0,0,0,0.55)]">{signal.detail}</p>
                                <div className="mt-2 flex items-center justify-end gap-1.5">
                                  <AntBtn variant="text" onClick={() => ignoreSignal(signal)}>Ignorer</AntBtn>
                                  <AntBtn variant="primary" onClick={() => resolveSignal(signal)}>{ACTION_LABEL[signal.action]}</AntBtn>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )
                )}

                {activeAxis === 'echeances' && (
                  filteredAssessments.length === 0 && filteredOfficial.length === 0
                    ? <AntEmpty title="Aucune échéance proche" description="Devoirs indicatifs (14 jours) et jalons du bulletin officiel (30 jours) apparaîtront ici." />
                    : (
                      <ul className="divide-y divide-[#f0f0f0]">
                        {filteredAssessments.map(item => (
                          <li key={`${item.classId}-${item.id}`}>
                            <button type="button" onClick={() => openClassById(item.classId)} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.02)]">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: item.inDays <= 3 ? TAG.red.bg : TAG.blue.bg, color: item.inDays <= 3 ? TAG.red.text : TAG.blue.text }}>
                                <CalendarCheck className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-[13px] font-semibold leading-snug text-[rgba(0,0,0,0.88)]">
                                  {formatClassDisplayName(item.className)} — {item.label.split(' — ')[0]}
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <AntTag tone={item.inDays <= 3 ? 'red' : 'blue'}>{delayLabel(item.inDays)}</AntTag>
                                  <span className="text-[11px] text-[rgba(0,0,0,0.45)]">{formatDateFR(item.dateISO)} · devoir indicatif</span>
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                        {filteredOfficial.map(item => (
                          <li key={`official-${item.event.id}`} className="flex items-start gap-3 py-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: TAG.blue.bg, color: TAG.blue.text }}>
                              <CalendarRange className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <AntTag tone="blue">Officiel</AntTag>
                                <span className="break-words text-[13px] font-semibold leading-snug text-[rgba(0,0,0,0.88)]">{item.event.title}</span>
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-[rgba(0,0,0,0.45)]">
                                {delayLabel(item.inDays)} · {item.classNames.slice(0, 3).map(formatClassDisplayName).join(', ')}{item.classNames.length > 3 ? '…' : ''}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )
                )}

                {activeAxis === 'classes' && (
                  filteredOverviews.length === 0
                    ? <AntEmpty title="Aucune classe" description="Créez un cahier pour suivre ici sa progression et son état." />
                    : (
                      <ul className="divide-y divide-[#f0f0f0]">
                        {filteredOverviews.map(overview => (
                          <li key={overview.classInfo.id}>
                            <button type="button" onClick={() => openClassById(overview.classInfo.id)} className="block w-full py-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.02)]">
                              <span className="flex items-center gap-2.5">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] font-semibold leading-snug text-[rgba(0,0,0,0.88)]">{overview.className}</span>
                                  <span className="mt-0.5 block text-[11px] text-[rgba(0,0,0,0.45)]">
                                    {overview.sessionsCount} séance{overview.sessionsCount > 1 ? 's' : ''} · {overview.lastDate ? `dernière saisie ${formatDateFR(overview.lastDate)}` : 'aucune séance datée'}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right">
                                  <span className="block text-[15px] font-bold leading-none tabular-nums text-[#1677ff]">{overview.completionRate}%</span>
                                </span>
                              </span>
                              <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[#f5f5f5]" aria-hidden>
                                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, overview.completionRate))}%`, background: ANT.primary }} />
                              </span>
                              <span className="mt-1.5 flex items-center justify-between gap-3 text-[11px]">
                                <span className={overview.toPrintCount > 0 ? 'font-medium text-[#1677ff]' : 'text-[rgba(0,0,0,0.4)]'}>
                                  {overview.toPrintCount > 0 ? `${overview.toPrintCount} séance${overview.toPrintCount > 1 ? 's' : ''} à imprimer` : 'Impressions à jour'}
                                </span>
                                <span className="text-[rgba(0,0,0,0.4)]">{overview.lastPrintedAt ? `Imprimé ${timeAgoFr(overview.lastPrintedAt)}` : 'Jamais imprimé'}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )
                )}

                {activeAxis === 'activite' && (
                  filteredActivity.length === 0
                    ? <AntEmpty title="Aucune activité dans cette catégorie" description="Changez de catégorie ou de classe pour consulter les actions enregistrées." />
                    : (
                      <div className="pb-2">
                        {groupedActivityDays.map((day, dayIndex) => (
                          <section key={`${day.label}-${dayIndex}`} className="pt-2">
                            <h3 className="sticky top-0 z-10 -mx-3 border-b border-[#f0f0f0] bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)] backdrop-blur">
                              {day.label}
                            </h3>
                            <ul className="divide-y divide-[#f0f0f0]">
                              {day.entries.map((entry, index) => (
                                <li key={`${entry.classId}-${entry.at}-${index}`}>
                                  <button
                                    type="button"
                                    onClick={() => openClassById(entry.classId)}
                                    aria-label={`Ouvrir ${entry.className} après ${opLabel(entry.op)}`}
                                    className="flex w-full items-start gap-2.5 py-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.02)]"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ANT.primary }} aria-hidden />
                                    <span className="min-w-0 flex-1">
                                      <span className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[12px] font-medium leading-snug text-[rgba(0,0,0,0.88)]">{opLabel(entry.op)}</span>
                                        {entry.count > 1 && <AntTag tone="default">×{entry.count}</AntTag>}
                                        {!selectedClass && <AntTag tone="blue">{entry.className}</AntTag>}
                                      </span>
                                      <span className="mt-0.5 block text-[10px] text-[rgba(0,0,0,0.4)]">
                                        {timeAgoFr(entry.at)} · {timeRangeLabel(entry)}
                                      </span>
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    )
                )}

                {activeAxis === 'ignores' && (
                  filteredIgnored.length === 0
                    ? <AntEmpty title="Aucune exception" description="Les points ignorés depuis les priorités ou la vérification de dates apparaîtront ici, réactivables." />
                    : (
                      <ul className="divide-y divide-[#f0f0f0]">
                        {filteredIgnored.map(signal => (
                          <li key={signal.id} className="flex items-center gap-2.5 py-3">
                            <span className="min-w-0 flex-1 text-[12px] leading-snug text-[rgba(0,0,0,0.5)]">
                              {signal.className ? `${signal.className} — ` : ''}{signal.title}
                            </span>
                            <AntBtn variant="default" onClick={() => restoreSignal(signal)}>Réactiver</AntBtn>
                          </li>
                        ))}
                      </ul>
                    )
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
