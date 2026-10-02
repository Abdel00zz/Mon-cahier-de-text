interface PendingDevice { token: string; binding: string; at: number }
type CleanupStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const key = (owner: string) => `nativePushCleanup_v1_${owner}`;
const valid = (raw: unknown): raw is PendingDevice => !!raw && typeof raw === 'object'
  && typeof (raw as PendingDevice).token === 'string' && /^[a-zA-Z0-9_:\-]{40,4096}$/.test((raw as PendingDevice).token)
  && typeof (raw as PendingDevice).binding === 'string' && /^[a-zA-Z0-9-]{16,100}$/.test((raw as PendingDevice).binding)
  && Number.isFinite((raw as PendingDevice).at);

/** Private device-local retry; never synced with lesson data or sent under another account. */
export function pendingNativePushCleanup(owner: string | null, storage: CleanupStorage = localStorage, now = Date.now()): PendingDevice[] {
  if (!owner) return [];
  try {
    const raw: unknown = JSON.parse(storage.getItem(key(owner)) ?? '[]');
    return Array.isArray(raw) ? raw.filter(valid).filter(item => item.at <= now && now - item.at < 14 * 86400_000).slice(-5) : [];
  } catch { return []; }
}

export function rememberNativePushCleanup(owner: string, token: string, binding: string, storage: CleanupStorage = localStorage): void {
  const entry = { token, binding, at: Date.now() };
  if (!valid(entry)) return;
  try {
    const entries = pendingNativePushCleanup(owner, storage).filter(item => item.token !== token || item.binding !== binding);
    storage.setItem(key(owner), JSON.stringify([...entries, entry].slice(-5)));
  } catch { /* Revocation on the device still protects an offline logout. */ }
}

export function forgetNativePushCleanup(owner: string, token: string, binding: string, storage: CleanupStorage = localStorage): void {
  try {
    const entries = pendingNativePushCleanup(owner, storage).filter(item => item.token !== token || item.binding !== binding);
    if (entries.length) storage.setItem(key(owner), JSON.stringify(entries)); else storage.removeItem(key(owner));
  } catch { /* Idempotent retry on the next foreground connection. */ }
}
