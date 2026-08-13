import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, DevoirType, LessonsData, ManualAssessment, PedagogicalEvent, PedagogicalEventType } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { migrateLessonsData } from '@/utils/dataUtils';
import { getBundledCalendar, schoolYearLabelFromDate, todayInMorocco } from '@/utils/calendar';
import { daysBetweenISO } from '@/utils/assessments';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/utils/assessmentSync';
import { getClassSchoolSegment } from '@/utils/officialStudentEvents';
import { getClassVisual } from '@/utils/classVisuals';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import {
  CalendarCheck,
  Check,
  CircleAlert,
  CircleCheck,
  Plus,
  Undo2,
  Trash2,
  Users,
  X,
} from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface DevoirsViewProps {
  classes: ClassInfo[];
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
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

const formatLongDate = (iso: string, locale: AppLocale): string => {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return iso;
  }
};

const STATUS_STYLE: Record<AssessmentLink['status'], { labelKey: string; tone: 'green' | 'amber' | 'blue' | 'zinc' }> = {
  done: { labelKey: 'evaluations.status.done', tone: 'green' },
  mismatch: { labelKey: 'evaluations.status.mismatch', tone: 'amber' },
  upcoming: { labelKey: 'evaluations.status.upcoming', tone: 'blue' },
  missing: { labelKey: 'evaluations.status.missing', tone: 'zinc' },
};

const PEDAGOGICAL_EVENT_CONFIG: Record<PedagogicalEventType, { labelKey: string }> = {
  evaluation_diagnostic: { labelKey: 'evaluations.event.evaluation_diagnostic' },
  olympiade: { labelKey: 'evaluations.event.olympiade' },
  concours: { labelKey: 'evaluations.event.concours' },
  soutien: { labelKey: 'evaluations.event.soutien' },
  remediation: { labelKey: 'evaluations.event.remediation' },
  examen_blanc: { labelKey: 'evaluations.event.examen_blanc' },
  rattrapage: { labelKey: 'evaluations.event.rattrapage' },
  autre: { labelKey: 'evaluations.event.autre' },
};

const formatDateRange = (start: string, end: string | undefined, locale: AppLocale, rangeSeparator: string): string => {
  if (!end || end === start) return formatLongDate(start, locale);
  return `${formatLongDate(start, locale)} ${rangeSeparator} ${formatLongDate(end, locale)}`;
};

