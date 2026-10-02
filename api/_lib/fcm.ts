import { createSign } from 'node:crypto';
import type { AppLocale } from '../../src/types.js';

interface Credentials { projectId: string; email: string; privateKey: string }
let access: { value: string; expires: number; identity: string } | null = null;
let pendingAccess: Promise<string> | null = null;

const credentials = (): Credentials | null => {
    const projectId = process.env.FCM_PROJECT_ID;
    const email = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY?.replaceAll('\\n', '\n');
    return projectId && /^[a-z0-9][a-z0-9-]{4,62}$/.test(projectId) && email?.endsWith('.gserviceaccount.com') && privateKey
        ? { projectId, email, privateKey } : null;
};
export const fcmConfigured = (): boolean => credentials() !== null;

/** Short-lived OAuth on the server only; no service-account secrets enter the APK. */
const accessToken = async (config: Credentials): Promise<string> => {
    const identity = `${config.projectId}:${config.email}`;
    if (access?.identity === identity && access.expires > Date.now() + 60_000) return access.value;
    if (pendingAccess) return pendingAccess;
    pendingAccess = (async () => {
        const now = Math.floor(Date.now() / 1000);
        const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
        const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
            iss: config.email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
        })}`;
        const signer = createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
        const assertion = `${unsigned}.${signer.sign(config.privateKey).toString('base64url')}`;
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
            signal: AbortSignal.timeout(8_000),
        });
        const data = await response.json() as { access_token?: unknown; expires_in?: unknown };
        if (!response.ok || typeof data.access_token !== 'string' || typeof data.expires_in !== 'number') throw new Error('FCM authorization unavailable');
        access = { value: data.access_token, expires: Date.now() + Math.min(data.expires_in, 3600) * 1000, identity };
        return access.value;
    })().finally(() => { pendingAccess = null; });
    return pendingAccess;
};

export interface NativePushDevice { token: string; binding: string; locale: AppLocale; installationId?: string }
export interface NativeInboxPush { kind: 'admin' | 'test' | 'badge-sync'; badgeCount?: number; timestamp: number }

/** FCM data-only delivery: native code checks the account binding before displaying. */
export async function sendNativePush(device: NativePushDevice, payload: NativeInboxPush): Promise<{ sent: boolean; expired: boolean }> {
    const config = credentials();
    if (!config) return { sent: false, expired: false };
    try {
        const token = await accessToken(config);
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
            body: JSON.stringify({ message: {
                token: device.token,
                data: { kind: payload.kind, binding: device.binding, locale: device.locale,
                    badgeCount: String(payload.badgeCount ?? 0), timestamp: String(payload.timestamp) },
                android: { priority: payload.kind === 'badge-sync' ? 'NORMAL' : 'HIGH', ttl: payload.kind === 'badge-sync' ? '3600s' : '86400s',
                    // A delayed acknowledgement must not replace a queued new message.
                    ...(payload.kind === 'badge-sync' ? { collapse_key: 'cahier-read' } : {}) },
            } }),
        });
        if (response.ok) return { sent: true, expired: false };
        const data = await response.json().catch(() => null) as { error?: { details?: Array<{ errorCode?: string }> } } | null;
        // INVALID_ARGUMENT can mean a bad payload, not a revoked token. Retain it.
        return { sent: false, expired: data?.error?.details?.some(detail => detail.errorCode === 'UNREGISTERED') === true };
    } catch { return { sent: false, expired: false }; }
}
