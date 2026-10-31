import { clamp } from 'es-toolkit';
import type { NotificationSettings } from '../../types.js';

export const DEFAULT_SESSION_REMINDER_MINUTES = 5;

/** Upgrade the former one-minute default; subsequent explicit choices remain editable. */
export function sessionReminderMinutes(settings?: Partial<NotificationSettings>): number {
  const value = settings?.sessionReminderMinutes;
  if (!Number.isFinite(value) || (value === 1 && settings?.sessionReminderTimingVersion !== 1)) {
    return DEFAULT_SESSION_REMINDER_MINUTES;
  }
  return clamp(Math.round(value!), 1, 10);
}
