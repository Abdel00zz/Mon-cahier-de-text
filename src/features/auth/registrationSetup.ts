import type { AppConfig, ClassInfo, Cycle } from "@/types";
import { readWorkspaceScope } from "@/infrastructure/storage/accountWorkspace";
import {
  CLASS_LEVELS_BY_CYCLE,
  SUBJECTS,
  classLevelGroupsForCycle,
} from "@/constants";
import {
  classNameForLevelAndGroup,
  normalizeGroupNumber,
} from "@/domain/classes/classGroup";

export interface RegistrationDraft {
  cycle: Cycle | "";
  levelGroup: string;
  level: string;
  subject: string;
  group: string;
}

const EMPTY_DRAFT: RegistrationDraft = {
  cycle: "",
  levelGroup: "",
  level: "",
  subject: "",
  group: "1",
};

/** Niveaux proposés pour un brouillon donné — source unique partagée par l'UI et la validation. */
export function levelsForDraft(
  draft: Pick<RegistrationDraft, "cycle" | "levelGroup">,
): string[] {
  if (!draft.cycle) return [];
  if (draft.cycle === "college") return CLASS_LEVELS_BY_CYCLE.college;
  return (
    classLevelGroupsForCycle(draft.cycle).find(
      (group) => group.key === draft.levelGroup,
    )?.levels ?? []
  );
}

/** Use the same official levels and group rules as the dashboard. */
export function registrationSetupFromDraft(
  draft: RegistrationDraft,
  locale: "fr" | "ar",
): RegistrationSetup | null {
  if (!draft.cycle) return null;
  const levels = levelsForDraft(draft);
  const group = normalizeGroupNumber(draft.group);
  if (
    !levels.includes(draft.level) ||
    !SUBJECTS.some((subject) => subject === draft.subject) ||
    !group
  )
    return null;
  return {
    cycle: draft.cycle,
    className: classNameForLevelAndGroup(draft.level, group),
    subject: draft.subject,
    applicationLocale: locale,
    preparationCompleted: true,
  };
}

/* Brouillon conservé en sessionStorage : uniquement les choix pédagogiques
 * (cycle, niveau, matière), jamais de données personnelles. Survit au
 * rechargement ou à une suspension de l'onglet pendant l'inscription. */
const DRAFT_KEY = "registrationDraft_v1";

export function saveRegistrationDraft(
  draft: RegistrationDraft,
  storage: Storage = sessionStorage,
): void {
  try {
    if (!draft.cycle) storage.removeItem(DRAFT_KEY);
    else storage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // stockage indisponible : le brouillon reste en mémoire
  }
}

export function clearRegistrationDraft(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // stockage indisponible
  }
}

export function readRegistrationDraft(
  storage: Storage = sessionStorage,
): RegistrationDraft {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return EMPTY_DRAFT;
    const item = value as Partial<RegistrationDraft>;
    const cycle: Cycle | "" = ["college", "lycee", "prepa"].includes(
      item.cycle ?? "",
    )
      ? (item.cycle as Cycle)
      : "";
    if (!cycle) return EMPTY_DRAFT;
    const levelGroup =
      cycle !== "college" &&
      typeof item.levelGroup === "string" &&
      classLevelGroupsForCycle(cycle).some((group) => group.key === item.levelGroup)
        ? item.levelGroup
        : "";
    const levels = levelsForDraft({ cycle, levelGroup });
    const level =
      typeof item.level === "string" && levels.includes(item.level)
        ? item.level
        : "";
    const subject =
      typeof item.subject === "string" &&
      SUBJECTS.some((entry) => entry === item.subject)
        ? item.subject
        : "";
    const group =
      typeof item.group === "string" && /^\d{1,2}$/.test(item.group)
        ? item.group
        : EMPTY_DRAFT.group;
    return { cycle, levelGroup, level, subject, group };
  } catch {
    return EMPTY_DRAFT;
  }
}