export const DevoirsView: React.FC<DevoirsViewProps> = ({
  classes,
  config,
  onConfigChange,
  embedded = false,
}) => {
  const { t, locale } = useLocale();
  const number = useMemo(() => new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA'), [locale]);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null;
  const selectedClassDisplayName = selectedClass ? formatClassDisplayName(selectedClass.name) : '';
  const classVisual = selectedClass ? getClassVisual(selectedClass.name) : null;
  const { assessments, hasPlan } = useClassAssessments(selectedClass, config);
  const [absencesFor, setAbsencesFor] = useState<AssessmentLink | null>(null);
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [manualEditorOpen, setManualEditorOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<ManualAssessment | null>(null);

  const today = todayInMorocco(new Date(), getBundledCalendar());

  /* Une classe supprimée ne doit jamais laisser les évaluations sur un contexte obsolète. */
  useEffect(() => {
    if (selectedClassId && classes.some((classInfo) => classInfo.id === selectedClassId)) return;
    setSelectedClassId(classes[0]?.id ?? '');
  }, [classes, selectedClassId]);

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

  const classGroups = useMemo(() => {
    const definitions = [
      { id: 'college', label: t('evaluations.group.college') },
      { id: 'lycee', label: t('evaluations.group.lycee') },
      { id: 'unknown', label: t('evaluations.group.other') },
    ] as const;
    return definitions
      .map((group) => ({ ...group, classes: classes.filter((item) => getClassSchoolSegment(item) === group.id) }))
      .filter((group) => group.classes.length > 0);
  }, [classes, t]);

  const selectClass = (classId: string) => {
    setSelectedClassId(classId);
    setAbsencesFor(null);
    setEventEditorOpen(false);
  };

  const setAssessmentDate = (assessmentId: string, dateISO: string) => {
    if (!selectedClass) return;
    const assessment = assessments.find(item => item.id === assessmentId);
    const next: Record<string, Record<string, string>> = {
      ...(config.assessmentDates ?? {}),
      [selectedClass.id]: { ...(config.assessmentDates?.[selectedClass.id] ?? {}) },
    };
    if (dateISO) next[selectedClass.id][assessmentId] = dateISO;
    else {
      delete next[selectedClass.id][assessmentId];
      if (assessment?.legacyId) delete next[selectedClass.id][assessment.legacyId];
    }
    onConfigChange({ assessmentDates: next });
  };

  const alignOnNotebook = (link: AssessmentLink) => {
    if (!link.entry?.date) return;
    setAssessmentDate(link.planned.id, link.entry.date);
    toast.success(
      t('evaluations.alignedToast', {
        assessment: `${t(`evaluations.type.${link.planned.type}`)} n°${link.planned.num}`,
        date: formatLongDate(link.entry.date, locale),
      })
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
    toast.success(t('evaluations.eventAddedToast', {
      event: t(PEDAGOGICAL_EVENT_CONFIG[event.type].labelKey),
      className: selectedClassDisplayName,
    }));
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

  const openCreateAssessment = () => {
    setEditingAssessment(null);
    setManualEditorOpen(true);
  };

  const openEditAssessment = (assessment: { id: string; type: DevoirType; num: number; dateISO: string; duree?: string; semestre: 1 | 2 }) => {
    setEditingAssessment({
      id: assessment.id,
      type: assessment.type,
      num: assessment.num,
      dateISO: assessment.dateISO,
      duree: assessment.duree,
      semestre: assessment.semestre,
    });
    setManualEditorOpen(true);
  };

  const saveAssessment = (manual: ManualAssessment) => {
    if (!selectedClass) return;
    const classId = selectedClass.id;
    const current = config.manualAssessments?.[classId] ?? [];
    let nextManual: ManualAssessment[];

    if (editingAssessment) {
      const editingId = editingAssessment.id;
      if (current.some((a) => a.id === editingId)) {
        // devoir manuel édité → mise à jour sur place
        nextManual = current.map((a) => (a.id === editingId ? manual : a));
      } else {
        // devoir prédéfini édité → matérialisé avec le MÊME id (le merge déduplique
        // et le devoir conserve sa place dans la liste)
        nextManual = [...current, { ...manual, id: editingId }];
      }
    } else {
      nextManual = [...current, manual];
    }

    onConfigChange({
      manualAssessments: { ...(config.manualAssessments ?? {}), [classId]: nextManual },
    });
    setManualEditorOpen(false);
    setEditingAssessment(null);
    toast.success(
      t('evaluations.manualSaved', { type: t(`evaluations.type.${manual.type}`), number: manual.num })
    );
  };

  const deleteAssessment = (id: string) => {
    if (!selectedClass) return;
    const classId = selectedClass.id;
    const manual = (config.manualAssessments?.[classId] ?? []).filter((a) => a.id !== id);
    const removed = new Set([...(config.removedAssessments?.[classId] ?? []), id]);
    const order = (config.assessmentOrder?.[classId] ?? []).filter((oid) => oid !== id);
    onConfigChange({
      manualAssessments: { ...(config.manualAssessments ?? {}), [classId]: manual },
      removedAssessments: { ...(config.removedAssessments ?? {}), [classId]: [...removed] },
      assessmentOrder: { ...(config.assessmentOrder ?? {}), [classId]: order },
    });
    toast.success(t('evaluations.manualDeleted'));
  };

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 mb-4">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground dark:text-zinc-100">{t('evaluations.createClass')}</h3>
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {t('evaluations.createClassHint')}
        </p>
      </div>
    );
  }

  const semesters: (1 | 2)[] = [1, 2];
  const absencesRecord =
    absencesFor && selectedClass
      ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.id]
        ?? (absencesFor.planned.legacyId ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.legacyId] : undefined)
      : undefined;

  return (
    <div className={cn('space-y-3 font-sans', embedded ? '' : 'p-0')}>
      {/* Le planning est toujours filtré par la classe active. */}
      {!embedded && (
        <section
          aria-labelledby="evaluations-class-context"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2 shadow-xs"
        >
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', classVisual?.iconSurfaceClass ?? 'bg-muted text-muted-foreground')}>
            <Users className={cn('h-4 w-4', classVisual?.iconClass)} aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="evaluations-class-context" className="sr-only">{t('evaluations.activeClass')}</h2>
            <label htmlFor="evaluations-class-selector" className="sr-only">{t('evaluations.chooseClass')}</label>
            <Select value={selectedClass?.id ?? ''} onValueChange={selectClass}>
              <SelectTrigger id="evaluations-class-selector" className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground shadow-none transition-colors hover:bg-accent focus:ring-ring/20">
                <SelectValue placeholder={t('evaluations.chooseClass')} />
              </SelectTrigger>
              <SelectContent>
                {classGroups.map((group) => (
                  <SelectGroup key={group.id}>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </SelectLabel>
                    {group.classes.map((classInfo) => {
                      const displayName = formatClassDisplayName(classInfo.name);
                      return (
                        <SelectItem key={classInfo.id} value={classInfo.id} className="text-xs font-medium">
                          {classInfo.subject ? `${displayName}, ${classInfo.subject}` : displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>
      )}

      {/* Section Content */}
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Barre d'actions unifiée */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEventEditorOpen(true)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" /> {t('evaluations.addActivity')}
          </button>
          <button
            type="button"
            onClick={openCreateAssessment}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" /> {t('evaluations.addDevoir')}
          </button>
        </div>

        <PedagogicalEventsSection
          events={pedagogicalEvents}
          onToggle={togglePedagogicalEvent}
          onDelete={deletePedagogicalEvent}
        />

        {/* Devoirs (planning officiel + saisie manuelle) */}
        <section className="space-y-2">
        {!hasPlan ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-3 text-center text-xs text-muted-foreground">
            {t('evaluations.noOfficialPlan')}
          </div>
        ) : (
          <div className="space-y-3">
                  {semesters.map((sem) => {
                    const ofSemester = links.filter((l) => l.planned.semestre === sem);
                    if (ofSemester.length === 0) return null;
                    return (
                      <section key={sem} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h3 className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('evaluations.semester', { number: number.format(sem) })}
                          </h3>
                        </div>

                        <div className="grid gap-1.5">
                          {ofSemester.map((link) => {
                            const a = link.planned;
                            const inDays = daysBetweenISO(today, a.dateISO);
                            const custom = !!(
                              config.assessmentDates?.[selectedClass!.id]?.[a.id]
                              ?? (a.legacyId ? config.assessmentDates?.[selectedClass!.id]?.[a.legacyId] : undefined)
                            );
                            const absents = (
                              config.assessmentAbsences?.[selectedClass!.id]?.[a.id]
                              ?? (a.legacyId ? config.assessmentAbsences?.[selectedClass!.id]?.[a.legacyId] : undefined)
                            )?.names ?? [];
                            const status = STATUS_STYLE[link.status];
                            const isSupervised = a.type !== 'maison';

                            return (
                              <div
                                key={a.id}
                                className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2 shadow-xs transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditAssessment(a)}
                                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded text-start transition-colors"
                                    title={t('evaluations.editDevoir')}
                                  >
                                    <span className="text-sm font-medium text-foreground transition-colors group-hover:text-blue-600 group-hover:underline underline-offset-4">
                                      {t(`evaluations.type.${a.type}`)}
                                    </span>
                                    <span className="text-xs font-semibold text-muted-foreground">n°{a.num}</span>
                                    {a.duree && <span className="text-xs font-medium text-muted-foreground">· {a.duree}</span>}
                                  </button>

                                  {link.status !== 'upcoming' && (
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                        status.tone === 'green' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
                                        status.tone === 'amber' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                                        status.tone === 'zinc' && 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                      )}
                                    >
                                      {link.status === 'done' && <Check className="h-3 w-3" />}
                                      {link.status === 'mismatch' && <CircleAlert className="h-3 w-3" />}
                                      {t(status.labelKey)}
                                    </span>
                                  )}

                                  {link.status === 'upcoming' && inDays >= 0 && inDays <= 14 && (
                                    <span
                                      className={cn(
                                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                        inDays === 0
                                          ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                                          : inDays === 1
                                            ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                      )}
                                    >
                                      {inDays === 0
                                        ? t('evaluations.today')
                                        : inDays === 1
                                          ? t('evaluations.tomorrow')
                                          : t('evaluations.inDays', { count: number.format(inDays) })}
                                    </span>
                                  )}

                                  {link.status === 'mismatch' && link.entry?.date && (
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                      {t('evaluations.notebookDate', { date: formatLongDate(link.entry.date, locale) })}
                                    </span>
                                  )}

                                  {link.status === 'mismatch' && (
                                    <button
                                      type="button"
                                      onClick={() => alignOnNotebook(link)}
                                      className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-amber-700 shadow-xs transition-colors hover:bg-accent dark:text-amber-400"
                                    >
                                      {t('evaluations.align')}
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 sm:pt-0">
                                  {isSupervised && (
                                    <button
                                      type="button"
                                      onClick={() => setAbsencesFor(link)}
                                      className={cn(
                                        'inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors',
                                        absents.length > 0
                                          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400'
                                          : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                      )}
                                    >
                                      <Users className="h-3 w-3" />
                                      {absents.length > 0
                                        ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                                        : t('evaluations.absentees')}
                                    </button>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <input
                                      type="date"
                                      value={a.dateISO}
                                      onChange={(e) => setAssessmentDate(a.id, e.target.value)}
                                      className={cn(
                                        'h-8 rounded-md border bg-background px-2 text-[10px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30',
                                        custom ? 'border-blue-600 font-semibold text-blue-600 dark:text-blue-400' : 'border-border'
                                      )}
                                      title={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : t('evaluations.adjustDate')}
                                      aria-label={t('evaluations.assessmentDateAria', { assessment: t(`evaluations.type.${a.type}`) })}
                                    />
                                    {custom && (
                                      <button
                                        type="button"
                                        onClick={() => setAssessmentDate(a.id, '')}
                                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                        title={t('evaluations.restoreDate')}
                                      >
                                        <Undo2 className="h-3 w-3" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => deleteAssessment(a.id)}
                                      className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10"
                                      title={t('evaluations.manualDelete')}
                                      aria-label={t('evaluations.manualDelete')}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
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
        </section>

      </div>

      {/* Add Pedagogical Event */}
      <Modal
        isOpen={eventEditorOpen}
        onClose={() => setEventEditorOpen(false)}
        maxWidth="md"
        title={t('evaluations.addActivity')}
        description={selectedClass ? t('evaluations.teacherEvent', { className: selectedClassDisplayName }) : undefined}
      >
        {selectedClass && (
          <PedagogicalEventEditor
            today={today}
            onCancel={() => setEventEditorOpen(false)}
            onSave={addPedagogicalEvent}
          />
        )}
      </Modal>

      {/* Add / Edit Devoir (surveillé / maison) */}
      <Modal
        isOpen={manualEditorOpen}
        onClose={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
        maxWidth="sm"
        title={editingAssessment ? t('evaluations.editDevoir') : t('evaluations.addDevoir')}
        description={selectedClass ? t('evaluations.teacherEvent', { className: selectedClassDisplayName }) : undefined}
      >
        <ManualAssessmentEditor
          today={today}
          initial={editingAssessment}
          assessments={assessments}
          onCancel={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
          onSave={saveAssessment}
        />
      </Modal>

      {/* Absences Editor */}
      <Modal
        isOpen={absencesFor !== null}
        onClose={() => setAbsencesFor(null)}
        maxWidth="md"
        title={absencesFor && selectedClass
          ? t('evaluations.absencesTitle', {
              assessment: `${t(`evaluations.type.${absencesFor.planned.type}`)} n°${absencesFor.planned.num}`,
            })
          : undefined}
        description={absencesFor && selectedClass
          ? `${selectedClassDisplayName} · ${formatLongDate(absencesFor.planned.dateISO, locale)}${absencesRecord?.updatedAt ? ` · ${t('evaluations.updatedOn', { date: new Date(absencesRecord.updatedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA') })}` : ''}`
          : undefined}
      >
        {absencesFor && selectedClass && (
          <AbsencesEditor
            key={`${selectedClass.id}-${absencesFor.planned.id}`}
            initialNames={absencesRecord?.names ?? []}
            updatedAt={absencesRecord?.updatedAt}
            onCancel={() => setAbsencesFor(null)}
            onSave={(names) => {
              const classId = selectedClass.id;
              const forClass = { ...(config.assessmentAbsences?.[classId] ?? {}) };
              if (names.length > 0) {
                forClass[absencesFor.planned.id] = { names, updatedAt: new Date().toISOString() };
                if (absencesFor.planned.legacyId) delete forClass[absencesFor.planned.legacyId];
              } else {
                delete forClass[absencesFor.planned.id];
                if (absencesFor.planned.legacyId) delete forClass[absencesFor.planned.legacyId];
              }
              onConfigChange({
                assessmentAbsences: { ...(config.assessmentAbsences ?? {}), [classId]: forClass },
              });
              toast.success(
                names.length > 0
                  ? t(names.length === 1 ? 'evaluations.absenceSavedOne' : 'evaluations.absenceSavedMany', {
                      count: number.format(names.length),
                      assessment: `${t(`evaluations.type.${absencesFor.planned.type}`)} n°${absencesFor.planned.num}`,
                    })
                  : t('evaluations.absenceCleared')
              );
              setAbsencesFor(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

interface PedagogicalEventsSectionProps {
  events: PedagogicalEvent[];
  onToggle: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({
  events,
  onToggle,
  onDelete,
}) => {
  const { t, locale } = useLocale();
  return (
    <section className="space-y-2">
    {events.length > 0 && (
      <div className="grid gap-2">
        {events.map((event) => {
          const done = event.status === 'done';
          return (
            <div
              key={event.id}
              className={cn(
                'flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-all',
                done && 'opacity-60'
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggle(event.id)}
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                    done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  aria-label={t(done ? 'evaluations.reopenEventAria' : 'evaluations.completeEventAria', { title: event.title })}
                >
                  {done ? <CircleCheck className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                </button>

                <div className="min-w-0">
                  <h4 className={cn('text-sm font-medium leading-snug text-foreground', done && 'line-through text-muted-foreground')}>
                    {event.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateRange(event.date, event.endDate, locale, t('evaluations.rangeSeparator'))}
                  </p>
                  {event.note && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {event.note}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10"
                aria-label={t('evaluations.deleteEventAria', { title: event.title })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    )}
    </section>
  );
};

interface PedagogicalEventEditorProps {
  today: string;
  onCancel: () => void;
  onSave: (event: PedagogicalEvent) => void;
}

const PedagogicalEventEditor: React.FC<PedagogicalEventEditorProps> = ({ today, onCancel, onSave }) => {
  const { t } = useLocale();
  const [type, setType] = useState<PedagogicalEventType>('evaluation_diagnostic');
  const [title, setTitle] = useState(() => t(PEDAGOGICAL_EVENT_CONFIG.evaluation_diagnostic.labelKey));
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const changeType = (nextType: PedagogicalEventType) => {
    const previousDefault = t(PEDAGOGICAL_EVENT_CONFIG[type].labelKey);
    setType(nextType);
    if (!title.trim() || title === previousDefault) setTitle(t(PEDAGOGICAL_EVENT_CONFIG[nextType].labelKey));
  };

  const submit = () => {
    if (!title.trim()) {
      setError(t('evaluations.eventTitleRequired'));
      return;
    }
    if (!date) {
      setError(t('evaluations.startDateRequired'));
      return;
    }
    if (endDate && endDate < date) {
      setError(t('evaluations.endDateInvalid'));
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
    <div className="space-y-5">
      <div className="space-y-4 pt-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">{t('evaluations.activityType')}</span>
          <select
            value={type}
            onChange={(event) => changeType(event.target.value as PedagogicalEventType)}
            className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
          >
            {Object.entries(PEDAGOGICAL_EVENT_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {t(config.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">{t('evaluations.titleLabel')}</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm font-semibold text-foreground transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            placeholder={t('evaluations.titlePlaceholder')}
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.start')}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setError('');
              }}
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-xs font-semibold text-foreground transition-all duration-200 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">
              {t('evaluations.end')} <span className="font-normal text-muted-foreground">({t('evaluations.optional')})</span>
            </span>
            <input
              type="date"
              value={endDate}
              min={date}
              onChange={(event) => {
                setEndDate(event.target.value);
                setError('');
              }}
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-xs font-semibold text-foreground transition-all duration-200 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">
            {t('evaluations.note')} <span className="font-normal text-muted-foreground">({t('evaluations.optional')})</span>
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-input p-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            placeholder={t('evaluations.notePlaceholder')}
          />
        </label>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl bg-muted text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 active:scale-[0.98]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all duration-200 active:scale-[0.98] shadow-sm"
          >
            {t('evaluations.add')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ManualAssessmentEditorProps {
  today: string;
  initial?: ManualAssessment | null;
  assessments?: { id: string; type: DevoirType }[];
  onCancel: () => void;
  onSave: (manual: ManualAssessment) => void;
}

const ManualAssessmentEditor: React.FC<ManualAssessmentEditorProps> = ({ today, initial, assessments = [], onCancel, onSave }) => {
  const { t } = useLocale();
  const [type, setType] = useState<DevoirType>(initial?.type ?? 'controle');
  const [num, setNum] = useState(String(initial?.num ?? 1));
  const [date, setDate] = useState(initial?.dateISO ?? today);
  const [duree, setDuree] = useState(initial?.duree ?? '');
  const [semestre, setSemestre] = useState<1 | 2>(initial?.semestre ?? 1);
  const [error, setError] = useState('');

  // Numérotation automatique et dynamique par type (hors devoir en cours d'édition).
  const nextNumFor = (nextType: DevoirType): number =>
    assessments.filter((a) => a.type === nextType && a.id !== initial?.id).length + 1;

  const changeType = (nextType: DevoirType) => {
    setType(nextType);
    setNum(String(nextNumFor(nextType)));
  };

  const submit = () => {
    const numValue = parseInt(num, 10);
    if (!numValue || numValue < 1) {
      setError(t('evaluations.manualNumRequired'));
      return;
    }
    if (!date) {
      setError(t('evaluations.startDateRequired'));
      return;
    }
    onSave({
      id: initial?.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `dev-${Date.now()}`),
      schoolYear: schoolYearLabelFromDate(date),
      type,
      num: numValue,
      dateISO: date,
      duree: duree.trim() || undefined,
      semestre,
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualType')}</span>
            <select
              value={type}
              onChange={(event) => changeType(event.target.value as DevoirType)}
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            >
              <option value="controle">{t('evaluations.type.controle')}</option>
              <option value="controle_court">{t('evaluations.type.controle_court')}</option>
              <option value="controle_global">{t('evaluations.type.controle_global')}</option>
              <option value="oral">{t('evaluations.type.oral')}</option>
              <option value="maison">{t('evaluations.type.maison')}</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualSemester')}</span>
            <select
              value={semestre}
              onChange={(event) => setSemestre(Number(event.target.value) as 1 | 2)}
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            >
              <option value={1}>{t('evaluations.semester', { number: 1 })}</option>
              <option value={2}>{t('evaluations.semester', { number: 2 })}</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualNum')}</span>
            <input
              type="number"
              min={1}
              value={num}
              onChange={(event) => {
                setNum(event.target.value);
                setError('');
              }}
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
              inputMode="numeric"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualDate')}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setError('');
              }}
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-xs font-semibold text-foreground transition-all duration-200 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">
            {t('evaluations.manualDuree')} <span className="font-normal text-muted-foreground">({t('evaluations.optional')})</span>
          </span>
          <input
            value={duree}
            onChange={(event) => setDuree(event.target.value)}
            placeholder="1h, 2h…"
            className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm font-semibold text-foreground transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl bg-muted text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 active:scale-[0.98]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all duration-200 active:scale-[0.98] shadow-sm"
          >
            {initial ? t('common.save') : t('evaluations.add')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AbsencesEditorProps {
  initialNames: string[];
  updatedAt?: string;
  onCancel: () => void;
  onSave: (names: string[]) => void;
}

const AbsencesEditor: React.FC<AbsencesEditorProps> = ({
  initialNames,
  onCancel,
  onSave,
}) => {
  const { t, locale } = useLocale();
  const [names, setNames] = useState<string[]>(initialNames);
  const [draft, setDraft] = useState('');

  const commitDraft = (raw: string) => {
    const parts = raw
      .split(/[,;\n]+/)
      .map((p) => p.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (parts.length === 0) return;
    setNames((prev) => {
      const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
      const seen = new Set(prev.map((n) => n.toLocaleLowerCase(localeCode)));
      const additions = parts.filter((p) => !seen.has(p.toLocaleLowerCase(localeCode)));
      return [...prev, ...additions];
    });
    setDraft('');
  };

  return (
    <div className="space-y-5">
      <div className="space-y-4 pt-2">
        {names.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {names.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                {name}
                <button
                  type="button"
                  onClick={() => setNames((prev) => prev.filter((n) => n !== name))}
                  className="rounded-full text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t('evaluations.removeStudentAria', { name })}
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
            placeholder={t('evaluations.studentPlaceholder')}
            className="h-11 flex-1 rounded-xl border border-border bg-input px-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/25"
            autoFocus
          />
          <button
            type="button"
            onClick={() => commitDraft(draft)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all duration-200 active:scale-95"
            aria-label={t('evaluations.addStudentAria')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('evaluations.pasteHint')}
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl bg-muted text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 active:scale-[0.98]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave(names)}
            className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all duration-200 active:scale-[0.98] shadow-sm"
          >
            {t('common.save')} {names.length > 0 ? `(${new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA').format(names.length)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
