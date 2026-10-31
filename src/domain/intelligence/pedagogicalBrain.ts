import { maxBy, sumBy } from 'es-toolkit';
import type { AppConfig, ClassInfo, DevoirType, LessonsData } from '../../types';
import { effectiveSchedules, getHourSlots, TIMETABLE_DAYS } from '../calendar/timetable';
import { analyseNotebook, type NotebookAdvice } from './notebookAdvisor';
import { hasOnlyPristineStarterDiagnostic } from '../notebook/starterDiagnostic';
import { detectNotebookFollowup, type FollowupClass, type FollowupConfig, type NotebookFollowup } from '../assistant/notebookFollowup';
import type { HolidayCalendar } from '../calendar/calendar';
import { getBundledCalendar, schoolYearLabelFromDate } from '../calendar/calendar';
import { detectEvaluationConflicts, evaluationSlots, type EvaluationConflict } from '../evaluations/evaluationConflicts';
import type { PlannedAssessment } from '../evaluations/assessments';
import { historicalStudentNames } from '../evaluations/classRosterSync';
import { studentIdentityKey } from '../evaluations/studentRoster';

interface NotebookClassFollowup { classInfo: FollowupClass; followup: NotebookFollowup }

interface NotebookClassIssue {
  classInfo: Pick<ClassInfo, 'id' | 'name'>;
  advices: NotebookAdvice[];
  topAdvice: NotebookAdvice;
}

interface EvaluationClassConflict {
  classInfo: Pick<ClassInfo, 'id' | 'name'>;
  conflictCount: number;
  topConflictKind: EvaluationConflict['kind'];
  sampleLabel?: string;
}

interface RosterClassIssue {
  classInfo: Pick<ClassInfo, 'id' | 'name'>;
  missingCount: number;
  reason: 'missing-roster' | 'unmerged-names';
}

export type PedagogicalBrainConfig = Pick<AppConfig, 'timetable' | 'schedules'> &
  FollowupConfig &
  Partial<Pick<AppConfig, 'assessmentDates' | 'manualAssessments' | 'removedAssessments' | 'pedagogicalEvents' | 'assessmentParticipants' | 'assessmentAbsences' | 'classRosters'>>;

export interface PedagogicalDiagnosis {
  /** Le type de besoin ou d'état pédagogique prioritaire */
  step: 'create' | 'schedule' | 'active-session' | 'notebook-issue' | 'evaluation-conflict' | 'roster-incomplete' | 'notebook-empty' | 'notebook-unavailable' | 'notebook-followup' | 'checking' | 'ready';
  /** Classe ciblée par l'action */
  targetClass?: Pick<ClassInfo, 'id' | 'name'>;
  /** Nombre total de points nécessitant attention */
  problemCount: number;
  /** Détails sur les classes sans horaires */
  unscheduledClasses: Pick<ClassInfo, 'id' | 'name'>[];
  /** Détails sur les cahiers encore vierges */
  emptyNotebookClasses: Pick<ClassInfo, 'id' | 'name'>[];
  /** Détails sur les anomalies détectées par le conseiller de cahier */
  notebookIssues: NotebookClassIssue[];
  /** Détails sur les conflits de dates ou de numéros d'évaluation */
  evaluationConflicts?: EvaluationClassConflict[];
  /** Détails sur les listes d'élèves manquantes ou incomplètes */
  incompleteRosterClasses?: RosterClassIssue[];
  notebookFollowups?: NotebookClassFollowup[];
  unreadableNotebookClasses?: Pick<ClassInfo, 'id' | 'name'>[];
  /** Classe actuellement en séance */
  activeSessionClass?: Pick<ClassInfo, 'id' | 'name'>;
}

export interface PedagogicalBrainOptions {
  classes: readonly FollowupClass[];
  config: PedagogicalBrainConfig;
  preferredClassId?: string;
  activeSessionClassIds?: readonly string[];
  readLessons?: (classId: string) => LessonsData;
  notebooksLoading?: boolean;
  /** Explicit clock keeps temporal diagnostics deterministic for all callers. */
  today?: string;
  calendar?: HolidayCalendar;
  /** The central assistant scans all local notebooks even when a live session takes display priority. */
  inspectDuringSession?: boolean;
}

const VALID_DAYS = new Set(TIMETABLE_DAYS.map(day => day.value));
const VALID_SLOTS = new Set(getHourSlots().map(slot => slot.index));
// The shared notebook reader returns immutable revisions. Old revisions are garbage collected.
const adviceCache = new WeakMap<LessonsData, NotebookAdvice[]>();

const OVERRIDE_KEY_PATTERN = /^(?:(\d{4}-\d{4}):)?s([12])-(controle(?:_court|_global)?|oral|maison|colle)(\d+)$/;

