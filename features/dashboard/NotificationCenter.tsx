import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell, CalendarCheck, CircleAlert, GraduationCap, History, Undo2,
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
 * Centre de notifications GLOBAL — la base d'information du tableau de bord.
 * Organisé en AXES via une barre latérale (rail vertical sur grand écran,
 * onglets horizontaux sur mobile) :
 *   · Priorités  — singularités par classe (dates, emploi du temps, volume
 *                  horaire — mêmes ids et mémoire « ignoré » que l'éditeur)
 *                  + retards de saisie ;
 *   · Échéances  — devoirs indicatifs (≤ 14 j) + jalons officiels (≤ 30 j) ;
 *   · Classes    — état réel de chaque cahier : progression, séances,
 *                  dernière saisie, impressions en attente ;
 *   · Activité   — journal des dernières actions, toutes classes confondues ;
 *   · Ignorés    — exceptions réactivables (synchronisées avec l'éditeur).
 * Chaque entrée est reliée à sa fonctionnalité : ouverture du cahier avec
 * focus sur l'élément, ou de Paramètres ▸ Emploi du temps.
 */

export interface NotificationFeed {
  /** situations pratiques actives (non ignorées), toutes classes confondues */
  corrections: ClassSignal[];
  /** situations mises en exception — réactivables */
  ignoredCorrections: ClassSignal[];
  /** devoirs indicatifs à ≤ 14 jours */
  assessments: UpcomingAssessment[];
  /** jalons officiels à ≤ 30 jours */
  officialEvents: UpcomingOfficialStudentEvent[];
  /** compteur du badge : situations à traiter + jalons officiels imminents */
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

    // Devoir surveillé passé sans liste d'absents consignée
    for (const item of pastAssessments.filter(a => a.type === 'controle')) {
      const saisi = config.assessmentAbsences?.[item.classId]?.[item.id];
      if (saisi) continue; // liste saisie (même vide = « aucun absent » confirmé)
      const id = `absences:${item.classId}:${item.id}:${item.dateISO}`;
      all.push({
        id,
        kind: 'absences',
        action: 'evaluations',
        classId: item.classId,
        className: classNameById.get(item.classId) ?? formatClassDisplayName(item.className),
        title: 'Absents du devoir à consigner',
        detail: `${item.label.split(' — ')[0]} passé ${item.daysAgo === 1 ? 'hier' : `il y a ${item.daysAgo} jours`} (${formatDateFR(item.dateISO)}) — aucun élève absent n'est encore saisi, même « aucun » compte.`,
        date: item.dateISO,
        ignored: readIgnoredActionIds(item.classId).has(id),
      });
    }

    const corrections = sortSignals(all.filter(signal => !signal.ignored));
    const ignoredCorrections = sortSignals(all.filter(signal => signal.ignored));
    // les devoirs urgents sont déjà des signaux : seuls les jalons officiels imminents s'ajoutent
    const urgentOfficial = officialEvents.filter(item => item.inDays <= 3).length;
    return {
      corrections,
      ignoredCorrections,
      assessments,
      officialEvents,
      attentionCount: corrections.length + urgentOfficial,
    };
    // refreshKey force la relecture du stockage après « Ignorer/Réactiver ».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, config, assessments, pastAssessments, officialEvents, refreshKey]);
};

/** libellé du bouton principal selon la destination du signal */
const ACTION_LABEL: Record<ClassSignal['action'], string> = {
  class: 'Ouvrir le cahier',
  timetable: 'Emploi du temps',
  evaluations: 'Évaluations',
  print: 'Imprimer',
  export: 'Exporter une copie',
};

const BLUE = '#0056D2';

const delayLabel = (inDays: number): string => {
  if (inDays <= 0) return "aujourd'hui";
  if (inDays === 1) return 'demain';
  return `dans ${inDays} jours`;
};

type AxisId = 'priorites' | 'echeances' | 'classes' | 'activite' | 'ignores';

interface AxisDef {
  id: AxisId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  /** compteur affiché en bleu quand il demande l'attention */
  emphasize?: boolean;
}

/** État réel d'un cahier — l'axe « Classes » du centre. */
interface ClassOverview {
  classInfo: ClassInfo;
  className: string;
  completionRate: number;
  sessionsCount: number;
  lastDate: string | null;
  /** séances jamais imprimées */
  toPrintCount: number;
  lastPrintedAt: string | null;
}

interface ActivityEntry extends JournalEntry {
  classId: string;
  className: string;
}

const EmptyPane: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="px-2 py-7 text-center">
    <p className="text-xs font-extrabold text-emerald-800">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-[10px] font-medium leading-relaxed text-zinc-500">{detail}</p>
  </div>
);

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
  const open = isOpen ?? internalOpen;
  const { corrections, ignoredCorrections, assessments, officialEvents, attentionCount } = feed;

  /*
   * Axe « Classes » + axe « Activité » : lus depuis le stockage local à chaque
   * rafraîchissement du flux (identité de `feed`) — donc à l'ouverture du
   * panneau et après chaque action, sans coût pendant la frappe ailleurs.
   */
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

  const activityEntries = useMemo<ActivityEntry[]>(() => classes
    .flatMap(classInfo => readJournal(classInfo.id).map(entry => ({
      ...entry,
      classId: classInfo.id,
      className: formatClassDisplayName(classInfo.name),
    })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 25),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, feed]);

  const selectedClass = selectedClassId === 'all'
    ? null
    : classes.find(classInfo => classInfo.id === selectedClassId) ?? null;
  const classFilterValue = selectedClass?.id ?? 'all';
  const filteredCorrections = selectedClass
    ? corrections.filter(signal => signal.classId === selectedClass.id)
    : corrections;
  const filteredIgnoredCorrections = selectedClass
    ? ignoredCorrections.filter(signal => signal.classId === selectedClass.id)
    : ignoredCorrections;
  const filteredAssessments = selectedClass
    ? assessments.filter(item => item.classId === selectedClass.id)
    : assessments;
  const filteredOfficialEvents = selectedClass
    ? officialEvents.filter(item => item.classNames.includes(selectedClass.name))
    : officialEvents;
  const filteredClassOverviews = selectedClass
    ? classOverviews.filter(overview => overview.classInfo.id === selectedClass.id)
    : classOverviews;
  const filteredActivityEntries = selectedClass
    ? activityEntries.filter(entry => entry.classId === selectedClass.id)
    : activityEntries;
  const filteredAttentionCount = filteredCorrections.length
    + filteredOfficialEvents.filter(item => item.inDays <= 3).length;

  const axes: AxisDef[] = [
    { id: 'priorites', label: 'Priorités', icon: CircleAlert, count: filteredCorrections.length, emphasize: true },
    { id: 'echeances', label: 'Échéances', icon: CalendarCheck, count: filteredAssessments.length + filteredOfficialEvents.length },
    { id: 'classes', label: 'Classes', icon: GraduationCap, count: filteredClassOverviews.length },
    { id: 'activite', label: 'Activité', icon: History, count: filteredActivityEntries.length },
    ...(filteredIgnoredCorrections.length > 0
      ? [{ id: 'ignores' as AxisId, label: 'Ignorés', icon: Undo2, count: filteredIgnoredCorrections.length }]
      : []),
  ];
  const activeAxisDef = axes.find(axis => axis.id === activeAxis) ?? axes[0];

  const handleClassFilterChange = (nextClassId: string) => {
    setSelectedClassId(nextClassId);
    if (nextClassId === 'all') return;

    const nextClass = classes.find(classInfo => classInfo.id === nextClassId);
    if (!nextClass) return;

    const available: Record<AxisId, boolean> = {
      priorites: corrections.some(signal => signal.classId === nextClass.id),
      echeances: assessments.some(item => item.classId === nextClass.id)
        || officialEvents.some(item => item.classNames.includes(nextClass.name)),
      classes: true,
      activite: activityEntries.some(entry => entry.classId === nextClass.id),
      ignores: ignoredCorrections.some(signal => signal.classId === nextClass.id),
    };

    if (!available[activeAxis]) {
      setActiveAxis(available.priorites ? 'priorites' : available.echeances ? 'echeances' : 'classes');
    }
  };

  const updateOpen = (next: boolean) => {
    if (isOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const handleOpenChange = (next: boolean) => {
    updateOpen(next);
    if (next) {
      onMutate(); // relit le stockage à l'ouverture (retour d'un cahier)
      // Ouvre sur l'axe le plus pertinent du moment.
      setActiveAxis(
        corrections.length > 0
          ? 'priorites'
          : assessments.length + officialEvents.length > 0
            ? 'echeances'
            : 'classes'
      );
    }
  };

  const openClassById = (classId: string) => {
    const classInfo = classes.find(item => item.id === classId);
    if (!classInfo) return;
    updateOpen(false);
    onSelectClass(classInfo);
  };

  /** classe la plus récemment active — destination des signaux globaux (sauvegarde) */
  const mostActiveClassId = (): string | null => {
    let best: { classId: string; at: string } | null = null;
    for (const classInfo of classes) {
      const last = readJournal(classInfo.id)[0];
      if (last && (!best || last.at > best.at)) best = { classId: classInfo.id, at: last.at };
    }
    return best?.classId ?? classes[0]?.id ?? null;
  };

  /** chaque signal mène à l'endroit exact où la situation se corrige */
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
      case 'print':
        requestEditorModal({ classId: signal.classId, modal: 'print', expiresAt: Date.now() + 120_000 });
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
    if (activeAxis === 'ignores' && filteredIgnoredCorrections.length <= 1) {
      setActiveAxis('priorites');
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => handleOpenChange(true)}
        aria-expanded={open}
        data-tippy-content={attentionCount > 0 ? `${attentionCount} notification${attentionCount > 1 ? 's' : ''}` : 'Notifications'}
        aria-label={attentionCount > 0
          ? `Centre de notifications, ${attentionCount} point${attentionCount > 1 ? 's' : ''} à traiter`
          : 'Centre de notifications'}
        className={`group relative h-9 w-9 overflow-visible rounded-xl border-0 shadow-none transition-all duration-200 hover:-translate-y-px ${attentionCount > 0
          ? 'bg-[#eef5ff] text-[#0056D2] hover:bg-[#e2eeff] hover:text-[#0048b5]'
          : 'bg-transparent text-zinc-400 hover:bg-[#f2f6fc] hover:text-[#0056D2]'}`}
      >
        <Bell className={`h-[17px] w-[17px] transition-transform duration-200 ${attentionCount > 0 ? 'group-hover:-rotate-6 group-hover:scale-105' : 'group-hover:scale-105'}`} />
        {attentionCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0056D2] px-1 text-[8px] font-black leading-none text-white ring-2 ring-[#f8f9fb]">
            {Math.min(attentionCount, 9)}{attentionCount > 9 ? '+' : ''}
          </span>
        )}
      </Button>

      <Modal
        isOpen={open}
        onClose={() => handleOpenChange(false)}
        title="Centre de notifications"
        description={filteredAttentionCount > 0
          ? `${filteredAttentionCount} priorité${filteredAttentionCount > 1 ? 's' : ''} à traiter${selectedClass ? ` pour ${formatClassDisplayName(selectedClass.name)}` : ''}.`
          : 'Tout est à jour.'}
        maxWidth="2xl"
        className="inset-x-1 bottom-[max(0.25rem,env(safe-area-inset-bottom))] top-auto m-0 mx-auto h-[min(94dvh,760px)] w-[calc(100vw-0.5rem)] rounded-[1.5rem] border-0 shadow-[0_24px_80px_rgba(15,23,42,0.24)] ring-1 ring-black/5 transition-[height,width,border-radius] duration-300 ease-out md:inset-0 md:m-auto md:h-[min(620px,calc(100dvh-2rem))] md:w-[calc(100vw-1.5rem)] md:max-w-[900px] md:rounded-[1.25rem] md:[&_.dialog-close]:right-4 md:[&_.dialog-close]:top-4 md:[&_.dialog-close]:h-8 md:[&_.dialog-close]:w-8 [&_.dialog-close]:right-2.5 [&_.dialog-close]:top-2.5 [&_.dialog-close]:h-10 [&_.dialog-close]:w-10"
        headerClassName="sr-only"
        bodyClassName="flex min-h-0 flex-col overflow-hidden bg-white p-0 md:flex-row"
      >
        <div className="flex h-[52px] shrink-0 items-center border-b border-zinc-200/80 bg-white/95 px-4 pr-14 pt-1 backdrop-blur-xl md:hidden">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold tracking-[-0.01em] text-zinc-950">Centre de notifications</p>
            <p className="mt-px text-[9px] font-semibold text-zinc-500">
              {filteredAttentionCount > 0 ? `${filteredAttentionCount} à traiter` : 'Tout est à jour'}
            </p>
          </div>
        </div>

        {/* Barre latérale des axes — rail vertical (desktop), onglets (mobile) */}
        <nav
          aria-label="Axes du centre de notifications"
          className="flex shrink-0 touch-pan-x snap-x gap-1.5 overflow-x-auto border-b border-zinc-200/80 bg-white/95 px-2.5 py-2 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-[176px] md:flex-col md:gap-0.5 md:overflow-visible md:border-b-0 md:border-r md:bg-[#f7f8fa] md:px-3 md:py-3.5"
        >
          <div className="mb-2 hidden border-b border-zinc-200 px-1 pb-3 md:block">
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Centre d'alertes</p>
            <p className="mt-1 text-[14px] font-extrabold tracking-[-0.015em] text-zinc-950">Notifications</p>
            <p className="mt-1 text-[9px] font-semibold text-zinc-500">
              {filteredAttentionCount > 0 ? `${filteredAttentionCount} à traiter` : 'Tout est à jour'}
            </p>
          </div>

          {axes.map(axis => {
            const isActive = axis.id === activeAxis;
            return (
              <button
                key={axis.id}
                type="button"
                onClick={() => setActiveAxis(axis.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-full px-3 text-left text-[11px] font-bold transition-all active:scale-[0.98] md:h-8 md:w-full md:rounded-lg md:px-2.5 md:text-[10px] ${
                  isActive
                    ? 'bg-[#0056D2] text-white shadow-sm md:bg-[#eaf2ff] md:text-[#0056D2] md:shadow-none'
                    : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 md:bg-transparent'
                }`}
              >
                <axis.icon className={`hidden h-3.5 w-3.5 shrink-0 md:block ${isActive ? 'text-[#0056D2]' : 'text-zinc-400'}`} />
                <span className="flex-1 whitespace-nowrap">{axis.label}</span>
                {axis.count > 0 && (
                  <span className={`ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none ${
                    axis.emphasize && axis.count > 0
                      ? isActive
                        ? 'bg-white text-[#0056D2] md:bg-[#0056D2] md:text-white'
                        : 'bg-[#0056D2] text-white'
                      : isActive
                        ? 'bg-white/20 text-white md:bg-white md:text-[#0056D2]'
                        : 'bg-zinc-200/70 text-zinc-500'
                  }`}>
                    {axis.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-auto hidden border-t border-zinc-200 px-1 pt-3 text-[8px] font-semibold text-zinc-400 md:block">
            Données actualisées en temps réel
          </div>
        </nav>

        {/* Contenu de l'axe actif */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-zinc-100 bg-white/95 px-3.5 backdrop-blur-xl md:px-5 md:pr-12">
            <div className="hidden min-w-0 items-center md:flex">
              <span className="truncate text-xs font-extrabold tracking-[-0.01em] text-zinc-950">{activeAxisDef.label}</span>
              {activeAxisDef.count > 0 && (
                <span className="ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fff7e6] px-1 text-[9px] font-black text-[#ad6800] ring-1 ring-[#ffd591]">
                  {activeAxisDef.count}
                </span>
              )}
            </div>

            <span className="shrink-0 text-[10px] font-bold text-zinc-500 md:hidden">Classe</span>
            <Select value={classFilterValue} onValueChange={handleClassFilterChange}>
              <SelectTrigger
                aria-label="Filtrer les notifications par classe"
                className="ml-auto h-9 w-[min(15rem,70vw)] rounded-[10px] border-[#d9d9d9] bg-[#f8f9fb] px-3 text-[11px] font-bold text-slate-700 shadow-none focus:border-[#1677ff] focus:ring-[#1677ff]/10 md:h-8 md:w-[220px] md:rounded-lg md:bg-white md:text-[10px]"
              >
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent className="z-[80] rounded-lg border-[#d9d9d9] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <SelectItem value="all" className="min-h-10 rounded-md text-xs font-semibold md:min-h-8 md:text-[11px]">Toutes les classes</SelectItem>
                {classes.map(classInfo => (
                  <SelectItem key={classInfo.id} value={classInfo.id} className="min-h-10 rounded-md text-xs font-semibold md:min-h-8 md:text-[11px]">
                    {formatClassDisplayName(classInfo.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-[#f7f9fc] px-2.5 py-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] sm:px-3 md:px-4 md:py-1.5">
          {activeAxis === 'priorites' && (
            <div className={filteredCorrections.length > 0 ? 'my-2.5 divide-y divide-zinc-100 overflow-hidden rounded-[14px] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : ''}>
              {filteredCorrections.length === 0 && (
                <EmptyPane title="Aucune priorité en attente" detail="Séances non consignées, dates à vérifier, devoirs imminents, absents à saisir : tout apparaîtra ici, relié à sa source." />
              )}
              {filteredCorrections.map(signal => (
                  <div key={signal.id} className="px-3.5 py-3 transition-colors hover:bg-zinc-50/50 md:px-3 md:py-2.5">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-wide text-[#0056D2]">
                        {signal.className || 'Toutes les classes'}
                      </p>
                      <h3 className="mt-0.5 text-[13px] font-extrabold leading-snug text-slate-950 md:text-xs">{signal.title}</h3>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600 md:mt-0.5 md:text-[10px]">{signal.detail}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-end gap-1.5 md:mt-2 md:gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => ignoreSignal(signal)} className="h-9 rounded-lg px-3 text-[10px] font-bold text-slate-500 active:scale-[0.98] md:h-7 md:rounded-md md:px-2 md:text-[9px]">
                        Ignorer
                      </Button>
                      <Button type="button" size="sm" onClick={() => resolveSignal(signal)} className="h-9 rounded-lg border-[#0056D2] bg-[#0056D2] px-3.5 text-[10px] font-bold shadow-none active:scale-[0.98] hover:bg-[#0048b5] md:h-7 md:rounded-md md:px-2.5 md:text-[9px]">
                        {ACTION_LABEL[signal.action]}
                      </Button>
                    </div>
                  </div>
              ))}
            </div>
          )}

          {activeAxis === 'echeances' && (
            <div className={filteredAssessments.length + filteredOfficialEvents.length > 0 ? 'my-2.5 divide-y divide-zinc-100 overflow-hidden rounded-[14px] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : ''}>
              {filteredAssessments.length === 0 && filteredOfficialEvents.length === 0 && (
                <EmptyPane title="Aucune échéance proche" detail="Devoirs indicatifs (14 jours) et jalons du bulletin officiel (30 jours) apparaîtront ici." />
              )}
              {filteredAssessments.map(item => (
                <button
                  key={`${item.classId}-${item.id}`}
                  type="button"
                  onClick={() => openClassById(item.classId)}
                  className="group flex w-full items-center px-3.5 py-3 text-left transition-colors active:bg-zinc-100/70 hover:bg-zinc-50/60 md:px-3 md:py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-extrabold leading-snug text-slate-950 md:text-xs">
                      {formatClassDisplayName(item.className)} — {item.label.split(' — ')[0]}
                    </span>
                    <span className={`mt-1 block text-[11px] font-bold md:mt-0.5 md:text-[10px] ${item.inDays <= 3 ? 'text-red-600' : 'text-slate-500'}`}>
                      {delayLabel(item.inDays)} · {formatDateFR(item.dateISO)} · devoir indicatif, modifiable
                    </span>
                  </span>
                </button>
              ))}
              {filteredOfficialEvents.map(item => (
                <div key={`official-${item.event.id}`} className="flex w-full items-start px-3.5 py-3 md:px-3 md:py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-[#cfe0f8] bg-[#eef5ff] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#0056D2]">Officiel</span>
                      <span className="text-[13px] font-extrabold leading-snug text-slate-950 md:text-xs">{item.event.title}</span>
                    </span>
                    <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-600 md:mt-0.5 md:text-[10px]">
                      {delayLabel(item.inDays)} · {item.classNames.slice(0, 3).map(formatClassDisplayName).join(', ')}{item.classNames.length > 3 ? '…' : ''}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeAxis === 'classes' && (
            <div className={filteredClassOverviews.length > 0 ? 'my-2.5 divide-y divide-zinc-100 overflow-hidden rounded-[14px] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : ''}>
              {filteredClassOverviews.length === 0 && (
                <EmptyPane title="Aucune classe" detail="Créez un cahier pour voir son état ici." />
              )}
              {filteredClassOverviews.map(overview => (
                <button
                  key={overview.classInfo.id}
                  type="button"
                  onClick={() => openClassById(overview.classInfo.id)}
                  className="group block w-full px-3.5 py-3 text-left transition-colors active:bg-zinc-100/70 hover:bg-zinc-50/60 md:px-3 md:py-2.5"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-extrabold leading-snug text-slate-950 md:text-xs">{overview.className}</span>
                      <span className="mt-1 block text-[11px] font-medium text-slate-500 md:mt-0.5 md:text-[10px]">
                        {overview.sessionsCount} séance{overview.sessionsCount > 1 ? 's' : ''}
                        {' · '}
                        {overview.lastDate ? `dernière saisie ${formatDateFR(overview.lastDate)}` : 'aucune séance datée'}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-black tabular-nums leading-none" style={{ color: BLUE }}>{overview.completionRate}%</span>
                      <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-zinc-400">Progression</span>
                    </span>
                  </span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
                    <span className="block h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, Math.max(0, overview.completionRate))}%`, backgroundColor: BLUE }} />
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold md:mt-1.5 md:text-[10px]">
                    <span className={overview.toPrintCount > 0 ? 'text-[#0056D2]' : 'text-zinc-400'}>
                      {overview.toPrintCount > 0
                        ? `${overview.toPrintCount} séance${overview.toPrintCount > 1 ? 's' : ''} à imprimer`
                        : 'Impressions à jour'}
                    </span>
                    <span className="text-zinc-400">
                      {overview.lastPrintedAt ? `Imprimé ${timeAgoFr(overview.lastPrintedAt)}` : 'Jamais imprimé'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeAxis === 'activite' && (
            <div className={filteredActivityEntries.length > 0 ? 'my-2.5 divide-y divide-zinc-100 overflow-hidden rounded-[14px] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : ''}>
              {filteredActivityEntries.length === 0 && (
                <EmptyPane title="Aucune activité récente" detail="Les actions d'édition de vos cahiers s'afficheront ici au fil de l'eau." />
              )}
              {filteredActivityEntries.map((entry, index) => (
                <button
                  key={`${entry.classId}-${entry.at}-${index}`}
                  type="button"
                  onClick={() => openClassById(entry.classId)}
                  className="group flex min-h-12 w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors active:bg-zinc-100/70 hover:bg-zinc-50/60 md:min-h-0 md:px-3 md:py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-900 md:text-[11px]">{opLabel(entry.op)}</span>
                    <span className="mt-px block text-[10px] font-semibold text-zinc-400 md:text-[9px]">{entry.className}</span>
                  </span>
                  <span className="shrink-0 text-[9px] font-bold text-zinc-400">{timeAgoFr(entry.at)}</span>
                </button>
              ))}
            </div>
          )}

          {activeAxis === 'ignores' && (
            <div className={filteredIgnoredCorrections.length > 0 ? 'my-2.5 divide-y divide-zinc-100 overflow-hidden rounded-[14px] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : ''}>
              {filteredIgnoredCorrections.length === 0 && (
                <EmptyPane title="Aucune exception" detail="Les points ignorés depuis les priorités ou la vérification de dates seraient listés ici." />
              )}
              {filteredIgnoredCorrections.map(signal => (
                <div key={signal.id} className="flex items-center gap-2.5 px-3.5 py-3 md:gap-2 md:px-3 md:py-2.5">
                  <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-slate-500 md:text-[10px]">
                    {signal.className ? `${signal.className} — ` : ''}{signal.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => restoreSignal(signal)}
                    className="inline-flex h-9 shrink-0 items-center rounded-lg bg-white px-3 text-[10px] font-bold text-[#0056D2] ring-1 ring-zinc-200 transition-all active:scale-[0.98] hover:bg-[#eef5ff] md:h-7 md:rounded-md md:px-2 md:text-[9px]"
                  >
                    Réactiver
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </Modal>
    </>
  );
};
