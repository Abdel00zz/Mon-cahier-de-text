import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, ClassEvaluationEntry, DevoirType, LessonsData, ManualAssessment, NotebookCondition, PedagogicalEvent, PedagogicalEventType } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { migrateLessonsData } from '@/domain/notebook/dataUtils';
import { getBundledCalendar, schoolYearLabelFromDate, todayInMorocco } from '@/domain/calendar/calendar';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/domain/evaluations/assessmentSync';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import './evaluationsResponsive.css';
import './evaluationReference.css';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  CalendarCheck,
  CircleCheck,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  FileText,
  Users,
  UserX,
  BookCheck,
  Mic,
} from 'lucide-react';
import { saveNotebook } from '@/infrastructure/storage/saveNotebook';
import { syncEventToNotebook, syncAssessmentDateToNotebook } from '@/domain/evaluations/notebookSyncBridge';
import { useLocale } from '@/i18n/LocaleProvider';
import { SchedulePlanningIllustration } from '@/components/ui/DynamicIllustration';
import { useEvaluationModals } from './hooks/useEvaluationModals';
import { useEvaluationActions } from './hooks/useEvaluationActions';
import { StudentReviewDialog } from './components/StudentReviewDialog';
import { StudentNamesEditor } from './components/StudentNamesEditor';
import { ContentDocumentModal } from './components/ContentDocumentModal';
import { KindChooser, KindHeader, ProgrammedList, StepTrail, type ProgrammedItem } from './components/KindChooser';
import { KindGroupHeader } from './components/KindGroupHeader';
import { DEVOIR_KIND_CONFIG, KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG, kindLabelKey, type EvaluationKind } from './kindCatalog';
import { numberFormat } from '@/lib/formatters';

interface DevoirsViewProps {
  classInfo: ClassInfo;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  entry?: ClassEvaluationEntry;
  lessonsData?: LessonsData;
  onLessonsChange?: (newLessons: LessonsData) => void;
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

const STATUS_CHIP: Record<AssessmentLink['status'], string> = {
  done: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400',
  mismatch: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400',
  upcoming: 'bg-primary/8 text-primary ring-primary/20',
  missing: 'bg-muted text-muted-foreground ring-border',
};

const formatDateRange = (start: string, end: string | undefined, locale: AppLocale, rangeSeparator: string): string => {
  if (!end || end === start) return formatLongDate(start, locale);
  return `${formatLongDate(start, locale)} ${rangeSeparator} ${formatLongDate(end, locale)}`;
};

export const DevoirsView: React.FC<DevoirsViewProps> = ({
  classInfo,
  config,
  onConfigChange,
  entry = 'all',
  lessonsData,
  onLessonsChange,
}) => {
  const activeLessons = useMemo(() => lessonsData ?? readLessons(classInfo.id), [lessonsData, classInfo.id]);
  const persistLessons = (nextLessons: LessonsData) => {
    if (onLessonsChange) {
      onLessonsChange(nextLessons);
    } else {
      saveNotebook(classInfo.id, nextLessons, 'ltr');
    }
  };
  const { t, locale } = useLocale();
  const number = useMemo(() => numberFormat(locale), [locale]);
  const selectedClass = classInfo;
  const selectedClassDisplayName = selectedClass ? formatLocalizedClassDisplayName(selectedClass.name, locale) : '';
  const { assessments } = useClassAssessments(selectedClass, config);
  const {
    absencesFor, oralFor, documentFor, studentsFor, manualEditorOpen, kindChooserOpen,
    chosenKind, manualFormOpen, wizardStep, editingAssessment,
    setAbsencesFor, setOralFor, setDocumentFor, setStudentsFor, setManualEditorOpen,
    setChosenKind, setManualFormOpen, setWizardStep, setEditingAssessment, openKindChooser, closeKindChooser,
  } = useEvaluationModals();
  const actions = useEvaluationActions(classInfo.id, config, onConfigChange);

  const [deletingAssessment, setDeletingAssessment] = useState<{ id: string; name: string } | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; title: string } | null>(null);

