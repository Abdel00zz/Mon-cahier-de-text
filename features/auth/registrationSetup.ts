import type { AppConfig, ClassInfo, Cycle } from '@/types';
import { readWorkspaceScope } from '@/utils/accountWorkspace';

/** Only user-entered preview data, held in memory until explicit registration. */
export interface RegistrationSetup {
  cycle: Cycle;
  className: string;
  subject: string;
  applicationLocale: 'fr' | 'ar';
  firstTitle?: string;
}

export function normalizeRegistrationSetup(
  value: unknown,
): RegistrationSetup | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<RegistrationSetup>;
  if (
    !['college', 'lycee', 'prepa'].includes(item.cycle ?? '') ||
    !['fr', 'ar'].includes(item.applicationLocale ?? '')
  )
    return null;
  if (
    typeof item.className !== 'string' ||
    !item.className.trim() ||
    item.className.length > 120
  )
    return null;
  if (
    typeof item.subject !== 'string' ||
    !item.subject.trim() ||
    item.subject.length > 120
  )
    return null;
  if (
    item.firstTitle !== undefined &&
    (typeof item.firstTitle !== 'string' || item.firstTitle.length > 300)
  )
    return null;
  return {
    cycle: item.cycle!,
    className: item.className.trim(),
    subject: item.subject.trim(),
    applicationLocale: item.applicationLocale!,
    firstTitle: item.firstTitle?.trim() || undefined,
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
    throw new Error('Workspace owner mismatch');
  const config: Partial<AppConfig> = JSON.parse(
    storage.getItem('appConfig_v1') ?? '{}',
  );
  const classes: ClassInfo[] = JSON.parse(
    storage.getItem('classManager_v1') ?? '[]',
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
    teacherName: config.defaultTeacherName ?? '',
    createdAt: new Date().toISOString(),
    color: '',
  };
  const entries = {
    appConfig_v1: JSON.stringify({
      ...config,
      applicationLocale: setup.applicationLocale,
      selectedCycles: [setup.cycle],
      selectedSubjects: [setup.subject],
      showAllCycles: false,
      showAllSubjects: false,
    }),
    classManager_v1: JSON.stringify([classInfo]),
    app_first_launch_v1: 'true',
    ['classData_v1_' + id]: JSON.stringify({
      lessonsData: setup.firstTitle
        ? [
            {
              type: 'chapter',
              title: setup.firstTitle,
              sections: [],
              _tempId: crypto.randomUUID(),
            },
          ]
        : [],
      contentDirection: setup.firstTitle
        ? /[\u0600-\u06ff]/.test(setup.firstTitle)
          ? 'rtl'
          : 'ltr'
        : setup.applicationLocale === 'ar'
          ? 'rtl'
          : 'ltr',
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
