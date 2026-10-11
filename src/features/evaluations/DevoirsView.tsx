import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
import { AppConfig, ClassInfo, ClassEvaluationEntry, DevoirType, LessonsData, ManualAssessment, PedagogicalEvent } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { getBundledCalendar, todayInMorocco } from '@/domain/calendar/calendar';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/domain/evaluations/assessmentSync';
import './evaluationsResponsive.css';
import './evaluationReference.css';
import {
  CalendarCheck,
  RefreshCw,
  FileText,
  UserX,
  Users,
  CheckCheck,
  Mic,
  ChevronDown,
} from 'lucide-react';
import { useEvaluationNotebook } from './hooks/useEvaluationNotebook';
import { useEvaluationConflictGuard } from './hooks/useEvaluationConflictGuard';
import { assessmentSlot, eventSlot, evaluationSlots } from '@/domain/evaluations/evaluationConflicts';
import { countHomeworkOutcomes } from '@/domain/evaluations/homeworkSubmissions';
import {
  syncEventToNotebook,
  syncAssessmentDateToNotebook,
  removeEventFromNotebook,
  removeAssessmentFromNotebook,
} from '@/domain/evaluations/notebookSyncBridge';
import { useLocale } from '@/i18n/LocaleProvider';
import { useEvaluationModals } from './hooks/useEvaluationModals';
import { useEvaluationActions } from './hooks/useEvaluationActions';
import { ActivitiesEmptyState } from './components/ActivitiesEmptyState';
import { PedagogicalEventsSection } from './components/PedagogicalEventsSection';
import { DevoirsModals } from './components/DevoirsModals';
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

