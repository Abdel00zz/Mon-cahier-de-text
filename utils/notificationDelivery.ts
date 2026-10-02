import type { PushNotificationKind } from './notificationTypes.js';

/** Expire time-sensitive reminders; reserve urgent delivery for immediate tests/session alerts. */
export function notificationDeliveryPolicy(kind: PushNotificationKind): { TTL: number; urgency: 'low' | 'normal' | 'high' } {
  switch (kind) {
    case 'session-reminder': return { TTL: 120, urgency: 'high' };
    case 'missing-date': return { TTL: 900, urgency: 'normal' };
    case 'test': return { TTL: 300, urgency: 'high' };
    case 'lateness': return { TTL: 86_400, urgency: 'low' };
    case 'assessment':
    case 'admin': return { TTL: 86_400, urgency: 'normal' };
  }
}
