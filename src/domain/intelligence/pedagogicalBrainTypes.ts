import type { AppConfig, ClassInfo, LessonsData } from '../../types';
import type { HolidayCalendar } from '../calendar/calendar';
import type { NotebookAdvice } from './notebookAdvisor';
import type { FollowupClass, FollowupConfig, NotebookFollowup } from '../assistant/notebookFollowup';
import type { EvaluationConflict } from '../evaluations/evaluationConflicts';

export interface NotebookClassFollowup { classInfo: FollowupClass; followup: NotebookFollowup }

export interface NotebookClassIssue {
  classInfo: Pick<ClassInfo, 'id' | 'name'>;
  advices: NotebookAdvice[];
  topAdvice: NotebookAdvice;
}

export interface EvaluationClassConflict {
  classInfo: Pick<ClassInfo, 'id' | 'name'>;
  conflictCount: number;
  topConflictKind: EvaluationConflict['kind'];
  sampleLabel?: string;
}

export interface RosterClassIssue {
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
