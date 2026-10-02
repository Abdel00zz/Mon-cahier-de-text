import type { AppConfig, ClassInfo } from '@/types';

export function gettingStartedState(
  config: Partial<AppConfig>,
  classes: ClassInfo[],
) {
  const hasClass = classes.length > 0;
  const opened = hasClass && config.firstNotebookOpened === true;
  const scheduled =
    config.timetable?.some((slot) =>
      classes.some((item) => item.id === slot.classId),
    ) ?? false;
  return {
    done: [hasClass, opened, scheduled],
    visible:
      config.showGettingStarted === true && !(hasClass && opened && scheduled),
  };
}
