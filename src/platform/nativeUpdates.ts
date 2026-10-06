type NativeUpdateState = 'idle' | 'available' | 'current' | 'downloading' | 'downloaded' | 'store' | 'manual' | 'error';
export interface UpdateResult {
  state: NativeUpdateState;
  source?: 'play' | 'apk';
  versionCode?: number;
  availableVersionCode?: number;
  signatureSha256?: string;
  progress?: number;
  downloadUrl?: string;
  availableVersion?: string;
}

/** A restart must never interrupt a form, save or another open modal. */
export function canRestartForUpdate(): boolean {
  if (document.visibilityState !== 'visible' || document.documentElement.dataset.nativeActive === 'false') return false;
  if (document.querySelector('[role="dialog"], [role="alertdialog"], [data-pwa-update-blocked="true"], [aria-busy="true"]')) return false;
  return !document.activeElement?.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}
