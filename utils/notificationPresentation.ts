import type { AppLocale } from '../types.js';
import { defaultNotificationTag, isPushNotificationKind, type PushNotificationPayload } from './notificationTypes.js';

const NOTIFICATION_ICON = '/icons/icon-192.png';
/*
 * Chemin de la pastille, vérifié par `scripts/test-notification-mechanisms.ts`
 * (Android masque le canal alpha : un carré plein devient un carré blanc).
 */
export const NOTIFICATION_BADGE = '/icons/notification-badge-96.png';

export function conciseNotificationText(value: unknown, limit: number): string {
  const text = typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
  const chars = Array.from(text);
  return chars.length <= limit ? text : `${chars.slice(0, limit - 1).join('').trimEnd()}…`;
}

const COPY = {
  fr: { title: 'Mon cahier de textes', body: 'Consultez vos notifications.', open: 'Ouvrir', notebook: 'Ouvrir le cahier', dismiss: 'Fermer' },
  ar: { title: 'دفتر نصوصي', body: 'اطّلع على إشعاراتك.', open: 'فتح', notebook: 'فتح الدفتر', dismiss: 'إغلاق' },
  en: { title: 'My lesson notebook', body: 'View your notifications.', open: 'Open', notebook: 'Open notebook', dismiss: 'Dismiss' },
} as const;

/** One presentation contract for local reminders and server push. */
export function notificationPresentation(raw: unknown, vibration = false, now = Date.now()) {
  const payload = raw && typeof raw === 'object' ? raw as Partial<PushNotificationPayload> : {};
  const locale: AppLocale = payload.locale === 'ar' || payload.locale === 'en' || payload.locale === 'fr'
    ? payload.locale : /[\u0600-\u06ff]/u.test(`${payload.title ?? ''} ${payload.body ?? ''}`) ? 'ar' : 'fr';
  const copy = COPY[locale];
  const kind = isPushNotificationKind(payload.kind) ? payload.kind : 'lateness';
  const url = typeof payload.url === 'string' && /^\/#\/(?:classe\/[^/?#]+|notifications(?:\?[^#]*)?|parametres)$/.test(payload.url)
    ? payload.url : '/#/notifications';
  const timestamp = typeof payload.timestamp === 'number' && Number.isFinite(payload.timestamp) && payload.timestamp > 0 && payload.timestamp <= now
    ? payload.timestamp : now;
  return {
    title: conciseNotificationText(payload.title, 72) || copy.title,
    options: {
      body: conciseNotificationText(payload.body, 180) || copy.body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      lang: locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      tag: conciseNotificationText(payload.tag, 180) || defaultNotificationTag(kind),
      renotify: false,
      timestamp,
      vibrate: vibration ? [160, 80, 160] : [],
      actions: [
        { action: 'open', title: url.startsWith('/#/classe/') ? copy.notebook : copy.open },
        { action: 'dismiss', title: copy.dismiss },
      ],
      data: { url, kind, timestamp, messageId: typeof payload.messageId === 'string' ? payload.messageId : undefined },
    } satisfies NotificationOptions & { renotify: boolean; vibrate: number[]; timestamp: number; actions: { action: string; title: string }[] },
  };
}