function buildClassPlannedAssessments(
  classId: string,
  config: PedagogicalBrainConfig,
  defaultSchoolYear: string,
): PlannedAssessment[] {
  const removed = new Set(config.removedAssessments?.[classId] ?? []);
  const overrides = config.assessmentDates?.[classId] ?? {};
  const manual = config.manualAssessments?.[classId] ?? [];
  const result: PlannedAssessment[] = [];
  const seenIds = new Set<string>();

  for (const item of manual) {
    if (removed.has(item.id)) continue;
    const dateISO = overrides[item.id] ?? item.dateISO;
    const schoolYear = item.schoolYear || (dateISO ? schoolYearLabelFromDate(dateISO) : defaultSchoolYear);
    seenIds.add(item.id);
    result.push({
      id: item.id,
      schoolYear,
      semestre: item.semestre,
      type: item.type,
      num: item.num,
      label: `${item.type} ${item.num}`,
      dateISO,
      semaine: 1,
      manual: true,
      note: item.note,
      predictionStatus: 'manual',
      confidence: 'high',
      predictionReason: 'manual',
    });
  }

  for (const [id, dateISO] of Object.entries(overrides)) {
    if (seenIds.has(id) || removed.has(id) || !dateISO) continue;
    const match = OVERRIDE_KEY_PATTERN.exec(id);
    if (!match) continue;
    const [, explicitYear, semStr, rawType, numStr] = match;
    const semestre = Number(semStr) as 1 | 2;
    const type = rawType as DevoirType;
    const num = Number(numStr);
    const schoolYear = explicitYear || schoolYearLabelFromDate(dateISO) || defaultSchoolYear;
    result.push({
      id,
      schoolYear,
      semestre,
      type,
      num,
      label: `${type} ${num}`,
      dateISO,
      semaine: 1,
      predictionStatus: 'adjusted',
      confidence: 'high',
      predictionReason: 'adjusted',
    });
  }

  return result;
}

