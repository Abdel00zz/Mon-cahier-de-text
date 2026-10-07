import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, DevoirType, LessonsData, ManualAssessment, PedagogicalEvent, PedagogicalEventType } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { migrateLessonsData } from '@/domain/notebook/dataUtils';
import { getBundledCalendar, schoolYearLabelFromDate, todayInMorocco } from '@/domain/calendar/calendar';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/domain/evaluations/assessmentSync';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { getClassSchoolSegment } from '@/domain/evaluations/officialStudentEvents';
import { getClassVisual } from '@/components/classes/classVisuals';
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
  CircleCheck,
  Plus,
  Trash2,
  Undo2,
  Users,
} from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
import { FluidTabRail, FluidTabItem } from '@/components/ui/FluidTabRail';
import { CurriculumImportIllustration, SchedulePlanningIllustration } from '@/components/ui/DynamicIllustration';
import { StudentNamesEditor } from './components/StudentNamesEditor';
import { ContentDocumentModal } from './components/ContentDocumentModal';
import { KindChooser, KindHeader, ProgrammedList, StepTrail, type ProgrammedItem } from './components/KindChooser';
import { KindGroupHeader } from './components/KindGroupHeader';
import { KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG, kindLabelKey, type EvaluationKind } from './kindCatalog';
import { numberFormat } from '@/lib/formatters';

interface DevoirsViewProps {
  classes: ClassInfo[];
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  /** Mode contextuel : la classe est déjà connue, aucun sélecteur ni lien de retour. */
  embedded?: boolean;
}

/**
 * Cible d'un document pédagogique : un devoir (officiel ou manuel) ou une
 * activité. Le devoir range son document dans `assessmentDocuments` — comme ses
 * absences —, l'activité le porte en propre, puisque la liste d'activités est
 * déjà enregistrée d'un bloc.
 */
type DocumentTarget =
  | { kind: 'assessment'; link: AssessmentLink }
  | { kind: 'event'; event: PedagogicalEvent };

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

/**
 * Une seule pastille d'état par devoir, et pas d'icône dedans : « Consigné »
 * ou « Écart de date » se lisent au mot, la couleur porte le reste. Seuls les
 * deux états qui demandent une action sont affichés.
 */
const STATUS_CHIP: Partial<Record<AssessmentLink['status'], string>> = {
  done: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400',
  mismatch: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400',
};