export const DevoirsView: React.FC<DevoirsViewProps> = ({
  classInfo,
  config,
  onConfigChange,
  entry = 'all',
  lessonsData,
  onLessonsChange,
}) => {
  const { t, locale } = useLocale();
  const { lessons: activeLessons, commit: commitNotebookChange } = useEvaluationNotebook(classInfo.id, locale, lessonsData, onLessonsChange);
  const number = useMemo(() => numberFormat(locale), [locale]);
  const selectedClass = classInfo;
  const selectedClassDisplayName = selectedClass ? formatLocalizedClassDisplayName(selectedClass.name, locale) : '';
  const { assessments } = useClassAssessments(selectedClass, config);
  const evaluationModals = useEvaluationModals();
  const {
    editingAssessment,
    setAbsencesFor, setOralFor, setSubmissionsFor, setDocumentFor, setStudentsFor, setManualEditorOpen,
    setEditingAssessment,
    setDeletingAssessment, setDeletingEvent, setEditingDateAssessment,
  } = evaluationModals;
  const actions = useEvaluationActions(classInfo.id, config, onConfigChange);

  const today = todayInMorocco(new Date(), getBundledCalendar());

  const links = useMemo(() => {
    if (!selectedClass) return [];
    const notebookEntries = findNotebookAssessments(activeLessons);

    const allLinks = linkAssessments(assessments, notebookEntries, today);
    // Afficher STRICTEMENT les devoirs qui existent sur le table editor (saisis par l'utilisateur)
    const manualIds = new Set(config.manualAssessments?.[classInfo.id]?.map(item => item.id));
    const assigned = config.assessmentDates?.[classInfo.id] ?? {};
    const linked = allLinks.filter(link => link.entry !== undefined || manualIds.has(link.planned.id)
      || !!assigned[link.planned.id] || !!(link.planned.legacyId && assigned[link.planned.legacyId]));

    const matchedEntries = new Set(linked.map(l => l.entry));
    const extraEntries = notebookEntries.filter(entry => !matchedEntries.has(entry));
    const syntheticLinks: AssessmentLink[] = extraEntries.map(entry => ({
      planned: {
        id: entry.assessmentId || `${entry.type}-${entry.num}-${entry.date || 'custom'}`,
        schoolYear: '',
        semestre: 1,
        type: entry.type,
        num: entry.num,
        label: `${t(`evaluations.type.${entry.type}`)} ${number.format(entry.num)}`,
        dateISO: entry.date || '',
        semaine: 0,
        predictionStatus: 'manual',
        confidence: 'high',
        predictionReason: 'Saisie dans le cahier',
      },
      entry,
      status: entry.date ? 'done' : 'upcoming',
    }));

    return [...linked, ...syntheticLinks];
  }, [assessments, selectedClass, today, activeLessons, t, number, config.manualAssessments, config.assessmentDates, classInfo.id]);

  const pedagogicalEvents = useMemo(
    () =>
      selectedClass
        ? [...(config.pedagogicalEvents?.[selectedClass.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [config.pedagogicalEvents, selectedClass]
  );

  const conflictSlots = useMemo(() => evaluationSlots(activeLessons, assessments, pedagogicalEvents), [activeLessons, assessments, pedagogicalEvents]);
  const conflictRevision = useMemo(() => ({ config, activeLessons }), [config, activeLessons]);
  const conflicts = useEvaluationConflictGuard(conflictSlots, conflictRevision);

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

  const setAssessmentDate = (assessmentId: string, dateISO: string) => {
    const targetAssessment = assessments.find(item => item.id === assessmentId);
    if (targetAssessment) {
      conflicts.run(assessmentSlot({ ...targetAssessment, dateISO }), () => {
        const { lessons: nextLessons } = syncAssessmentDateToNotebook(
          activeLessons,
          {
            id: targetAssessment.id,
            type: targetAssessment.type,
            num: targetAssessment.num,
            dateISO,
            label: targetAssessment.label,
            clearIfEmpty: !dateISO,
            entryKey: links.find(link => link.planned.id === assessmentId)?.entry?.key,
          },
          locale
        );
        commitNotebookChange(nextLessons, () => actions.setAssessmentDate(assessmentId, dateISO, targetAssessment.legacyId));
      }, assessmentId);
    }
  };

  const changeEventDate = (event: PedagogicalEvent, date: string, endDate?: string) => {
    const next = { ...event, date, endDate: date && endDate && endDate >= date ? endDate : undefined };
    conflicts.run(eventSlot(next), () => {
      const notebook = syncEventToNotebook(activeLessons, next, locale);
      commitNotebookChange(notebook.lessons, () => actions.updateEvent(next));
    }, event.id);
  };
  const deletePedagogicalEvent = (eventOrId: string | { id: string; title?: string }) => {
    const id = typeof eventOrId === 'string' ? eventOrId : eventOrId.id;
    const title = typeof eventOrId === 'string' ? undefined : eventOrId.title;
    const target = pedagogicalEvents.find(e => e.id === id);
    const { lessons: nextLessons } = removeEventFromNotebook(
      activeLessons,
      id,
      target?.type,
      target?.title || title
    );
    commitNotebookChange(nextLessons, () => actions.deleteEvent(id));
  };

  const activityLabelOf = (event: PedagogicalEvent) =>
    event.title || t(PEDAGOGICAL_EVENT_CONFIG[event.type].labelKey);

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
    conflicts.run(assessmentSlot({ ...manual, id: editingAssessment?.id ?? manual.id,
      label: `${t(`evaluations.type.${manual.type}`)} ${number.format(manual.num)}` }), () => {
      const previous = editingAssessment;
      const entryKey = links.find(link => link.planned.id === previous?.id)?.entry?.key;
      const source = previous && previous.type !== manual.type
        ? removeAssessmentFromNotebook(activeLessons, previous.id, previous.type, previous.num, entryKey).lessons
        : activeLessons;
      const { lessons: nextLessons } = syncAssessmentDateToNotebook(
        source,
        { id: editingAssessment?.id ?? manual.id, type: manual.type, num: manual.num, dateISO: manual.dateISO,
          entryKey: source === activeLessons ? entryKey : undefined,
          updatedTitle: previous && (previous.num !== manual.num || previous.type !== manual.type) ? `${t(`evaluations.type.${manual.type}`)} ${number.format(manual.num)}` : undefined },
        locale
      );
      if (!commitNotebookChange(nextLessons, () => actions.saveAssessment(manual, editingAssessment?.id))) return;
      setManualEditorOpen(false);
      setEditingAssessment(null);
      toast.success(
        t('evaluations.manualSaved', { type: t(`evaluations.type.${manual.type}`), number: manual.num })
      );
    }, editingAssessment?.id);
  };

  const deleteAssessment = (id: string) => {
    const target = assessments.find(item => item.id === id);
    const nextLessons = target ? removeAssessmentFromNotebook(
        activeLessons,
        target.id,
        target.type,
        target.num,
        links.find(link => link.planned.id === id)?.entry?.key
      ).lessons : activeLessons;
    if (!commitNotebookChange(nextLessons, () => actions.deleteAssessment(id, target?.legacyId))) return;
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
    // Remise du devoir maison : ce que l'enseignant a constaté, élève par élève.
    const submissions = a.type === 'maison'
      ? config.assessmentParticipants?.[selectedClass!.id]?.[a.id]
        ?? (a.legacyId ? config.assessmentParticipants?.[selectedClass!.id]?.[a.legacyId] : undefined)
      : undefined;
    const submissionSummary = submissions
      ? countHomeworkOutcomes(submissions.names ?? [], submissions.homeworkOutcomes)
      : null;
    // Second temps du devoir maison : la séance de correction, distincte de la
    // séance d'attribution — elle date le devoir sans changer sa date de remise.
    const correctionDateISO = a.type === 'maison'
      ? (config.manualAssessments?.[selectedClass!.id]?.find(item => item.id === a.id || item.id === a.legacyId)?.correctionDateISO ?? '')
      : '';
    const rawDate = link.entry ? (link.entry.date ?? '') : a.dateISO;
    const formatSingleDate = (iso: string) => {
      if (!iso) return locale === 'ar' ? '+ تحديد التاريخ' : '+ Définir une date';
      const parts = iso.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return iso;
    };
    const assessmentDocument = (
      config.assessmentDocuments?.[selectedClass!.id]?.[a.id]
      ?? (a.legacyId ? config.assessmentDocuments?.[selectedClass!.id]?.[a.legacyId] : undefined)
    );
    const status = STATUS_STYLE[link.status];
    const isSupervised = ['controle', 'controle_court', 'controle_global'].includes(a.type);
    const kindStyle = DEVOIR_KIND_CONFIG[a.type] ?? DEVOIR_KIND_CONFIG.controle;
    const displayName = `${t(`evaluations.type.${a.type}`)} ${number.format(a.num)}`;

    const statusExplanation = link.status === 'done'
      ? (locale === 'ar' ? 'متزامن تماماً: التاريخ يطابق تماماً الحصة المسجلة في دفتر النصوص' : 'Parfaitement synchronisé : la date correspond exactement à la séance dans le cahier')
      : link.status === 'mismatch'
        ? (locale === 'ar' ? `اختلاف تاريخ التخطيط (${link.planned.dateISO}) مع دفتر النصوص (${link.entry?.date ?? ''})` : `Écart de date entre la programmation (${link.planned.dateISO}) et le cahier (${link.entry?.date ?? ''})`)
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

    const homeworkTooltip = locale === 'ar'
      ? 'متابعة تسليم الفرض المنزلي: مُسلَّم أو غير مُسلَّم لكل تلميذ'
      : 'Suivre la remise du devoir : rendu ou non rendu, élève par élève';
    const observedSubmissions = submissionSummary ? submissionSummary.given + submissionSummary.missing : 0;

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
                onClick={() => openEditAssessment(a)}
                className="-ms-1 inline-flex max-w-full cursor-pointer items-center truncate rounded-md px-1.5 py-0.5 text-start text-[13px] font-bold text-foreground transition-colors hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
              >
                {displayName}
              </button>
            </div>

            <div className="ev-row__state flex flex-col items-center gap-1">
              <span
                className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', STATUS_CHIP[link.status])}
                data-tippy-content={statusExplanation}
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
                  aria-label={locale === 'ar' ? `ضبط مع دفتر النصوص (${link.entry?.date})` : `Aligner sur le cahier (${link.entry?.date})`}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{locale === 'ar' ? 'مزامنة' : 'Aligner'}</span>
                </button>
              )}
              {a.type === 'maison' && rawDate && (custom || link.entry) && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground"
                >
                  <CalendarCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{t('evaluations.homework.givenOn', { date: formatSingleDate(rawDate) })}</span>
                </span>
              )}
              {a.type === 'maison' && correctionDateISO && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground"
                >
                  <CheckCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{t('evaluations.homework.correctedOn', { date: formatSingleDate(correctionDateISO) })}</span>
                </span>
              )}
            </div>

            <div className="ev-row__date">
              <button
                type="button"
                onClick={() => setEditingDateAssessment({ id: a.id, name: displayName, date: rawDate })}
                className={cn(
                  "ev-date-trigger inline-flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold select-none cursor-pointer transition-all active:scale-95 border-0 shadow-none",
                  rawDate
                    ? "text-foreground hover:text-primary hover:bg-muted/40 rounded-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md"
                )}
                data-tippy-content={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : undefined}
                aria-label={t('evaluations.assessmentDateAria', { assessment: t(`evaluations.type.${a.type}`) })}
              >
                <span className="whitespace-nowrap tabular-nums text-xs font-bold" dir="ltr">
                  {rawDate ? formatSingleDate(rawDate) : (locale === 'ar' ? '+ تحديد التاريخ' : '+ Définir une date')}
                </span>
              </button>
            </div>

            <div className="ev-row__actions flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
              <button
                type="button"
                onClick={() => setDocumentFor({ kind: 'assessment', link })}
                className="ev-action shrink-0"
                data-filled={assessmentDocument ? 'tone' : undefined}
                data-tippy-content={docTooltip}
                aria-label={t('evaluations.doc.title', { activity: `${t(`evaluations.type.${a.type}`)} n°${a.num}` })}
              >
                <FileText className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
                <span className="sr-only">{t('evaluations.doc.open')}</span>
              </button>

              {isSupervised && (
                <button
                  type="button"
                  onClick={() => setAbsencesFor(link)}
                  className="ev-action shrink-0"
                  data-filled={absents.length > 0 ? 'danger' : undefined}
                  data-tippy-content={absentsTooltip}
                  aria-label={absents.length > 0
                    ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                    : t('evaluations.absentees')}
                >
                  <UserX className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
                  {absents.length > 0 && (
                    <span className="inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[10px] font-bold text-destructive dark:text-red-400">
                      {number.format(absents.length)}
                    </span>
                  )}
                  <span className="sr-only">
                    {absents.length > 0
                      ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                      : t('evaluations.absentees')}
                  </span>
                </button>
              )}

              {(a.type === 'oral' || a.type === 'colle') && (
                <button
                  type="button"
                  onClick={() => setOralFor(link)}
                  className="ev-action shrink-0"
                  data-tippy-content={oralTooltip}
                  aria-label={`${t('evaluations.oral.title')} — ${t(`evaluations.type.${a.type}`)} ${number.format(a.num)}`}
                >
                  <Mic className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
                  <span className="sr-only">{t('evaluations.oral.title')}</span>
                </button>
              )}

              {a.type === 'maison' && (
                <button
                  type="button"
                  onClick={() => setSubmissionsFor(link)}
                  className="ev-action shrink-0"
                  data-filled={submissionSummary?.missing ? 'danger' : observedSubmissions ? 'tone' : undefined}
                  data-tippy-content={homeworkTooltip}
                  aria-label={`${t('evaluations.homework.title')} — ${displayName}`}
                >
                  <Users className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
                  {observedSubmissions > 0 && (
                    <span className="inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-foreground tabular-nums">
                      {number.format(submissionSummary!.given)}/{number.format(submissionSummary!.given + submissionSummary!.missing + submissionSummary!.pending)}
                    </span>
                  )}
                  <span className="sr-only">{t('evaluations.homework.title')}</span>
                </button>
              )}

              <AnimatedTrashButton
                iconOnly
                size="sm"
                variant="icon"
                data-danger="true"
                onClick={() => setDeletingAssessment({ id: a.id, name: displayName })}
                className="ev-icon-btn shrink-0"
                title={locale === 'ar' ? `حذف ${displayName} نهائياً` : `Supprimer définitivement ${displayName}`}
                aria-label={t('evaluations.manualDelete')}
              />
            </div>
          </div>
        );
  });

  return (
    <div className="evaluation-workspace space-y-4 font-sans sm:space-y-5">
      {conflicts.dialog}
      <div className="evaluation-class-meta flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <h2 id="evaluations-class-context" className="sr-only">
              {selectedClassDisplayName}
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {classActivities.length === 0 ? (
          <ActivitiesEmptyState />
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
                  const KindIcon = kind.style.Icon;
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
                        <span className="ev-accordion__label">
                          <span className="ev-accordion__kind-icon evaluation-tone" data-tone={kind.style.tone} aria-hidden="true">
                            <KindIcon className="h-4 w-4 shrink-0" />
                          </span>
                          <span className="ev-accordion__label-text">{label}</span>
                        </span>
                        <span className="ev-accordion__toggle-icon inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200" aria-hidden="true">
                          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                        </span>
                        <span className="sr-only">{isOpen ? t('evaluations.collapse') : t('evaluations.expand')}</span>
                      </button>

                      {isOpen && (
                        <div className="ev-accordion__body">
                          {count === 0 ? (
                            <ActivitiesEmptyState compact />
                          ) : kind.family === 'event' ? (
                            <PedagogicalEventsSection
                              events={eventsOfKind(kind)}
                              showHeader={false}
                              onDateChange={changeEventDate}
                              onDelete={event => setDeletingEvent({ id: event.id, title: activityLabelOf(event) })}
                              onOpenDocument={(event) => setDocumentFor({ kind: 'event', event })}
                              onOpenStudents={(event) => setStudentsFor(event)}
                            />
                          ) : (
                            <div className="ev-board__rows">
                              <div className="ev-board__head" aria-hidden="true">
                                <span>{t('evaluations.titleLabel')}</span>
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

      <DevoirsModals
        classInfo={classInfo}
        classDisplayName={selectedClassDisplayName}
        config={config}
        today={today}
        assessments={assessments}
        modals={evaluationModals}
        actions={actions}
        saveAssessment={saveAssessment}
        setAssessmentDate={setAssessmentDate}
        deletePedagogicalEvent={deletePedagogicalEvent}
        deleteAssessment={deleteAssessment}
      />

    </div>
  );
};
