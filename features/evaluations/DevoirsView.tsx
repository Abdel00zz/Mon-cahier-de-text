import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, LessonsData, PedagogicalEvent, PedagogicalEventType } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { migrateLessonsData } from '@/utils/dataUtils';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

const PEDAGOGICAL_EVENT_CONFIG: Record<PedagogicalEventType, { labelKey: string; badgeClass: string }> = {
  evaluation_diagnostic: { labelKey: 'evaluations.event.evaluation_diagnostic', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900/40' },
  olympiade: { labelKey: 'evaluations.event.olympiade', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-900/40' },
  concours: { labelKey: 'evaluations.event.concours', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-900/40' },
  soutien: { labelKey: 'evaluations.event.soutien', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40' },
  remediation: { labelKey: 'evaluations.event.remediation', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-900/40' },
  examen_blanc: { labelKey: 'evaluations.event.examen_blanc', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-900/40' },
  rattrapage: { labelKey: 'evaluations.event.rattrapage', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/40' },
  autre: { labelKey: 'evaluations.event.autre', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' },
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
      t('evaluations.alignedToast', {
        assessment: t(link.planned.type === 'controle' ? 'evaluations.supervised' : 'evaluations.homework', { number: link.planned.num }),
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

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 mb-4">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t('evaluations.createClass')}</h3>
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
      : undefined;

  return (
    <div className={cn('space-y-6 font-sans', embedded ? '' : 'p-2 sm:p-4')}>
      {/* Le planning est toujours filtré par la classe active. */}
      {!embedded && (
        <section
          aria-labelledby="evaluations-class-context"
          className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/25 p-3 text-card-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', classVisual?.iconSurfaceClass ?? 'bg-primary/10 text-primary')}>
              <Users className={cn('h-4 w-4', classVisual?.iconClass)} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="evaluations-class-context" className="text-sm font-bold text-foreground">{t('evaluations.activeClass')}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('evaluations.activeClassHint')}</p>
            </div>
          </div>

          <div className="w-full shrink-0 sm:w-[min(100%,19rem)]">
            <label htmlFor="evaluations-class-selector" className="sr-only">{t('evaluations.chooseClass')}</label>
            <Select value={selectedClass?.id ?? ''} onValueChange={selectClass}>
              <SelectTrigger id="evaluations-class-selector" className="h-10 border-border/80 bg-background px-3 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-primary/35 focus:ring-primary/20">
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
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <PedagogicalEventsSection
          events={pedagogicalEvents}
          onAdd={() => setEventEditorOpen(true)}
          onToggle={togglePedagogicalEvent}
          onDelete={deletePedagogicalEvent}
        />

        {!hasPlan ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t('evaluations.noOfficialPlan')}
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
                            {t('evaluations.semester', { number: number.format(sem) })}
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
                                    {t(isControle ? 'evaluations.supervised' : 'evaluations.homework', { number: a.num })}
                                    {a.duree && <span className="ms-1 text-[11px] font-medium opacity-70">· {a.duree}</span>}
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
                                      {t(status.labelKey)}
                                    </span>
                                  )}

                                  {link.status === 'upcoming' && inDays >= 0 && inDays <= 14 && (
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                      {inDays === 0
                                        ? t('evaluations.today')
                                        : inDays === 1
                                          ? t('evaluations.tomorrow')
                                          : t('evaluations.inDays', { count: number.format(inDays) })}
                                    </span>
                                  )}

                                  {link.status === 'mismatch' && link.entry?.date && (
                                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                      {t('evaluations.notebookDate', { date: formatLongDate(link.entry.date, locale) })}
                                    </span>
                                  )}

                                  {link.status === 'mismatch' && (
                                    <button
                                      type="button"
                                      onClick={() => alignOnNotebook(link)}
                                      className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-700"
                                    >
                                      {t('evaluations.align')}
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 pt-1.5 sm:pt-0">
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
                                        'h-8 rounded-lg border bg-zinc-50 dark:bg-zinc-800 px-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                                        custom ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700'
                                      )}
                                      title={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : t('evaluations.adjustDate')}
                                      aria-label={t('evaluations.assessmentDateAria', { assessment: t(isControle ? 'evaluations.supervised' : 'evaluations.homework', { number: a.num }) })}
                                    />
                                    {custom && (
                                      <button
                                        type="button"
                                        onClick={() => setAssessmentDate(a.id, '')}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title={t('evaluations.restoreDate')}
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
                    ? t(names.length === 1 ? 'evaluations.absenceSavedOne' : 'evaluations.absenceSavedMany', {
                        count: number.format(names.length),
                        assessment: t(absencesFor.planned.type === 'controle' ? 'evaluations.supervised' : 'evaluations.homework', { number: absencesFor.planned.num }),
                      })
                    : t('evaluations.absenceCleared')
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
  events: PedagogicalEvent[];
  onAdd: () => void;
  onToggle: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({
  events,
  onAdd,
  onToggle,
  onDelete,
}) => {
  const { t, locale } = useLocale();
  return (
    <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
        {t('evaluations.activities')}
      </h3>
    </div>

    {events.length === 0 ? (
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 text-sm font-semibold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:border-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <Plus className="h-4 w-4" /> {t('evaluations.addActivity')}
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
                  aria-label={t(done ? 'evaluations.reopenEventAria' : 'evaluations.completeEventAria', { title: event.title })}
                >
                  {done ? <CircleCheck className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', config.badgeClass)}>
                      {t(config.labelKey)}
                    </span>
                    {done && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('evaluations.completed')}</span>}
                  </div>
                  <h4 className={cn('text-sm font-bold text-zinc-900 dark:text-zinc-100', done && 'line-through text-zinc-500')}>
                    {event.title}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDateRange(event.date, event.endDate, locale, t('evaluations.rangeSeparator'))}
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
                aria-label={t('evaluations.deleteEventAria', { title: event.title })}
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
          <Plus className="h-4 w-4" /> {t('evaluations.addActivity')}
        </button>
      </div>
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
      <SheetHeader className="text-start">
        <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('evaluations.addActivity')}</SheetTitle>
        <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('evaluations.teacherEvent', { className })}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 pt-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('evaluations.activityType')}</span>
          <select
            value={type}
            onChange={(event) => changeType(event.target.value as PedagogicalEventType)}
            className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {Object.entries(PEDAGOGICAL_EVENT_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {t(config.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('evaluations.titleLabel')}</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={t('evaluations.titlePlaceholder')}
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('evaluations.start')}</span>
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
              {t('evaluations.end')} <span className="font-normal text-zinc-400">({t('evaluations.optional')})</span>
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
            {t('evaluations.note')} <span className="font-normal text-zinc-400">({t('evaluations.optional')})</span>
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={t('evaluations.notePlaceholder')}
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
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 rounded-xl bg-zinc-900 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            {t('evaluations.add')}
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

  const effectiveDate = link.entry?.date ?? link.planned.dateISO;

  return (
    <div className="space-y-4">
      <SheetHeader className="text-start">
        <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {t('evaluations.absencesTitle', { assessment: t(link.planned.type === 'controle' ? 'evaluations.supervised' : 'evaluations.homework', { number: link.planned.num }) })}
        </SheetTitle>
        <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-400">
          {className} · {formatLongDate(effectiveDate, locale)}
          {updatedAt && ` · ${t('evaluations.updatedOn', { date: new Date(updatedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA') })}`}
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
            className="h-10 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoFocus
          />
          <button
            type="button"
            onClick={() => commitDraft(draft)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            aria-label={t('evaluations.addStudentAria')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
          {t('evaluations.pasteHint')}
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave(names)}
            className="h-10 rounded-xl bg-zinc-900 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            {t('common.save')} {names.length > 0 ? `(${new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA').format(names.length)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