/*
 * Les natures d'évaluation (libellé, teinte, icône) vivent dans `kindCatalog.ts` :
 * la page, le choix de la nature et les cartes d'activité partagent donc la même
 * source, et une nouvelle nature s'ajoute à UN seul endroit.
 */

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
  const number = useMemo(() => numberFormat(locale), [locale]);
  /* Le nom de la matière n'est utile que si l'enseignant en a plusieurs. */
  const showsSubjectLabels = useShowsSubjectLabels();
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null;
  const selectedClassDisplayName = selectedClass ? formatClassDisplayName(selectedClass.name) : '';
  const classVisual = selectedClass ? getClassVisual(selectedClass.name) : null;
  const { assessments, hasPlan } = useClassAssessments(selectedClass, config);
  const [absencesFor, setAbsencesFor] = useState<AssessmentLink | null>(null);
  /** Devoir ou activité dont on rédige le document pédagogique. */
  const [documentFor, setDocumentFor] = useState<DocumentTarget | null>(null);
  /** Activité dont on consigne les élèves (cahiers contrôlés, participants). */
  const [studentsFor, setStudentsFor] = useState<PedagogicalEvent | null>(null);
  const [manualEditorOpen, setManualEditorOpen] = useState(false);
  /**
   * Parcours de création en DEUX ÉTAPES : la nature (cartes colorées), puis
   * ses champs. `chosenKind === null` = on montre le choix.
   */
  const [kindChooserOpen, setKindChooserOpen] = useState(false);
  const [chosenKind, setChosenKind] = useState<EvaluationKind | null>(null);
  /** 3ᵉ temps d'un devoir : la création hors programmation, à la demande. */
  const [manualFormOpen, setManualFormOpen] = useState(false);
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

  const devoirTabItems: FluidTabItem<'all' | 's1' | 's2' | 'events'>[] = useMemo(() => [
    { id: 'all', label: `${t('evaluations.tabAll')} (${number.format(links.length)})` },
    { id: 's1', label: t('evaluations.semester', { number: 1 }) },
    { id: 's2', label: t('evaluations.semester', { number: 2 }) },
    { id: 'events', label: `${t('evaluations.activities')} (${number.format(pedagogicalEvents.length)})` },
  ], [t, number, links.length, pedagogicalEvents.length]);

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
    setDocumentFor(null);
    setStudentsFor(null);
    setKindChooserOpen(false);
    setChosenKind(null);
  };

  /*
   * Une seule porte d'entrée pour tout créer : le CHOIX de la nature est la
   * première étape de la fenêtre, pas une liste déroulante dans un formulaire.
   */
  const openKindChooser = () => {
    setChosenKind(null);
    setKindChooserOpen(true);
  };

  const closeKindChooser = () => {
    setKindChooserOpen(false);
    setChosenKind(null);
    setManualFormOpen(false);
  };

  /**
   * Les devoirs DÉJÀ programmés de cette nature, dans l'ordre du planning :
   * le professeur ouvre celui du jour au lieu de ressaisir un numéro et une date.
   * Les ajouts hors programmation sont dans la même liste (ils vivent dans
   * `assessments`), donc rien n'échappe à l'écran.
   */
  const programmedFor = (type: DevoirType): ProgrammedItem[] =>
    links
      .filter(link => link.planned.type === type)
      .map(link => ({
        id: link.planned.id,
        label: `${t(`evaluations.type.${link.planned.type}`)} ${number.format(link.planned.num)}`,
        dateISO: link.planned.dateISO,
        statusLabel: t(STATUS_STYLE[link.status].labelKey),
        statusClass: STATUS_CHIP[link.status] ?? 'bg-muted text-muted-foreground ring-border/60',
        hasDocument: !!(config.assessmentDocuments?.[selectedClass?.id ?? '']?.[link.planned.id]
          ?? (link.planned.legacyId ? config.assessmentDocuments?.[selectedClass?.id ?? '']?.[link.planned.legacyId] : undefined)),
      }));

  /** Ouvrir le sujet d'un devoir programmé : le document du devoir, en lecture ou rédaction. */
  const openProgrammedAssessment = (assessmentId: string) => {
    const link = links.find(item => item.planned.id === assessmentId);
    if (!link) return;
    closeKindChooser();
    setDocumentFor({ kind: 'assessment', link });
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
    closeKindChooser();
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

  /** Activité concernée par un document ou une liste d'élèves, telle qu'affichée. */
  const activityLabelOf = (event: PedagogicalEvent) =>
    event.title || t(PEDAGOGICAL_EVENT_CONFIG[event.type].labelKey);

  const saveEventDocument = (source: string) => {
    if (!selectedClass || !documentFor || documentFor.kind !== 'event') return;
    const target = documentFor.event.id;
    savePedagogicalEvents(pedagogicalEvents.map(event => event.id === target
      ? { ...event, document: source.trim() ? { source, updatedAt: new Date().toISOString() } : undefined }
      : event));
  };

  const saveAssessmentDocument = (source: string) => {
    if (!selectedClass || !documentFor || documentFor.kind !== 'assessment') return;
    const classId = selectedClass.id;
    const forClass = { ...(config.assessmentDocuments?.[classId] ?? {}) };
    const id = documentFor.link.planned.id;
    const legacyId = documentFor.link.planned.legacyId;
    if (source.trim()) forClass[id] = { source, updatedAt: new Date().toISOString() };
    else delete forClass[id];
    if (legacyId) delete forClass[legacyId];
    onConfigChange({ assessmentDocuments: { ...(config.assessmentDocuments ?? {}), [classId]: forClass } });
  };

  const saveEventStudents = (names: string[]) => {
    if (!selectedClass || !studentsFor) return;
    const target = studentsFor.id;
    const activity = activityLabelOf(studentsFor);
    savePedagogicalEvents(pedagogicalEvents.map(event => event.id === target
      ? { ...event, students: names.length > 0 ? { names, updatedAt: new Date().toISOString() } : undefined }
      : event));
    toast.success(names.length > 0
      ? t(names.length === 1 ? 'evaluations.students.savedOne' : 'evaluations.students.savedMany', {
          count: number.format(names.length),
          activity,
        })
      : t('evaluations.students.cleared'));
    setStudentsFor(null);
  };

  const openCreateAssessment = () => {
    // Le devoir se crée par le MÊME chemin que les activités : la nature d'abord.
    openKindChooser();
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
    closeKindChooser();
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
          <CalendarCheck className="h-7 w-7 stroke-[2.2]" />
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

  /* Document et titres de la modale : le devoir comme l'activité parlent la
     même langue (« Devoir surveillé n°2 », « Contrôle des cahiers »). */
  const documentOf = (() => {
    if (!documentFor || !selectedClass) return undefined;
    if (documentFor.kind === 'event') return documentFor.event.document;
    const forClass = config.assessmentDocuments?.[selectedClass.id];
    return forClass?.[documentFor.link.planned.id]
      ?? (documentFor.link.planned.legacyId ? forClass?.[documentFor.link.planned.legacyId] : undefined);
  })();
  const documentTitle = documentFor === null
    ? ''
    : documentFor.kind === 'event'
      ? (documentFor.event.title || t(PEDAGOGICAL_EVENT_CONFIG[documentFor.event.type].labelKey))
      : `${t(`evaluations.type.${documentFor.link.planned.type}`)} n°${documentFor.link.planned.num}`;
  const documentDate = documentFor === null
    ? ''
    : documentFor.kind === 'event' ? documentFor.event.date : documentFor.link.planned.dateISO;

  return (
    <div className="space-y-4 font-sans sm:space-y-5">
      {/* Class Selector (when not embedded) */}
      {!embedded && (
        <section
          aria-labelledby="evaluations-class-context"
          className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/80 p-1.5 sm:p-2 shadow-xs backdrop-blur-xs"
        >
          <span className={cn('flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg', classVisual?.iconSurfaceClass ?? 'bg-primary/10 text-primary')}>
            <Users className={cn('h-4 w-4 stroke-[2.2]', classVisual?.iconClass)} aria-hidden />
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
                    <SelectLabel className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </SelectLabel>
                    {group.classes.map((classInfo) => {
                      const displayName = formatClassDisplayName(classInfo.name);
                      return (
                        <SelectItem key={classInfo.id} value={classInfo.id} className="text-xs font-semibold">
                          {showsSubjectLabels && classInfo.subject ? `${displayName} · ${classInfo.subject}` : displayName}
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
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {/* Organic Pill Segmented Filter avec auto-centrage fluide */}
        <div className="w-full sm:w-auto">
          <FluidTabRail<'all' | 's1' | 's2' | 'events'>
            items={devoirTabItems}
            activeId={activeTab}
            onChange={setActiveTab}
            layoutId="devoirs-filter-subpill"
            size="sm"
            ariaLabel={t('evaluations.tabAll')}
          />
        </div>

        {/*
         * UNE seule action de création : ajouter un devoir ET une activité sont
         * le même geste (créer une évaluation) ; la nature se choisit dans la
         * fenêtre, en cartes colorées. Deux boutons juxtaposés obligeaient à
         * savoir d'avance dans quelle famille on se trouve.
         */}
        <button
          type="button"
          onClick={openKindChooser}
          className="inline-flex h-8 w-full min-w-0 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[10.5px] font-semibold text-primary-foreground shadow-xs transition-all hover:brightness-110 active:scale-[0.97] sm:w-auto sm:px-3.5 sm:text-xs cursor-pointer"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span>{t('evaluations.add')}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-5">
        {/*
         * Activités pédagogiques : TOUJOURS là, y compris vides. La page montre
         * ainsi tout ce qu'une classe peut porter — devoirs et activités — au
         * lieu de faire disparaître une famille entière tant qu'elle est vide.
         */}
        {(activeTab === 'all' || activeTab === 'events') && (
          pedagogicalEvents.length > 0
            ? (
              <PedagogicalEventsSection
                events={pedagogicalEvents}
                onToggle={togglePedagogicalEvent}
                onDelete={deletePedagogicalEvent}
                onOpenDocument={(event) => setDocumentFor({ kind: 'event', event })}
                onOpenStudents={(event) => setStudentsFor(event)}
              />
            )
            : <ActivitiesEmptyState onCreate={openKindChooser} compact={activeTab === 'all'} />
        )}

        {/* Devoirs et évaluations, par semestre */}
        {activeTab !== 'events' && (
          <section className="space-y-4" aria-labelledby="evaluations-assessments-title">
            <div className="px-1">
              <KindGroupHeader
                title={t('evaluations.assessments')}
                tone={KIND_GROUPS[0].tone}
                Icon={KIND_GROUPS[0].Icon}
                titleId="evaluations-assessments-title"
                countLabel={links.length > 0 ? `${links.length} ${links.length === 1 ? t('evaluations.assessmentSingle') : t('evaluations.assessmentPlural')}` : undefined}
              />
            </div>
            {!hasPlan ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/40 px-4 py-8 text-center">
                <CurriculumImportIllustration size={120} className="mb-2" />
                <h4 className="text-sm font-bold text-foreground">{t('evaluations.noOfficialPlan')}</h4>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground text-pretty">
                  {t('evaluations.noOfficialPlanHint')}
                </p>
                <button
                  type="button"
                  onClick={openCreateAssessment}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[2.2]" />
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
                        <div className="flex items-center">
                          <h3 className="evaluations-category-title text-foreground">
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
                          const custom = !!(
                            config.assessmentDates?.[selectedClass!.id]?.[a.id]
                            ?? (a.legacyId ? config.assessmentDates?.[selectedClass!.id]?.[a.legacyId] : undefined)
                          );
                          const absents = (
                            config.assessmentAbsences?.[selectedClass!.id]?.[a.id]
                            ?? (a.legacyId ? config.assessmentAbsences?.[selectedClass!.id]?.[a.legacyId] : undefined)
                          )?.names ?? [];
                          const assessmentDocument = (
                            config.assessmentDocuments?.[selectedClass!.id]?.[a.id]
                            ?? (a.legacyId ? config.assessmentDocuments?.[selectedClass!.id]?.[a.legacyId] : undefined)
                          );
                          const status = STATUS_STYLE[link.status];
                          const isSupervised = a.type !== 'maison';

                          // Type accents
                          return (
                            <div
                              key={a.id}
                              className={cn(
                                'group flex flex-col gap-3 rounded-2xl border bg-card/85 p-3.5 sm:p-4 shadow-xs transition-all duration-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between backdrop-blur-xs',
                                link.status === 'done' ? 'border-border/70' : link.status === 'mismatch' ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/90'
                              )}
                            >
                              {/* Left Info */}
                              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                                <div className="flex min-w-0 items-center">
                                  <button
                                    type="button"
                                    onClick={() => openEditAssessment(a)}
                                    className="group/title inline-flex min-h-9 min-w-0 cursor-pointer items-center rounded-xl px-1 text-start transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                    title={t('evaluations.editDevoir')}
                                  >
                                    <span className="truncate text-sm font-bold text-foreground transition-colors group-hover/title:text-primary">
                                      {t(`evaluations.type.${a.type}`)} {number.format(a.num)}
                                    </span>
                                  </button>
                                </div>

                                {/* Status badges */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {STATUS_CHIP[link.status] && (
                                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', STATUS_CHIP[link.status])}>
                                      {t(status.labelKey)}
                                    </span>
                                  )}

                                </div>
                              </div>

                              {/* Right Actions & Date Selector */}
                              <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:pt-0">
                                {/* Sujet, corrigé, fiche : le document du devoir suit le même
                                    moteur que le carnet, donc le même rendu qu'à l'impression. */}
                                <button
                                  type="button"
                                  onClick={() => setDocumentFor({ kind: 'assessment', link })}
                                  className={cn(
                                    'inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-3 text-[11px] font-bold transition-all cursor-pointer shadow-2xs sm:min-h-9 sm:w-auto sm:text-xs',
                                    assessmentDocument
                                      ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                                      : 'border-border/80 bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground'
                                  )}
                                  aria-label={t('evaluations.doc.title', { activity: `${t(`evaluations.type.${a.type}`)} n°${a.num}` })}
                                >
                                  {t('evaluations.doc.open')}
                                </button>

                                {isSupervised && (
                                  <button
                                    type="button"
                                    onClick={() => setAbsencesFor(link)}
                                    className={cn(
                                      'inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-3 text-[11px] font-bold transition-all cursor-pointer shadow-2xs sm:min-h-9 sm:w-auto sm:text-xs',
                                      absents.length > 0
                                        ? 'border-rose-300 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                                        : 'border-border/80 bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground'
                                    )}
                                  >
                                    {absents.length > 0
                                      ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                                      : t('evaluations.absentees')}
                                  </button>
                                )}

                                <div className="flex w-full min-w-0 items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 p-0.5 shadow-2xs sm:w-auto">
                                  <div className="relative flex min-w-0 flex-1 items-center sm:flex-none">
                                    <input
                                      type="date"
                                      value={a.dateISO}
                                      onChange={(e) => setAssessmentDate(a.id, e.target.value)}
                                      className={cn(
                                        'h-8 w-full min-w-0 rounded-lg bg-transparent px-2 text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer sm:w-auto sm:px-2.5 sm:text-xs',
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

      {/* Ajouter une évaluation : la nature d'abord (cartes), puis ses champs */}
      <Modal
        isOpen={kindChooserOpen}
        onClose={closeKindChooser}
        maxWidth="md"
        className="sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="border-t-0 bg-background"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              {chosenKind
                ? <chosenKind.style.Icon className="h-5 w-5" />
                : <Plus className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <span className="block text-lg font-bold tracking-tight text-foreground sm:text-xl">{t('evaluations.add')}</span>
              {selectedClass && (
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{selectedClassDisplayName}</p>
              )}
            </div>
          </div>
        }
      >
        {selectedClass && (chosenKind ? (
          <>
            <StepTrail step={2} label={t(kindLabelKey(chosenKind))} />
            {/* 2ᵉ étape : la nature choisie reste visible, et se change d'un geste. */}
            <KindHeader kind={chosenKind} onBack={() => { setChosenKind(null); setManualFormOpen(false); }} />
            {chosenKind.family === 'event' ? (
              <PedagogicalEventEditor
                today={today}
                initialType={chosenKind.type}
                onCancel={closeKindChooser}
                onSave={addPedagogicalEvent}
              />
            ) : manualFormOpen ? (
              <ManualAssessmentEditor
                today={today}
                initial={null}
                initialType={chosenKind.type}
                assessments={assessments}
                onCancel={() => setManualFormOpen(false)}
                onSave={saveAssessment}
              />
            ) : (
              <ProgrammedList
                items={programmedFor(chosenKind.type)}
                onOpen={openProgrammedAssessment}
                onCreate={() => setManualFormOpen(true)}
              />
            )}
          </>
        ) : (
          <>
            <StepTrail step={1} label={t('evaluations.stepKind')} />            <KindChooser onSelect={setChosenKind} />
          </>
        ))}
      </Modal>

      {/* Add / Edit Devoir Modal */}
      <Modal
        isOpen={manualEditorOpen}
        onClose={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
        maxWidth="md"
        className="sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="border-t-0 bg-background"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-bold leading-tight tracking-tight text-foreground sm:text-base">
                {editingAssessment ? t('evaluations.editDevoir') : t('evaluations.addDevoir')}
              </span>
              {selectedClass && (
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{selectedClassDisplayName}</p>
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
        className="sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
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
          <StudentNamesEditor
            key={`${selectedClass.id}-${absencesFor.planned.id}`}
            variant="absent"
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

      {/* Document pédagogique : sujet de devoir, corrigé, fiche d'olympiade.
          Une seule source, un aperçu composé par le moteur du carnet (KaTeX). */}
      <ContentDocumentModal
        isOpen={documentFor !== null}
        onClose={() => setDocumentFor(null)}
        title={t('evaluations.doc.title', { activity: documentTitle })}
        subtitle={selectedClass && documentDate
          ? `${selectedClassDisplayName} · ${formatLongDate(documentDate, locale)}`
          : undefined}
        document={documentOf}
        onSave={(source) => {
          if (documentFor?.kind === 'event') saveEventDocument(source);
          else saveAssessmentDocument(source);
          setDocumentFor(null);
        }}
      />

      {/* Élèves consignés sur une activité : les cahiers contrôlés d'un côté, la
          même mécanique que les absents d'un devoir de l'autre. */}
      <Modal
        isOpen={studentsFor !== null}
        onClose={() => setStudentsFor(null)}
        maxWidth="md"
        className="sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {studentsFor?.title || t('evaluations.students.open')}
              </span>
              {studentsFor && (
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  {t(PEDAGOGICAL_EVENT_CONFIG[studentsFor.type].labelKey)} · {formatLongDate(studentsFor.date, locale)}
                </p>
              )}
            </div>
          </div>
        }
      >
        {studentsFor && (
          <StudentNamesEditor
            key={`students-${studentsFor.id}`}
            variant="checked"
            initialNames={studentsFor.students?.names ?? []}
            updatedAt={studentsFor.students?.updatedAt}
            onCancel={() => setStudentsFor(null)}
            onSave={saveEventStudents}
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
  onOpenDocument: (event: PedagogicalEvent) => void;
  onOpenStudents: (event: PedagogicalEvent) => void;
}

/**
 * Aucune activité : un état vide qui propose l'action suivante plutôt qu'une
 * surface muette — c'est le moment où l'enseignant découvre la rubrique. Sur
 * l'onglet « tout », la variante `compact` se contente de la ligne d'invitation :
 * la page montre alors ses deux familles sans doubler la hauteur.
 */
const ActivitiesEmptyState: React.FC<{ onCreate: () => void; compact?: boolean }> = ({ onCreate, compact = false }) => {
  const { t } = useLocale();
  return (
    <div className={`flex flex-col items-center border border-dashed border-border bg-card/40 text-center ${compact ? 'gap-2 rounded-2xl px-4 py-4' : 'rounded-3xl px-4 py-8'}`}>
      {!compact && <SchedulePlanningIllustration size={120} className="mb-2" />}
      <h4 className="text-sm font-bold text-foreground">{t('evaluations.activitiesEmptyTitle')}</h4>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground text-pretty">
        {t('evaluations.activitiesEmptyHint')}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
      >
        <Plus className="h-4 w-4 stroke-[2.2]" />
        {t('evaluations.addActivity')}
      </button>
    </div>
  );
};

/*
 * Commandes d'une carte : mêmes dimensions que dans le reste de la fenêtre,
 * cible tactile de 44 px sur tous les écrans. Elles
 * portent leur libellé et rien d'autre — l'icône de la carte dit déjà la nature
 * de l'activité, une seconde icône par bouton ne ferait que du bruit.
 */
const EVENT_ACTION_CLASS = 'inline-flex h-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 px-3 text-[11px] font-semibold text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground cursor-pointer motion-reduce:transition-none';

const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({
  events,
  onToggle,
  onDelete,
  onOpenDocument,
  onOpenStudents,
}) => {
  const { t, locale } = useLocale();
  if (events.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="px-1">
        <KindGroupHeader
          title={t('evaluations.pedagogicalEvents')}
          tone={KIND_GROUPS[1].tone}
          Icon={KIND_GROUPS[1].Icon}
          countLabel={`${events.length} ${events.length === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural')}`}
        />
      </div>

      <ul className="hub-grid" data-rows>
        {events.map((event) => {
          const done = event.status === 'done';
          const { labelKey, tone, Icon } = PEDAGOGICAL_EVENT_CONFIG[event.type] ?? PEDAGOGICAL_EVENT_CONFIG.autre;
          const names = event.students?.names.length ?? 0;
          const typeLabel = t(labelKey);
          const title = event.title.trim() || typeLabel;
          const normalizeLabel = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase(locale);
          const showType = normalizeLabel(title) !== normalizeLabel(typeLabel);
          const showNote = event.note?.trim() && normalizeLabel(event.note) !== normalizeLabel(title) && normalizeLabel(event.note) !== normalizeLabel(typeLabel);
          return (
            <li
              key={event.id}
              className="hub-card"
              data-layout="row"
              data-static="true"
              data-activity-card="true"
              data-activity-type={event.type}
              data-tone={tone}
              {...(done ? { 'data-done': 'true' } : {})}
            >
              {/* Icône de la nature de l'activité */}
              <span className="hub-card__icon" aria-hidden="true"><Icon /></span>

              {/* Corps : titre + méta (date, type, état) */}
              <div className="hub-card__body min-w-0 flex-1">
                <h4 className="hub-card__title text-start" dir="auto">{title}</h4>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {showType && <span className="tone-chip">{typeLabel}</span>}
                  <time dateTime={event.date} className="activity-card__date hub-card__hint text-start">
                    {formatDateRange(event.date, event.endDate, locale, t('evaluations.rangeSeparator'))}
                  </time>
                  {done && <span className="tone-chip" data-state="done">{t('evaluations.completed')}</span>}
                </div>
                {showNote && (
                  <p className="hub-card__hint line-clamp-2 text-start">{event.note}</p>
                )}
              </div>

              {/* Tous les boutons sur la même ligne : texte(s) d'action + icônes de contrôle */}
              <div className="activity-card__actions">
                {event.type !== REMARK_EVENT_TYPE && (
                  <button
                    type="button"
                    onClick={() => onOpenDocument(event)}
                    className={cn(EVENT_ACTION_CLASS, event.document && 'activity-card__action-filled')}
                    aria-label={t('evaluations.doc.title', { activity: event.title })}
                  >
                    {t('evaluations.doc.open')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenStudents(event)}
                  className={cn(EVENT_ACTION_CLASS, names > 0 && 'activity-card__action-filled')}
                  aria-label={`${t('evaluations.students.open')} — ${event.title}`}
                >
                  {names > 0 ? `${t('evaluations.students.open')} · ${names}` : t('evaluations.students.open')}
                </button>

                <button
                  type="button"
                  onClick={() => onToggle(event.id)}
                  className={cn(
                    'activity-card__icon-btn',
                    done
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/20'
                      : 'border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/8 hover:text-primary'
                  )}
                  aria-label={t(done ? 'evaluations.reopenEventAria' : 'evaluations.completeEventAria', { title: event.title })}
                >
                  {done ? <CircleCheck className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="activity-card__icon-btn border-transparent text-destructive hover:border-destructive/25 hover:bg-destructive/10 active:bg-destructive/20"
                  aria-label={t('evaluations.deleteEventAria', { title: event.title })}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

interface PedagogicalEventEditorProps {
  today: string;
  /** Nature choisie à l'étape précédente : la fiche ne la redemande pas. */
  initialType: PedagogicalEventType;
  onCancel: () => void;
  onSave: (event: PedagogicalEvent) => void;
}

const PedagogicalEventEditor: React.FC<PedagogicalEventEditorProps> = ({ today, initialType, onCancel, onSave }) => {
  const { t } = useLocale();
  const [type] = useState<PedagogicalEventType>(initialType);
  const [title, setTitle] = useState(() => t(PEDAGOGICAL_EVENT_CONFIG[initialType].labelKey));
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

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
  /** Nature choisie à l'étape précédente (création) : la fiche ne la redemande pas. */
  initialType?: DevoirType;
  assessments?: { id: string; type: DevoirType }[];
  onCancel: () => void;
  onSave: (manual: ManualAssessment) => void;
}

const ManualAssessmentEditor: React.FC<ManualAssessmentEditorProps> = ({ today, initial, initialType, assessments = [], onCancel, onSave }) => {
  const { t } = useLocale();
  const initialKind: DevoirType = initial?.type ?? initialType ?? 'controle';
  const [type, setType] = useState<DevoirType>(initialKind);
  // Numéro suivant de SA famille : le premier « devoir maison 1 » arrive quand
  // les contrôles existent déjà.
  const [num, setNum] = useState(String(initial?.num ?? (assessments.filter(a => a.type === initialKind).length + 1)));
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
    <div className="space-y-3.5 sm:space-y-4">
      <div className="space-y-3 sm:space-y-3.5">
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
          {/*
           * Le type n'est proposé QUE pour une modification : à la création, il
           * vient de la carte choisie à l'étape précédente — le redemander ici
           * serait une seconde décision pour la même information.
           */}
          {initial ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('evaluations.manualType')}</span>
              <select
                value={type}
                onChange={(event) => changeType(event.target.value as DevoirType)}
                className="h-9.5 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10"
              >
                <option value="controle">{t('evaluations.type.controle')}</option>
                <option value="controle_court">{t('evaluations.type.controle_court')}</option>
                <option value="controle_global">{t('evaluations.type.controle_global')}</option>
                <option value="oral">{t('evaluations.type.oral')}</option>
                <option value="maison">{t('evaluations.type.maison')}</option>
              </select>
            </label>
          ) : (
            <div className="flex flex-col justify-end gap-1 rounded-xl bg-muted/40 px-3 py-2">
              <span className="text-xs font-bold text-foreground">{t('evaluations.manualType')}</span>
              <span className="truncate text-xs font-semibold text-muted-foreground">{t(`evaluations.type.${type}`)}</span>
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualSemester')}</span>
            <select
              value={semestre}
              onChange={(event) => setSemestre(Number(event.target.value) as 1 | 2)}
              className="h-9.5 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10"
            >
              <option value={1}>{t('evaluations.semester', { number: 1 })}</option>
              <option value={2}>{t('evaluations.semester', { number: 2 })}</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
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
              className="h-9.5 w-full rounded-xl border border-border/80 bg-background px-2.5 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10 sm:px-3"
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
              className="h-9.5 w-full min-w-0 rounded-xl border border-border/80 bg-background px-2 text-[11px] font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10 sm:px-3 sm:text-xs"
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
            className="h-9.5 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 sm:flex sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-9.5 rounded-xl bg-muted px-3 text-[11px] font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground sm:h-10 sm:px-4 sm:text-xs cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-9.5 rounded-xl bg-primary px-4 text-[11px] font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 sm:h-10 sm:px-5 sm:text-xs cursor-pointer"
          >
            {initial ? t('common.save') : t('evaluations.add')}
          </button>
        </div>
      </div>
    </div>
  );
};
