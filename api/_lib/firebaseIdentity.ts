import { firebaseAuth, teacherEmail, teacherUid } from './firebaseAdmin.js';
import { HttpError } from './http.js';

export interface MigratableUser {
  phone: string; nom: string; prenom: string; passwordHash: string; blocked?: boolean;
}
/** Standard Node scrypt is different from Firebase's modified SCRYPT algorithm. */
export function firebasePasswordImport(user: MigratableUser) {
  const match = /^scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/.exec(user.passwordHash);
  if (!match || match[1] !== '16384' || match[2] !== '8' || match[3] !== '1') throw new Error('Unsupported password hash');
  const passwordSalt = Buffer.from(match[4], 'base64');
  const passwordHash = Buffer.from(match[5], 'base64');
  if (passwordSalt.length !== 16 || passwordHash.length !== 64) throw new Error('Invalid password hash');
  return {
    uid: teacherUid(user.phone), email: teacherEmail(user.phone), emailVerified: false,
    displayName: `${user.prenom} ${user.nom}`.trim(), disabled: user.blocked === true,
    customClaims: { role: 'teacher' }, passwordSalt, passwordHash,
  };
}
export const STANDARD_SCRYPT_OPTIONS = {
  hash: { algorithm: 'STANDARD_SCRYPT' as const, memoryCost: 16384, parallelization: 1, blockSize: 8, derivedKeyLength: 64 },
};

export async function importFirebaseTeacher(user: MigratableUser, allowExisting = true): Promise<boolean> {
  const auth = firebaseAuth();
  try {
    const existing = await auth.getUser(teacherUid(user.phone));
    if (existing.email !== teacherEmail(user.phone)) throw new Error('Firebase identity collision');
    if (!allowExisting) throw new HttpError(409, 'Un compte existe déjà avec ce numéro de téléphone.');
    return false; // Re-running migration must never reset an already migrated password.
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
  }
  try {
    await auth.getUserByEmail(teacherEmail(user.phone));
    throw new Error('Firebase email collision');
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
  }
  const result = await auth.importUsers([firebasePasswordImport(user)], STANDARD_SCRYPT_OPTIONS);
  if (result.failureCount) throw new Error(`Firebase import failed: ${result.errors[0].error.code}`);
  return true;
}

export async function verifyFirebasePassword(phone: string, password: string): Promise<boolean> {
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) throw new HttpError(503, 'Connexion Firebase non configurée.');
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
  const response = await fetch(`${base}/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ email: teacherEmail(phone), password, returnSecureToken: true }),
  });
  const data = await response.json() as { localId?: string; error?: { message?: string } };
  if (response.ok) return data.localId === teacherUid(phone);
  const reason = data.error?.message ?? '';
  if (reason === 'USER_DISABLED') throw new HttpError(403, 'Ce compte a été bloqué par la direction. Contactez votre établissement.', 'ACCOUNT_BLOCKED');
  if (['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND'].includes(reason)) return false;
  if (reason.startsWith('TOO_MANY_ATTEMPTS')) throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  throw new HttpError(503, 'Connexion Firebase temporairement indisponible. Réessayez.');
}
