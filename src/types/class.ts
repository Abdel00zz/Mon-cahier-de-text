import type { Cycle, NotebookContentOrigin } from './base';

export interface ClassInfo {
  id: string;
  name: string; // Formerly className
  teacherName: string;
  subject: string;
  createdAt: string;
  /** Version des paramètres de classe, indépendante du contenu du cahier. */
  metadataUpdatedAt?: string;
  lastOpenedAt?: string;
  color: string;
  cycle?: Cycle; // optional for backward compatibility
  level?: string;   // classe / niveau pédagogique (ex: "3AC", "Tronc Commun", "1er Bac", "2ème Bac")
  branch?: string;  // filière / branche (ex: "Sciences Expérimentales", "Sciences Physiques", "Lettres")
  group?: string;   // numéro ou lettre de groupe (ex: "1", "2")
  /** @deprecated Legacy metadata preserved for old clients; progression only uses chapter title dates. */
  courseStartDate?: string;
  curriculumSourceId?: string;
  /** How the teacher started/replaced this notebook, not a claim about authorship of every row. */
  notebookContentOrigin?: NotebookContentOrigin;
  /** Associations confirmées, invalidées si le titre ou l'index du cahier change. */
  curriculumChapterMatches?: Record<string, { index: number; title: string }[]>;
}

/** Classe en cours de création : le gestionnaire complète l'identifiant, la
    date de création et la couleur. Source unique du contrat `addClass`. */
export type ClassDraft = Omit<ClassInfo, 'id' | 'createdAt' | 'color' | 'metadataUpdatedAt'> & { color?: string };

/** Identité d'une classe saisie par l'assistant de création (professeur comme
    direction). `level`, `branch` et `group` sont transmis en plus du nom
    affiché : les circuits officiels (plans de devoirs, liaisons de progression)
    les lisent sans re-deviner le nom. Voir `domain/classes/classLevelParts.ts`. */
export type ClassIdentityDraft = Pick<ClassInfo, 'name' | 'subject' | 'cycle' | 'level' | 'branch' | 'group'>;

interface OfficialChapter {
  id: string;
  order: number;
  semester: 1 | 2;
  title: string;
  titleAr?: string;
  allocatedHours: number | null; // null : volume non lisible ou non ventilé dans la source
  aliases?: string[];
  assessmentMilestone?: {
    type: 'DM' | 'DS' | 'EXAM';
    num?: number;
    label: string;
    labelAr: string;
    timing: string;
  };
}

export interface OfficialCurriculumPlan {
  id: string;
  levels?: string[];
  preferredForMatching?: boolean;
  cycle: Cycle;
  level: string;
  subject: string;
  sourceDoc: string;
  weeklyHours: number;
  diagnosticEvaluation: {
    period: string;
    weeks: string;
    label: string;
    labelAr: string;
  };
  chapters: OfficialChapter[];
  schoolYear?: string;
  sourceFile?: string;
  authority?: 'teacher-plan' | 'ministerial';
  notes?: string[];
  coverage?: 'annual' | 'semester1';
  assessmentWindows?: { type: 'DM' | 'DS'; semester: 1 | 2; num: number; start: string; end: string; hours: number | null }[];
}
