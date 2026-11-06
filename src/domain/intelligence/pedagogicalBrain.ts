import { maxBy, sumBy } from 'es-toolkit';
import type { ClassInfo } from '../../types';
import { effectiveSchedules } from '../calendar/timetable';
import { analyseNotebook } from './notebookAdvisor';
import { hasOnlyPristineStarterDiagnostic } from '../notebook/starterDiagnostic';
import { detectNotebookFollowup } from '../assistant/notebookFollowup';
import { getBundledCalendar } from '../calendar/calendar';
import { adviceCache, detectClassEvaluationConflict, detectClassRosterIssue, VALID_DAYS, VALID_SLOTS } from './pedagogicalBrainHelpers';
import type { EvaluationClassConflict, NotebookClassFollowup, NotebookClassIssue, PedagogicalBrainOptions, PedagogicalDiagnosis, RosterClassIssue } from './pedagogicalBrainTypes';

export type { PedagogicalBrainConfig, PedagogicalBrainOptions, PedagogicalDiagnosis } from './pedagogicalBrainTypes';

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

