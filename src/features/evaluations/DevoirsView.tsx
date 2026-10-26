import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
import { AppConfig, ClassInfo, ClassEvaluationEntry, DevoirType, LessonsData, ManualAssessment, PedagogicalEvent } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { getBundledCalendar, todayInMorocco } from '@/domain/calendar/calendar';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/domain/evaluations/assessmentSync';
import { documentIndicator, documentRequirementForAssessment, documentRequirementForHomeworkCorrection } from '@/domain/evaluations/documentRequirement';
import { homeworkCorrectionDocumentId } from '@/domain/evaluations/homeworkIds';
import { resolveKindPolicy } from '@/domain/evaluations/evaluationPolicy';
import { localizedActivityTitle } from '@/domain/evaluations/activityTitle';
import './evaluationsResponsive.css';
import './evaluationReference.css';
import { ChevronDown } from 'lucide-react';
import { ltrIsolate } from '@/lib/text/textDirection';
import { ActionIcon } from './components/ActionIcon';
import { useEvaluationNotebook } from './hooks/useEvaluationNotebook';
import { useEvaluationConflictGuard } from './hooks/useEvaluationConflictGuard';
import { assessmentSlot, eventSlot, evaluationSlots } from '@/domain/evaluations/evaluationConflicts';
import { countHomeworkOutcomes } from '@/domain/evaluations/homeworkSubmissions';
import { syncHomeworkCorrectionContent } from '@/domain/evaluations/homeworkCorrectionContent';
import {
  syncEventToNotebook,
  syncAssessmentDateToNotebook,
  removeEventFromNotebook,
  removeAssessmentFromNotebook,
  removeHomeworkCorrectionFromNotebook,
  syncNotebookToEvaluations,
} from '@/domain/evaluations/notebookSyncBridge';
import { useLocale } from '@/i18n/LocaleProvider';
import { useEvaluationModals } from './hooks/useEvaluationModals';
import { useEvaluationActions } from './hooks/useEvaluationActions';
import { ActivitiesEmptyState } from './components/ActivitiesEmptyState';
import { PedagogicalEventsSection } from './components/PedagogicalEventsSection';
import { DevoirsModals } from './components/DevoirsModals';
import { KindGroupHeader } from './components/KindGroupHeader';
import { DEVOIR_KIND_CONFIG, groupKinds, kindLabelKey, type EvaluationKind } from './kindCatalog';
import { numberFormat } from '@/lib/formatters';


interface DevoirsViewProps {
  classInfo: ClassInfo;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  entry?: ClassEvaluationEntry;
  lessonsData?: LessonsData;
  onLessonsChange?: (newLessons: LessonsData) => void;
}

