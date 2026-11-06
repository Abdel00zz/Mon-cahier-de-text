import type { ClassInfo, DevoirType, LessonsData } from '../../types';
import { getHourSlots, TIMETABLE_DAYS } from '../calendar/timetable';
import { type NotebookAdvice } from './notebookAdvisor';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import { detectEvaluationConflicts, evaluationSlots, type EvaluationConflict } from '../evaluations/evaluationConflicts';
import type { PlannedAssessment } from '../evaluations/assessments';
import { historicalStudentNames } from '../evaluations/classRosterSync';
import { studentIdentityKey } from '../evaluations/studentRoster';
import type { EvaluationClassConflict, PedagogicalBrainConfig, RosterClassIssue } from './pedagogicalBrainTypes';

export const VALID_DAYS = new Set(TIMETABLE_DAYS.map(day => day.value));
export const VALID_SLOTS = new Set(getHourSlots().map(slot => slot.index));
// The shared notebook reader returns immutable revisions. Old revisions are garbage collected.
export const adviceCache = new WeakMap<LessonsData, NotebookAdvice[]>();

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

export function detectClassEvaluationConflict(
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

export function detectClassRosterIssue(
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

