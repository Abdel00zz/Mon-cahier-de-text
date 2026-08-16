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
  Clock,
  Pencil,
  AwardIcon,
  BookOpen,
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
      weekday: 'short',
      day: 'numeric',
      month: 'short',
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

const PEDAGOGICAL_EVENT_CONFIG: Record<PedagogicalEventType, { labelKey: string; badgeColor: string }> = {
  evaluation_diagnostic: { labelKey: 'evaluations.event.evaluation_diagnostic', badgeColor: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20' },
  olympiade: { labelKey: 'evaluations.event.olympiade', badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  concours: { labelKey: 'evaluations.event.concours', badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  soutien: { labelKey: 'evaluations.event.soutien', badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  remediation: { labelKey: 'evaluations.event.remediation', badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' },
  examen_blanc: { labelKey: 'evaluations.event.examen_blanc', badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' },
  rattrapage: { labelKey: 'evaluations.event.rattrapage', badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20' },
  autre: { labelKey: 'evaluations.event.autre', badgeColor: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20' },
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
  const [activeTab, setActiveTab] = useState<'all' | 's1' | 's2' | 'events'>('all');

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
        nextManual = current.map((a) => (a.id === editingId ? manual : a));
      } else {
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
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-card border border-border/80 shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20">
          <CalendarCheck className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-foreground">{t('evaluations.createClass')}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {t('evaluations.createClassHint')}
        </p>
      </div>
    );
  }

  const semesters: (1 | 2)[] = activeTab === 's1' ? [1] : activeTab === 's2' ? [2] : [1, 2];
  const absencesRecord =
    absencesFor && selectedClass
      ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.id]
        ?? (absencesFor.planned.legacyId ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.legacyId] : undefined)
      : undefined;

  return (
    <div className="space-y-5 font-sans">
      {/* Class Selector (when not embedded) */}
      {!embedded && (
        <section
          aria-labelledby="evaluations-class-context"
          className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/80 p-1.5 sm:p-2 shadow-xs backdrop-blur-xs"
        >
          <span className={cn('flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg', classVisual?.iconSurfaceClass ?? 'bg-primary/10 text-primary')}>
            <Users className={cn('h-4 w-4', classVisual?.iconClass)} aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="evaluations-class-context" className="sr-only">{t('evaluations.activeClass')}</h2>
            <Select value={selectedClass?.id ?? ''} onValueChange={selectClass}>
              <SelectTrigger id="evaluations-class-selector" className="h-7.5 sm:h-8 rounded-lg border border-border/80 bg-background/80 px-2.5 text-[11px] sm:text-xs font-semibold text-foreground shadow-none transition-colors hover:bg-accent focus:ring-primary/20">
                <SelectValue placeholder={t('evaluations.chooseClass')} />
              </SelectTrigger>
              <SelectContent>
                {classGroups.map((group) => (
                  <SelectGroup key={group.id}>
                    <SelectLabel className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                      {group.label}
                    </SelectLabel>
                    {group.classes.map((classInfo) => {
                      const displayName = formatClassDisplayName(classInfo.name);
                      return (
                        <SelectItem key={classInfo.id} value={classInfo.id} className="text-xs font-semibold">
                          {classInfo.subject ? `${displayName} · ${classInfo.subject}` : displayName}
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

      {/* Modern Filter Tabs & Action Toolbar (Android 16 Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        {/* Organic Pill Segmented Filter */}
        <div className="inline-flex items-center rounded-full bg-muted/50 p-0.5 shadow-2xs backdrop-blur-xs self-start flex-wrap gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold rounded-full transition-all duration-200 cursor-pointer active:scale-[0.97]',
              activeTab === 'all'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('evaluations.tabAll')} ({number.format(links.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('s1')}
            className={cn(
              'px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold rounded-full transition-all duration-200 cursor-pointer active:scale-[0.97]',
              activeTab === 's1'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('evaluations.semester', { number: 1 })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('s2')}
            className={cn(
              'px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold rounded-full transition-all duration-200 cursor-pointer active:scale-[0.97]',
              activeTab === 's2'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('evaluations.semester', { number: 2 })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={cn(
              'px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold rounded-full transition-all duration-200 cursor-pointer active:scale-[0.97]',
              activeTab === 'events'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('evaluations.activities')} ({number.format(pedagogicalEvents.length)})
          </button>
        </div>

        {/* Floating Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEventEditorOpen(true)}
            className="inline-flex h-7.5 sm:h-8 items-center justify-center gap-1.5 rounded-full bg-muted/60 hover:bg-muted px-2.5 sm:px-3 text-[10.5px] sm:text-xs font-semibold text-foreground shadow-2xs transition-all cursor-pointer active:scale-[0.97]"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            <span>{t('evaluations.addActivity')}</span>
          </button>
          <button
            type="button"
            onClick={openCreateAssessment}
            className="inline-flex h-7.5 sm:h-8 items-center justify-center gap-1.5 rounded-full bg-primary px-3 sm:px-3.5 text-[10.5px] sm:text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:brightness-110 cursor-pointer active:scale-[0.97]"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{t('evaluations.addDevoir')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-5">
        {/* Pedagogical Events Section (shown when on 'all' or 'events' tab) */}
        {(activeTab === 'all' || activeTab === 'events') && pedagogicalEvents.length > 0 && (
          <PedagogicalEventsSection
            events={pedagogicalEvents}
            onToggle={togglePedagogicalEvent}
            onDelete={deletePedagogicalEvent}
          />
        )}

        {/* Assessment Lists by Semester */}
        {activeTab !== 'events' && (
          <section className="space-y-4">
            {!hasPlan ? (
              <div className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">{t('evaluations.noOfficialPlan')}</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {t('evaluations.noOfficialPlanHint')}
                </p>
                <button
                  type="button"
                  onClick={openCreateAssessment}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:brightness-110 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  {t('evaluations.addDevoir')}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {semesters.map((sem) => {
                  const ofSemester = links.filter((l) => l.planned.semestre === sem);
                  if (ofSemester.length === 0) return null;
                  return (
                    <section key={sem} className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-black">
                            {sem}
                          </span>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {t('evaluations.semester', { number: number.format(sem) })}
                          </h3>
                        </div>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {ofSemester.length} {ofSemester.length === 1 ? t('evaluations.assessmentSingle') : t('evaluations.assessmentPlural')}
                        </span>
                      </div>

                      <div className="grid gap-2.5">
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

                          // Type accents
                          const isMaison = a.type === 'maison';
                          const isCourt = a.type === 'controle_court' || a.type === 'oral';

                          return (
                            <div
                              key={a.id}
                              className={cn(
                                'group flex flex-col gap-3 rounded-2xl border bg-card/85 p-3.5 sm:p-4 shadow-xs transition-all duration-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between backdrop-blur-xs',
                                link.status === 'done' ? 'border-border/70' : link.status === 'mismatch' ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/90'
                              )}
                            >
                              {/* Left Info */}
                              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-2xs',
                                      isMaison
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20'
                                        : isCourt
                                          ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/20'
                                          : 'bg-primary/10 text-primary ring-1 ring-primary/20'
                                    )}
                                  >
                                    n°{a.num}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => openEditAssessment(a)}
                                    className="group/title inline-flex cursor-pointer items-center gap-1.5 rounded-lg text-start transition-colors"
                                    title={t('evaluations.editDevoir')}
                                  >
                                    <span className="text-sm font-bold text-foreground transition-colors group-hover/title:text-primary">
                                      {t(`evaluations.type.${a.type}`)}
                                    </span>
                                    {a.duree && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                        <Clock className="h-2.5 w-2.5" />
                                        {a.duree}
                                      </span>
                                    )}
                                    <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover/title:text-primary transition-opacity" />
                                  </button>
                                </div>

                                {/* Status Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {link.status === 'done' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                                      <Check className="h-3 w-3 stroke-[3]" />
                                      {t(status.labelKey)}
                                    </span>
                                  )}

                                  {link.status === 'mismatch' && (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20">
                                        <CircleAlert className="h-3 w-3" />
                                        {t(status.labelKey)}
                                      </span>
                                      {link.entry?.date && (
                                        <button
                                          type="button"
                                          onClick={() => alignOnNotebook(link)}
                                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 transition-colors cursor-pointer"
                                          title={t('evaluations.align')}
                                        >
                                          <span>⚡ {formatLongDate(link.entry.date, locale)}</span>
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {link.status === 'upcoming' && (
                                    <span
                                      className={cn(
                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1',
                                        inDays === 0
                                          ? 'bg-blue-600 text-white ring-blue-600'
                                          : inDays === 1
                                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/25'
                                            : 'bg-muted text-muted-foreground ring-border/80'
                                      )}
                                    >
                                      {inDays === 0
                                        ? t('evaluations.today')
                                        : inDays === 1
                                          ? t('evaluations.tomorrow')
                                          : inDays > 1 && inDays <= 30
                                            ? t('evaluations.inDays', { count: number.format(inDays) })
                                            : formatLongDate(a.dateISO, locale)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right Actions & Date Selector */}
                              <div className="flex items-center gap-2 shrink-0 sm:pt-0">
                                {isSupervised && (
                                  <button
                                    type="button"
                                    onClick={() => setAbsencesFor(link)}
                                    className={cn(
                                      'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer shadow-2xs',
                                      absents.length > 0
                                        ? 'border-rose-300 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                                        : 'border-border/80 bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground'
                                    )}
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                    {absents.length > 0
                                      ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                                      : t('evaluations.absentees')}
                                  </button>
                                )}

                                <div className="flex items-center gap-1.5 bg-background/80 border border-border/80 rounded-xl p-0.5 shadow-2xs">
                                  <div className="relative flex items-center">
                                    <input
                                      type="date"
                                      value={a.dateISO}
                                      onChange={(e) => setAssessmentDate(a.id, e.target.value)}
                                      className={cn(
                                        'h-8 rounded-lg bg-transparent px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer',
                                        custom && 'text-primary font-black'
                                      )}
                                      title={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : t('evaluations.adjustDate')}
                                      aria-label={t('evaluations.assessmentDateAria', { assessment: t(`evaluations.type.${a.type}`) })}
                                    />
                                  </div>

                                  {custom && (
                                    <button
                                      type="button"
                                      onClick={() => setAssessmentDate(a.id, '')}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                                      title={t('evaluations.restoreDate')}
                                    >
                                      <Undo2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => deleteAssessment(a.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
        )}
      </div>

      {/* Add Pedagogical Event Modal */}
      <Modal
        isOpen={eventEditorOpen}
        onClose={() => setEventEditorOpen(false)}
        maxWidth="md"
        className="sm:rounded-3xl border border-border/80 shadow-2xl"
        headerClassName="px-6 pt-5 pb-4 border-b border-border/60"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <AwardIcon className="h-5 w-5" />
            </span>
            <div>
              <span className="text-base font-bold text-foreground">{t('evaluations.addActivity')}</span>
              {selectedClass && (
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{selectedClassDisplayName}</p>
              )}
            </div>
          </div>
        }
      >
        {selectedClass && (
          <PedagogicalEventEditor
            today={today}
            onCancel={() => setEventEditorOpen(false)}
            onSave={addPedagogicalEvent}
          />
        )}
      </Modal>

      {/* Add / Edit Devoir Modal */}
      <Modal
        isOpen={manualEditorOpen}
        onClose={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
        maxWidth="md"
        className="sm:rounded-3xl border border-border/80 shadow-2xl"
        headerClassName="px-6 pt-5 pb-4 border-b border-border/60"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div>
              <span className="text-base font-bold text-foreground">
                {editingAssessment ? t('evaluations.editDevoir') : t('evaluations.addDevoir')}
              </span>
              {selectedClass && (
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{selectedClassDisplayName}</p>
              )}
            </div>
          </div>
        }
      >
        <ManualAssessmentEditor
          today={today}
          initial={editingAssessment}
          assessments={assessments}
          onCancel={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
          onSave={saveAssessment}
        />
      </Modal>

      {/* Absences Editor Modal */}
      <Modal
        isOpen={absencesFor !== null}
        onClose={() => setAbsencesFor(null)}
        maxWidth="md"
        className="sm:rounded-3xl border border-border/80 shadow-2xl"
        headerClassName="px-6 pt-5 pb-4 border-b border-border/60"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <span className="text-base font-bold text-foreground">
                {absencesFor && selectedClass
                  ? t('evaluations.absencesTitle', {
                      assessment: `${t(`evaluations.type.${absencesFor.planned.type}`)} n°${absencesFor.planned.num}`,
                    })
                  : t('evaluations.absentees')}
              </span>
              {absencesFor && selectedClass && (
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  {selectedClassDisplayName} · {formatLongDate(absencesFor.planned.dateISO, locale)}
                </p>
              )}
            </div>
          </div>
        }
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
  if (events.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 text-xs">
            <AwardIcon className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            {t('evaluations.activities')} & {t('evaluations.pedagogicalEvents')}
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {events.length} {events.length === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural')}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {events.map((event) => {
          const done = event.status === 'done';
          const eventConfig = PEDAGOGICAL_EVENT_CONFIG[event.type] ?? PEDAGOGICAL_EVENT_CONFIG.autre;
          return (
            <div
              key={event.id}
              className={cn(
                'group flex items-start justify-between gap-3 rounded-2xl border p-3.5 shadow-xs transition-all duration-200 backdrop-blur-xs',
                done
                  ? 'border-border/60 bg-card/50 opacity-70'
                  : 'border-border/85 bg-card/85 hover:shadow-md'
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggle(event.id)}
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer',
                    done
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      : 'border-border/80 bg-background hover:border-primary/40 hover:bg-primary/5 text-muted-foreground'
                  )}
                  aria-label={t(done ? 'evaluations.reopenEventAria' : 'evaluations.completeEventAria', { title: event.title })}
                >
                  {done ? <CircleCheck className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold', eventConfig.badgeColor)}>
                      {t(eventConfig.labelKey)}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {formatDateRange(event.date, event.endDate, locale, t('evaluations.rangeSeparator'))}
                    </span>
                  </div>

                  <h4 className={cn('text-sm font-bold mt-1 text-foreground', done && 'line-through text-muted-foreground')}>
                    {event.title}
                  </h4>

                  {event.note && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {event.note}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                aria-label={t('evaluations.deleteEventAria', { title: event.title })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
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
    <div className="space-y-4">
      <div className="space-y-3.5">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">{t('evaluations.activityType')}</span>
          <select
            value={type}
            onChange={(event) => changeType(event.target.value as PedagogicalEventType)}
            className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {Object.entries(PEDAGOGICAL_EVENT_CONFIG).map(([value, conf]) => (
              <option key={value} value={value}>
                {t(conf.labelKey)}
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
            className="h-10 w-full rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            className="w-full resize-none rounded-xl border border-border/80 bg-background p-3 text-xs text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={t('evaluations.notePlaceholder')}
          />
        </label>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl bg-muted text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 px-5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:brightness-110 transition-all shadow-xs cursor-pointer"
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
    <div className="space-y-4">
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualType')}</span>
            <select
              value={type}
              onChange={(event) => changeType(event.target.value as DevoirType)}
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl bg-muted text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 px-5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:brightness-110 transition-all shadow-xs cursor-pointer"
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
    <div className="space-y-4">
      <div className="space-y-3.5">
        {names.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-muted/40 border border-border/70 max-h-36 overflow-y-auto">
            {names.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-xl bg-background border border-border/80 px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs"
              >
                {name}
                <button
                  type="button"
                  onClick={() => setNames((prev) => prev.filter((n) => n !== name))}
                  className="rounded-full text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  aria-label={t('evaluations.removeStudentAria', { name })}
                >
                  <X className="h-3 w-3" />
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
            className="h-10 flex-1 rounded-xl border border-border/80 bg-background px-3.5 text-xs text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <button
            type="button"
            onClick={() => commitDraft(draft)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all cursor-pointer shadow-xs"
            aria-label={t('evaluations.addStudentAria')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t('evaluations.pasteHint')}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl bg-muted text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave(names)}
            className="h-10 px-5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:brightness-110 transition-all shadow-xs cursor-pointer"
          >
            {t('common.save')} {names.length > 0 ? `(${new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA').format(names.length)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