export const DevoirsView: React.FC<DevoirsViewProps> = ({
  classInfo,
  config,
  onConfigChange,
  entry = 'all',
  lessonsData,
  onLessonsChange,
}) => {
  const { t, locale } = useLocale();
  const { lessons: activeLessons, commit: commitNotebookChange } = useEvaluationNotebook(classInfo.id, locale, lessonsData, onLessonsChange, config);
  const number = useMemo(() => numberFormat(locale), [locale]);
  const selectedClass = classInfo;
  const selectedClassDisplayName = selectedClass ? formatLocalizedClassDisplayName(selectedClass.name, locale) : '';
  const effectiveConfig = useMemo(() => {
    if (!selectedClass || activeLessons.length === 0) return config;
    const { patch, updated } = syncNotebookToEvaluations(selectedClass.id, config, activeLessons, {
      policy: config.evaluationPolicy,
    });
    return updated ? { ...config, ...patch } : config;
  }, [selectedClass, config, activeLessons]);
  const { assessments } = useClassAssessments(selectedClass, effectiveConfig);
  const evaluationModals = useEvaluationModals();
  const {
    editingAssessment,
    setAbsencesFor, setOralFor, setSubmissionsFor, setDocumentFor, setStudentsFor, setManualEditorOpen,
    setEditingAssessment,
    setDeletingAssessment, setDeletingEvent, setEditingDateAssessment, setDeletingCorrection,
  } = evaluationModals;
  const actions = useEvaluationActions(classInfo.id, effectiveConfig, onConfigChange);

  const today = todayInMorocco(new Date(), getBundledCalendar());

  const links = useMemo(() => {
    if (!selectedClass) return [];
    const notebookEntries = findNotebookAssessments(activeLessons);

    const allLinks = linkAssessments(assessments, notebookEntries, today);
    // Afficher STRICTEMENT les devoirs qui existent sur le table editor (saisis par l'utilisateur)
    const manualIds = new Set(effectiveConfig.manualAssessments?.[classInfo.id]?.map(item => item.id));
    const assigned = effectiveConfig.assessmentDates?.[classInfo.id] ?? {};
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
  }, [assessments, selectedClass, today, activeLessons, t, number, effectiveConfig.manualAssessments, effectiveConfig.assessmentDates, classInfo.id]);

  const pedagogicalEvents = useMemo(
    () =>
      selectedClass
        ? [...(effectiveConfig.pedagogicalEvents?.[selectedClass.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [effectiveConfig.pedagogicalEvents, selectedClass]
  );

  const conflictSlots = useMemo(() => evaluationSlots(activeLessons, assessments, pedagogicalEvents), [activeLessons, assessments, pedagogicalEvents]);
  const conflictRevision = useMemo(() => ({ config, activeLessons }), [config, activeLessons]);
  const conflicts = useEvaluationConflictGuard(conflictSlots, conflictRevision);

  // La direction décide, nature par nature, ce que la feuille propose (voir evaluationPolicy.ts).
  const policy = config.evaluationPolicy;

  const classActivities = useMemo(() => {
    const countFor = (kind: EvaluationKind): number => kind.family === 'devoir'
      ? links.filter((link) => link.planned.type === kind.type).length
      : pedagogicalEvents.filter((event) => event.type === kind.type).length;
    return groupKinds(policy)
      .map((group) => ({
        group,
        entries: group.kinds
          .map((kind) => ({ kind, count: countFor(kind) }))
          .filter((item) => item.count > 0 || item.kind.type === entry),
      }))
      .filter((group) => group.entries.length > 0);
  }, [links, pedagogicalEvents, entry, policy]);

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
    localizedActivityTitle(event.title, event.type, locale);

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
    let nextLessons = target ? removeAssessmentFromNotebook(
        activeLessons,
        target.id,
        target.type,
        target.num,
        links.find(link => link.planned.id === id)?.entry?.key
      ).lessons : activeLessons;
    if (target?.type === 'maison') {
      const owner = config.manualAssessments?.[classInfo.id]?.find(item => item.id === id || item.id === target.legacyId);
      nextLessons = removeHomeworkCorrectionFromNotebook(nextLessons, target.num,
        { id, legacyId: target.legacyId, date: owner?.correctionDateISO }).lessons;
    }
    if (!commitNotebookChange(nextLessons, () => actions.deleteAssessment(id, target?.legacyId))) return;
    toast.success(t('evaluations.manualDeleted'));
  };

  /** Date limite ou séance de correction d'un devoir maison, écrite sur SON enregistrement (aucune clé de plus à synchroniser). */
  const setHomeworkDate = (id: string, field: 'due' | 'correction', dateISO: string) => {
    const planned = assessments.find(item => item.id === id);
    if (!planned || planned.type !== 'maison') return;
    const chosen = config.assessmentDates?.[classInfo.id]?.[id]
      ?? (planned.legacyId ? config.assessmentDates?.[classInfo.id]?.[planned.legacyId] : undefined)
      ?? (planned.manual ? planned.dateISO : '');
    const previous = config.manualAssessments?.[classInfo.id]?.find(item => item.id === id || item.id === planned.legacyId);
    const nextLessons = field === 'correction'
      ? syncHomeworkCorrectionContent(activeLessons, { id: previous?.id ?? id, num: planned.num, correctionDateISO: dateISO }, locale, previous?.correctionDateISO)
      : activeLessons;
    commitNotebookChange(nextLessons, () => actions.setHomeworkSchedule(
      { id: planned.id, legacyId: planned.legacyId, schoolYear: planned.schoolYear, semestre: planned.semestre, num: planned.num },
      chosen,
      field === 'due' ? { dueDateISO: dateISO } : { correctionDateISO: dateISO },
    ));
  };

  /** Corbeille de la correction : date et corrigé — et le bloc du cahier, pour qu'elle ne revienne pas. */
  const deleteHomeworkCorrection = (link: AssessmentLink) => {
    const owner = config.manualAssessments?.[classInfo.id]?.find(item => item.id === link.planned.id || item.id === link.planned.legacyId);
    const { lessons: nextLessons } = removeHomeworkCorrectionFromNotebook(activeLessons, link.planned.num,
      { id: link.planned.id, legacyId: link.planned.legacyId, date: owner?.correctionDateISO });
    if (!commitNotebookChange(nextLessons, () => actions.clearHomeworkCorrection(link.planned.id, link.planned.legacyId))) return;
    toast.success(t('evaluations.correctionDeleted'));
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
    const notReturned = submissionSummary?.missing ?? 0;
    const observedSubmissions = submissionSummary ? submissionSummary.given + submissionSummary.missing : 0;
    // Second temps du devoir maison : la séance de correction, distincte de la
    // séance d'attribution — elle date le devoir sans changer sa date de remise.
    const correctionDateISO = a.type === 'maison'
      ? (config.manualAssessments?.[selectedClass!.id]?.find(item => item.id === a.id || item.id === a.legacyId)?.correctionDateISO ?? '')
      : '';
    const rawDate = link.entry ? (link.entry.date ?? '') : a.dateISO;
    const formatSingleDate = (iso: string) => {
      if (!iso) return '—';
      const parts = iso.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return iso;
    };
    const assessmentDocument = (
      config.assessmentDocuments?.[selectedClass!.id]?.[a.id]
      ?? (a.legacyId ? config.assessmentDocuments?.[selectedClass!.id]?.[a.legacyId] : undefined)
    );
    const kindPolicy = resolveKindPolicy(policy, a.type);
    const kindStyle = DEVOIR_KIND_CONFIG[a.type] ?? DEVOIR_KIND_CONFIG.controle;
    const displayName = `${t(`evaluations.type.${a.type}`)} ${number.format(a.num)}`;

    // Seul l'écart de date reste signalé sous le titre : c'est lui qui appelle une action.
    // Les dates restent de gauche à droite au milieu d'une phrase arabe.
    const mismatchExplanation = t('evaluations.align.gap', {
      planned: ltrIsolate(formatSingleDate(link.planned.dateISO)),
      notebook: link.entry?.date ? ltrIsolate(formatSingleDate(link.entry.date)) : '',
    });

    const docIndicator = documentIndicator(documentRequirementForAssessment(a.type, policy), assessmentDocument);
    const docTooltip = t(docIndicator === 'attached' ? 'evaluations.tip.docAttached'
      : docIndicator === 'missing' ? 'evaluations.tip.docMissing' : 'evaluations.tip.docIdle');
    const docStateSuffix = docIndicator === 'attached' ? ` — ${t('evaluations.doc.stateAttached')}` : docIndicator === 'missing' ? ` — ${t('evaluations.doc.stateMissing')}` : '';

    const absentsTooltip = absents.length > 0
      ? t('evaluations.tip.absentSome', { count: number.format(absents.length) })
      : t('evaluations.tip.absentNone');
    const oralTooltip = t('evaluations.tip.oral');
    /*
     * Un devoir maison = DEUX entrées : « assigné aux élèves » (document · date limite · corbeille) et
     * « correction » (contenu de la correction · corbeille). Même identité, même enregistrement.
     */
    const dueDateISO = a.type === 'maison'
      ? (config.manualAssessments?.[selectedClass!.id]?.find(item => item.id === a.id || item.id === a.legacyId)?.dueDateISO ?? '')
      : '';
    const correctionDocument = a.type === 'maison'
      ? config.assessmentDocuments?.[selectedClass!.id]?.[homeworkCorrectionDocumentId(a.id)]
        ?? (a.legacyId ? config.assessmentDocuments?.[selectedClass!.id]?.[homeworkCorrectionDocumentId(a.legacyId)] : undefined)
      : undefined;
    const correctionIndicator = documentIndicator(documentRequirementForHomeworkCorrection(policy), correctionDocument);
    const correctionName = `${t('manageLessons.type.correction_devoir_maison')} ${number.format(a.num)}`;
    // Une correction déjà saisie reste visible même si la direction ne la transmet plus : rien n'est caché.
    const showCorrection = a.type === 'maison'
      && (kindPolicy.correction || kindPolicy.students || !!correctionDateISO || correctionIndicator === 'attached' || !!submissions);

    const assignedRow = (
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
                dir="auto"
                onClick={() => openEditAssessment(a)}
                className="-ms-1 inline-flex max-w-full cursor-pointer items-center truncate rounded-md px-1 py-0.5 text-start text-[11.5px] font-semibold text-foreground/90 transition-colors hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
              >
                              {displayName}
              </button>
              {((link.status === 'mismatch' && link.entry?.date) || (a.type === 'maison' && (rawDate || dueDateISO))) && (
                <div className="ev-row__meta">
                  {link.status === 'mismatch' && link.entry?.date && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetDate = link.entry?.date;
                        if (!targetDate) return;
                        setAssessmentDate(a.id, targetDate);
                        toast.success(t('evaluations.align.done', { date: ltrIsolate(formatSingleDate(targetDate)) }));
                      }}
                      className="ev-row__align inline-flex cursor-pointer items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 transition-all hover:bg-amber-500/25 active:scale-95 dark:text-amber-400"
                      data-tippy-content={mismatchExplanation}
                    >
                      <span>{t('evaluations.align.action', { date: ltrIsolate(formatSingleDate(link.entry.date)) })}</span>
                    </button>
                  )}
                  {a.type === 'maison' && rawDate && (
                    <span className="ev-row__note">{t('evaluations.homework.givenOn', { date: ltrIsolate(formatSingleDate(rawDate)) })}</span>
                  )}
                  {a.type === 'maison' && dueDateISO && (
                    <span className="ev-row__note">{dueDateISO === today ? t('evaluations.homework.dueToday') : t('evaluations.homework.dueOn', { date: ltrIsolate(formatSingleDate(dueDateISO)) })}</span>
                  )}
                </div>
              )}
            </div>

            <div className="ev-row__date">
              {rawDate ? (
                <button
                  type="button"
                  onClick={() => setEditingDateAssessment({ id: a.id, name: displayName, date: rawDate })}
                  className="ev-date-trigger inline-flex items-center justify-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-foreground select-none cursor-pointer transition-all hover:text-primary hover:bg-muted/50 rounded-full active:scale-95 border border-border/40 shadow-xs"
                  data-tippy-content={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : undefined}
                  aria-label={t('evaluations.assessmentDateAria', { assessment: t(`evaluations.type.${a.type}`) })}
                >
                  <span className="whitespace-nowrap tabular-nums text-[11px] font-bold"><bdi dir="ltr">{formatSingleDate(rawDate)}</bdi></span>
                </button>
              ) : (
                /* La date vient du tableau de l'éditeur : sans date, un simple constat, rien à cliquer. */
                <span className="ev-date-empty" data-tippy-content={a.fenetre ? t('evaluations.windowHint', { window: a.fenetre }) : undefined}>{t('evaluations.noDateYet')}</span>
              )}
            </div>
            <div className="ev-row__actions flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
              {a.type !== 'colle' && docIndicator !== 'none' && (
                <button
                  type="button"
                  onClick={() => setDocumentFor({ kind: 'assessment', link })}
                  className="ev-action shrink-0"
                  data-filled={docIndicator === 'attached' ? 'ok' : docIndicator === 'missing' ? 'missing' : undefined}
                  data-doc-state={docIndicator}
                  title={docTooltip}
                  data-tippy-content={docTooltip}
                  aria-label={`${t('evaluations.doc.title', { activity: displayName })}${docStateSuffix}`}
                >
                  {/* Le nom reste accessible ; la teinte indique l'état du document. */}
                  <ActionIcon name="document" />
                  <span className="sr-only">{t(docIndicator === 'attached' ? 'evaluations.doc.open' : 'evaluations.action.addContent')}</span>
                </button>
              )}

              {kindPolicy.absences && a.type !== 'maison' && (
                <button
                  type="button"
                  onClick={() => setAbsencesFor(link)}
                  className="ev-action shrink-0"
                  data-filled={absents.length > 0 ? 'danger' : undefined}
                  title={absentsTooltip}
                  data-tippy-content={absentsTooltip}
                  aria-label={absents.length > 0
                    ? t(absents.length === 1 ? 'evaluations.absentOne' : 'evaluations.absentMany', { count: number.format(absents.length) })
                    : t('evaluations.absentees')}
                >
                  <ActionIcon name="absents" />
                  <span className="sr-only">{t('evaluations.action.absent')}</span>
                  {absents.length > 0 && (
                    <span className="ev-action__count">{number.format(absents.length)}</span>
                  )}
                </button>
              )}

              {/* Élèves : la même commande pour tout devoir, son habillage suit la nature. */}
              {kindPolicy.students && a.type !== 'maison' && (
                <button
                  type="button"
                  onClick={() => setOralFor(link)}
                  className="ev-action shrink-0"
                  title={oralTooltip}
                  data-tippy-content={oralTooltip}
                  aria-label={`${t(a.type === 'colle' ? 'evaluations.colle.title' : a.type === 'oral' ? 'evaluations.oral.title' : 'evaluations.track.title')} — ${displayName}`}
                >
                  <ActionIcon name="students" />
                  <span className="sr-only">{t(a.type === 'oral' ? 'evaluations.action.track' : 'evaluations.action.students')}</span>
                </button>
              )}

              {/* Date limite à laquelle les élèves rendent le devoir. */}
              {a.type === 'maison' && (
                <button
                  type="button"
                  onClick={() => setEditingDateAssessment({ id: a.id, name: displayName, date: dueDateISO, field: 'due' })}
                  // A calm semantic state; the exact deadline remains in the row metadata.
                  className={cn("ev-action shrink-0", dueDateISO === today && "glow-pulse-warning")}
                  data-filled={dueDateISO ? 'tone' : undefined}
                  data-due={dueDateISO === today ? 'today' : undefined}
                  data-tippy-content={dueDateISO === today ? t('evaluations.homework.dueToday') : t('evaluations.tip.dueDate')}
                  aria-label={dueDateISO
                    ? `${t('evaluations.action.dueDate')} — ${formatSingleDate(dueDateISO)} — ${displayName}`
                    : `${t('evaluations.action.dueDate')} — ${displayName}`}
                >
                  <ActionIcon name="deadline" />
                  <span className="sr-only">{t('evaluations.action.dueDate')}</span>
                  {dueDateISO && <span className="sr-only"><bdi dir="ltr">{formatSingleDate(dueDateISO)}</bdi></span>}
                </button>
              )}

              <AnimatedTrashButton
                iconOnly
                size="sm"
                variant="icon"
                data-danger="true"
                onClick={() => setDeletingAssessment({ id: a.id, name: displayName })}
                className="ev-icon-btn shrink-0"
                title={t('evaluations.tip.deleteForever', { name: displayName })}
                aria-label={t('evaluations.manualDelete')}
              />
            </div>
          </div>
        );
    if (!showCorrection) return assignedRow;
    const correctionTooltip = t(correctionIndicator === 'attached' ? 'evaluations.tip.docAttached' : 'evaluations.tip.docIdle');
    const correctionRow = (
      <div
        key={`${a.id}:correction`}
        className="ev-row ev-row--correction evaluation-tone"
        data-assessment-id={`${a.id}:correction`}
        data-assessment-type="maison_correction"
        data-tone={kindStyle.tone}
      >
        <div className="ev-row__id min-w-0">
          <span dir="auto" className="-ms-1 inline-flex max-w-full items-center truncate px-1 py-0.5 text-start text-[11.5px] font-semibold text-foreground/90">{correctionName}</span>
        </div>
        <div className="ev-row__date">
          <button
            type="button"
            onClick={() => setEditingDateAssessment({ id: a.id, name: correctionName, date: correctionDateISO, field: 'correction' })}
            className={cn(
              "ev-date-trigger inline-flex items-center justify-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold select-none cursor-pointer transition-all active:scale-95 border border-border/40 rounded-full shadow-xs",
              correctionDateISO
                ? "text-foreground hover:text-primary hover:bg-muted/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
            aria-label={t('evaluations.assessmentDateAria', { assessment: correctionName })}
          >
            <span className="whitespace-nowrap tabular-nums text-[11px] font-bold">
              {correctionDateISO ? <bdi dir="ltr">{formatSingleDate(correctionDateISO)}</bdi> : t('evaluations.noDateYet')}
            </span>
          </button>
        </div>
        <div className="ev-row__actions flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
          {(
            <button
              type="button"
              onClick={() => setDocumentFor({ kind: 'assessment', link, part: 'correction' })}
              className="ev-action shrink-0"
              data-filled={correctionIndicator === 'attached' ? 'ok' : correctionIndicator === 'missing' ? 'missing' : undefined}
              data-doc-state={correctionIndicator}
              title={correctionTooltip}
              data-tippy-content={correctionTooltip}
              aria-label={`${t('evaluations.doc.title', { activity: correctionName })}${correctionIndicator === 'attached' ? ` — ${t('evaluations.doc.stateAttached')}` : ''}`}
            >
              <ActionIcon name="document" />
              <span className="sr-only">{t('evaluations.action.correctionContent')}</span>
            </button>
          )}
          {kindPolicy.students && (
            <button
              type="button"
              onClick={() => setSubmissionsFor(link)}
              className="ev-action shrink-0"
              data-filled={notReturned > 0 ? 'danger' : observedSubmissions ? 'tone' : undefined}
              data-tippy-content={t('evaluations.tip.notReturned')}
              aria-label={`${t('evaluations.homework.notReturnedTitle')} — ${correctionName}${notReturned > 0 ? ` · ${number.format(notReturned)}` : ''}`}
            >
              <ActionIcon name="students" />
              <span className="sr-only">{t('evaluations.action.notReturned')}</span>
              {notReturned > 0 && <span className="ev-action__count">{number.format(notReturned)}</span>}
            </button>
          )}
          <AnimatedTrashButton
            iconOnly
            size="sm"
            variant="icon"
            data-danger="true"
            onClick={() => setDeletingCorrection(link)}
            className="ev-icon-btn shrink-0"
            title={t('evaluations.tip.deleteCorrection', { name: correctionName })}
            aria-label={t('evaluations.deleteCorrectionAction')}
          />
        </div>
      </div>
    );
    return <React.Fragment key={a.id}>{assignedRow}{correctionRow}</React.Fragment>;
  });

  return (
    <div lang={locale} className="evaluation-workspace space-y-4 font-sans sm:space-y-5">
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
                              policy={policy}
                            />
                          ) : (
                            <div className="ev-board__rows">
                              <div className="ev-board__head" aria-hidden="true">
                                <span>{t('evaluations.titleLabel')}</span>
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
        onConfigChange={onConfigChange}
        classInfo={classInfo}
        classDisplayName={selectedClassDisplayName}
        config={effectiveConfig}
        today={today}
        assessments={assessments}
        modals={evaluationModals}
        actions={actions}
        saveAssessment={saveAssessment}
        setAssessmentDate={setAssessmentDate}
        setHomeworkDate={setHomeworkDate}
        deletePedagogicalEvent={deletePedagogicalEvent}
        deleteAssessment={deleteAssessment}
        deleteHomeworkCorrection={deleteHomeworkCorrection}
      />

    </div>
  );
};
