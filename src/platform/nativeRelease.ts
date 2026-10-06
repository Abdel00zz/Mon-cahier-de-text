import type { UpdateResult } from './nativeUpdates';

declare const __NATIVE_API_ORIGIN__: string | undefined;
const origin = typeof __NATIVE_API_ORIGIN__ === 'string' ? __NATIVE_API_ORIGIN__ : 'https://mon-cahier-de-text.vercel.app';

export function trustedApkUrl(raw: unknown, cloudOrigin = origin): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.pathname.endsWith('.apk')) return null;
    if (url.origin === cloudOrigin || (url.hostname === 'github.com' && url.pathname.startsWith('/Abdel00zz/Mon-cahier-de-text/releases/download/'))) return url.href;
  } catch { /* Invalid release metadata must never open a download. */ }
  return null;
}

/** The published manifest describes an actual signed binary, independently of web deployments. */
export function validateNativeRelease(raw: unknown, installed: UpdateResult, cloudOrigin = origin): UpdateResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const downloadUrl = trustedApkUrl(value.downloadUrl, cloudOrigin);
  if (value.package !== 'ma.cahier.textes' || !downloadUrl || typeof value.version !== 'string'
    || !/^\d+\.\d+\.\d+$/.test(value.version) || !Number.isSafeInteger(value.versionCode)
    || (value.versionCode as number) < 1 || (value.versionCode as number) > 2_100_000_000
    || typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)
    || typeof value.signatureSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.signatureSha256)
    || !installed.versionCode || !installed.signatureSha256 || value.signatureSha256 !== installed.signatureSha256) return null;
  if ((value.versionCode as number) < installed.versionCode) return null; // A stale/rolled-back feed is not proof of being current.
  return { ...installed, state: value.versionCode === installed.versionCode ? 'current' : 'available',
    availableVersionCode: value.versionCode as number, availableVersion: value.version, downloadUrl };
}
