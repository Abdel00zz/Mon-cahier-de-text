import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type NativeUpdateState = 'idle' | 'available' | 'current' | 'downloading' | 'downloaded' | 'store' | 'error';
export interface UpdateResult { state: NativeUpdateState }
export const NativeUpdates = registerPlugin<{
  check(): Promise<UpdateResult>;
  start(): Promise<UpdateResult>;
  complete(): Promise<UpdateResult>;
  openStore(): Promise<void>;
  addListener(event: 'stateChanged', listener: (value: UpdateResult) => void): Promise<PluginListenerHandle>;
}>('NativeUpdates');

export function supportsNativeUpdates(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/** A restart must never interrupt a form, save or another open modal. */
export function canRestartForUpdate(): boolean {
  if (document.visibilityState !== 'visible' || document.documentElement.dataset.nativeActive === 'false') return false;
  if (document.querySelector('[role="dialog"], [role="alertdialog"], [data-pwa-update-blocked="true"], [aria-busy="true"]')) return false;
  return !document.activeElement?.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}
