import { apiFetch } from '../../platform/nativeHttp';
import { MAX_SYNC_EXPANDED_BYTES, MAX_SYNC_WIRE_BYTES, SYNC_ENCODING } from './syncProtocol';
export const syncJsonBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;

/** Transport partagé : délais bornés, erreurs typées et budgets en octets UTF-8. */
export class SyncRequestError extends Error {
  constructor(message: string, public status = 0, public code?: string, public retryAfter?: string | null) {
    super(message);
    this.name = 'SyncRequestError';
  }
}

/** Ce qu'une entrée de push doit dire pour être planifiable : qui, et combien d'octets. */
export interface PushPlanEntry {
  classId: string;
  /** Taille JSON de la classe SEULE, en octets UTF-8 (`syncJsonBytes`). */
  bytes: number;
}

export interface PushPlan<T extends PushPlanEntry> {
  /** Lots envoyés dans cet ordre ; un lot VIDE en tête = liste, réglages et suppressions seuls. */
  batches: T[][];
  /**
   * Classes qui dépassent À ELLES SEULES le budget d'un lot. Elles partent
   * seules (on ne coupe pas un cahier en deux requêtes : son horodatage et son
   * verrou de conflit portent sur la classe entière) et elles sont NOMMÉES pour
   * que l'appelant n'arrête pas la file sur leur échec.
   */
  oversized: T[];
}

/**
 * Découpe un envoi en lots qui tiennent sous `maxBytes`.
 *
 * Règle née d'un défaut réel : le serveur refuse un corps au-delà d'environ
 * 950 Ko (413). Un cahier officiel volumineux partait seul dans son lot, était
 * refusé, et l'échec INTERROMPAIT la file — donc AUCUNE autre classe ne montait
 * plus au cloud tant que ce cahier restait en attente. La planification sépare
 * les deux questions : ce qui tient ensemble, et ce qui, trop gros, doit être
 * envoyé seul en sachant que son échec ne concerne que lui.
 */
export const planPushBatches = <T extends PushPlanEntry>(entries: readonly T[], maxBytes: number): PushPlan<T> => {
  const batches: T[][] = [];
  const oversized: T[] = [];
  let current: T[] = [];
  let currentBytes = 0;
  for (const entry of entries) {
    if (entry.bytes > maxBytes) oversized.push(entry);
    if (current.length > 0 && currentBytes + entry.bytes > maxBytes) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(entry);
    currentBytes += entry.bytes;
  }
  if (current.length > 0) batches.push(current);
  // Aucune classe en attente : les métadonnées (liste, réglages, suppressions)
  // partent quand même, dans un lot vide.
  if (batches.length === 0) batches.push([]);
  return { batches, oversized };
};

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
    const response = await apiFetch(url, { ...options, cache: 'no-store', signal: controller.signal });
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

/** Large imported notebooks use the browser's native gzip stream, without a bundled codec. */
export async function encodeSyncPayload(value: unknown): Promise<string> {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  if (bytes.byteLength <= MAX_SYNC_WIRE_BYTES) return json;
  if (bytes.byteLength > MAX_SYNC_EXPANDED_BYTES) throw new SyncRequestError('Le cahier dépasse la capacité de synchronisation de 3 Mio. Les données restent sur cet appareil.', 413);
  if (typeof CompressionStream === 'undefined') throw new SyncRequestError('Mettez à jour Android System WebView pour envoyer ce cahier volumineux. Les données restent sur cet appareil.', 413);
  const compressed = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  // Chunk conversion avoids the argument limit of String.fromCharCode on large buffers.
  let binary = '';
  for (let i = 0; i < compressed.length; i += 8192) binary += String.fromCharCode(...compressed.subarray(i, i + 8192));
  const envelope = JSON.stringify({ encoding: SYNC_ENCODING, data: btoa(binary) });
  if (new TextEncoder().encode(envelope).byteLength > MAX_SYNC_WIRE_BYTES) throw new SyncRequestError('Ce cahier reste trop volumineux après compression. Répartissez le contenu entre plusieurs cahiers ; la copie locale est conservée.', 413);
  return envelope;
}

export async function requestSyncPush<T>(value: unknown, options: RequestInit): Promise<T> {
  const bytes = syncJsonBytes(value);
  // A pagehide request cannot wait for gzip or negotiate an upload. Keep it queued.
  if (options.keepalive && bytes > 60_000) throw new SyncRequestError('Envoi repris à la prochaine ouverture.');
  if (bytes > MAX_SYNC_WIRE_BYTES) {
    const capabilities = await requestSyncJson<{ encoding?: string }>('/api/sync?scope=capabilities', {
      headers: options.headers, credentials: options.credentials, signal: options.signal,
    });
    if (capabilities.encoding !== SYNC_ENCODING) throw new SyncRequestError('Le serveur doit être mis à jour pour synchroniser ce cahier volumineux. La copie locale est conservée.', 413);
  }
  const body = await encodeSyncPayload(value);
  options.signal?.throwIfAborted();
  return requestSyncJson<T>('/api/sync', { ...options, method: 'POST', body });
}
