import { nextInboxBadge, applyAppBadge, type InboxBadgeState } from '../domain/notifications/appBadge';

const CACHE = 'notification-inbox-v1';
const KEY = '/__notification_inbox__';
let queue = Promise.resolve();

export const readInboxBadge = async (): Promise<InboxBadgeState | null> => {
  try {
    const response = await (await caches.open(CACHE)).match(KEY);
    return response ? nextInboxBadge(null, await response.json()) : null;
  } catch { return null; }
};

export function updateWorkerInboxBadge(target: Parameters<typeof applyAppBadge>[0], raw: unknown, fromPush = false, onClear?: () => Promise<void>): Promise<void> {
  queue = queue.catch(() => {}).then(async () => {
    const previous = await readInboxBadge();
    const state = nextInboxBadge(previous, raw);
    if (!state || (fromPush && previous?.owner !== state.owner)) return;
    try { await (await caches.open(CACHE)).put(KEY, new Response(JSON.stringify(state))); } catch { /* badge remains best effort */ }
    await applyAppBadge(target, state.count);
    if (state.count === 0) await onClear?.();
  });
  return queue.catch(() => {});
}

export function clearWorkerInboxBadge(target: Parameters<typeof applyAppBadge>[0]): Promise<void> {
  queue = queue.catch(() => {}).then(async () => {
    try { await caches.delete(CACHE); } catch { /* private mode */ }
    await applyAppBadge(target, 0);
  });
  return queue.catch(() => {});
}

/** Serialize scoped delivery with logout and foreground reconciliation. */
export function presentInboxPush(target: Parameters<typeof applyAppBadge>[0], raw: unknown, show: () => Promise<void>): Promise<void> {
  queue = queue.catch(() => {}).then(async () => {
    const previous = await readInboxBadge();
    const state = nextInboxBadge(previous, raw);
    if (!state || previous?.owner !== state.owner || (previous.updatedAt >= state.updatedAt && previous.count === state.count)) return;
    await show();
    try { await (await caches.open(CACHE)).put(KEY, new Response(JSON.stringify(state))); } catch { /* private mode */ }
    await applyAppBadge(target, state.count);
  });
  return queue.catch(() => {});
}
