/** Transport partagé : délais bornés, erreurs typées et budgets en octets UTF-8. */
export class SyncRequestError extends Error {
  constructor(message: string, public status = 0, public code?: string, public retryAfter?: string | null) {
    super(message);
    this.name = 'SyncRequestError';
  }
}

export const retryDelayMs = (attempt: number, retryAfter?: string | null, now = Date.now(), random = Math.random()): number => {
  const seconds = Number(retryAfter);
  const requested = retryAfter
    ? (Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now)
    : 0;
  const backoff = Math.min(120_000, 5_000 * 2 ** Math.min(Math.max(0, attempt), 5));
  return Math.min(600_000, Math.max(backoff * (0.8 + random * 0.4), Number.isFinite(requested) ? requested : 0));
};

export const isRetryableSyncError = (error: unknown): boolean =>
  error instanceof SyncRequestError
    ? error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500 || error.code === 'WRITE_CONFLICT'
    : error instanceof TypeError || error instanceof SyntaxError;

/** Le délai couvre également la lecture du corps, pas seulement les headers. */
export const requestSyncJson = async <T>(
  url: string, options: RequestInit = {}, timeoutMs = 30_000,
): Promise<T> => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { ...options, cache: 'no-store', signal: controller.signal });
    const data = await response.json().catch(error => {
      if (response.ok) throw error;
      return {};
    });
    if (!response.ok) throw new SyncRequestError(
      typeof data?.error === 'string' ? data.error : `HTTP ${response.status}`,
      response.status, data?.code, response.headers.get('Retry-After'),
    );
    // Also reject a mock/proxy that resolves after cancellation.
    if (controller.signal.aborted) throw new SyncRequestError('Délai réseau dépassé');
    return data as T;
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) throw new SyncRequestError('Délai réseau dépassé');
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
};
