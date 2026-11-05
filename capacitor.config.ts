import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ma.cahier.textes',
  appName: 'Mon cahier de textes',
  webDir: 'dist-android',
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  server: { androidScheme: 'https', hostname: 'localhost' },
  plugins: {
    SplashScreen: { launchAutoHide: false, launchShowDuration: 230, backgroundColor: '#faf9f5', showSpinner: false },
    StatusBar: { overlaysWebView: true, style: 'LIGHT' },
    LocalNotifications: { smallIcon: 'ic_stat_notebook', iconColor: '#b35230' },
  },
};

export default config;
