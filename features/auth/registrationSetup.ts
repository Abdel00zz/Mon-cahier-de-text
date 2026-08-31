import type { AppConfig, ClassInfo, Cycle } from "@/types";
import { readWorkspaceScope } from "@/utils/accountWorkspace";
import {
  CLASS_LEVELS_BY_CYCLE,
  SUBJECTS,
  classLevelGroupsForCycle,
} from "@/constants";
import {
  classNameForLevelAndGroup,
  normalizeGroupNumber,
} from "@/utils/classGroup";

export interface RegistrationDraft {
  cycle: Cycle | "";
  levelGroup: string;
  level: string;
  subject: string;
  group: string;
}

/** Use the same official levels and group rules as the dashboard. */
export function registrationSetupFromDraft(
  draft: RegistrationDraft,
  locale: "fr" | "ar",
): RegistrationSetup | null {
  if (!draft.cycle) return null;
  const levels =
    draft.cycle === "college"
      ? CLASS_LEVELS_BY_CYCLE.college
      : (classLevelGroupsForCycle(draft.cycle).find(
          (group) => group.key === draft.levelGroup,
        )?.levels ?? []);
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
  const config: Partial<AppConfig> = JSON.parse(
    storage.getItem("appConfig_v1") ?? "{}",
  );
  const classes: ClassInfo[] = JSON.parse(
    storage.getItem("classManager_v1") ?? "[]",
  );
  if (
    !Array.isArray(classes) ||
    classes.length ||
    config.hasCompletedWelcome ||
    config.selectedCycles?.length ||
    config.selectedSubjects?.length
  )
    return null;
  const id = crypto.randomUUID();
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
      lessonsData: setup.firstTitle
        ? [
            {
              type: "chapter",
              title: setup.firstTitle,
              sections: [],
              _tempId: crypto.randomUUID(),
            },
          ]
        : [],
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
