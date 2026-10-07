import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, DevoirType, LessonsData, ManualAssessment, PedagogicalEvent, PedagogicalEventType } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { migrateLessonsData } from '@/domain/notebook/dataUtils';
import { getBundledCalendar, schoolYearLabelFromDate, todayInMorocco } from '@/domain/calendar/calendar';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/domain/evaluations/assessmentSync';
import { resolveClassAssessments } from '@/domain/evaluations/assessments';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import './evaluationsResponsive.css';
import './classPickerCards.css';
import { classColorAttributes } from '@/domain/classes/classColors';
import { Modal } from '@/components/ui/modal';
import {
  ArrowLeft,
  CalendarCheck,
  CircleCheck,
  Plus,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { SchedulePlanningIllustration } from '@/components/ui/DynamicIllustration';
import { StudentNamesEditor } from './components/StudentNamesEditor';
import { ContentDocumentModal } from './components/ContentDocumentModal';
import { KindChooser, KindHeader, ProgrammedList, StepTrail, type ProgrammedItem } from './components/KindChooser';
import { KindGroupHeader } from './components/KindGroupHeader';
import { DEVOIR_KIND_CONFIG, KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG, kindLabelKey, type EvaluationKind } from './kindCatalog';
import { classCardLabelFor, classIdentityFor } from '@/domain/classes/classIdentity';
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
 * Une seule pastille d'état par devoir, et pas d'icône dedans : « Consigné ›
 * ou « Écart de date » se lisent au mot, la couleur porte le reste.
 * Les quatre états s'affichent — une colonne de tableau sans valeur ne se lit
 * pas —, mais à deux niveaux : les deux états qui demandent une ACTION portent
 * la couleur vive (vert consigné, ambre écart), les deux états de routine
 * restent en sourdine (bleu « échéance à venir », gris « non encore consigné »),
 * pour que l'œil ne s'arrête que là où il y a quelque chose à faire.
 */
const STATUS_CHIP: Record<AssessmentLink['status'], string> = {
  done: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400',
  mismatch: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400',
  upcoming: 'bg-primary/8 text-primary ring-primary/20',
  missing: 'bg-muted text-muted-foreground ring-border',
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
  const { t, locale, isRtl } = useLocale();
  const number = useMemo(() => numberFormat(locale), [locale]);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
  /**
   * Navigation à deux vues : l'écran s'ouvre sur les CLASSES, puis la classe
   * ouverte montre ses devoirs et ses activités. En mode contexte (fenêtre d'une
   * classe du tableau de bord), la classe est déjà connue : on va droit à elle.
   */
  const [openedClassId, setOpenedClassId] = useState<string | null>(embedded ? (classes[0]?.id ?? null) : null);
  const openClass = embedded ? true : openedClassId !== null;
  const selectedClass = classes.find((c) => c.id === (openedClassId ?? selectedClassId)) ?? classes[0] ?? null;
  const selectedClassDisplayName = selectedClass ? formatLocalizedClassDisplayName(selectedClass.name, locale) : '';
  const { assessments, planning, calendar } = useClassAssessments(selectedClass, config);
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
  /** Étape de la fenêtre de création : 1 la nature, 2 le contenu de cette nature. */
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [editingAssessment, setEditingAssessment] = useState<ManualAssessment | null>(null);
  /**
   * Le parcours de création, en trois crans : la classe, la nature, le contenu.
   */

  const today = todayInMorocco(new Date(), getBundledCalendar());

  /* Une classe supprimée ne doit jamais laisser les évaluations sur un contexte obsolète. */
  useEffect(() => {
    if (openedClassId && classes.some((classInfo) => classInfo.id === openedClassId)) return;
    if (embedded) return;
    setOpenedClassId(null);
  }, [classes, openedClassId, embedded]);

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

  /**
   * LES ACTIVITÉS DE LA CLASSE — le deuxième cran du parcours.
   *
   * Chaque nature que la classe porte DÉJÀ, avec son nombre d'occurrences :
   * « Devoir surveillé · 6 », « Contrôle des cahiers · 1 ». Une nature sans
   * occurrence ne figure pas ici : elle se crée par « Ajouter », qui fait
   * traverser le choix complet. Un professeur n'a donc jamais à décider entre
   * douze natures vides — il voit ce qui existe, et l'ouvre.
   */
  const classActivities = useMemo(() => {
    const countFor = (kind: EvaluationKind): number => kind.family === 'devoir'
      ? links.filter((link) => link.planned.type === kind.type).length
      : pedagogicalEvents.filter((event) => event.type === kind.type).length;
    return KIND_GROUPS
      .map((group) => ({
        group,
        entries: group.kinds
          .map((kind) => ({ kind, count: countFor(kind) }))
          .filter((entry) => entry.count > 0),
      }))
      .filter((group) => group.entries.length > 0);
  }, [links, pedagogicalEvents]);

  /**
   * LES TIROIRS OUVERTS — un ensemble, pas un seul : deux activités peuvent
   * rester ouvertes côte à côte, donc on COMPARE deux types sans refermer le
   * premier. État dérivé : tant que le professeur n'a rien touché (`undefined`),
   * le premier tiroir de la classe est ouvert — la page montre du contenu au
   * lieu d'une liste fermée. Choix remis à zéro au changement de classe.
   */
  const [openActivityKeys, setOpenActivityKeys] = useState<string[] | undefined>(undefined);
  const activityKey = (kind: EvaluationKind) => `${kind.family}:${kind.type}`;
  const firstActivity = classActivities[0]?.entries[0]?.kind;
  const openKeys = openActivityKeys ?? (firstActivity ? [activityKey(firstActivity)] : []);
  const toggleActivity = (kind: EvaluationKind) => {
    const key = activityKey(kind);
    setOpenActivityKeys(openKeys.includes(key) ? openKeys.filter((open) => open !== key) : [...openKeys, key]);
  };

  /** Les occurrences d'UNE activité : ses devoirs, ou ses séances. */
  const linksOfKind = (kind: EvaluationKind): AssessmentLink[] =>
    (kind.family === 'devoir' ? links.filter((link) => link.planned.type === kind.type) : []);
  const eventsOfKind = (kind: EvaluationKind): PedagogicalEvent[] =>
    (kind.family === 'event' ? pedagogicalEvents.filter((event) => event.type === kind.type) : []);

  /** Ouvre une classe depuis la vue des classes : elle devient le contexte. */
  const openClassView = (classId: string) => {
    setOpenedClassId(classId);
    setSelectedClassId(classId);
    setOpenActivityKeys(undefined);
    setAbsencesFor(null);
    setDocumentFor(null);
    setStudentsFor(null);
    setKindChooserOpen(false);
    setChosenKind(null);
  };

  /** Retour aux classes : on referme aussi les tiroirs. */
  const backToClasses = () => {
    setOpenedClassId(null);
    setOpenActivityKeys(undefined);
  };

  /**
   * Les classes proposées à la première vue, dans le vocabulaire des cartes du
   * tableau de bord : palier reconnu, libellé localisé, numéro de groupe. Elles
   * portent AUSSI ce qu'elles contiennent déjà — un professeur choisit sa classe
   * en sachant où en est son contrôle continu.
   */
  const classPicks = useMemo(() => classes.map((item) => {
    const identity = classIdentityFor(item.name, locale);
    const label = classCardLabelFor(identity, locale);
    const devoirs = planning && calendar
      ? resolveClassAssessments(item, planning, config, calendar, today).length
      : 0;
    return {
      id: item.id,
      color: item.color,
      tier: label.tier,
      title: label.title,
      group: label.group,
      fullName: label.fullName,
      devoirs,
      activities: config.pedagogicalEvents?.[item.id]?.length ?? 0,
    };
  }), [classes, locale, planning, calendar, config, today]);

  /*
   * Une seule porte d'entrée pour tout créer : la NATURE d'abord, puis ses
   * zones. La classe n'est PAS redemandée — elle est déjà ouverte sur l'écran,
   * et reposer la question serait une seconde décision pour la même réponse.
   * Le cran déjà franchi reste cliquable dans le fil d'étapes.
   */
  const openKindChooser = () => {
    setChosenKind(null);
    setManualFormOpen(false);
    setWizardStep(1);
    setKindChooserOpen(true);
  };

  const closeKindChooser = () => {
    setKindChooserOpen(false);
    setChosenKind(null);
    setManualFormOpen(false);
    setWizardStep(1);
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
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20">
          <CalendarCheck className="h-7 w-7 stroke-[2.2]" />
        </div>
        <h3 className="text-base font-bold text-foreground">{t('evaluations.createClass')}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {t('evaluations.createClassHint')}
        </p>
      </div>
    );
  }

  /* Les deux semestres sont toujours lus : la classe ouverte se lit en entier. */
  /**
   * LES LIGNES DU TABLEAU DES DEVOIRS — une par occurrence de l'activité ouverte.
   * Quatre colonnes : l'identité cliquable (« Devoir surveillé 3 »), l'état, la
   * date réglable, puis les actions — toujours dans cet ordre, donc on sait où
   * cliquer sans relire. Aucune icône : la nature est écrite dans le libellé.
   */
  const renderAssessmentRows = (group: AssessmentLink[]) => group.map((link) => {
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
    const kindStyle = DEVOIR_KIND_CONFIG[a.type] ?? DEVOIR_KIND_CONFIG.controle;

    // UNE LIGNE DU TABLEAU : l'identité cliquable, l'état, la date réglable,
    // puis les actions — toujours dans cet ordre, donc on sait où cliquer sans
    // relire. La nature est déjà dans le libellé : aucune icône à répéter.
    return (
      <div
        key={a.id}
        className="ev-row evaluation-tone"
        data-assessment-id={a.id}
        data-tone={kindStyle.tone}
      >
        <div className="ev-row__id min-w-0">
          <button
            type="button"
            onClick={() => openEditAssessment(a)}
            className="-ms-1.5 inline-flex min-h-9 max-w-full cursor-pointer items-center truncate rounded-lg px-1.5 text-start text-sm font-bold text-foreground transition-colors hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            title={t('evaluations.editDevoir')}
          >
            {t(`evaluations.type.${a.type}`)} {number.format(a.num)}
          </button>
        </div>

        <div className="ev-row__state">
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', STATUS_CHIP[link.status])}>
            {t(status.labelKey)}
          </span>
        </div>

        <div className="ev-row__date">
          <input
            type="date"
            value={a.dateISO}
            onChange={(e) => setAssessmentDate(a.id, e.target.value)}
            data-custom={custom}
            title={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : t('evaluations.adjustDate')}
            aria-label={t('evaluations.assessmentDateAria', { assessment: t(`evaluations.type.${a.type}`) })}
          />
          {custom && (
            <button
              type="button"
              onClick={() => setAssessmentDate(a.id, '')}
              className="ev-icon-btn"
              title={t('evaluations.restoreDate')}
              aria-label={t('evaluations.restoreDate')}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ev-row__actions">
          {/* Sujet, corrigé, fiche : le document du devoir suit le même
              moteur que le carnet, donc le même rendu qu'à l'impression. */}
          <button
            type="button"
            onClick={() => setDocumentFor({ kind: 'assessment', link })}
            className="ev-action"
            data-filled={assessmentDocument ? 'tone' : undefined}
            aria-label={t('evaluations.doc.title', { activity: `${t(`evaluations.type.${a.type}`)} n°${a.num}` })}
          >
            {t('evaluations.doc.open')}
          </button>

          {isSupervised && (
            <button
              type="button"
              onClick={() => setAbsencesFor(link)}
              className="ev-action"
              data-filled={absents.length > 0 ? 'danger' : undefined}
            >
              {absents.length > 0
                ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                : t('evaluations.absentees')}
            </button>
          )}

          <button
            type="button"
            onClick={() => deleteAssessment(a.id)}
            className="ev-icon-btn"
            data-danger="true"
            title={t('evaluations.manualDelete')}
            aria-label={t('evaluations.manualDelete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  });

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
    <div className="evaluation-workspace space-y-4 font-sans sm:space-y-5">
      {/* VUE 1 — LES CLASSES. L'écran commence par « quelle classe ? », en
          grandes cartes : le palier, le libellé, le groupe, et ce que la classe
          porte déjà (devoirs et activités). Rien d'autre : ni onglets, ni
          filtres, ni sélecteur — le contenu n'apparaît qu'après le choix. */}
      {!openClass && (
        <ClassPicker classes={classPicks} onOpen={openClassView} />
      )}

      {/* VUE 2 — LA CLASSE OUVERTE : ses ACTIVITÉS, chacune dépliable.
          Le parcours se lit toujours de gauche à droite du même fil : la classe,
          l'activité, puis ses occurrences — les devoirs d'un type, ses séances —
          qui s'ouvrent DANS la page au lieu d'envoyer ailleurs. */}
      {openClass && (
        <>
          <div className="evaluation-class-meta flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {!embedded && (
                <button
                  type="button"
                  onClick={backToClasses}
                  className="evaluation-back inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className={cn('h-4 w-4', isRtl && 'rotate-180')} aria-hidden="true" />
                  {t('evaluations.allClasses')}
                </button>
              )}
              <div className="min-w-0">
                <h2 id="evaluations-class-context" className={cn("truncate text-sm font-bold text-foreground sm:text-base", embedded && "sr-only")}>
                  {selectedClassDisplayName}
                </h2>
                <p className="truncate text-[11px] font-medium text-muted-foreground">
                  {number.format(links.length)} {links.length === 1 ? t('evaluations.assessmentSingle') : t('evaluations.assessmentPlural')}
                  {' · '}
                  {number.format(pedagogicalEvents.length)} {pedagogicalEvents.length === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural')}
                </p>
              </div>
            </div>

            {/*
             * UNE seule action de création : le devoir et l'activité sont le même
             * geste ; la nature se choisit dans la fenêtre, pas à l'avance.
             */}
            <button
              type="button"
              onClick={openKindChooser}
              className="evaluation-add inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 active:scale-[0.97] sm:w-auto cursor-pointer"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span>{t('evaluations.add')}</span>
            </button>
          </div>

          <div className="space-y-4">
            {classActivities.length === 0 ? (
              <ActivitiesEmptyState onCreate={openKindChooser} />
            ) : classActivities.map(({ group, entries }) => {
              const total = entries.reduce((sum, entry) => sum + entry.count, 0);
              return (
                <section key={group.id} className="space-y-2" aria-label={t(group.titleKey)}>
                  <KindGroupHeader
                    title={t(group.titleKey)}
                    tone={group.tone}
                    headingLevel={4}
                    countLabel={`${number.format(total)} ${group.id === 'devoir'
                      ? (total === 1 ? t('evaluations.assessmentSingle') : t('evaluations.assessmentPlural'))
                      : (total === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural'))}`}
                  />
                  <div className="ev-board">
                    {entries.map(({ kind, count }) => {
                      const isOpen = openKeys.includes(activityKey(kind));
                      const label = t(kindLabelKey(kind));
                      const countLabel = `${number.format(count)} ${kind.family === 'devoir'
                        ? (count === 1 ? t('evaluations.assessmentSingle') : t('evaluations.assessmentPlural'))
                        : (count === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural'))}`;
                      return (
                        <div key={kind.type} className="ev-accordion" data-activity-kind={kind.type} data-open={isOpen ? 'true' : undefined}>
                          {/* Le tiroir : le type, son compte, et le mot qui dit ce
                              qu'il fait. Aucune icône, aucun chevron — « Ouvrir » se lit. */}
                          <button
                            type="button"
                            onClick={() => toggleActivity(kind)}
                            aria-expanded={isOpen}
                            aria-label={`${label} — ${countLabel}`}
                            className="ev-accordion__toggle"
                          >
                            <span className="ev-accordion__label">{label}</span>
                            <span className="ev-accordion__count">
                              <span className="tone-chip">{countLabel}</span>
                            </span>
                            <span className="ev-accordion__toggle-word" aria-hidden="true">
                              {isOpen ? t('evaluations.collapse') : t('evaluations.expand')}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="ev-accordion__body">
                              {kind.family === 'event' ? (
                                <PedagogicalEventsSection
                                  events={eventsOfKind(kind)}
                                  showHeader={false}
                                  onToggle={togglePedagogicalEvent}
                                  onDelete={deletePedagogicalEvent}
                                  onOpenDocument={(event) => setDocumentFor({ kind: 'event', event })}
                                  onOpenStudents={(event) => setStudentsFor(event)}
                                />
                              ) : (
                                <div className="ev-board__rows">
                                  <div className="ev-board__head" aria-hidden="true">
                                    <span>{t('evaluations.assessmentSingle')}</span>
                                    <span>{t('evaluations.colState')}</span>
                                    <span>{t('evaluations.manualDate')}</span>
                                    <span>{t('evaluations.colActions')}</span>
                                  </div>
                                  {renderAssessmentRows(linksOfKind(kind))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}


      {/* Ajouter une évaluation : la nature d'abord (cartes), puis ses champs */}
      <Modal
        isOpen={kindChooserOpen}
        onClose={closeKindChooser}
        maxWidth="md"
        className="evaluation-modal sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="border-t-0 bg-background"
        title={
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <span className="block text-lg font-bold tracking-tight text-foreground sm:text-xl">{t('evaluations.add')}</span>
              {selectedClass && (
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{selectedClassDisplayName}</p>
              )}
            </div>
          </div>
        }
      >
        {selectedClass && (
          <>
            {/* Le fil d'étapes EST la navigation : un cran franchi se reclique,
                donc revenir ne coûte ni un bouton de plus ni la saisie. */}
            <StepTrail
              step={wizardStep}
              label={chosenKind ? t(kindLabelKey(chosenKind)) : undefined}
              onStep={(next) => {
                setWizardStep(next);
                setChosenKind(null);
                setManualFormOpen(false);
              }}
            />

            {/* 1 · LA NATURE — la décision de l'écran, en grandes cartes. */}
            {wizardStep === 1 && (
              <div className="wizard-step">
                <KindChooser onSelect={(kind) => { setChosenKind(kind); setWizardStep(2); }} />
              </div>
            )}

            {/* 2 · LES ZONES DE CETTE NATURE — devoirs programmés, ou champs. */}
            {wizardStep === 2 && chosenKind && (
              <div className="wizard-step">
                <KindHeader
                  kind={chosenKind}
                  onBack={() => { setChosenKind(null); setManualFormOpen(false); setWizardStep(1); }}
                />
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
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Add / Edit Devoir Modal */}
      <Modal
        isOpen={manualEditorOpen}
        onClose={() => { setManualEditorOpen(false); setEditingAssessment(null); }}
        maxWidth="md"
        className="evaluation-modal sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="border-t-0 bg-background"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
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
        className="evaluation-modal sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center shrink-0 rounded-xl bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {t('evaluations.absentees')}
              </span>
              {absencesFor && selectedClass && (
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  {t(`evaluations.type.${absencesFor.planned.type}`)} {number.format(absencesFor.planned.num)} · {formatLongDate(absencesFor.planned.dateISO, locale)}
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
        className="evaluation-modal sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center shrink-0 rounded-xl bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className="block break-words text-base font-semibold text-foreground sm:text-lg">
                {t('evaluations.students.open')}
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

/** Une classe telle que la vue des classes la présente : son identité et ses comptes. */
interface ClassPick {
  id: string;
  color: string;
  tier?: string | null;
  title: string;
  group?: string | null;
  fullName: string;
  devoirs: number;
  activities: number;
}

/**
 * VUE 1 — LES CLASSES.
 *
 * L'écran du contrôle continu commence par la seule question qui commande tout
 * le reste : quelle classe ? De grandes cartes, une par classe — palier, libellé
 * localisé, numéro de groupe —, et ce que la classe porte DÉJÀ (devoirs,
 * activités) pour savoir où l'on en est avant d'entrer. Aucune icône, aucun
 * onglet, aucun filtre : la liste est la première décision, le contenu vient
 * après elle et rien ne se mêle à elle.
 */
const ClassPicker: React.FC<{ classes: ClassPick[]; onOpen: (id: string) => void }> = ({ classes, onOpen }) => {
  const { t, locale } = useLocale();
  const number = numberFormat(locale);
  return (
    <section className="space-y-3">
      <p className="px-1 text-xs leading-relaxed text-muted-foreground text-pretty">{t('evaluations.pickClassHint')}</p>
      <ul className="hub-grid" data-rows>
        {classes.map(item => (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              data-class-id={item.id}
              {...classColorAttributes(item)}
              onClick={() => onOpen(item.id)}
              className="hub-card class-choice h-full w-full"
              data-layout="row"
              aria-label={item.fullName}
            >
              <span className="hub-card__body min-w-0 flex-1">
                {item.tier && <span className="class-choice__tier">{item.tier}</span>}
                <span className="class-choice__identity">
                  <span className="hub-card__title block text-start">{item.title}</span>
                  {item.group && <bdi dir="ltr" className="class-choice__group" aria-hidden="true">{item.group}</bdi>}
                </span>
                <span className="class-choice__counts">
                  {number.format(item.devoirs)} {item.devoirs === 1 ? t('evaluations.assessmentSingle') : t('evaluations.assessmentPlural')}
                  {' · '}
                  {number.format(item.activities)} {item.activities === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

interface PedagogicalEventsSectionProps {  events: PedagogicalEvent[];
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
 * Les commandes de ligne vivent dans `evaluationsBoard.css` (`.ev-action`, `.ev-icon-btn`) :
 * une seule règle les sert dans les deux zones — devoirs et activités —, donc
 * la même cible tactile de 44 px au doigt et les mêmes états au survol.
 */

const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps & { showHeader?: boolean }> = ({
  events,
  onToggle,
  onDelete,
  onOpenDocument,
  onOpenStudents,
  showHeader = true,
}) => {
  const { t, locale } = useLocale();
  if (events.length === 0) return null;

  return (
    <section className="space-y-2.5">
      {/* Dans une activité ouverte, c'est la nature qui nomme l'écran :
          l'en-tête de famille serait une redite. */}
      {showHeader && (
        <div className="px-1">
          <KindGroupHeader
            title={t('evaluations.pedagogicalEvents')}
            tone={KIND_GROUPS[1].tone}
            countLabel={`${events.length} ${events.length === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural')}`}
          />
        </div>
      )}

      <div className="ev-board">
        <div className="ev-board__head" aria-hidden="true">
          <span>{t('evaluations.titleLabel')}</span>
          <span>{t('evaluations.colState')}</span>
          <span>{t('evaluations.manualDate')}</span>
          <span>{t('evaluations.colActions')}</span>
        </div>
        {/* Même tableau que les devoirs : une activité se lit dans les mêmes
            colonnes, avec sa nature, son état, sa période et ses commandes. */}
        <ul className="ev-board__rows">
        {events.map((event) => {
          const done = event.status === 'done';
          const { labelKey, tone } = PEDAGOGICAL_EVENT_CONFIG[event.type] ?? PEDAGOGICAL_EVENT_CONFIG.autre;
          const names = event.students?.names.length ?? 0;
          const typeLabel = t(labelKey);
          const title = event.title.trim() || typeLabel;
          const normalizeLabel = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase(locale);
          const showType = normalizeLabel(title) !== normalizeLabel(typeLabel);
          const showNote = event.note?.trim() && normalizeLabel(event.note) !== normalizeLabel(title) && normalizeLabel(event.note) !== normalizeLabel(typeLabel);
          return (
            <li
              key={event.id}
              className="ev-row evaluation-tone"
              data-activity-card="true"
              data-activity-type={event.type}
              data-tone={tone}
              data-done={done ? 'true' : undefined}
            >
              {/* 1 · L'identité : le titre, sa nature écrite SEULEMENT si le titre ne
                  la dit pas déjà, et la note qui reste utile. */}
              <div className="ev-row__id min-w-0">
                <h4 className="text-[13.5px] font-bold leading-snug text-foreground" dir="auto">{title}</h4>
                {showType && <span className="tone-chip">{typeLabel}</span>}
                {showNote && (
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground text-start">{event.note}</p>
                )}
              </div>

              {/* 3 · L'état : écrit seulement quand il y a quelque chose à dire. */}
              <div className="ev-row__state">
                {done && <span className="tone-chip" data-state="done">{t('evaluations.completed')}</span>}
              </div>

              {/* 4 · La période : lecture seule — une activité se date à sa création. */}
              <div className="ev-row__date">
                <time dateTime={event.date} className="ev-row__period">
                  {formatDateRange(event.date, event.endDate, locale, t('evaluations.rangeSeparator'))}
                </time>
              </div>

              {/* 5 · Les commandes, toujours dans le même ordre que celles d'un devoir :
                  le document, les élèves, l'état, la suppression. */}
              <div className="ev-row__actions">
                {event.type !== REMARK_EVENT_TYPE && (
                  <button
                    type="button"
                    onClick={() => onOpenDocument(event)}
                    className="ev-action"
                    data-filled={event.document ? 'tone' : undefined}
                    aria-label={t('evaluations.doc.title', { activity: event.title })}
                  >
                    {t('evaluations.doc.open')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenStudents(event)}
                  className="ev-action"
                  data-filled={names > 0 ? 'tone' : undefined}
                  aria-label={`${t('evaluations.students.open')} — ${event.title}`}
                >
                  {names > 0 ? `${t('evaluations.students.open')} · ${names}` : t('evaluations.students.open')}
                </button>

                <button
                  type="button"
                  onClick={() => onToggle(event.id)}
                  className="ev-icon-btn"
                  data-done={done}
                  aria-label={t(done ? 'evaluations.reopenEventAria' : 'evaluations.completeEventAria', { title: event.title })}
                >
                  {done ? <CircleCheck className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="ev-icon-btn"
                  data-danger="true"
                  aria-label={t('evaluations.deleteEventAria', { title: event.title })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
        </ul>
      </div>
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
              <Select value={type} onValueChange={(value) => changeType(value as DevoirType)}>
                <SelectTrigger aria-label={t('evaluations.manualType')} className="min-h-11 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['controle', 'controle_court', 'controle_global', 'oral', 'maison'] as const).map(value => (
                    <SelectItem key={value} value={value}>{t(`evaluations.type.${value}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : (
            <div className="flex flex-col justify-end gap-1 rounded-xl bg-muted/40 px-3 py-2">
              <span className="text-xs font-bold text-foreground">{t('evaluations.manualType')}</span>
              <span className="truncate text-xs font-semibold text-muted-foreground">{t(`evaluations.type.${type}`)}</span>
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualSemester')}</span>
            <Select value={String(semestre)} onValueChange={(value) => setSemestre(Number(value) as 1 | 2)}>
              <SelectTrigger aria-label={t('evaluations.manualSemester')} className="min-h-11 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('evaluations.semester', { number: 1 })}</SelectItem>
                <SelectItem value="2">{t('evaluations.semester', { number: 2 })}</SelectItem>
              </SelectContent>
            </Select>
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
