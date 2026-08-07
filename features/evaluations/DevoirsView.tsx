import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppConfig, ClassInfo, LessonsData, PedagogicalEvent, PedagogicalEventType } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { migrateLessonsData } from '@/utils/dataUtils';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
import { daysBetweenISO } from '@/utils/assessments';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/utils/assessmentSync';
import {
  getOfficialEventEffectiveEnd,
  getClassSchoolSegment,
  getOfficialStudentEventsFile,
  getOfficialStudentEventsForClass,
  loadOfficialStudentEvents,
  OfficialStudentEvent,
  OfficialStudentEventCategory,
  OfficialStudentEventsFile,
} from '@/utils/officialStudentEvents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  FlaskConical,
  GraduationCap,
  Plus,
  Undo2,
  Trash2,
  Users,
  X,
} from '@/components/ui/icons';

interface DevoirsViewProps {
  classes: ClassInfo[];
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  onOpenNotebook: (classInfo: ClassInfo) => void;
  /** Mode contextuel : la classe est déjà connue, aucun sélecteur ni lien de retour. */
  embedded?: boolean;
}

const readLessons = (classId: string): LessonsData => {
  try {
    const raw = localStorage.getItem(`classData_v1_${classId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return migrateLessonsData(Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []));
  } catch {
    return [];
  }
};

const formatLongDate = (iso: string): string => {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return iso;
  }
};

const STATUS_STYLE: Record<AssessmentLink['status'], { label: string; tone: 'green' | 'amber' | 'blue' | 'zinc' }> = {
  done: { label: 'Dans le cahier', tone: 'green' },
  mismatch: { label: 'Écart avec le cahier', tone: 'amber' },
  upcoming: { label: 'À venir', tone: 'blue' },
  missing: { label: 'Non saisi', tone: 'zinc' },
};

type DevoirsSection = 'planning' | 'official' | 'competitions';

const PEDAGOGICAL_EVENT_CONFIG: Record<PedagogicalEventType, { label: string; badgeClass: string }> = {
  evaluation_diagnostic: { label: 'Évaluation diagnostique', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900/40' },
  olympiade: { label: 'Olympiade', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-900/40' },
  concours: { label: 'Concours', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-900/40' },
  soutien: { label: 'Soutien', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40' },
  remediation: { label: 'Remédiation', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-900/40' },
  examen_blanc: { label: 'Examen blanc', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-900/40' },
  rattrapage: { label: 'Rattrapage', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/40' },
  autre: { label: 'Autre activité', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' },
};

const OFFICIAL_CATEGORY_CONFIG: Record<OfficialStudentEventCategory, { label: string; badgeClass: string }> = {
  school: { label: 'Scolarité', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300' },
  assessment: { label: 'Évaluation', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400' },
  exam: { label: 'Examen', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400' },
  result: { label: 'Résultat', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' },
  support: { label: 'Préparation', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400' },
  competition: { label: 'Concours', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400' },
};

const formatDateRange = (start: string, end?: string): string => {
  if (!end || end === start) return formatLongDate(start);
  return `${formatLongDate(start)} au ${formatLongDate(end)}`;
};

export const DevoirsView: React.FC<DevoirsViewProps> = ({
  classes,
  config,
  onConfigChange,
  onOpenNotebook,
  embedded = false,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null;
  const selectedClassDisplayName = selectedClass ? formatClassDisplayName(selectedClass.name) : '';
  const { assessments, hasPlan } = useClassAssessments(selectedClass, config);
  const [absencesFor, setAbsencesFor] = useState<AssessmentLink | null>(null);
  const [section, setSection] = useState<DevoirsSection>('planning');
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [showAllOfficial, setShowAllOfficial] = useState(false);
  const [officialEventsFile, setOfficialEventsFile] = useState<OfficialStudentEventsFile>(() => getOfficialStudentEventsFile());

  const today = todayInMorocco(new Date(), getBundledCalendar());

  useEffect(() => {
    let active = true;
    loadOfficialStudentEvents().then((file) => {
      if (active) setOfficialEventsFile(file);
    });
    return () => {
      active = false;
    };
  }, []);

  const links = useMemo(() => {
    if (!selectedClass) return [];
    return linkAssessments(assessments, findNotebookAssessments(readLessons(selectedClass.id)), today);
  }, [assessments, selectedClass, today]);

  const pedagogicalEvents = useMemo(
    () =>
      selectedClass
        ? [...(config.pedagogicalEvents?.[selectedClass.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [config.pedagogicalEvents, selectedClass]
  );

  const officialEvents = useMemo(
    () => (selectedClass ? getOfficialStudentEventsForClass(selectedClass, undefined, officialEventsFile) : []),
    [officialEventsFile, selectedClass]
  );

  const officialJourney = useMemo(
    () => officialEvents.filter((event) => event.category !== 'competition'),
    [officialEvents]
  );

  const officialCompetitions = useMemo(
    () => officialEvents.filter((event) => event.category === 'competition'),
    [officialEvents]
  );

  const classGroups = useMemo(() => {
    const definitions = [
      { id: 'college', label: 'Collège' },
      { id: 'lycee', label: 'Lycée qualifiant' },
      { id: 'unknown', label: 'Autres classes' },
    ] as const;
    return definitions
      .map((group) => ({ ...group, classes: classes.filter((item) => getClassSchoolSegment(item) === group.id) }))
      .filter((group) => group.classes.length > 0);
  }, [classes]);

  const setAssessmentDate = (assessmentId: string, dateISO: string) => {
    if (!selectedClass) return;
    const next: Record<string, Record<string, string>> = {
      ...(config.assessmentDates ?? {}),
      [selectedClass.id]: { ...(config.assessmentDates?.[selectedClass.id] ?? {}) },
    };
    if (dateISO) next[selectedClass.id][assessmentId] = dateISO;
    else delete next[selectedClass.id][assessmentId];
    onConfigChange({ assessmentDates: next });
  };

  const alignOnNotebook = (link: AssessmentLink) => {
    if (!link.entry?.date) return;
    setAssessmentDate(link.planned.id, link.entry.date);
    toast.success(
      `Calendrier aligné sur le cahier : ${link.planned.label.split(' — ')[0]} → ${formatLongDate(link.entry.date)}.`
    );
  };

  const savePedagogicalEvents = (events: PedagogicalEvent[]) => {
    if (!selectedClass) return;
    onConfigChange({
      pedagogicalEvents: {
        ...(config.pedagogicalEvents ?? {}),
        [selectedClass.id]: events,
      },
    });
  };

  const addPedagogicalEvent = (event: PedagogicalEvent) => {
    savePedagogicalEvents([...pedagogicalEvents, event]);
    setEventEditorOpen(false);
    toast.success(`${PEDAGOGICAL_EVENT_CONFIG[event.type].label} ajoutée au parcours de ${selectedClassDisplayName}.`);
  };

  const togglePedagogicalEvent = (eventId: string) => {
    savePedagogicalEvents(
      pedagogicalEvents.map((event) =>
        event.id === eventId ? { ...event, status: event.status === 'done' ? 'planned' : 'done' } : event
      )
    );
  };

  const deletePedagogicalEvent = (eventId: string) => {
    savePedagogicalEvents(pedagogicalEvents.filter((event) => event.id !== eventId));
  };

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 mb-4">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Créez d'abord vos classes</h3>
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Le calendrier des devoirs se construit automatiquement à partir de vos classes et du planning officiel.
        </p>
      </div>
    );
  }

  const semesters: (1 | 2)[] = [1, 2];
  const absencesRecord =
    absencesFor && selectedClass
      ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.id]
      : undefined;

  return (
    <div className={cn('space-y-6 font-sans', embedded ? '' : 'p-2 sm:p-4')}>
      {/* Selector pills for multi-class mode */}
      {!embedded && (
        <div className="space-y-3 bg-card text-card-foreground p-4 rounded-2xl border border-border shadow-xs">
          {classGroups.map((group) => (
            <div key={group.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.classes.map((c) => {
                  const active = c.id === selectedClass?.id;
                  const displayName = formatClassDisplayName(c.name);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClassId(c.id);
                        setShowAllOfficial(false);
                      }}
                      className={cn(
                        'h-9 rounded-xl px-4 text-xs font-semibold transition-all duration-200',
                        active
                          ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                      )}
                    >
                      {displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section Content */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <PedagogicalEventsSection
          className={selectedClassDisplayName}
          events={pedagogicalEvents}
          onAdd={() => setEventEditorOpen(true)}
          onToggle={togglePedagogicalEvent}
          onDelete={deletePedagogicalEvent}
        />

        {!hasPlan ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Aucun planning de devoirs pour ce niveau et cette matière. Les activités ajoutées ci-dessus restent disponibles.
          </div>
        ) : (
          <div className="space-y-6">
                  {semesters.map((sem) => {
                    const ofSemester = links.filter((l) => l.planned.semestre === sem);
                    if (ofSemester.length === 0) return null;
                    return (
                      <section key={sem} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Semestre {sem}
                          </h3>
                        </div>

                        <div className="grid gap-2.5">
                          {ofSemester.map((link) => {
                            const a = link.planned;
                            const inDays = daysBetweenISO(today, a.dateISO);
                            const custom = !!config.assessmentDates?.[selectedClass!.id]?.[a.id];
                            const absents = config.assessmentAbsences?.[selectedClass!.id]?.[a.id]?.names ?? [];
                            const status = STATUS_STYLE[link.status];
                            const isControle = a.type === 'controle';

                            return (
                              <div
                                key={a.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-white dark:bg-zinc-900 p-3 px-3.5 shadow-2xs ring-1 ring-zinc-200/80 dark:ring-zinc-800 transition-all hover:ring-zinc-300 dark:hover:ring-zinc-700"
                              >
                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                  <span
                                    className={cn(
                                      'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
                                      isControle
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-900/40'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-900/40'
                                    )}
                                  >
                                    {isControle ? `Surveillé ${a.num}` : `Maison ${a.num}`}
                                    {a.duree && <span className="ml-1 opacity-70 font-medium text-[11px]">· {a.duree}</span>}
                                  </span>

                                  {link.status !== 'upcoming' && (
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border',
                                        status.tone === 'green' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40',
                                        status.tone === 'amber' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/40',
                                        status.tone === 'zinc' && 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                      )}
                                    >
                                      {link.status === 'done' && <Check className="h-3 w-3" />}
                                      {link.status === 'mismatch' && <CircleAlert className="h-3 w-3" />}
                                      {status.label}
                                    </span>
                                  )}

                                  {link.status === 'upcoming' && inDays >= 0 && inDays <= 14 && (
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                      {inDays === 0 ? "aujourd'hui" : inDays === 1 ? 'demain' : `dans ${inDays} j`}
                                    </span>
                                  )}

                                  {link.status === 'mismatch' && link.entry?.date && (
                                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                      cahier : {formatLongDate(link.entry.date)}
                                    </span>
                                  )}

                                  {link.status === 'mismatch' && (
                                    <button
                                      type="button"
                                      onClick={() => alignOnNotebook(link)}
                                      className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-700"
                                    >
                                      Aligner le calendrier
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60">
                                  {isControle && (
                                    <button
                                      type="button"
                                      onClick={() => setAbsencesFor(link)}
                                      className={cn(
                                        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors',
                                        absents.length > 0
                                          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900/40'
                                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                                      )}
                                    >
                                      <Users className="h-3.5 w-3.5" />
                                      {absents.length > 0 ? `${absents.length} absent${absents.length > 1 ? 's' : ''}` : 'Absents'}
                                    </button>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <input
                                      type="date"
                                      value={a.dateISO}
                                      onChange={(e) => setAssessmentDate(a.id, e.target.value)}
                                      className={cn(
                                        'h-8 rounded-lg border bg-zinc-50 dark:bg-zinc-800 px-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                                        custom ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700'
                                      )}
                                      title={a.fenetre ? `Fenêtre indicative : ${a.fenetre}` : 'Ajuster la date'}
                                      aria-label={`Date du devoir ${a.label}`}
                                    />
                                    {custom && (
                                      <button
                                        type="button"
                                        onClick={() => setAssessmentDate(a.id, '')}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="Revenir à la date indicative"
                                      >
                                        <Undo2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {selectedClass && !embedded && (
                <button
                  type="button"
                  onClick={() => onOpenNotebook(selectedClass)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Ouvrir le cahier de {selectedClassDisplayName}
                </button>
              )}

        {officialJourney && (
          <div id="parcours-officiel" className="scroll-mt-6">
            <OfficialEventsPanel
              className={selectedClassDisplayName}
              events={officialJourney}
              source={officialEventsFile}
              today={today}
              showAll={showAllOfficial}
              onToggleAll={() => setShowAllOfficial((value) => !value)}
            />
          </div>
        )}

        {officialCompetitions && (
          <div id="concours" className="scroll-mt-6">
            <OfficialEventsPanel
              className={selectedClassDisplayName}
              events={officialCompetitions}
              source={officialEventsFile}
              today={today}
              showAll={showAllOfficial}
              onToggleAll={() => setShowAllOfficial((value) => !value)}
              competitions
            />
          </div>
        )}
      </div>

      {/* Add Pedagogical Event Modal Sheet */}
      <Sheet open={eventEditorOpen} onOpenChange={setEventEditorOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto custom-scrollbar rounded-t-3xl border-t p-6 sm:mx-auto sm:max-w-lg"
        >
          {selectedClass && (
            <PedagogicalEventEditor
              className={selectedClassDisplayName}
              today={today}
              onCancel={() => setEventEditorOpen(false)}
              onSave={addPedagogicalEvent}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Absences Editor Modal Sheet */}
      <Sheet open={absencesFor !== null} onOpenChange={(open) => { if (!open) setAbsencesFor(null); }}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto custom-scrollbar rounded-t-3xl border-t p-6 sm:mx-auto sm:max-w-lg"
        >
          {absencesFor && selectedClass && (
            <AbsencesEditor
              key={`${selectedClass.id}-${absencesFor.planned.id}`}
              link={absencesFor}
              className={selectedClassDisplayName}
              initialNames={absencesRecord?.names ?? []}
              updatedAt={absencesRecord?.updatedAt}
              onCancel={() => setAbsencesFor(null)}
              onSave={(names) => {
                const classId = selectedClass.id;
                const forClass = { ...(config.assessmentAbsences?.[classId] ?? {}) };
                if (names.length > 0) {
                  forClass[absencesFor.planned.id] = { names, updatedAt: new Date().toISOString() };
                } else {
                  delete forClass[absencesFor.planned.id];
                }
                onConfigChange({
                  assessmentAbsences: { ...(config.assessmentAbsences ?? {}), [classId]: forClass },
                });
                toast.success(
                  names.length > 0
                    ? `${names.length} absent${names.length > 1 ? 's' : ''} consigné${names.length > 1 ? 's' : ''} — ${absencesFor.planned.label.split(' — ')[0]}.`
                    : 'Liste des absents effacée.'
                );
                setAbsencesFor(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

interface PedagogicalEventsSectionProps {
  className: string;
  events: PedagogicalEvent[];
  onAdd: () => void;
  onToggle: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({
  className,
  events,
  onAdd,
  onToggle,
  onDelete,
}) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
        Activités pédagogiques
      </h3>
    </div>

    {events.length === 0 ? (
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 text-sm font-semibold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:border-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <Plus className="h-4 w-4" /> Ajouter une activité
      </button>
    ) : (
      <div className="grid gap-3">
        {events.map((event) => {
          const config = PEDAGOGICAL_EVENT_CONFIG[event.type];
          const done = event.status === 'done';
          return (
            <div
              key={event.id}
              className={cn(
                'flex items-start justify-between gap-3 rounded-2xl bg-white dark:bg-zinc-900 p-4 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-sm transition-all',
                done && 'opacity-60 bg-zinc-50/50 dark:bg-zinc-900/50'
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggle(event.id)}
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors',
                    done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-zinc-200 bg-white text-zinc-400 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800'
                  )}
                  aria-label={done ? `Rouvrir ${event.title}` : `Marquer ${event.title} comme réalisé`}
                >
                  {done ? <CircleCheck className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', config.badgeClass)}>
                      {config.label}
                    </span>
                    {done && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Réalisé</span>}
                  </div>
                  <h4 className={cn('text-sm font-bold text-zinc-900 dark:text-zinc-100', done && 'line-through text-zinc-500')}>
                    {event.title}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDateRange(event.date, event.endDate)}
                  </p>
                  {event.note && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {event.note}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                aria-label={`Supprimer ${event.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 text-xs font-semibold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:border-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <Plus className="h-4 w-4" /> Ajouter une activité
        </button>
      </div>
    )}
  </section>
);

interface OfficialEventsPanelProps {
  className: string;
  events: OfficialStudentEvent[];
  source: OfficialStudentEventsFile;
  today: string;
  showAll: boolean;
  onToggleAll: () => void;
  competitions?: boolean;
}

const OfficialEventsPanel: React.FC<OfficialEventsPanelProps> = ({
  className,
  events,
  source,
  today,
  showAll,
  onToggleAll,
  competitions = false,
}) => {
  const upcoming = events.filter((event) => getOfficialEventEffectiveEnd(event) >= today);
  const fallbackPast = [...events].filter((event) => getOfficialEventEffectiveEnd(event) < today).slice(-6);
  const visible = showAll ? events : upcoming.length > 0 ? upcoming.slice(0, 8) : fallbackPast;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 p-5 ring-1 ring-blue-100 dark:ring-blue-900/30">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            {competitions ? <FlaskConical className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {competitions ? 'Concours accessibles' : 'Parcours officiel de l’élève'}
              </h3>
              <span className="rounded-md bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                Officiel · 047.26
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {className} · année {source.schoolYear}. Seules les échéances compatibles avec le niveau sont affichées.
            </p>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aucun jalon officiel identifié pour ce niveau.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((event) => {
            const category = OFFICIAL_CATEGORY_CONFIG[event.category];
            const end = getOfficialEventEffectiveEnd(event);
            const startsIn = daysBetweenISO(today, event.start);
            const past = end < today;
            const ongoing = event.start <= today && end >= today;
            const timing = ongoing
              ? 'En cours'
              : past
              ? 'Terminé'
              : startsIn === 0
              ? "Aujourd'hui"
              : startsIn === 1
              ? 'Demain'
              : `Dans ${startsIn} jours`;

            return (
              <div
                key={event.id}
                className={cn(
                  'flex flex-col justify-between rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 transition-all',
                  past && 'opacity-60'
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', category.badgeClass)}>
                      {category.label}
                    </span>
                    <span className={cn(
                      'text-xs font-bold',
                      ongoing ? 'text-blue-600 dark:text-blue-400' : past ? 'text-zinc-400' : 'text-purple-600 dark:text-purple-400'
                    )}>
                      {timing}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {event.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {event.studentAction}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span>{formatDateRange(event.start, event.end)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {events.length > 8 && (
        <button
          type="button"
          onClick={onToggleAll}
          className="w-full h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {showAll ? 'Afficher seulement les prochains jalons' : `Voir le calendrier complet (${events.length})`}
        </button>
      )}
    </section>
  );
};

interface PedagogicalEventEditorProps {
  className: string;
  today: string;
  onCancel: () => void;
  onSave: (event: PedagogicalEvent) => void;
}

const PedagogicalEventEditor: React.FC<PedagogicalEventEditorProps> = ({ className, today, onCancel, onSave }) => {
  const [type, setType] = useState<PedagogicalEventType>('evaluation_diagnostic');
  const [title, setTitle] = useState(PEDAGOGICAL_EVENT_CONFIG.evaluation_diagnostic.label);
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const changeType = (nextType: PedagogicalEventType) => {
    const previousDefault = PEDAGOGICAL_EVENT_CONFIG[type].label;
    setType(nextType);
    if (!title.trim() || title === previousDefault) setTitle(PEDAGOGICAL_EVENT_CONFIG[nextType].label);
  };

  const submit = () => {
    if (!title.trim()) {
      setError('Donnez un titre clair à cette activité.');
      return;
    }
    if (!date) {
      setError('Choisissez la date de début.');
      return;
    }
    if (endDate && endDate < date) {
      setError('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }
    onSave({
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `event-${Date.now()}`,
      type,
      title: title.trim(),
      date,
      endDate: endDate || undefined,
      note: note.trim() || undefined,
      status: 'planned',
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <SheetHeader className="text-left">
        <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Ajouter une activité</SheetTitle>
        <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-400">
          {className} · événement créé par le professeur
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 pt-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Type d'activité</span>
          <select
            value={type}
            onChange={(event) => changeType(event.target.value as PedagogicalEventType)}
            className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {Object.entries(PEDAGOGICAL_EVENT_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Titre</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Ex. Diagnostic des prérequis du chapitre 1"
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Début</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setError('');
              }}
              className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Fin <span className="font-normal text-zinc-400">(facultatif)</span>
            </span>
            <input
              type="date"
              value={endDate}
              min={date}
              onChange={(event) => {
                setEndDate(event.target.value);
                setError('');
              }}
              className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Consigne / Note <span className="font-normal text-zinc-400">(facultatif)</span>
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Compétences visées, élèves concernés, matériel..."
          />
        </label>

        {error && (
          <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/40 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 rounded-xl bg-zinc-900 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
};

interface AbsencesEditorProps {
  link: AssessmentLink;
  className: string;
  initialNames: string[];
  updatedAt?: string;
  onCancel: () => void;
  onSave: (names: string[]) => void;
}

const AbsencesEditor: React.FC<AbsencesEditorProps> = ({
  link,
  className,
  initialNames,
  updatedAt,
  onCancel,
  onSave,
}) => {
  const [names, setNames] = useState<string[]>(initialNames);
  const [draft, setDraft] = useState('');

  const commitDraft = (raw: string) => {
    const parts = raw
      .split(/[,;\n]+/)
      .map((p) => p.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (parts.length === 0) return;
    setNames((prev) => {
      const seen = new Set(prev.map((n) => n.toLocaleLowerCase('fr')));
      const additions = parts.filter((p) => !seen.has(p.toLocaleLowerCase('fr')));
      return [...prev, ...additions];
    });
    setDraft('');
  };

  const effectiveDate = link.entry?.date ?? link.planned.dateISO;

  return (
    <div className="space-y-4">
      <SheetHeader className="text-left">
        <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Absents — {link.planned.label.split(' — ')[0]}
        </SheetTitle>
        <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-400">
          {className} · {formatLongDate(effectiveDate)}
          {updatedAt && ` · mise à jour le ${new Date(updatedAt).toLocaleDateString('fr-FR')}`}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 pt-2">
        {names.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {names.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
              >
                {name}
                <button
                  type="button"
                  onClick={() => setNames((prev) => prev.filter((n) => n !== name))}
                  className="rounded-full text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                  aria-label={`Retirer ${name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                commitDraft(draft);
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (/[,;\n]/.test(text)) {
                e.preventDefault();
                commitDraft(text);
              }
            }}
            onBlur={() => commitDraft(draft)}
            placeholder="Nom de l'élève, puis Entrée…"
            className="h-10 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoFocus
          />
          <button
            type="button"
            onClick={() => commitDraft(draft)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            aria-label="Ajouter l'élève"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
          Astuce : collez une liste « Nom1, Nom2 » — chaque nom devient une étiquette.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSave(names)}
            className="h-10 rounded-xl bg-zinc-900 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Enregistrer {names.length > 0 ? `(${names.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
