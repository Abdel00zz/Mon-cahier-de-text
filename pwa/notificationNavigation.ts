import { notificationTarget } from '../utils/notificationPresentation.js';

export interface NotificationWindow {
  url: string;
  focused: boolean;
  visibilityState: string;
  focus: () => Promise<unknown>;
  postMessage: (message: { type: string; url: string }) => void;
}

/** Reuse the teacher app, never the administration page; keep its document and draft alive. */
export async function openNotificationTarget(
  requestedUrl: unknown,
  origin: string,
  windows: readonly NotificationWindow[],
  openWindow: (url: string) => Promise<unknown>,
): Promise<void> {
  const route = notificationTarget(requestedUrl);
  const target = new URL(route, origin).href;
  const candidates = windows.filter(client => {
    try { const url = new URL(client.url); return url.origin === origin && (url.pathname === '/' || url.pathname === '/index.html'); }
    catch { return false; }
  }).sort((a, b) =>
    Number(b.url === target) - Number(a.url === target)
    || Number(b.focused) - Number(a.focused)
    || Number(b.visibilityState === 'visible') - Number(a.visibilityState === 'visible'),
  );
  for (const client of candidates) {
    try {
      await client.focus();
      if (client.url !== target) client.postMessage({ type: 'notification-open', url: route });
      return;
    } catch { /* Closed/unfocusable window: try another, then open the app. */ }
  }
  await openWindow(target);
}
