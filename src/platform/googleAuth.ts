import { Capacitor, registerPlugin } from '@capacitor/core';
import { apiFetch } from './nativeHttp';
import type { Auth } from 'firebase/auth';

const NativeGoogleAuth = registerPlugin<{
  signIn(): Promise<{ idToken: string }>;
  signOut(): Promise<void>;
}>('NativeGoogleAuth');

let prepared: Promise<{ auth: Auth; sdk: typeof import('firebase/auth') }> | undefined;

/** Auth only, loaded on the sign-in screen; no Analytics or Firestore client. */
export function prepareGoogleAuth() {
  if (Capacitor.isNativePlatform()) return Promise.resolve(null);
  return prepared ??= (async () => {
    const response = await apiFetch('/api/auth?action=config', { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw Object.assign(new Error('Google configuration unavailable'), { code: 'auth/unavailable' });
    const config = await response.json();
    const [{ initializeApp, getApps }, sdk] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps().find(app => app.name === 'teacher-sign-in') ?? initializeApp(config, 'teacher-sign-in');
    const auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence, popupRedirectResolver: sdk.browserPopupRedirectResolver });
    return { auth, sdk };
  })().catch(error => { prepared = undefined; throw error; });
}

export async function googleSignIn(locale: string): Promise<{ action: 'google' | 'googleNative'; idToken: string }> {
  if (Capacitor.isNativePlatform()) {
    const { idToken } = await NativeGoogleAuth.signIn();
    return { action: 'googleNative', idToken };
  }
  const ready = await prepareGoogleAuth();
  if (!ready) throw new Error('Google configuration unavailable');
  const { auth, sdk } = ready;
  auth.languageCode = locale;
  const provider = new sdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await sdk.signInWithPopup(auth, provider);
    return { action: 'google', idToken: await result.user.getIdToken() };
  } finally {
    // The application's HttpOnly cookie is the only persistent session.
    await sdk.signOut(auth).catch(() => undefined);
  }
}

export async function clearGoogleSignIn(): Promise<void> {
  if (Capacitor.isNativePlatform()) await NativeGoogleAuth.signOut().catch(() => undefined);
}
