import { Capacitor, CapacitorHttp } from '@capacitor/core';

declare const __NATIVE_API_ORIGIN__: string | undefined;
const CLOUD_ORIGIN = typeof __NATIVE_API_ORIGIN__ === 'string' ? __NATIVE_API_ORIGIN__ : 'https://mon-cahier-de-text.vercel.app';

export function nativeApiUrl(input: string, origin: string, localOrigin: string): string | null {
  const local = new URL(input, localOrigin);
  if (local.origin !== localOrigin || !local.pathname.startsWith('/api/')) return null;
  const cloud = new URL(origin);
  if (cloud.protocol !== 'https:' || cloud.username || cloud.password || cloud.pathname !== '/' || cloud.search || cloud.hash) {
    throw new TypeError('Adresse cloud HTTPS invalide.');
  }
  return new URL(local.pathname + local.search, cloud.origin).href;
}

/** Native HTTP preserves HttpOnly cloud cookies without weakening browser security. */
export async function apiFetch(input: string, options: RequestInit = {}): Promise<Response> {
  if (!Capacitor.isNativePlatform()) return fetch(input, options);
  const target = nativeApiUrl(input, CLOUD_ORIGIN, window.location.origin);
  if (!target) return fetch(input, options);
  if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
  if (options.body != null && typeof options.body !== 'string') throw new TypeError('Unsupported native API body');
  const headers = Object.fromEntries(new Headers(options.headers).entries());
  const data = options.body && headers['content-type']?.includes('application/json')
    ? JSON.parse(options.body) : options.body ?? undefined;
  const pending = CapacitorHttp.request({
    url: target, method: options.method ?? 'GET', headers, data,
    responseType: 'text', connectTimeout: 8000, readTimeout: 20000,
  });
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Request aborted', 'AbortError'));
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    pending.then(result => {
      if (options.signal?.aborted) return;
      if (result.status < 200 || result.status > 599) throw new TypeError('Invalid native HTTP response');
      const body = result.status === 204 || result.status === 205 ? null
        : typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      const responseHeaders = new Headers(result.headers);
      // Match fetch: authentication cookies belong to the native cookie jar.
      responseHeaders.delete('set-cookie');
      responseHeaders.delete('set-cookie2');
      resolve(new Response(body, { status: result.status, headers: responseHeaders }));
    }).catch(reject).finally(() => options.signal?.removeEventListener('abort', abort));
  });
}
