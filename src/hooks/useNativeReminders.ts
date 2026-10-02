import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import type { AppConfig, ClassInfo } from '../types';
import { subscribe } from '../infrastructure/sync/syncBus';

/** Replan on actual changes/resume; no background polling or permanent wake lock. */
export function useNativeReminders(config: AppConfig, classes: ClassInfo[], owner?: string) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void import('../platform/nativeNotifications').then(module => {
          if (!cancelled) return module.reconcileNativeReminders(config, classes, owner);
        }).catch(() => {});
      }, 250);
    };
    refresh();
    const unsubscribe = ['dirty', 'pull-applied', 'notifications-changed'].map(event => subscribe(event as 'dirty' | 'pull-applied' | 'notifications-changed', refresh));
    window.addEventListener('native-resume', refresh);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe.forEach(stop => stop());
      window.removeEventListener('native-resume', refresh);
    };
  }, [config, classes, owner]);
}
