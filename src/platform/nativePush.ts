import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { AppLocale } from '../types';
import { readWorkspaceScope, captureWorkspaceLease } from '../infrastructure/storage/accountWorkspace';
import { requestSyncJson } from '../infrastructure/sync/syncTransport';
import { pendingNativePushCleanup, rememberNativePushCleanup, forgetNativePushCleanup } from '../infrastructure/push/nativePushCleanup';

interface NativeDeviceState { available: boolean; token?: string; binding?: string; installationId?: string }
export const NativePush = registerPlugin<{
  getState(options: { owner: string }): Promise<NativeDeviceState>;
  register(): Promise<NativeDeviceState>;
  bind(options: { owner: string; token: string; binding: string; locale: AppLocale }): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  syncUnread(options: { owner: string; count: number; updatedAt: number; locale: AppLocale; enabled?: boolean }): Promise<void>;
  clear(): Promise<void>;
  addListener(event: 'inboxMessage', listener: () => void): Promise<PluginListenerHandle>;
}>('NativePush');

type RemoteState = { available: boolean; registered: boolean | null; configured?: boolean };
let connecting: Promise<RemoteState> | null = null;
let connectionKey = '';
const request = <T>(owner: string, body: object) => requestSyncJson<T>('/api/notify', {
  method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Workspace-Owner': owner },
  body: JSON.stringify(body),
}, 8_000);

export async function connectNativePush(locale: AppLocale): Promise<RemoteState> {
  const key = `${readWorkspaceScope()?.revision}:${locale}`;
  if (connecting && connectionKey === key) return connecting;
  const owner = readWorkspaceScope()?.owner;
  const current = captureWorkspaceLease();
  if (!owner) return { available: false, registered: false };
  connectionKey = key;
  const operation = (async (): Promise<RemoteState> => {
    try {
      await retryCleanup(owner, current);
      if (!current() || localStorage.getItem(`cdt_native_reminders_v1_${owner}`) !== 'true') return { available: false, registered: false };
      await NativePush.setEnabled({ enabled: true });
      if (!current()) return { available: false, registered: false };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const device = await Promise.race([NativePush.register(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Device registration timeout')), 8_000);
      })]).finally(() => clearTimeout(timer));
      if (!device.available || !device.token || !current()) return { available: device.available, registered: false };
      const result = await request<{ configured: boolean; registered: boolean; binding?: string }>(owner,
        { action: 'nativeSubscribe', token: device.token, locale, installationId: device.installationId });
      if (!current()) return { available: true, registered: false };
      if (result.registered && result.binding) await NativePush.bind({ owner, token: device.token, binding: result.binding, locale });
      return { available: true, registered: result.registered, configured: result.configured };
    } catch { return { available: true, registered: null }; }
  })().finally(() => { if (connecting === operation) connecting = null; });
  connecting = operation;
  return operation;
}

async function retryCleanup(owner: string, current: () => boolean, extra?: { token: string; binding: string }): Promise<boolean> {
  const devices = new Map(pendingNativePushCleanup(owner).map(device => [`${device.token}:${device.binding}`, device]));
  if (extra) devices.set(`${extra.token}:${extra.binding}`, { ...extra, at: Date.now() });
  const results = await Promise.all([...devices.values()].map(async device => {
    if (!current()) return false;
    try {
      await request(owner, { action: 'nativeUnsubscribe', token: device.token, binding: device.binding });
      forgetNativePushCleanup(owner, device.token, device.binding);
      return true;
    } catch { return false; }
  }));
  return results.every(Boolean);
}

export async function nativeRemoteState(): Promise<RemoteState> {
  const owner = readWorkspaceScope()?.owner;
  if (!owner) return { available: false, registered: false };
  const device = await NativePush.getState({ owner });
  if (!device.available || !device.token || !device.binding) return { available: device.available, registered: false };
  try {
    const result = await request<{ configured: boolean; registered: boolean }>(owner,
      { action: 'nativeStatus', token: device.token, binding: device.binding });
    return { available: true, ...result };
  } catch { return { available: true, registered: null }; }
}

export async function disconnectNativePush(): Promise<boolean> {
  const owner = readWorkspaceScope()?.owner;
  const current = captureWorkspaceLease();
  let device: NativeDeviceState | undefined;
  try { if (owner) device = await NativePush.getState({ owner }); }
  finally { if (current()) await (await import('../infrastructure/push/appBadge')).clearInboxBadge(); }
  if (!owner || !current()) return false;
  if (device?.token && device.binding) rememberNativePushCleanup(owner, device.token, device.binding);
  return retryCleanup(owner, current, device?.token && device.binding ? { token: device.token, binding: device.binding } : undefined);
}

export async function testNativePush(): Promise<{ ok: boolean; sent: number } | null> {
  const owner = readWorkspaceScope()?.owner;
  if (!owner) return null;
  const device = await NativePush.getState({ owner });
  if (!device.available || !device.token || !device.binding) return null;
  return request(owner, { action: 'nativeTest', token: device.token, binding: device.binding });
}