  const today = todayInMorocco(new Date(), getBundledCalendar());

  const links = useMemo(() => {
    if (!selectedClass) return [];
    return linkAssessments(assessments, findNotebookAssessments(activeLessons), today);
  }, [assessments, selectedClass, today, activeLessons]);

  const pedagogicalEvents = useMemo(
    () =>
      selectedClass
        ? [...(config.pedagogicalEvents?.[selectedClass.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [config.pedagogicalEvents, selectedClass]
  );

  const classActivities = useMemo(() => {
    const countFor = (kind: EvaluationKind): number => kind.family === 'devoir'
      ? links.filter((link) => link.planned.type === kind.type).length
      : pedagogicalEvents.filter((event) => event.type === kind.type).length;
    return KIND_GROUPS
      .map((group) => ({
        group,
        entries: group.kinds
          .map((kind) => ({ kind, count: countFor(kind) }))
          .filter((item) => item.count > 0 || item.kind.type === entry),
      }))
      .filter((group) => group.entries.length > 0);
  }, [links, pedagogicalEvents, entry]);

  const [openActivityKeys, setOpenActivityKeys] = useState<string[] | undefined>(() => entry === 'all' ? undefined : [`${entry === 'oral' ? 'devoir' : 'event'}:${entry}`]);
  const activityKey = (kind: EvaluationKind) => `${kind.family}:${kind.type}`;
  const firstActivity = classActivities[0]?.entries[0]?.kind;
  const openKeys = openActivityKeys ?? (firstActivity ? [activityKey(firstActivity)] : []);
  const toggleActivity = (kind: EvaluationKind) => {
    const key = activityKey(kind);
    setOpenActivityKeys(openKeys.includes(key) ? openKeys.filter((open) => open !== key) : [...openKeys, key]);
  };

  const linksOfKind = (kind: EvaluationKind): AssessmentLink[] =>
    (kind.family === 'devoir' ? links.filter((link) => link.planned.type === kind.type) : []);
  const eventsOfKind = (kind: EvaluationKind): PedagogicalEvent[] =>
    (kind.family === 'event' ? pedagogicalEvents.filter((event) => event.type === kind.type) : []);

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

  const openProgrammedAssessment = (assessmentId: string) => {
    const link = links.find(item => item.planned.id === assessmentId);
    if (!link) return;
    closeKindChooser();
    setDocumentFor({ kind: 'assessment', link });
  };

  const setAssessmentDate = (assessmentId: string, dateISO: string) => {
    actions.setAssessmentDate(assessmentId, dateISO, assessments.find(item => item.id === assessmentId)?.legacyId);
    const targetAssessment = assessments.find(item => item.id === assessmentId);
    if (targetAssessment && dateISO) {
      const { lessons: nextLessons, updated } = syncAssessmentDateToNotebook(
        activeLessons,
        { id: targetAssessment.id, type: targetAssessment.type, num: targetAssessment.num, dateISO, label: targetAssessment.label },
        locale
      );
      if (updated) persistLessons(nextLessons);
    }
  };

  const addPedagogicalEvent = (event: PedagogicalEvent) => {
    actions.addEvent(event);
    const { lessons: nextLessons, updated } = syncEventToNotebook(activeLessons, event, locale);
    if (updated) {
      persistLessons(nextLessons);
    }
    closeKindChooser();
    toast.success(t('evaluations.eventAddedToast', {
      event: t(PEDAGOGICAL_EVENT_CONFIG[event.type].labelKey),
      className: selectedClassDisplayName,
    }));
  };

  const togglePedagogicalEvent = actions.toggleEvent;
  const deletePedagogicalEvent = actions.deleteEvent;

  const activityLabelOf = (event: PedagogicalEvent) =>
    event.title || t(PEDAGOGICAL_EVENT_CONFIG[event.type].labelKey);

  const saveEventDocument = (source: string) => {
    if (documentFor?.kind === 'event') actions.saveEventDocument(documentFor.event.id, source);
  };
  const saveAssessmentDocument = (source: string) => {
    if (documentFor?.kind === 'assessment') actions.saveAssessmentDocument(documentFor.link.planned.id, source, documentFor.link.planned.legacyId);
  };

  const saveEventStudents = (names: string[], conditions?: Record<string, NotebookCondition>) => {
    if (!selectedClass || !studentsFor) return;
    const target = studentsFor.id;
    const activity = activityLabelOf(studentsFor);
    actions.saveEventStudents(target, names, conditions);
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
    actions.saveAssessment(manual, editingAssessment?.id);
    const { lessons: nextLessons, updated } = syncAssessmentDateToNotebook(
      activeLessons,
      { id: manual.id, type: manual.type, num: manual.num, dateISO: manual.dateISO },
      locale
    );
    if (updated) persistLessons(nextLessons);
    setManualEditorOpen(false);
    closeKindChooser();
    setEditingAssessment(null);
    toast.success(
      t('evaluations.manualSaved', { type: t(`evaluations.type.${manual.type}`), number: manual.num })
    );
  };

  const deleteAssessment = (id: string) => {
    actions.deleteAssessment(id);
    toast.success(t('evaluations.manualDeleted'));
  };

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
    const displayName = `${t(`evaluations.type.${a.type}`)} ${number.format(a.num)}`;

    const statusExplanation = link.status === 'synced'
      ? (locale === 'ar' ? 'متزامن تماماً: التاريخ يطابق تماماً الحصة المسجلة في دفتر النصوص' : 'Parfaitement synchronisé : la date correspond exactement à la séance dans le cahier')
      : link.status === 'mismatch'
        ? (locale === 'ar' ? `اختلاف تاريخ التخطيط (${link.planned.dateISO}) مع دفتر النصوص (${link.entry?.date ?? ''})` : `Écart de date entre la programmation (${link.planned.dateISO}) et le cahier (${link.entry?.date ?? ''})`)
        : link.status === 'done'
          ? (locale === 'ar' ? 'تم إجراء هذه المراقبة' : 'Évaluation effectuée')
          : (locale === 'ar' ? 'مراقبة مبرمجة في التقويم' : 'Évaluation planifiée');

    const docTooltip = assessmentDocument
      ? (locale === 'ar' ? 'المحتوى محرر — انقر للاطلاع أو تعديل نص الموضوع، التمارين وعناصر الإجابة' : 'Sujet et corrigé rédigés — Cliquer pour consulter ou modifier')
      : (locale === 'ar' ? 'لم يتم تحرير أي محتوى — انقر لكتابة نص الفرض، التمارين وسلّم التنقيط' : 'Aucun document rédigé — Cliquer pour rédiger le sujet ou le corrigé');

    const absentsTooltip = absents.length > 0
      ? (locale === 'ar' ? `${absents.length} تلميذ(ة) متغيب(ة) — إدارة لائحة الغياب وبرمجة الاستدراك` : `${absents.length} élève(s) absent(s) — Gérer la liste des absents et le rattrapage`)
      : (locale === 'ar' ? 'تسجيل التلاميذ المتغيبين في هذا الفرض لتنظيم حصة الاستدراك' : 'Consigner les élèves absents pour programmer la séance de rattrapage');

    const oralTooltip = locale === 'ar'
      ? 'تقييم مهارات التعبير الشفهي وتدوين ملاحظات ومكتسبات التلاميذ'
      : 'Évaluer les compétences orales et consigner les observations des élèves';

    return (
      <div
        key={a.id}
        className="ev-row evaluation-tone"
        data-assessment-id={a.id}
        data-assessment-type={a.type}
        data-legacy-id={a.legacyId}
        data-tone={kindStyle.tone}
        data-custom={custom ? 'true' : undefined}
      >
            <div className="ev-row__id min-w-0">
              <button
                type="button"
                onClick={() => setEditingAssessment(a)}
                className="-ms-1.5 inline-flex min-h-11 max-w-full cursor-pointer items-center truncate rounded-lg px-2 text-start text-sm font-bold text-foreground transition-colors hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                title={t('evaluations.editDevoir')}
                data-tippy-content={locale === 'ar' ? `تعديل تفاصيل ${displayName}` : `Modifier les détails de ${displayName}`}
              >
                {displayName}
              </button>
            </div>

            <div className="ev-row__state flex flex-col items-center gap-1">
              <span
                className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', STATUS_CHIP[link.status])}
                data-tippy-content={statusExplanation}
                title={statusExplanation}
              >
                {t(status.labelKey)}
              </span>
              {link.status === 'mismatch' && link.entry?.date && (
                <button
                  type="button"
                  onClick={() => {
                    const targetDate = link.entry?.date;
                    if (!targetDate) return;
                    setAssessmentDate(a.id, targetDate);
                    toast.success(locale === 'ar' ? `تمت المزامنة مع دفتر النصوص (${targetDate})` : `Date alignée sur le cahier (${targetDate})`);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 transition-all hover:bg-amber-500/25 active:scale-95 dark:text-amber-400"
                  title={locale === 'ar' ? `ضبط تاريخ التخطيط ليتوافق مع دفتر النصوص (${link.entry?.date})` : `Aligner la date sur le cahier (${link.entry?.date})`}
                  data-tippy-content={locale === 'ar' ? `مزامنة تاريخ التخطيط مع تاريخ الحصة المسجلة في دفتر النصوص (${link.entry?.date})` : `Harmoniser la date sur celle de la séance consignée dans le cahier (${link.entry?.date})`}
                  aria-label={locale === 'ar' ? `ضبط مع دفتر النصوص (${link.entry?.date})` : `Aligner sur le cahier (${link.entry?.date})`}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{locale === 'ar' ? 'مزامنة' : 'Aligner'}</span>
                </button>
              )}
            </div>

            <div className="ev-row__date">
              <input
                type="date"
                value={a.dateISO}
                onChange={(e) => setAssessmentDate(a.id, e.target.value)}
                data-custom={custom}
                title={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : t('evaluations.adjustDate')}
                data-tippy-content={locale === 'ar' ? `تعديل تاريخ إجراء ${displayName} في التقويم` : `Modifier la date d'exécution de ${displayName}`}
                aria-label={t('evaluations.assessmentDateAria', { assessment: t(`evaluations.type.${a.type}`) })}
                className="h-9 rounded-lg border border-border/80 bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {custom && (
                <button
                  type="button"
                  onClick={() => setAssessmentDate(a.id, '')}
                  className="ev-icon-btn"
                  title={t('evaluations.restoreDate')}
                  data-tippy-content={locale === 'ar' ? 'استعادة التاريخ الرسمي المقترح' : 'Rétablir la date officielle préconisée'}
                  aria-label={t('evaluations.restoreDate')}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="ev-row__actions">
              <button
                type="button"
                onClick={() => setDocumentFor({ kind: 'assessment', link })}
                className="ev-action"
                data-filled={assessmentDocument ? 'tone' : undefined}
                data-tippy-content={docTooltip}
                title={docTooltip}
                aria-label={t('evaluations.doc.title', { activity: `${t(`evaluations.type.${a.type}`)} n°${a.num}` })}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                <span>{t('evaluations.doc.open')}</span>
              </button>

              {isSupervised && (
                <button
                  type="button"
                  onClick={() => setAbsencesFor(link)}
                  className="ev-action"
                  data-filled={absents.length > 0 ? 'danger' : undefined}
                  data-tippy-content={absentsTooltip}
                  title={absentsTooltip}
                  aria-label={absents.length > 0
                    ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                    : t('evaluations.absentees')}
                >
                  <UserX className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                  <span>
                    {absents.length > 0
                      ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                      : t('evaluations.absentees')}
                  </span>
                </button>
              )}

              {a.type === 'oral' && (
                <button
                  type="button"
                  onClick={() => setOralFor(link)}
                  className="ev-action"
                  data-tippy-content={oralTooltip}
                  title={oralTooltip}
                  aria-label={`${t('evaluations.oral.title')} — ${t('evaluations.type.oral')} ${number.format(a.num)}`}
                >
                  <Mic className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                  <span>{t('evaluations.oral.title')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDeletingAssessment({ id: a.id, name: displayName })}
                className="ev-icon-btn"
                data-danger="true"
                data-tippy-content={locale === 'ar' ? `حذف ${displayName} نهائياً` : `Supprimer définitivement ${displayName}`}
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
      <div className="evaluation-class-meta flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <h2 id="evaluations-class-context" className="sr-only">
              {selectedClassDisplayName}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openKindChooser()}
          title={locale === 'ar' ? 'إضافة فرض محروس، مراقبة مستمرة أو نشاط تربوي جديد' : 'Ajouter un devoir surveillé ou une activité pédagogique'}
          data-tippy-content={locale === 'ar' ? 'إضافة فرض محروس، مراقبة مستمرة أو نشاط تربوي جديد' : 'Ajouter un devoir surveillé ou une activité pédagogique'}
          className="evaluation-add inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 active:scale-[0.97] sm:w-auto cursor-pointer"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span>{t('evaluations.add')}</span>
        </button>
      </div>

      <div className="space-y-4">
        {classActivities.length === 0 ? (
          <ActivitiesEmptyState onCreate={() => openKindChooser()} />
        ) : classActivities.map(({ group, entries }) => {
          return (
            <section key={group.id} className="space-y-2" aria-label={t(group.titleKey)}>
              <KindGroupHeader
                title={t(group.titleKey)}
                tone={group.tone}
                headingLevel={4}
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
                      <button
                        type="button"
                        onClick={() => toggleActivity(kind)}
                        aria-expanded={isOpen}
                        aria-label={`${label} — ${countLabel}`}
                        className="ev-accordion__toggle"
                      >
                        <span className="ev-accordion__label">{label}</span>
                        <span className="ev-accordion__toggle-word" aria-hidden="true">
                          {isOpen ? t('evaluations.collapse') : t('evaluations.expand')}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="ev-accordion__body">
                          {count === 0 ? (
                            <ActivitiesEmptyState compact onCreate={() => openKindChooser(kind)} />
                          ) : kind.family === 'event' ? (
                            <PedagogicalEventsSection
                              events={eventsOfKind(kind)}
                              showHeader={false}
                              onToggle={togglePedagogicalEvent}
                              onDelete={event => setDeletingEvent({ id: event.id, title: activityLabelOf(event) })}
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

      {/* 1. Modal Choix de nature & Assistant d'ajout */}
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
            <StepTrail
              step={wizardStep}
              label={chosenKind ? t(kindLabelKey(chosenKind)) : undefined}
              onStep={(next) => {
                setWizardStep(next);
                setChosenKind(null);
                setManualFormOpen(false);
              }}
            />

            {wizardStep === 1 && (
              <div className="wizard-step">
                <KindChooser onSelect={(kind) => { setChosenKind(kind); setWizardStep(2); }} />
              </div>
            )}

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

      {/* 2. Modal Ajout / Modification manuelle d'un devoir */}
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

      {/* 3. Modal Absences */}
      <StudentReviewDialog
        isOpen={absencesFor !== null}
        onClose={() => setAbsencesFor(null)}
        title={t('evaluations.absentees')}
        context={absencesFor ? `${selectedClassDisplayName} · ${t(`evaluations.type.${absencesFor.planned.type}`)} ${number.format(absencesFor.planned.num)} · ${formatLongDate(absencesFor.planned.dateISO, locale)}` : undefined}
      >
        {absencesFor && selectedClass && (
          <StudentNamesEditor
            key={`${selectedClass.id}-${absencesFor.planned.id}`}
            variant="absent"
            initialNames={absencesRecord?.names ?? []}
            updatedAt={absencesRecord?.updatedAt}
            onCancel={() => setAbsencesFor(null)}
            onSave={(names) => {
              actions.saveAbsences(absencesFor.planned.id, names, absencesFor.planned.legacyId);
              setAbsencesFor(null);
            }}
          />
        )}
      </StudentReviewDialog>

      {/* 4. Modal Document Pédagogique */}
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

      {/* 5. Modal Évaluation Orale */}
      <StudentReviewDialog
        isOpen={oralFor !== null}
        onClose={() => setOralFor(null)}
        tracking
        title={t('evaluations.oral.title')}
        context={oralFor ? `${selectedClassDisplayName} · ${t('evaluations.type.oral')} ${number.format(oralFor.planned.num)} · ${formatLongDate(oralFor.planned.dateISO, locale)}` : undefined}
      >
        {oralFor && selectedClass && (
          <StudentNamesEditor
            key={`oral-${selectedClass.id}-${oralFor.planned.id}`}
            variant="checked"
            trackOral
            initialNames={config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id]?.names ?? []}
            initialOralOutcomes={config.assessmentParticipants?.[selectedClass.id]?.[oralFor.planned.id]?.oralOutcomes}
            roster={config.classRosters?.[selectedClass.id]}
            reportContext={`${selectedClassDisplayName} · ${t('evaluations.type.oral')} ${number.format(oralFor.planned.num)} · ${formatLongDate(oralFor.planned.dateISO, locale)}`}
            onCancel={() => setOralFor(null)}
            onSave={(names, _notebook, oralOutcomes) => {
              actions.saveOral(oralFor.planned.id, names, oralOutcomes ?? {});
              setOralFor(null);
              toast.success(t(names.length ? 'evaluations.students.savedMany' : 'evaluations.students.cleared', {
                count: number.format(names.length), activity: t('evaluations.oral.title'),
              }));
            }}
          />
        )}
      </StudentReviewDialog>

      {/* 6. Modal Contrôle des cahiers & suivi participants */}
      <StudentReviewDialog
        isOpen={studentsFor !== null}
        onClose={() => setStudentsFor(null)}
        tracking={studentsFor?.type === REMARK_EVENT_TYPE}
        title={t(studentsFor?.type === REMARK_EVENT_TYPE ? 'evaluations.notebook.title' : 'evaluations.students.open')}
        context={studentsFor ? `${selectedClassDisplayName} · ${studentsFor.title || t(PEDAGOGICAL_EVENT_CONFIG[studentsFor.type].labelKey)} · ${formatLongDate(studentsFor.date, locale)}` : undefined}
      >
        {studentsFor && (
          <StudentNamesEditor
            key={`students-${studentsFor.id}`}
            variant="checked"
            initialNames={studentsFor.students?.names ?? []}
            trackNotebookCondition={studentsFor.type === REMARK_EVENT_TYPE}
            initialNotebookConditions={studentsFor.students?.notebookConditions}
            roster={studentsFor.type === REMARK_EVENT_TYPE && selectedClass ? config.classRosters?.[selectedClass.id] : undefined}
            reportContext={`${selectedClassDisplayName} · ${studentsFor.title || t(PEDAGOGICAL_EVENT_CONFIG[studentsFor.type].labelKey)} · ${formatLongDate(studentsFor.date, locale)}`}
            updatedAt={studentsFor.students?.updatedAt}
            onCancel={() => setStudentsFor(null)}
            onSave={saveEventStudents}
          />
        )}
      </StudentReviewDialog>

      {/* 7. Dialogue de confirmation suppression d'un devoir */}
      <ConfirmDialog
        open={Boolean(deletingAssessment)}
        onOpenChange={(open) => { if (!open) setDeletingAssessment(null); }}
        title={t('evaluations.deleteTitle', { name: deletingAssessment?.name ?? '' })}
        description={t('evaluations.deleteAssessmentDescription')}
        confirmLabel={t('evaluations.deleteAssessmentAction')}
        confirmationPhrase={deletingAssessment?.name}
        onConfirm={() => {
          if (!deletingAssessment) return;
          deleteAssessment(deletingAssessment.id);
          setDeletingAssessment(null);
        }}
      />

      {/* 8. Dialogue de confirmation suppression d'une activité */}
      <ConfirmDialog
        open={Boolean(deletingEvent)}
        onOpenChange={(open) => { if (!open) setDeletingEvent(null); }}
        title={t('evaluations.deleteTitle', { name: deletingEvent?.title ?? '' })}
        description={t('evaluations.deleteEventDescription')}
        confirmLabel={t('evaluations.deleteEventAction')}
        confirmationPhrase={deletingEvent?.title}
        onConfirm={() => {
          if (!deletingEvent) return;
          deletePedagogicalEvent(deletingEvent.id);
          setDeletingEvent(null);
        }}
      />
    </div>
  );
};

const ActivitiesEmptyState: React.FC<{ onCreate: () => void; compact?: boolean }> = ({ onCreate, compact = false }) => {
  const { t, locale } = useLocale();
  const addTooltip = locale === 'ar' ? 'إضافة فرض محروس، مراقبة مستمرة أو نشاط تربوي جديد' : 'Ajouter un devoir surveillé ou une activité pédagogique';
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
        title={addTooltip}
        data-tippy-content={addTooltip}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
      >
        <Plus className="h-4 w-4 stroke-[2.2]" />
        {t('evaluations.addActivity')}
      </button>
    </div>
  );
};

interface PedagogicalEventsSectionProps {
  events: PedagogicalEvent[];
  showHeader?: boolean;
  onToggle: (eventId: string) => void;
  onDelete: (event: PedagogicalEvent) => void;
  onOpenDocument: (event: PedagogicalEvent) => void;
  onOpenStudents: (event: PedagogicalEvent) => void;
}

const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({
  events,
  showHeader = true,
  onToggle,
  onDelete,
  onOpenDocument,
  onOpenStudents,
}) => {
  const { t, locale } = useLocale();
  if (events.length === 0) return null;

  return (
    <section className="space-y-2.5 font-sans">
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
            const eventDocTooltip = locale === 'ar'
              ? (event.document ? 'عرض وتعديل وثيقة أو موضوع هذا النشاط' : 'إرفاق وثيقة أو نص أو رابط لهذا النشاط التربوي')
              : (event.document ? 'Consulter ou modifier le document/sujet associé' : 'Associer un document, sujet ou lien à cette activité');

            const eventStudentsTooltip = event.type === REMARK_EVENT_TYPE
              ? (locale === 'ar'
                  ? (names > 0 ? `متابعة دفاتر التلاميذ (${names} تلميذ محدد)` : 'تسجيل التلاميذ المعنيين بمراقبة الدفاتر وملاحظات التفتيش')
                  : (names > 0 ? `Suivi des cahiers (${names} élève(s))` : 'Pointer les élèves dont les cahiers sont contrôlés'))
              : (locale === 'ar'
                  ? (names > 0 ? `قائمة التلاميذ المشاركين (${names} مشارك)` : 'تحديد التلاميذ المشاركين أو المستفيدين من النشاط')
                  : (names > 0 ? `Élèves participants (${names} élève(s))` : 'Désigner les élèves concernés par cette activité'));

            const toggleTooltip = done
              ? (locale === 'ar' ? 'إعادة فتح هذا النشاط (وضع قيد الإنجاز)' : 'Rouvrir cette activité (marquer comme en cours)')
              : (locale === 'ar' ? 'تحديد هذا النشاط كمكتمل ومنجز' : 'Marquer cette activité comme terminée / effectuée');

            const deleteTooltip = locale === 'ar'
              ? 'حذف هذا النشاط التربوي نهائياً'
              : 'Supprimer définitivement cette activité pédagogique';

            return (
              <li
                key={event.id}
                className="ev-row evaluation-tone"
                data-activity-card="true"
                data-activity-type={event.type}
                data-tone={tone}
                data-done={done ? 'true' : undefined}
              >
                <div className="ev-row__id min-w-0">
                  <h4 className="text-[13.5px] font-bold leading-snug text-foreground" dir="auto">{title}</h4>
                  {showType && <span className="tone-chip">{typeLabel}</span>}
                  {showNote && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground text-start">{event.note}</p>
                  )}
                </div>

                <div className="ev-row__state">
                  {done && <span className="tone-chip" data-state="done">{t('evaluations.completed')}</span>}
                </div>

                <div className="ev-row__date">
                  <time dateTime={event.date} className="ev-row__period">
                    {formatDateRange(event.date, event.endDate, locale, t('evaluations.rangeSeparator'))}
                  </time>
                </div>

                <div className="ev-row__actions">
                  {event.type !== REMARK_EVENT_TYPE && (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(event)}
                      className="ev-action"
                      data-filled={event.document ? 'tone' : undefined}
                      aria-label={t('evaluations.doc.title', { activity: event.title })}
                      title={eventDocTooltip}
                      data-tippy-content={eventDocTooltip}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                      <span>{t('evaluations.doc.open')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenStudents(event)}
                    className="ev-action"
                    data-filled={names > 0 ? 'tone' : undefined}
                    aria-label={`${t(event.type === REMARK_EVENT_TYPE ? 'evaluations.notebook.title' : 'evaluations.students.open')} — ${event.title}`}
                    title={eventStudentsTooltip}
                    data-tippy-content={eventStudentsTooltip}
                  >
                    {event.type === REMARK_EVENT_TYPE ? (
                      <BookCheck className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                    ) : (
                      <Users className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                    )}
                    <span>{t(event.type === REMARK_EVENT_TYPE ? 'evaluations.notebook.title' : 'evaluations.students.open')}{names > 0 ? ` · ${names}` : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggle(event.id)}
                    className="ev-icon-btn"
                    data-done={done}
                    aria-label={t(done ? 'evaluations.reopenEventAria' : 'evaluations.completeEventAria', { title: event.title })}
                    title={toggleTooltip}
                    data-tippy-content={toggleTooltip}
                  >
                    {done ? <CircleCheck className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(event)}
                    className="ev-icon-btn"
                    data-danger="true"
                    aria-label={t('evaluations.deleteEventAria', { title: event.title })}
                    title={deleteTooltip}
                    data-tippy-content={deleteTooltip}
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
    <div className="space-y-4 font-sans">
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
            className="min-h-11 px-4 py-2 rounded-xl bg-muted text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="min-h-11 px-5 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:brightness-110 transition-all shadow-xs cursor-pointer"
          >
            {t('evaluations.addActivity')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ManualAssessmentEditorProps {
  today: string;
  initial?: ManualAssessment | null;
  initialType?: DevoirType;
  assessments?: { id: string; type: DevoirType }[];
  onCancel: () => void;
  onSave: (manual: ManualAssessment) => void;
}

const ManualAssessmentEditor: React.FC<ManualAssessmentEditorProps> = ({ today, initial, initialType, assessments = [], onCancel, onSave }) => {
  const { t } = useLocale();
  const initialKind: DevoirType = initial?.type ?? initialType ?? 'controle';
  const [type, setType] = useState<DevoirType>(initialKind);
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
    <div className="space-y-3.5 sm:space-y-4 font-sans">
      <div className="space-y-3 sm:space-y-3.5">
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
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
              className="h-10 w-full min-w-0 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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

        <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 sm:flex sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl bg-muted px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="min-h-11 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 cursor-pointer"
          >
            {t(initial ? 'evaluations.saveAssessment' : 'evaluations.addDevoir')}
          </button>
        </div>
      </div>
    </div>
  );
};
