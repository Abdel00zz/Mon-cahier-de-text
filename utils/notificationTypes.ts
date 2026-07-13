const PUSH_NOTIFICATION_KINDS = [
  'lateness',
  'session-reminder',
  'missing-date',
  'assessment',
  'admin',
  'test',
] as const;

export type PushNotificationKind = (typeof PUSH_NOTIFICATION_KINDS)[number];

export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
  kind: PushNotificationKind;
  /** Deux notifications de meme tag se remplacent au lieu de s'empiler. */
  tag?: string;
  timestamp?: number;
}

export const isPushNotificationKind = (value: unknown): value is PushNotificationKind =>
  typeof value === 'string' && (PUSH_NOTIFICATION_KINDS as readonly string[]).includes(value);

export const defaultNotificationTag = (kind: PushNotificationKind): string => {
  switch (kind) {
    case 'lateness': return 'cdt-lateness';
    case 'session-reminder': return 'cdt-session-reminder';
    case 'missing-date': return 'cdt-missing-date';
    case 'assessment': return 'cdt-assessment';
    case 'admin': return 'cdt-admin';
    case 'test': return 'cdt-test';
  }
};