function detectClassEvaluationConflict(
  classInfo: Pick<ClassInfo, 'id' | 'name'>,
  lessons: LessonsData,
  config: PedagogicalBrainConfig,
  defaultSchoolYear: string,
): EvaluationClassConflict | undefined {
  const planned = buildClassPlannedAssessments(classInfo.id, config, defaultSchoolYear);
  const events = config.pedagogicalEvents?.[classInfo.id] ?? [];
  const slots = evaluationSlots(lessons, planned, events);
  if (slots.length < 2) return undefined;

  const seenPairs = new Set<string>();
  const conflicts: EvaluationConflict[] = [];
  for (const slot of slots) {
    for (const conflict of detectEvaluationConflicts(slot, slots)) {
      const pairKey = `${conflict.kind}:${[conflict.candidate.key, conflict.existing.key].sort().join('|')}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      conflicts.push(conflict);
    }
  }

  if (conflicts.length === 0) return undefined;
  return {
    classInfo,
    conflictCount: conflicts.length,
    topConflictKind: conflicts[0].kind,
    sampleLabel: conflicts[0].candidate.label || conflicts[0].existing.label,
  };
}

function hasNominativeNotebookItems(lessons: LessonsData): boolean {
  for (const top of lessons) {
    if (top.type === 'oral' || top.type === 'colle') return true;
    for (const item of top.items ?? []) {
      if (item.type === 'oral' || item.type === 'colle') return true;
    }
    for (const section of top.sections ?? []) {
      for (const item of section.items ?? []) {
        if (item.type === 'oral' || item.type === 'colle') return true;
      }
      for (const sub of section.subsections ?? []) {
        for (const item of sub.items ?? []) {
          if (item.type === 'oral' || item.type === 'colle') return true;
        }
      }
    }
  }
  return false;
}

function detectClassRosterIssue(
  classInfo: Pick<ClassInfo, 'id' | 'name'>,
  lessons: LessonsData,
  config: PedagogicalBrainConfig,
): RosterClassIssue | undefined {
  const historicalNames = historicalStudentNames(config, classInfo.id);
  const hasNominativeEvent = (config.pedagogicalEvents?.[classInfo.id] ?? []).some(
    event => event.type === 'controle_cahiers' || Boolean(event.students?.names?.length),
  );
  const hasNominativeAssessment = (config.manualAssessments?.[classInfo.id] ?? []).some(
    assessment => assessment.type === 'oral' || assessment.type === 'colle',
  ) || hasNominativeNotebookItems(lessons);

  // Only inspect classRosters when nominative activities or student records actually exist for this class.
  if (historicalNames.length === 0 && !hasNominativeEvent && !hasNominativeAssessment) {
    return undefined;
  }

  const rosterNames = config.classRosters?.[classInfo.id]?.names ?? [];
  if (rosterNames.length === 0) {
    return {
      classInfo,
      missingCount: Math.max(1, historicalNames.length),
      reason: 'missing-roster',
    };
  }

  if (historicalNames.length > 0) {
    const knownKeys = new Set(rosterNames.map(studentIdentityKey));
    const unmerged = historicalNames.filter(name => !knownKeys.has(studentIdentityKey(name)));
    if (unmerged.length > 0) {
      return {
        classInfo,
        missingCount: unmerged.length,
        reason: 'unmerged-names',
      };
    }
  }

  return undefined;
}

/**
 * CERVEAU PÉDAGOGIQUE CENTRAL DE L'APPLICATION
 *
 * Analyse holistique de la situation de l'enseignant :
 * 1. Présence de classes (Fondation)
 * 2. Emploi du temps & créneaux hebdomadaires (Planification)
 * 3. Séances en direct (Action immédiate / Présentiel)
 * 4. Qualité et cohérence des cahiers de textes (Conseiller de cahier)
 * 5. Conflits d'évaluations et listes d'élèves incomplètes (Suivi pédagogique)
 * 6. Cahiers vierges à démarrer (Progression)
 * 7. Aucun point détecté par ces vérifications (pas une validation exhaustive)
 */
export function diagnosePedagogicalState({
  classes,
  config,
  preferredClassId,
  activeSessionClassIds,
  readLessons,
  notebooksLoading = false,
  today,
  calendar = getBundledCalendar(),
  inspectDuringSession = false,
}: PedagogicalBrainOptions): PedagogicalDiagnosis {
  // 1. Aucune classe créée
  if (!classes.length) {
    return {
      step: 'create',
      problemCount: 1,
      unscheduledClasses: [],
      emptyNotebookClasses: [],
      notebookIssues: [],
    };
  }

  const knownIds = new Set(classes.map(item => item.id));
  const scheduled = new Set<string>();

  const timetable = config.timetable?.filter(
    entry => knownIds.has(entry.classId) && VALID_DAYS.has(entry.day) && VALID_SLOTS.has(entry.slot)
  );

  const schedules = effectiveSchedules({
    timetable,
    schedules: config.timetable === undefined ? config.schedules : [],
  });
  const slotsByClass = new Map(schedules.map(schedule => [schedule.classId, schedule.slots]));

  for (const schedule of schedules) {
    if (knownIds.has(schedule.classId) && schedule.slots.some(slot => VALID_DAYS.has(slot.weekday))) {
      scheduled.add(schedule.classId);
    }
  }

  // 2. Classes sans créneaux horaires
  const unscheduledClasses = classes.filter(item => !scheduled.has(item.id));
  // A real current session takes precedence over configuration of other classes.
  const activeIds = new Set(activeSessionClassIds);
  const activeSessionClass = classes.find(item => item.id === preferredClassId && activeIds.has(item.id))
    ?? classes.find(item => activeIds.has(item.id));
  if (activeSessionClass && (!inspectDuringSession || notebooksLoading)) return {
    step: 'active-session', targetClass: activeSessionClass, activeSessionClass,
    problemCount: 0, unscheduledClasses, emptyNotebookClasses: [], notebookIssues: [],
  };
  if (notebooksLoading) return {
    step: 'checking', targetClass: classes.find(item => item.id === preferredClassId) ?? classes[0],
    problemCount: 0, unscheduledClasses, emptyNotebookClasses: [], notebookIssues: [],
  };

  // 3. Séance active en direct (priorité pédagogique immédiate)

  // 4. Analyse qualitative des cahiers, évaluations et listes d'élèves si la lecture est branchée
  const notebookIssues: NotebookClassIssue[] = [];
  const evaluationConflicts: EvaluationClassConflict[] = [];
  const incompleteRosterClasses: RosterClassIssue[] = [];
  const emptyNotebookClasses: Pick<ClassInfo, 'id' | 'name'>[] = [];
  const unreadable: Pick<ClassInfo, 'id' | 'name'>[] = [];
  const notebookFollowups: NotebookClassFollowup[] = [];
  const defaultSchoolYear = calendar.anneeScolaire.libelle;

  if (typeof readLessons === 'function') {
    for (const classInfo of classes) {
      try {
        const lessons = readLessons(classInfo.id);
        const safeLessons = lessons ?? [];
        const evalConflict = detectClassEvaluationConflict(classInfo, safeLessons, config, defaultSchoolYear);
        if (evalConflict) evaluationConflicts.push(evalConflict);

        const rosterIssue = detectClassRosterIssue(classInfo, safeLessons, config);
        if (rosterIssue) incompleteRosterClasses.push(rosterIssue);

        if (!lessons || lessons.length === 0 || hasOnlyPristineStarterDiagnostic(lessons)) {
          emptyNotebookClasses.push(classInfo);
        } else {
          let advices = adviceCache.get(lessons);
          if (!advices) {
            // Empty headings are normal in a prepared curriculum, not tasks to fix.
            // Keep that informational note in import previews only.
            advices = analyseNotebook(lessons, 5).filter(advice => advice.code !== 'emptyStructure');
            adviceCache.set(lessons, advices);
          }
          if (advices.length > 0) {
            notebookIssues.push({
              classInfo,
              advices,
              topAdvice: advices[0],
            });
          }
          const slots = slotsByClass.get(classInfo.id) ?? [];
          if (today && scheduled.has(classInfo.id)) {
            const followup = detectNotebookFollowup(classInfo, lessons, slots, config, calendar, today);
            if (followup) notebookFollowups.push({ classInfo, followup });
          }
        }
      } catch {
        unreadable.push(classInfo);
      }
    }
  }

  const findings = {
    unscheduledClasses,
    emptyNotebookClasses,
    notebookIssues,
    evaluationConflicts,
    incompleteRosterClasses,
    notebookFollowups,
    unreadableNotebookClasses: unreadable,
    activeSessionClass,
  };
  if (activeSessionClass) return { ...findings, step: 'active-session', targetClass: activeSessionClass, problemCount: 0 };

  if (unreadable.length) return {
    ...findings,
    step: 'notebook-unavailable', targetClass: unreadable.find(item => item.id === preferredClassId) ?? unreadable[0],
    problemCount: unreadable.length, unscheduledClasses, emptyNotebookClasses, notebookIssues,
  };

  // Anomalies de cahiers (formules non fermées, séances antidatées, doublons)
  if (notebookIssues.length > 0) {
    // On priorise la classe sélectionnée si elle a une anomalie, sinon la première
    const targetIssue = notebookIssues.find(i => i.classInfo.id === preferredClassId) ?? notebookIssues[0];
    const totalAdvicesCount = sumBy(notebookIssues, curr => curr.advices.length);

    return {
      ...findings,
      step: 'notebook-issue',
      targetClass: targetIssue.classInfo,
      problemCount: totalAdvicesCount,
      unscheduledClasses,
      emptyNotebookClasses,
      notebookIssues,
    };
  }

  // Conflits de dates ou de numérotation d'évaluations
  if (evaluationConflicts.length > 0) {
    const targetConflict = evaluationConflicts.find(c => c.classInfo.id === preferredClassId) ?? evaluationConflicts[0];
    const totalConflicts = sumBy(evaluationConflicts, curr => curr.conflictCount);
    return {
      ...findings,
      step: 'evaluation-conflict',
      targetClass: targetConflict.classInfo,
      problemCount: totalConflicts,
    };
  }

  // Inspect notebooks before routine setup so unreadable content is never masked by an offer.
  if (unscheduledClasses.length > 0) return {
    ...findings,
    step: 'schedule', targetClass: unscheduledClasses.find(item => item.id === preferredClassId) ?? unscheduledClasses[0],
    problemCount: unscheduledClasses.length, unscheduledClasses, emptyNotebookClasses, notebookIssues,
  };

  // Listes d'élèves manquantes ou incomplètes sur une classe avec suivi nominatif
  if (incompleteRosterClasses.length > 0) {
    const targetRoster = incompleteRosterClasses.find(r => r.classInfo.id === preferredClassId) ?? incompleteRosterClasses[0];
    return {
      ...findings,
      step: 'roster-incomplete',
      targetClass: targetRoster.classInfo,
      problemCount: incompleteRosterClasses.length,
    };
  }

  // Cahiers entièrement vierges
  if (emptyNotebookClasses.length > 0 && typeof readLessons === 'function') {
    const target = emptyNotebookClasses.find(c => c.id === preferredClassId) ?? emptyNotebookClasses[0];
    return {
      ...findings,
      step: 'notebook-empty',
      targetClass: target,
      problemCount: emptyNotebookClasses.length,
      unscheduledClasses: [],
      emptyNotebookClasses,
      notebookIssues: [],
    };
  }

  if (notebookFollowups.length) {
    const target = notebookFollowups.find(item => item.classInfo.id === preferredClassId)
      ?? maxBy(notebookFollowups, item => item.followup.elapsedDays)!;
    return {
      ...findings,
      step: 'notebook-followup',
      targetClass: target.classInfo,
      problemCount: notebookFollowups.length,
      unscheduledClasses,
      emptyNotebookClasses,
      notebookIssues,
      notebookFollowups,
    };
  }

  // 7. Aucun point détecté par les vérifications disponibles
  const defaultTarget = classes.find(c => c.id === preferredClassId) ?? classes[0];
  return {
    step: 'ready',
    targetClass: defaultTarget,
    problemCount: 0,
    unscheduledClasses: [],
    emptyNotebookClasses: [],
    notebookIssues: [],
  };
}

