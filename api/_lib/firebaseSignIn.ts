import { firebaseAuth } from './firebaseAdmin.js';
import { HttpError } from './http.js';

type FirebaseResponse = { localId?: string; idToken?: string; error?: { message?: string } };

/** The password and Google token stay transient: never saved or logged. */
export async function firebaseIdentityRequest(method: string, body: Record<string, unknown>, locale = 'fr'): Promise<FirebaseResponse> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new HttpError(503, 'Connexion Firebase indisponible. Réessayez plus tard.');
  const base = process.env.FIREBASE_AUTH_EMULATOR_HOST
    ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`
    : 'https://identitytoolkit.googleapis.com/v1';
  const response = await fetch(`${base}/accounts:${method}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Firebase-Locale': locale === 'ar' ? 'ar' : 'fr' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json() as FirebaseResponse;
  if (response.ok) return data;
  const code = data.error?.message?.split(' : ')[0];
  if (code === 'USER_DISABLED') throw new HttpError(403, 'Compte suspendu. Contactez votre établissement.', 'ACCOUNT_BLOCKED');
  if (['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'INVALID_IDP_RESPONSE', 'INVALID_CREDENTIAL'].includes(code ?? '')) {
    throw new HttpError(401, 'Identifiants incorrects. Réessayez.', 'INVALID_CREDENTIALS');
  }
  if (code === 'EMAIL_EXISTS' || code === 'FEDERATED_USER_ID_ALREADY_LINKED') throw new HttpError(409, 'Un compte existe déjà avec cette adresse e-mail.', 'ACCOUNT_EXISTS');
  if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.', 'TOO_MANY_ATTEMPTS');
  throw new HttpError(503, 'Connexion Firebase indisponible. Réessayez plus tard.', 'AUTH_UNAVAILABLE');
}

export async function verifyGoogleSession(token: unknown) {
  if (typeof token !== 'string' || !token || token.length > 12_000) throw new HttpError(400, 'Connexion Google invalide.');
  try {
    const decoded = await firebaseAuth().verifyIdToken(token, true);
    if (decoded.firebase.sign_in_provider !== 'google.com' || !decoded.email_verified || !decoded.email ||
      !decoded.auth_time || Date.now() / 1000 - decoded.auth_time > 300 || decoded.auth_time > Date.now() / 1000 + 60) {
      throw new Error('Fresh Google authentication required');
    }
    return decoded;
  } catch {
    throw new HttpError(401, 'Reconnectez-vous à Google pour continuer.', 'GOOGLE_REAUTH_REQUIRED');
  }
}
