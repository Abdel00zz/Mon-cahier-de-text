import { Capacitor, registerPlugin } from '@capacitor/core';
import { notificationTarget } from '../domain/notifications/notificationPresentation';
import { readWorkspaceScope } from '../infrastructure/storage/accountWorkspace';
import { startSafePwaAction } from '../pwa/safeUpdate';
import { readThemeBackground } from './themeColor';

const NativeShell = registerPlugin<{
  setAppearance(options: { background: string; dark: boolean }): Promise<void>;
  openNotificationSettings(): Promise<void>;
}>('NativeShell');

export async function openNativeNotificationSettings(): Promise<void> {
  if (Capacitor.isNativePlatform()) await NativeShell.openNotificationSettings();
}

/** Native services are loaded only inside the installed application. */
export async function initNativeRuntime(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.dataset.platform = Capacitor.getPlatform();
  document.documentElement.dataset.standalone = 'true';
  document.documentElement.dataset.nativeActive = 'true';
  try {
    const [{ App }, { StatusBar, Style }, { Network }, { LocalNotifications }] = await Promise.all([
      import('@capacitor/app'), import('@capacitor/status-bar'),
      import('@capacitor/network'), import('@capacitor/local-notifications'),
    ]);
    let previousDark: boolean | undefined;
    const applySystemTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      if (dark === previousDark) return;
      previousDark = dark;
      const background = readThemeBackground();
      void NativeShell.setAppearance({ background, dark }).catch(() => {});
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
      void StatusBar.setBackgroundColor({ color: background }).catch(() => {});
    };
    applySystemTheme();
    new MutationObserver(applySystemTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    await App.addListener('backButton', () => {
      if (document.documentElement.dataset.keyboard === 'open' || document.activeElement?.matches('input, textarea, [contenteditable="true"]')) {
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        return;
      }
      const request = new Event('native-back', { cancelable: true });
      window.dispatchEvent(request);
      if (!request.defaultPrevented) void App.minimizeApp();
    });
    await App.addListener('appStateChange', ({ isActive }) => {
      document.documentElement.dataset.nativeActive = String(isActive);
      window.dispatchEvent(new Event(isActive ? 'native-resume' : 'native-pause'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await Network.addListener('networkStatusChange', ({ connected }) => window.dispatchEvent(new Event(connected ? 'online' : 'offline')));
    await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      const extra = notification.extra as { owner?: string; url?: string } | undefined;
      if (!extra?.owner || extra.owner !== readWorkspaceScope()?.owner) return;
      const route = notificationTarget(extra.url);
      startSafePwaAction(() => { window.location.hash = route.slice(1); });
    });
    const navigate = (url: string) => {
      let target: URL;
      try { target = new URL(url); } catch { return; }
      if (target.protocol !== 'cahier:') return;
      const route = notificationTarget(`/#/${target.hostname}${target.pathname}`);
      startSafePwaAction(() => { window.location.hash = route.slice(1); });
    };
    await App.addListener('appUrlOpen', ({ url }) => navigate(url));
    const launch = await App.getLaunchUrl();
    if (launch?.url) navigate(launch.url);
  } finally {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      void import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide()).catch(() => {});
    }));
  }
}
