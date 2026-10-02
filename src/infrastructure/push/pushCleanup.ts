type CleanupStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const keyFor = (owner: string) => `pushCleanup_v1_${owner}`;
const lifetime = 14 * 24 * 3600_000;

/** Device-local retry record, isolated by account; never part of the cloud notebook. */
export function pendingPushCleanup(owner: string | null, storage: CleanupStorage = localStorage, now = Date.now()): string[] {
  if (!owner) return [];
  try {
    const value: unknown = JSON.parse(storage.getItem(keyFor(owner)) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item.endpoint === 'string' && item.endpoint.length <= 2048
      && item.endpoint.startsWith('https://') && typeof item.at === 'number' && item.at <= now && now - item.at < lifetime)
      .slice(-5).map(item => item.endpoint);
  } catch { return []; }
}

export function rememberPushCleanup(owner: string | null, endpoint: string, storage: CleanupStorage = localStorage): void {
  if (!owner) return;
  try {
    const endpoints = [...new Set([...pendingPushCleanup(owner, storage), endpoint])].slice(-5);
    storage.setItem(keyFor(owner), JSON.stringify(endpoints.map(value => ({ endpoint: value, at: Date.now() }))));
  } catch { /* The immediate server request can still succeed when local storage is full. */ }
}

export function forgetPushCleanup(owner: string | null, endpoint: string, storage: CleanupStorage = localStorage): void {
  if (!owner) return;
  try {
    const endpoints = pendingPushCleanup(owner, storage).filter(value => value !== endpoint);
    if (endpoints.length) storage.setItem(keyFor(owner), JSON.stringify(endpoints.map(value => ({ endpoint: value, at: Date.now() }))));
    else storage.removeItem(keyFor(owner));
  } catch { /* A later retry is idempotent. */ }
}