/** Only user-entered onboarding data, held in memory until explicit registration. */
export interface RegistrationSetup {
  cycle: Cycle;
  className: string;
  subject: string;
  applicationLocale: "fr" | "ar";
  firstTitle?: string;
  preparationCompleted?: boolean;
}

export function normalizeRegistrationSetup(
  value: unknown,
): RegistrationSetup | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<RegistrationSetup>;
  if (
    !["college", "lycee", "prepa"].includes(item.cycle ?? "") ||
    !["fr", "ar"].includes(item.applicationLocale ?? "")
  )
    return null;
  if (
    typeof item.className !== "string" ||
    !item.className.trim() ||
    item.className.length > 120
  )
    return null;
  if (
    typeof item.subject !== "string" ||
    !item.subject.trim() ||
    item.subject.length > 120
  )
    return null;
  if (
    item.firstTitle !== undefined &&
    (typeof item.firstTitle !== "string" || item.firstTitle.length > 300)
  )
    return null;
  return {
    cycle: item.cycle!,
    className: item.className.trim(),
    subject: item.subject.trim(),
    applicationLocale: item.applicationLocale!,
    firstTitle: item.firstTitle?.trim() || undefined,
    ...(item.preparationCompleted === true
      ? { preparationCompleted: true }
      : {}),
  };
}

/** Identifiant robuste même hors contexte sécurisé (randomUUID exige HTTPS). */
const randomId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `cls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Lecture tolérante : une valeur corrompue repart d'une config vide au lieu de bloquer l'inscription. */
const readStoredJson = (storage: Storage, key: string, fallback: unknown): unknown => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
};

/** Registration only: cannot merge an anonymous draft into an existing workspace. */
export function applyRegistrationSetup(
  value: unknown,
  owner: string,
  storage: Storage = localStorage,
): string | null {
  const setup = normalizeRegistrationSetup(value);
  if (!setup) return null;
  if (readWorkspaceScope(storage)?.owner !== owner)
    throw new Error("Workspace owner mismatch");
  const config = readStoredJson(storage, "appConfig_v1", {}) as Partial<AppConfig>;
  const classes = readStoredJson(storage, "classManager_v1", []);
  if (
    !Array.isArray(classes) ||
    classes.length ||
    config.hasCompletedWelcome ||
    config.selectedCycles?.length ||
    config.selectedSubjects?.length
  )
    return null;
  const id = randomId();
  const classInfo: ClassInfo = {
    id,
    name: setup.className,
    subject: setup.subject,
    cycle: setup.cycle,
    teacherName: config.defaultTeacherName ?? "",
    createdAt: new Date().toISOString(),
    color: "",
  };
  const entries = {
    appConfig_v1: JSON.stringify({
      ...config,
      applicationLocale: setup.applicationLocale,
      selectedCycles: [setup.cycle],
      selectedSubjects: [setup.subject],
      showAllCycles: false,
      showAllSubjects: false,
      ...(setup.preparationCompleted
        ? { hasCompletedWelcome: true, showGettingStarted: true }
        : {}),
    }),
    classManager_v1: JSON.stringify([classInfo]),
    app_first_launch_v1: "true",
    ["classData_v1_" + id]: JSON.stringify({
      // Contenu personnel saisi à l'inscription : aucun diagnostic imposé.
      lessonsData: [
        ...(setup.firstTitle
          ? [
            {
              type: "chapter",
              title: setup.firstTitle,
              sections: [],
              _tempId: randomId(),
            },
          ]
          : []),
      ],
      contentDirection: setup.firstTitle
        ? /[\u0600-\u06ff]/.test(setup.firstTitle)
          ? "rtl"
          : "ltr"
        : setup.applicationLocale === "ar"
          ? "rtl"
          : "ltr",
    }),
  };
  const previous = Object.keys(entries).map(
    (key) => [key, storage.getItem(key)] as const,
  );
  try {
    for (const [key, data] of Object.entries(entries))
      storage.setItem(key, data);
  } catch (error) {
    for (const [key, data] of previous) {
      if (data === null) storage.removeItem(key);
      else storage.setItem(key, data);
    }
    throw error;
  }
  return id;
}
