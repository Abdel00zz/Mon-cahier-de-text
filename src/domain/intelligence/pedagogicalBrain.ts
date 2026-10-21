import type { AppConfig, ClassInfo, LessonsData } from '../../types';
import { effectiveSchedules, getHourSlots, TIMETABLE_DAYS } from '../calendar/timetable';
import { analyseNotebook, type NotebookAdvice } from './notebookAdvisor';
import { hasOnlyPristineStarterDiagnostic } from '../notebook/starterDiagnostic';

interface NotebookClassIssue {
  classInfo: Pick<ClassInfo, 'id' | 'name'>;
  advices: NotebookAdvice[];
  topAdvice: NotebookAdvice;
}

export interface PedagogicalDiagnosis {
  /** Le type de besoin ou d'état pédagogique prioritaire */
  step: 'create' | 'schedule' | 'active-session' | 'notebook-issue' | 'notebook-empty' | 'notebook-unavailable' | 'checking' | 'ready';
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
  /** Classe actuellement en séance */
  activeSessionClass?: Pick<ClassInfo, 'id' | 'name'>;
}

export interface PedagogicalBrainOptions {
  classes: readonly Pick<ClassInfo, 'id' | 'name'>[];
  config: Pick<AppConfig, 'timetable' | 'schedules'>;
  preferredClassId?: string;
  activeSessionClassIds?: readonly string[];
  readLessons?: (classId: string) => LessonsData;
  notebooksLoading?: boolean;
}

const VALID_DAYS = new Set(TIMETABLE_DAYS.map(day => day.value));
const VALID_SLOTS = new Set(getHourSlots().map(slot => slot.index));
// The shared notebook reader returns immutable revisions. Old revisions are garbage collected.
const adviceCache = new WeakMap<LessonsData, NotebookAdvice[]>();

/**
 * CERVEAU PÉDAGOGIQUE CENTRAL DE L'APPLICATION
 *
 * Analyse holistique de la situation de l'enseignant :
 * 1. Présence de classes (Fondation)
 * 2. Emploi du temps & créneaux hebdomadaires (Planification)
 * 3. Séances en direct (Action immédiate / Présentiel)
 * 4. Qualité et cohérence des cahiers de textes (Conseiller de cahier)
 * 5. Cahiers vierges à démarrer (Progression)
 * 6. Aucun point détecté par ces vérifications (pas une validation exhaustive)
 */
export function diagnosePedagogicalState({
  classes,
  config,
  preferredClassId,
  activeSessionClassIds,
  readLessons,
  notebooksLoading = false,
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
  if (activeSessionClass) return {
    step: 'active-session', targetClass: activeSessionClass, activeSessionClass,
    problemCount: 0, unscheduledClasses, emptyNotebookClasses: [], notebookIssues: [],
  };
  if (notebooksLoading) return {
    step: 'checking', targetClass: classes.find(item => item.id === preferredClassId) ?? classes[0],
    problemCount: 0, unscheduledClasses, emptyNotebookClasses: [], notebookIssues: [],
  };
  if (unscheduledClasses.length > 0) {
    const target = unscheduledClasses.find(item => item.id === preferredClassId) ?? unscheduledClasses[0];
    return {
      step: 'schedule',
      targetClass: target,
      problemCount: unscheduledClasses.length,
      unscheduledClasses,
      emptyNotebookClasses: [],
      notebookIssues: [],
    };
  }

  // 3. Séance active en direct (priorité pédagogique immédiate)

  // 4. Analyse qualitative des cahiers si la lecture est branchée
  const notebookIssues: NotebookClassIssue[] = [];
  const emptyNotebookClasses: Pick<ClassInfo, 'id' | 'name'>[] = [];
  const unreadable: Pick<ClassInfo, 'id' | 'name'>[] = [];

  if (typeof readLessons === 'function') {
    for (const classInfo of classes) {
      try {
        const lessons = readLessons(classInfo.id);
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
        }
      } catch {
        unreadable.push(classInfo);
      }
    }
  }

  if (unreadable.length) return {
    step: 'notebook-unavailable', targetClass: unreadable.find(item => item.id === preferredClassId) ?? unreadable[0],
    problemCount: unreadable.length, unscheduledClasses, emptyNotebookClasses, notebookIssues,
  };

  // Anomalies de cahiers (formules non fermées, séances antidatées, doublons)
  if (notebookIssues.length > 0) {
    // On priorise la classe sélectionnée si elle a une anomalie, sinon la première
    const targetIssue = notebookIssues.find(i => i.classInfo.id === preferredClassId) ?? notebookIssues[0];
    const totalAdvicesCount = notebookIssues.reduce((sum, curr) => sum + curr.advices.length, 0);

    return {
      step: 'notebook-issue',
      targetClass: targetIssue.classInfo,
      problemCount: totalAdvicesCount,
      unscheduledClasses: [],
      emptyNotebookClasses,
      notebookIssues,
    };
  }

  // Cahiers entièrement vierges
  if (emptyNotebookClasses.length > 0 && typeof readLessons === 'function') {
    const target = emptyNotebookClasses.find(c => c.id === preferredClassId) ?? emptyNotebookClasses[0];
    return {
      step: 'notebook-empty',
      targetClass: target,
      problemCount: emptyNotebookClasses.length,
      unscheduledClasses: [],
      emptyNotebookClasses,
      notebookIssues: [],
    };
  }

  // 5. Aucun point détecté par les vérifications disponibles
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
