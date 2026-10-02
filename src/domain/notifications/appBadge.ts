/** Counts come from the inbox, never from the number of push deliveries. */
export function unreadBadgeCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, 999) : null;
}

export interface InboxBadgeState { owner: string; count: number; updatedAt: number }

export function nextInboxBadge(previous: InboxBadgeState | null, raw: unknown): InboxBadgeState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<InboxBadgeState>;
  const count = unreadBadgeCount(value.count);
  if (typeof value.owner !== 'string' || !/^\d{8,15}$/.test(value.owner) || count === null
    || typeof value.updatedAt !== 'number' || !Number.isSafeInteger(value.updatedAt) || value.updatedAt <= 0) return null;
  if (previous?.owner === value.owner && previous.updatedAt > value.updatedAt) return null;
  return { owner: value.owner, count, updatedAt: value.updatedAt };
}

export async function applyAppBadge(target: { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }, count: number): Promise<void> {
  try {
    if (count > 0) await target.setAppBadge?.(count);
    else await target.clearAppBadge?.();
  } catch { /* Unsupported launcher or permission: never interrupt the notebook. */ }
}
